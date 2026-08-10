import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WorkerServicePort } from '../../domain/ports/worker-service.port';
import { WORKER_REPOSITORY_PORT, WorkerRepositoryPort } from '../../domain/ports/worker-repository.port';
import { PDF_GENERATOR_PORT, PdfGeneratorPort } from '../../domain/ports/pdf-generator.port';
import { StatementJobEntity } from '../../domain/entities/statement-job.entity';
import { AuditLogEntity } from '../../domain/entities/audit-log.entity';

@Injectable()
export class WorkerUseCases implements WorkerServicePort {
  private readonly logger = new Logger(WorkerUseCases.name);

  constructor(
    @Inject(WORKER_REPOSITORY_PORT)
    private readonly repository: WorkerRepositoryPort,
    @Inject(PDF_GENERATOR_PORT)
    private readonly pdfGenerator: PdfGeneratorPort,
  ) {}

  async requestStatement(userId: number): Promise<StatementJobEntity> {
    this.logger.log(`Creando trabajo de extracto bancario para userId: ${userId}`);
    const job = await this.repository.createJob(userId);

    // Generar PDF asincrónicamente
    this.processPdfGeneration(job.id, userId).catch((err) => {
      this.logger.error(`Error procesando PDF para jobId ${job.id}: ${err.message}`, err.stack);
    });

    return job;
  }

  private async processPdfGeneration(jobId: number, userId: number): Promise<void> {
    try {
      await this.repository.updateJobStatus(jobId, 'IN_PROGRESS');
      const pdfPath = await this.pdfGenerator.generateStatementPdf(jobId, userId);
      await this.repository.updateJobStatus(jobId, 'COMPLETED', pdfPath);
      this.logger.log(`PDF generado exitosamente para jobId ${jobId} en ${pdfPath}`);
    } catch (error) {
      await this.repository.updateJobStatus(jobId, 'FAILED', undefined, error.message || 'Error al generar PDF');
      throw error;
    }
  }

  async getJob(jobId: number): Promise<StatementJobEntity> {
    const job = await this.repository.findJobById(jobId);
    if (!job) {
      throw new NotFoundException(`Trabajo de extracto id ${jobId} no encontrado`);
    }
    return job;
  }

  async getJobsByUser(userId: number): Promise<StatementJobEntity[]> {
    return this.repository.findJobsByUserId(userId);
  }

  async getAuditLogsForUser(userId: number): Promise<AuditLogEntity[]> {
    return this.repository.findAuditLogsByUserId(userId);
  }

  async recordTransactionAudit(
    fromUserId: number | null,
    toUserId: number | null,
    amount: number,
    eventType: string,
    details: string,
  ): Promise<AuditLogEntity> {
    this.logger.log(`Registrando auditoría: ${eventType} - ${amount} USD`);
    return this.repository.createAuditLog({
      fromUserId: fromUserId ?? undefined,
      toUserId: toUserId ?? undefined,
      amount,
      eventType,
      details,
      timestamp: new Date(),
    });
  }
}
