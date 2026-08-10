export class StatementJobEntity {
  id: number;
  userId: number;
  status: string; // PENDING, IN_PROGRESS, COMPLETED, FAILED
  pdfPath?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;

  constructor(partial: Partial<StatementJobEntity>) {
    Object.assign(this, partial);
  }
}
