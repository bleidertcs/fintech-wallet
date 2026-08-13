import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetTransactionHistoryQuery } from './get-transaction-history.query';
import {
  TransactionRepositoryPort,
  TRANSACTION_REPOSITORY_PORT,
} from '../../domain/ports/outbound/transaction-repository.port';

@QueryHandler(GetTransactionHistoryQuery)
export class GetTransactionHistoryQueryHandler
  implements IQueryHandler<GetTransactionHistoryQuery>
{
  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepositoryPort,
  ) {}

  async execute(query: GetTransactionHistoryQuery): Promise<any[]> {
    const transactions = await this.transactionRepository.findTransactionsByUserId(query.userId);
    return transactions.map((t) => ({
      id: Number(t.id),
      fromUserId: Number(t.fromUserId),
      toUserId: Number(t.toUserId),
      amount: Number(t.amount),
      status: t.status,
      createdAt: t.createdAt,
    }));
  }
}
