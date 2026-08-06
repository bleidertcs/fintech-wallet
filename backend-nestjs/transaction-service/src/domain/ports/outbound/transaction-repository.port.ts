import { TransactionEntity } from '../../entities/transaction.entity';
import { MoneyRequestEntity } from '../../entities/money-request.entity';

export interface TransactionRepositoryPort {
  saveTransaction(transaction: TransactionEntity): Promise<TransactionEntity>;
  findTransactionsByUserId(userId: number): Promise<TransactionEntity[]>;
  findAllTransactions(): Promise<TransactionEntity[]>;
  
  saveMoneyRequest(request: MoneyRequestEntity): Promise<MoneyRequestEntity>;
  findMoneyRequestById(id: number): Promise<MoneyRequestEntity | null>;
  findMoneyRequestsByUserId(userId: number): Promise<MoneyRequestEntity[]>;
  updateMoneyRequestStatus(id: number, status: string): Promise<MoneyRequestEntity>;
}

export const TRANSACTION_REPOSITORY_PORT = Symbol('TransactionRepositoryPort');
