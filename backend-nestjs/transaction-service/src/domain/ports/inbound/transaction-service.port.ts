import { TransactionEntity } from '../../entities/transaction.entity';
import { MoneyRequestEntity } from '../../entities/money-request.entity';

export interface TransferParams {
  fromUserId: number;
  toUserId: number;
  amount: number;
  idempotencyKey?: string;
}

export interface MoneyRequestParams {
  requesterId: number;
  targetId: number;
  amount: number;
  message?: string;
}

export interface TransactionServicePort {
  transfer(params: TransferParams): Promise<TransactionEntity>;
  getUserTransactions(userId: number): Promise<TransactionEntity[]>;
  getAllTransactions(): Promise<TransactionEntity[]>;
  
  createMoneyRequest(params: MoneyRequestParams): Promise<MoneyRequestEntity>;
  getUserMoneyRequests(userId: number): Promise<MoneyRequestEntity[]>;
  acceptMoneyRequest(requestId: number, currentUserId?: number): Promise<TransactionEntity>;
  rejectMoneyRequest(requestId: number, currentUserId?: number): Promise<MoneyRequestEntity>;
}

export const TRANSACTION_SERVICE_PORT = Symbol('TransactionServicePort');
