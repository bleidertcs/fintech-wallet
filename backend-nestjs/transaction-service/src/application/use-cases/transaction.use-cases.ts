import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  TransactionServicePort,
  TransferParams,
  MoneyRequestParams,
} from '../../domain/ports/inbound/transaction-service.port';
import {
  TransactionRepositoryPort,
  TRANSACTION_REPOSITORY_PORT,
} from '../../domain/ports/outbound/transaction-repository.port';
import {
  UserServiceClientPort,
  USER_SERVICE_CLIENT_PORT,
} from '../../domain/ports/outbound/user-service-client.port';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { MoneyRequestEntity } from '../../domain/entities/money-request.entity';
import { IdempotencyService } from '../../adapters/outbound/redis/idempotency.service';
import { KafkaProducerService } from '../../adapters/outbound/kafka/kafka-producer.service';

@Injectable()
export class TransactionUseCases implements TransactionServicePort {
  private readonly logger = new Logger(TransactionUseCases.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepositoryPort,
    @Inject(USER_SERVICE_CLIENT_PORT)
    private readonly userServiceClient: UserServiceClientPort,
    private readonly idempotencyService: IdempotencyService,
    private readonly kafkaProducerService: KafkaProducerService,
  ) {}

  async transfer(params: TransferParams): Promise<TransactionEntity> {
    const { fromUserId, toUserId, amount, idempotencyKey } = params;

    if (fromUserId === toUserId) {
      throw new BadRequestException('No puedes realizar una transferencia a ti mismo');
    }

    if (amount <= 0) {
      throw new BadRequestException('El monto debe ser positivo');
    }

    // 1. Verificar idempotencia en Redis
    if (idempotencyKey && (await this.idempotencyService.isDuplicateKey(idempotencyKey))) {
      this.logger.warn(`Solicitud de transferencia duplicada detectada para key=${idempotencyKey}`);
      throw new BadRequestException('Transferencia procesada anteriormente (Idempotencia)');
    }

    // 2. Verificar saldo y perfil del emisor por gRPC
    const sender = await this.userServiceClient.getUser(fromUserId);
    if (!sender) {
      throw new NotFoundException(`Usuario emisor id=${fromUserId} no encontrado`);
    }

    if (sender.balance < amount) {
      throw new BadRequestException(
        `Saldo insuficiente. Saldo actual: ${sender.balance}, Monto a transferir: ${amount}`,
      );
    }

    // 3. Verificar perfil del receptor por gRPC
    const receiver = await this.userServiceClient.getUser(toUserId);
    if (!receiver) {
      throw new NotFoundException(`Usuario receptor id=${toUserId} no encontrado`);
    }

    // 4. Debitar cuenta emisor vía gRPC
    await this.userServiceClient.updateBalance(fromUserId, -amount);

    try {
      // 5. Acreditar cuenta receptor vía gRPC
      await this.userServiceClient.updateBalance(toUserId, amount);
    } catch (err) {
      // Rollback del débito si falla la acreditación
      this.logger.error(`Error al acreditar cuenta receptor. Aplicando rollback para emisor id=${fromUserId}`);
      await this.userServiceClient.updateBalance(fromUserId, amount);
      throw err;
    }

    // 6. Registrar la transacción en la base de datos
    const transaction = await this.transactionRepository.saveTransaction(
      new TransactionEntity({
        fromUserId,
        toUserId,
        amount,
        status: 'SUCCESS',
      }),
    );

    // 7. Publicar evento transfer_completed en Kafka
    await this.kafkaProducerService.sendTransferCompleted({
      fromUser: fromUserId,
      toUser: toUserId,
      amount,
    });

    // 8. Registrar la clave de idempotencia en Redis con TTL de 24 horas
    if (idempotencyKey) {
      await this.idempotencyService.registerKey(idempotencyKey, 24);
    }

    return transaction;
  }

  async getUserTransactions(userId: number): Promise<TransactionEntity[]> {
    return this.transactionRepository.findTransactionsByUserId(userId);
  }

  async getAllTransactions(): Promise<TransactionEntity[]> {
    return this.transactionRepository.findAllTransactions();
  }

  async createMoneyRequest(params: MoneyRequestParams): Promise<MoneyRequestEntity> {
    const { requesterId, targetId, amount, message } = params;

    if (requesterId === targetId) {
      throw new BadRequestException('No puedes solicitar dinero a ti mismo');
    }

    // Verificar existencia de usuarios por gRPC
    await this.userServiceClient.getUser(requesterId);
    await this.userServiceClient.getUser(targetId);

    return this.transactionRepository.saveMoneyRequest(
      new MoneyRequestEntity({
        requesterId,
        targetId,
        amount,
        message,
        status: 'PENDING',
      }),
    );
  }

  async getUserMoneyRequests(userId: number): Promise<MoneyRequestEntity[]> {
    return this.transactionRepository.findMoneyRequestsByUserId(userId);
  }

  async acceptMoneyRequest(requestId: number, currentUserId?: number): Promise<TransactionEntity> {
    const request = await this.transactionRepository.findMoneyRequestById(requestId);
    if (!request) {
      throw new NotFoundException(`Solicitud de dinero id=${requestId} no encontrada`);
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`La solicitud de dinero ya ha sido procesada (${request.status})`);
    }

    // Realizar la transferencia implícita: desde el targetId (quien paga) hacia el requesterId (quien pidió)
    const transaction = await this.transfer({
      fromUserId: request.targetId,
      toUserId: request.requesterId,
      amount: request.amount,
    });

    // Actualizar estado de la solicitud a ACCEPTED
    await this.transactionRepository.updateMoneyRequestStatus(requestId, 'ACCEPTED');

    return transaction;
  }

  async rejectMoneyRequest(requestId: number, currentUserId?: number): Promise<MoneyRequestEntity> {
    const request = await this.transactionRepository.findMoneyRequestById(requestId);
    if (!request) {
      throw new NotFoundException(`Solicitud de dinero id=${requestId} no encontrada`);
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`La solicitud de dinero ya ha sido procesada (${request.status})`);
    }

    return this.transactionRepository.updateMoneyRequestStatus(requestId, 'REJECTED');
  }
}
