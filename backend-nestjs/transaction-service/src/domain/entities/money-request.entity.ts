export class MoneyRequestEntity {
  id?: number;
  requesterId: number;
  targetId: number;
  amount: number;
  message?: string;
  status: string; // PENDING, ACCEPTED, REJECTED
  createdAt?: Date;

  constructor(partial: Partial<MoneyRequestEntity>) {
    Object.assign(this, partial);
  }
}
