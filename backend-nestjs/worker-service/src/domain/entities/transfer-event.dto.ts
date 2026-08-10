export class TransferCompletedEventDto {
  transactionId?: string;
  sourceUserId?: number;
  targetUserId?: number;
  fromUser?: number;
  toUser?: number;
  amount: number;
  currency?: string;
  timestamp?: string;
}
