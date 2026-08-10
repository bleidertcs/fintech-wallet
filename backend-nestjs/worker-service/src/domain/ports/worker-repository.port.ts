import { StatementJobEntity } from '../entities/statement-job.entity';
import { AuditLogEntity } from '../entities/audit-log.entity';

export const WORKER_REPOSITORY_PORT = Symbol('WORKER_REPOSITORY_PORT');

export interface WorkerRepositoryPort {
  createJob(userId: number): Promise<StatementJobEntity>;
  findJobById(jobId: number): Promise<StatementJobEntity | null>;
  findJobsByUserId(userId: number): Promise<StatementJobEntity[]>;
  updateJobStatus(jobId: number, status: string, pdfPath?: string, errorMessage?: string): Promise<StatementJobEntity>;
  createAuditLog(auditLog: Partial<AuditLogEntity>): Promise<AuditLogEntity>;
  findAuditLogsByUserId(userId: number): Promise<AuditLogEntity[]>;
}
