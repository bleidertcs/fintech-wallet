import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TransactionRepositoryPort } from '../../../domain/ports/outbound/transaction-repository.port';
import { TransactionEntity } from '../../../domain/entities/transaction.entity';
import { MoneyRequestEntity } from '../../../domain/entities/money-request.entity';

@Injectable()
export class PrismaTransactionRepository implements TransactionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async saveTransaction(transaction: TransactionEntity): Promise<TransactionEntity> {
    const created = await this.prisma.transaction.create({
      data: {
        fromUserId: BigInt(transaction.fromUserId),
        toUserId: BigInt(transaction.toUserId),
        amount: transaction.amount,
        status: transaction.status,
      },
    });

    return new TransactionEntity({
      id: Number(created.id),
      fromUserId: Number(created.fromUserId),
      toUserId: Number(created.toUserId),
      amount: Number(created.amount),
      status: created.status,
      createdAt: created.createdAt,
    });
  }

  async findTransactionsByUserId(userId: number): Promise<TransactionEntity[]> {
    const records = await this.prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: BigInt(userId) },
          { toUserId: BigInt(userId) },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(
      (r) =>
        new TransactionEntity({
          id: Number(r.id),
          fromUserId: Number(r.fromUserId),
          toUserId: Number(r.toUserId),
          amount: Number(r.amount),
          status: r.status,
          createdAt: r.createdAt,
        }),
    );
  }

  async findAllTransactions(): Promise<TransactionEntity[]> {
    const records = await this.prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return records.map(
      (r) =>
        new TransactionEntity({
          id: Number(r.id),
          fromUserId: Number(r.fromUserId),
          toUserId: Number(r.toUserId),
          amount: Number(r.amount),
          status: r.status,
          createdAt: r.createdAt,
        }),
    );
  }

  async saveMoneyRequest(request: MoneyRequestEntity): Promise<MoneyRequestEntity> {
    const created = await this.prisma.moneyRequest.create({
      data: {
        requesterId: BigInt(request.requesterId),
        targetId: BigInt(request.targetId),
        amount: request.amount,
        message: request.message || null,
        status: request.status || 'PENDING',
      },
    });

    return new MoneyRequestEntity({
      id: Number(created.id),
      requesterId: Number(created.requesterId),
      targetId: Number(created.targetId),
      amount: Number(created.amount),
      message: created.message || undefined,
      status: created.status,
      createdAt: created.createdAt,
    });
  }

  async findMoneyRequestById(id: number): Promise<MoneyRequestEntity | null> {
    const record = await this.prisma.moneyRequest.findUnique({
      where: { id: BigInt(id) },
    });

    if (!record) return null;

    return new MoneyRequestEntity({
      id: Number(record.id),
      requesterId: Number(record.requesterId),
      targetId: Number(record.targetId),
      amount: Number(record.amount),
      message: record.message || undefined,
      status: record.status,
      createdAt: record.createdAt,
    });
  }

  async findMoneyRequestsByUserId(userId: number): Promise<MoneyRequestEntity[]> {
    const records = await this.prisma.moneyRequest.findMany({
      where: {
        OR: [
          { requesterId: BigInt(userId) },
          { targetId: BigInt(userId) },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(
      (r) =>
        new MoneyRequestEntity({
          id: Number(r.id),
          requesterId: Number(r.requesterId),
          targetId: Number(r.targetId),
          amount: Number(r.amount),
          message: r.message || undefined,
          status: r.status,
          createdAt: r.createdAt,
        }),
    );
  }

  async updateMoneyRequestStatus(id: number, status: string): Promise<MoneyRequestEntity> {
    const updated = await this.prisma.moneyRequest.update({
      where: { id: BigInt(id) },
      data: { status },
    });

    return new MoneyRequestEntity({
      id: Number(updated.id),
      requesterId: Number(updated.requesterId),
      targetId: Number(updated.targetId),
      amount: Number(updated.amount),
      message: updated.message || undefined,
      status: updated.status,
      createdAt: updated.createdAt,
    });
  }
}
