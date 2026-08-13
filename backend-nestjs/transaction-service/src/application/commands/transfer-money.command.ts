export class TransferMoneyCommand {
  constructor(
    public readonly fromUserId: number,
    public readonly toUserId: number,
    public readonly amount: number,
    public readonly idempotencyKey?: string,
  ) {}
}
