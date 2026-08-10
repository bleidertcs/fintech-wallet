import { StatementJobEntity } from '../entities/statement-job.entity';
import { AuditLogEntity } from '../entities/audit-log.entity';

export const WORKER_SERVICE_PORT = Symbol('WORKER_SERVICE_PORT');

export interface WorkerServicePort {
  requestStatement(userId: number): Promise<StatementJobEntity>;
  getJob(jobId: number): Promise<StatementJobEntity>;
  getJobsByUser(userId: number): Promise<StatementJobEntity[]>;
  getAuditLogsForUser(userId: number): Promise<AuditLogEntity[]>;
  recordTransactionAudit(
    fromUserId: number | null,
    toUserId: number | null,
    amount: number,
    eventType: string,
    details: string,
  ): Promise<AuditLogEntity>;
}
