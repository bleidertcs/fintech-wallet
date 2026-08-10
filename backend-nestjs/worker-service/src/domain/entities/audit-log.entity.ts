export class AuditLogEntity {
  id: number;
  fromUserId?: number;
  toUserId?: number;
  amount: number;
  eventType: string;
  details?: string;
  timestamp: Date;

  constructor(partial: Partial<AuditLogEntity>) {
    Object.assign(this, partial);
  }
}
