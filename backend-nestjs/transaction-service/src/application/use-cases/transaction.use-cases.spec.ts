import { Test, TestingModule } from '@nestjs/testing';
import { TransactionUseCases } from './transaction.use-cases';
import { TRANSACTION_REPOSITORY_PORT } from '../../domain/ports/outbound/transaction-repository.port';
import { USER_SERVICE_CLIENT_PORT } from '../../domain/ports/outbound/user-service-client.port';
import { IdempotencyService } from '../../adapters/outbound/redis/idempotency.service';
import { KafkaProducerService } from '../../adapters/outbound/kafka/kafka-producer.service';
import { BadRequestException } from '@nestjs/common';

describe('TransactionUseCases', () => {
  let useCases: TransactionUseCases;
  let mockRepository: any;
  let mockUserClient: any;
  let mockIdempotency: any;
  let mockKafka: any;

  beforeEach(async () => {
    mockRepository = {
      saveTransaction: jest.fn(),
      findTransactionsByUserId: jest.fn(),
      findAllTransactions: jest.fn(),
      saveMoneyRequest: jest.fn(),
      findMoneyRequestById: jest.fn(),
      findMoneyRequestsByUserId: jest.fn(),
      updateMoneyRequestStatus: jest.fn(),
    };

    mockUserClient = {
      getUser: jest.fn(),
      updateBalance: jest.fn(),
    };

    mockIdempotency = {
      isDuplicateKey: jest.fn().mockResolvedValue(false),
      registerKey: jest.fn().mockResolvedValue(undefined),
      removeKey: jest.fn().mockResolvedValue(undefined),
    };

    mockKafka = {
      sendTransferCompleted: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionUseCases,
        {
          provide: TRANSACTION_REPOSITORY_PORT,
          useValue: mockRepository,
        },
        {
          provide: USER_SERVICE_CLIENT_PORT,
          useValue: mockUserClient,
        },
        {
          provide: IdempotencyService,
          useValue: mockIdempotency,
        },
        {
          provide: KafkaProducerService,
          useValue: mockKafka,
        },
      ],
    }).compile();

    useCases = module.get<TransactionUseCases>(TransactionUseCases);
  });

  it('debe estar definido', () => {
    expect(useCases).toBeDefined();
  });

  describe('transfer', () => {
    it('debe rechazar transferencias a uno mismo', async () => {
      await expect(
        useCases.transfer({ fromUserId: 1, toUserId: 1, amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar montos menores o iguales a cero', async () => {
      await expect(
        useCases.transfer({ fromUserId: 1, toUserId: 2, amount: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si el emisor no tiene saldo suficiente', async () => {
      mockUserClient.getUser.mockResolvedValueOnce({
        id: 1,
        balance: 50,
      });

      await expect(
        useCases.transfer({ fromUserId: 1, toUserId: 2, amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe realizar transferencia exitosa cuando las validaciones son correctas', async () => {
      mockUserClient.getUser
        .mockResolvedValueOnce({ id: 1, balance: 500 }) // sender
        .mockResolvedValueOnce({ id: 2, balance: 100 }); // receiver

      mockUserClient.updateBalance.mockResolvedValue({ success: true });

      mockRepository.saveTransaction.mockResolvedValue({
        id: 101,
        fromUserId: 1,
        toUserId: 2,
        amount: 100,
        status: 'SUCCESS',
        createdAt: new Date(),
      });

      const result = await useCases.transfer({
        fromUserId: 1,
        toUserId: 2,
        amount: 100,
        idempotencyKey: 'test-key-123',
      });

      expect(result.id).toBe(101);
      expect(mockUserClient.updateBalance).toHaveBeenCalledWith(1, -100);
      expect(mockUserClient.updateBalance).toHaveBeenCalledWith(2, 100);
      expect(mockKafka.sendTransferCompleted).toHaveBeenCalledWith({
        fromUser: 1,
        toUser: 2,
        amount: 100,
      });
      expect(mockIdempotency.registerKey).toHaveBeenCalledWith('test-key-123', 24);
    });
  });
});
