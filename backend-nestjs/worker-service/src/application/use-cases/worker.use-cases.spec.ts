import { Test, TestingModule } from '@nestjs/testing';
import { WorkerUseCases } from './worker.use-cases';
import { WORKER_REPOSITORY_PORT, WorkerRepositoryPort } from '../../domain/ports/worker-repository.port';
import { PDF_GENERATOR_PORT, PdfGeneratorPort } from '../../domain/ports/pdf-generator.port';
import { StatementJobEntity } from '../../domain/entities/statement-job.entity';
import { AuditLogEntity } from '../../domain/entities/audit-log.entity';
import { NotFoundException } from '@nestjs/common';

describe('WorkerUseCases', () => {
  let useCases: WorkerUseCases;
  let repository: jest.Mocked<WorkerRepositoryPort>;
  let pdfGenerator: jest.Mocked<PdfGeneratorPort>;

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<WorkerRepositoryPort>> = {
      createJob: jest.fn(),
      findJobById: jest.fn(),
      findJobsByUserId: jest.fn(),
      updateJobStatus: jest.fn(),
      createAuditLog: jest.fn(),
      findAuditLogsByUserId: jest.fn(),
    };

    const mockPdfGenerator: Partial<jest.Mocked<PdfGeneratorPort>> = {
      generateStatementPdf: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerUseCases,
        {
          provide: WORKER_REPOSITORY_PORT,
          useValue: mockRepository,
        },
        {
          provide: PDF_GENERATOR_PORT,
          useValue: mockPdfGenerator,
        },
      ],
    }).compile();

    useCases = module.get<WorkerUseCases>(WorkerUseCases);
    repository = module.get(WORKER_REPOSITORY_PORT);
    pdfGenerator = module.get(PDF_GENERATOR_PORT);
  });

  it('should be defined', () => {
    expect(useCases).toBeDefined();
  });

  describe('requestStatement', () => {
    it('should create a statement job and process PDF generation', async () => {
      const mockJob = new StatementJobEntity({
        id: 1,
        userId: 10,
        status: 'PENDING',
        createdAt: new Date(),
      });

      repository.createJob.mockResolvedValue(mockJob);
      repository.updateJobStatus.mockResolvedValue(mockJob);
      pdfGenerator.generateStatementPdf.mockResolvedValue('/tmp/statements/statement_job_1.pdf');

      const result = await useCases.requestStatement(10);

      expect(result).toEqual(mockJob);
      expect(repository.createJob).toHaveBeenCalledWith(10);
    });
  });

  describe('getJob', () => {
    it('should return a statement job if found', async () => {
      const mockJob = new StatementJobEntity({ id: 1, userId: 10, status: 'COMPLETED' });
      repository.findJobById.mockResolvedValue(mockJob);

      const result = await useCases.getJob(1);
      expect(result).toEqual(mockJob);
    });

    it('should throw NotFoundException if job is not found', async () => {
      repository.findJobById.mockResolvedValue(null);

      await expect(useCases.getJob(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordTransactionAudit', () => {
    it('should create an audit log entry', async () => {
      const mockAudit = new AuditLogEntity({
        id: 100,
        fromUserId: 1,
        toUserId: 2,
        amount: 150.0,
        eventType: 'TRANSFER_COMPLETED',
        details: 'Audit test',
        timestamp: new Date(),
      });

      repository.createAuditLog.mockResolvedValue(mockAudit);

      const result = await useCases.recordTransactionAudit(1, 2, 150.0, 'TRANSFER_COMPLETED', 'Audit test');

      expect(result).toEqual(mockAudit);
      expect(repository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          fromUserId: 1,
          toUserId: 2,
          amount: 150.0,
          eventType: 'TRANSFER_COMPLETED',
          details: 'Audit test',
        }),
      );
    });
  });
});
