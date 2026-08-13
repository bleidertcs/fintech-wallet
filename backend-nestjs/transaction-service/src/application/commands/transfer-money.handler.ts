import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TransferMoneyCommand } from './transfer-money.command';
import {
  TransactionRepositoryPort,
  TRANSACTION_REPOSITORY_PORT,
} from '../../domain/ports/outbound/transaction-repository.port';
import {
  UserServiceClientPort,
  USER_SERVICE_CLIENT_PORT,
} from '../../domain/ports/outbound/user-service-client.port';
import { IdempotencyService } from '../../adapters/outbound/redis/idempotency.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { TransferCompletedEvent } from '../../domain/events/transfer-completed.event';
import { Money } from '../../domain/value-objects/money.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { TransactionEntity } from '../../domain/entities/transaction.entity';

@CommandHandler(TransferMoneyCommand)
export class TransferMoneyCommandHandler implements ICommandHandler<TransferMoneyCommand> {
  private readonly logger = new Logger(TransferMoneyCommandHandler.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepositoryPort,
    @Inject(USER_SERVICE_CLIENT_PORT)
    private readonly userServiceClient: UserServiceClientPort,
    private readonly idempotencyService: IdempotencyService,
    private readonly outboxService: OutboxService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: TransferMoneyCommand): Promise<any> {
    const { fromUserId, toUserId, amount, idempotencyKey } = command;

    const money = new Money(amount);
    const senderId = new UserId(fromUserId);
    const receiverId = new UserId(toUserId);

    if (senderId.equals(receiverId)) {
      throw new BadRequestException('No puedes realizar una transferencia a ti mismo');
    }

    if (idempotencyKey && (await this.idempotencyService.isDuplicateKey(idempotencyKey, senderId.toBigInt()))) {
      this.logger.warn(`Solicitud duplicada para idempotencyKey=${idempotencyKey}`);
      throw new BadRequestException('Solicitud duplicada procesada previamente');
    }

    const senderProfile = await this.userServiceClient.getUser(senderId.toNumber());
    if (!senderProfile) {
      throw new NotFoundException(`Usuario origen id=${fromUserId} no encontrado`);
    }

    if (senderProfile.balance < money.amount) {
      throw new BadRequestException(`Saldo insuficiente (${senderProfile.balance} ARS)`);
    }

    const receiverProfile = await this.userServiceClient.getUser(receiverId.toNumber());
    if (!receiverProfile) {
      throw new NotFoundException(`Usuario destino id=${toUserId} no encontrado`);
    }

    // Atomic Debit via tRPC / DB
    const debitSuccess = await this.userServiceClient.updateBalance(senderId.toNumber(), -money.amount);
    if (!debitSuccess) {
      throw new BadRequestException('Error débito: saldo insuficiente o falla concurrente');
    }

    // Credit Receiver
    const creditSuccess = await this.userServiceClient.updateBalance(receiverId.toNumber(), money.amount);
    if (!creditSuccess) {
      // Compensate debit
      await this.userServiceClient.updateBalance(senderId.toNumber(), money.amount);
      throw new BadRequestException('Error al acreditar cuenta de destino; transferencia revertida');
    }

    // Persist Transaction
    const transaction = await this.transactionRepository.saveTransaction(
      new TransactionEntity({
        fromUserId: senderId.toNumber(),
        toUserId: receiverId.toNumber(),
        amount: money.amount,
        status: 'SUCCESS',
      }),
    );

    // Outbox + Redis Idempotency
    await this.outboxService.createOutboxEvent(
      'Transaction',
      transaction.id!.toString(),
      'TRANSFER_COMPLETED',
      {
        transactionId: transaction.id!.toString(),
        fromUser: senderId.toNumber(),
        toUser: receiverId.toNumber(),
        amount: money.amount,
      },
    );

    if (idempotencyKey) {
      await this.idempotencyService.registerKey(idempotencyKey, senderId.toBigInt(), 24);
    }

    // EventBus dispatch
    this.eventBus.publish(
      new TransferCompletedEvent(
        transaction.id!,
        senderId.toNumber(),
        receiverId.toNumber(),
        money.amount,
      ),
    );

    return {
      id: Number(transaction.id),
      fromUserId: senderId.toNumber(),
      toUserId: receiverId.toNumber(),
      amount: money.amount,
      status: 'SUCCESS',
      createdAt: transaction.createdAt,
    };
  }
}
