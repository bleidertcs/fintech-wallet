import { Test, TestingModule } from '@nestjs/testing';
import { TransactionController } from './transaction.controller';
import { TRANSACTION_SERVICE_PORT } from '../../../domain/ports/inbound/transaction-service.port';

describe('TransactionController', () => {
  let controller: TransactionController;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      transfer: jest.fn(),
      getUserTransactions: jest.fn(),
      getAllTransactions: jest.fn(),
      createMoneyRequest: jest.fn(),
      getUserMoneyRequests: jest.fn(),
      acceptMoneyRequest: jest.fn(),
      rejectMoneyRequest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        {
          provide: TRANSACTION_SERVICE_PORT,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar la transferencia al servicio y retornar la respuesta formateada', async () => {
    mockService.transfer.mockResolvedValue({
      id: 1,
      fromUserId: 10,
      toUserId: 20,
      amount: 250,
      status: 'SUCCESS',
      createdAt: new Date(),
    });

    const response = await controller.transfer(
      { fromUserId: 10, toUserId: 20, amount: 250 },
      'idem-key-1',
    );

    expect(response.id).toBe(1);
    expect(mockService.transfer).toHaveBeenCalledWith({
      fromUserId: 10,
      toUserId: 20,
      amount: 250,
      idempotencyKey: 'idem-key-1',
    });
  });
});
