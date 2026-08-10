import { Test, TestingModule } from '@nestjs/testing';
import { WorkerController } from './worker.controller';
import { WORKER_SERVICE_PORT, WorkerServicePort } from '../../../domain/ports/worker-service.port';
import { StatementJobEntity } from '../../../domain/entities/statement-job.entity';
import { AuditLogEntity } from '../../../domain/entities/audit-log.entity';

describe('WorkerController', () => {
  let controller: WorkerController;
  let service: jest.Mocked<WorkerServicePort>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<WorkerServicePort>> = {
      requestStatement: jest.fn(),
      getJob: jest.fn(),
      getJobsByUser: jest.fn(),
      getAuditLogsForUser: jest.fn(),
      recordTransactionAudit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkerController],
      providers: [
        {
          provide: WORKER_SERVICE_PORT,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<WorkerController>(WorkerController);
    service = module.get(WORKER_SERVICE_PORT);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('requestStatement', () => {
    it('should call workerService.requestStatement with userId', async () => {
      const mockJob = new StatementJobEntity({ id: 1, userId: 5, status: 'PENDING' });
      service.requestStatement.mockResolvedValue(mockJob);

      const result = await controller.requestStatement(5);
      expect(result).toEqual(mockJob);
      expect(service.requestStatement).toHaveBeenCalledWith(5);
    });
  });

  describe('getStatementStatus', () => {
    it('should call workerService.getJob with jobId', async () => {
      const mockJob = new StatementJobEntity({ id: 2, userId: 5, status: 'COMPLETED' });
      service.getJob.mockResolvedValue(mockJob);

      const result = await controller.getStatementStatus(2);
      expect(result).toEqual(mockJob);
      expect(service.getJob).toHaveBeenCalledWith(2);
    });
  });

  describe('getAuditLogsByUser', () => {
    it('should call workerService.getAuditLogsForUser with userId', async () => {
      const mockAudit = [new AuditLogEntity({ id: 1, fromUserId: 5, amount: 100, eventType: 'TRANSFER_COMPLETED' })];
      service.getAuditLogsForUser.mockResolvedValue(mockAudit);

      const result = await controller.getAuditLogsByUser(5);
      expect(result).toEqual(mockAudit);
      expect(service.getAuditLogsForUser).toHaveBeenCalledWith(5);
    });
  });
});
