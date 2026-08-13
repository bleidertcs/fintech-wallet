export class TransferCompletedEvent {
  constructor(
    public readonly transactionId: bigint | number,
    public readonly fromUserId: number,
    public readonly toUserId: number,
    public readonly amount: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
