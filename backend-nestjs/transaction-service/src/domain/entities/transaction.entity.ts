export class TransactionEntity {
  id?: number;
  fromUserId: number;
  toUserId: number;
  amount: number;
  status: string;
  createdAt?: Date;

  constructor(partial: Partial<TransactionEntity>) {
    Object.assign(this, partial);
  }
}
