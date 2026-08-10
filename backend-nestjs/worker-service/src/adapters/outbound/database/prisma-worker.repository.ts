import { Injectable } from '@nestjs/common';
import { WorkerRepositoryPort } from '../../../domain/ports/worker-repository.port';
import { StatementJobEntity } from '../../../domain/entities/statement-job.entity';
import { AuditLogEntity } from '../../../domain/entities/audit-log.entity';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class PrismaWorkerRepository implements WorkerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(userId: number): Promise<StatementJobEntity> {
    const created = await this.prisma.statementJob.create({
      data: {
        userId: BigInt(userId),
        status: 'PENDING',
      },
    });
    return this.mapJobToEntity(created);
  }

  async findJobById(jobId: number): Promise<StatementJobEntity | null> {
    const job = await this.prisma.statementJob.findUnique({
      where: { id: BigInt(jobId) },
    });
    return job ? this.mapJobToEntity(job) : null;
  }

  async findJobsByUserId(userId: number): Promise<StatementJobEntity[]> {
    const jobs = await this.prisma.statementJob.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
    });
    return jobs.map((job) => this.mapJobToEntity(job));
  }

  async updateJobStatus(
    jobId: number,
    status: string,
    pdfPath?: string,
    errorMessage?: string,
  ): Promise<StatementJobEntity> {
    const updated = await this.prisma.statementJob.update({
      where: { id: BigInt(jobId) },
      data: {
        status,
        ...(pdfPath && { pdfPath }),
        ...(errorMessage && { errorMessage }),
        ...(status === 'COMPLETED' || status === 'FAILED' ? { completedAt: new Date() } : {}),
      },
    });
    return this.mapJobToEntity(updated);
  }

  async createAuditLog(auditLog: Partial<AuditLogEntity>): Promise<AuditLogEntity> {
    const created = await this.prisma.auditLog.create({
      data: {
        fromUserId: auditLog.fromUserId ? BigInt(auditLog.fromUserId) : null,
        toUserId: auditLog.toUserId ? BigInt(auditLog.toUserId) : null,
        amount: auditLog.amount || 0,
        eventType: auditLog.eventType || 'UNKNOWN',
        details: auditLog.details || null,
        timestamp: auditLog.timestamp || new Date(),
      },
    });
    return this.mapAuditToEntity(created);
  }

  async findAuditLogsByUserId(userId: number): Promise<AuditLogEntity[]> {
    const targetUserId = BigInt(userId);
    const logs = await this.prisma.auditLog.findMany({
      where: {
        OR: [{ fromUserId: targetUserId }, { toUserId: targetUserId }],
      },
      orderBy: { timestamp: 'desc' },
    });
    return logs.map((log) => this.mapAuditToEntity(log));
  }

  private mapJobToEntity(raw: any): StatementJobEntity {
    return new StatementJobEntity({
      id: Number(raw.id),
      userId: Number(raw.userId),
      status: raw.status,
      pdfPath: raw.pdfPath ?? undefined,
      errorMessage: raw.errorMessage ?? undefined,
      createdAt: raw.createdAt,
      completedAt: raw.completedAt ?? undefined,
    });
  }

  private mapAuditToEntity(raw: any): AuditLogEntity {
    return new AuditLogEntity({
      id: Number(raw.id),
      fromUserId: raw.fromUserId ? Number(raw.fromUserId) : undefined,
      toUserId: raw.toUserId ? Number(raw.toUserId) : undefined,
      amount: Number(raw.amount),
      eventType: raw.eventType,
      details: raw.details ?? undefined,
      timestamp: raw.timestamp,
    });
  }
}
