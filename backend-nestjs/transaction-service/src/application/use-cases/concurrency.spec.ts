import { BadRequestException } from '@nestjs/common';
import { TransactionUseCases } from './transaction.use-cases';

describe('Concurrency & Financial Consistency Tests (Integration)', () => {
  let useCases: TransactionUseCases;

  let senderBalance = 100.0;
  let receiverBalance = 0.0;

  const mockTransactionRepo = {
    saveTransaction: jest.fn().mockImplementation((tx) => Promise.resolve({ id: BigInt(1), ...tx })),
  };

  const mockUserServiceClient = {
    getUser: jest.fn().mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve({ id: 1, balance: senderBalance });
      if (id === 2) return Promise.resolve({ id: 2, balance: receiverBalance });
      return Promise.resolve(null);
    }),
    updateBalance: jest.fn().mockImplementation((id: number, amount: number) => {
      if (id === 1) {
        if (amount < 0 && senderBalance < Math.abs(amount)) {
          throw new BadRequestException('Saldo insuficiente');
        }
        senderBalance += amount;
      } else if (id === 2) {
        receiverBalance += amount;
      }
      return Promise.resolve(true);
    }),
  };

  const mockIdempotencyService = {
    isDuplicateKey: jest.fn().mockResolvedValue(false),
    registerKey: jest.fn().mockResolvedValue(undefined),
  };

  const mockKafkaProducer = {
    sendTransferCompleted: jest.fn().mockResolvedValue(undefined),
  };

  const mockOutboxService = {
    createOutboxEvent: jest.fn().mockResolvedValue(undefined),
    processPendingEvents: jest.fn().mockResolvedValue(1),
  };

  beforeEach(() => {
    senderBalance = 100.0;
    receiverBalance = 0.0;
    jest.clearAllMocks();

    useCases = new TransactionUseCases(
      mockTransactionRepo as any,
      mockUserServiceClient as any,
      mockIdempotencyService as any,
      mockKafkaProducer as any,
      mockOutboxService as any,
    );
  });

  it('debe prevenir sobregiros cuando se lanzan múltiples transferencias concurrentes', async () => {
    const transferProms = Array.from({ length: 5 }).map((_, index) =>
      useCases
        .transfer({
          fromUserId: 1,
          toUserId: 2,
          amount: 30,
          idempotencyKey: `concurrent-tx-${index}`,
        })
        .catch((err) => err),
    );

    const results = await Promise.all(transferProms);

    const successes = results.filter((res) => !(res instanceof Error));
    const failures = results.filter((res) => res instanceof Error);

    expect(successes.length).toBeLessThanOrEqual(3);
    expect(failures.length).toBeGreaterThanOrEqual(2);
    expect(senderBalance).toBeGreaterThanOrEqual(0);
  });

  it('debe bloquear peticiones con la misma clave de idempotencia', async () => {
    mockIdempotencyService.isDuplicateKey.mockImplementation((key) => Promise.resolve(key === 'same-key'));

    await expect(
      useCases.transfer({
        fromUserId: 1,
        toUserId: 2,
        amount: 50,
        idempotencyKey: 'same-key',
      }),
    ).rejects.toThrow('Transferencia procesada anteriormente (Idempotencia)');
  });
});
