export class NotificationEntity {
  id: number;
  userId: number;
  type: string; // "TRANSFER_SENT" | "TRANSFER_RECEIVED"
  message: string;
  amount: number;
  fromUserId?: number | null;
  read: boolean;
  createdAt: Date;

  constructor(partial: Partial<NotificationEntity>) {
    Object.assign(this, partial);
  }
}
