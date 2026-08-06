export class UserProfileEntity {
  constructor(
    public readonly id: number,
    public name: string,
    public email: string,
    public balance: number,
    public dailyLimit: number = 50000,
    public currency: string = 'ARS',
  ) {}

  public hasSufficientBalance(amount: number): boolean {
    return this.balance >= amount;
  }

  public isWithinDailyLimit(amount: number): boolean {
    return amount <= this.dailyLimit;
  }

  public toJSON() {
    return {
      id: Number(this.id),
      name: this.name,
      email: this.email,
      balance: Number(this.balance),
      dailyLimit: Number(this.dailyLimit),
      currency: this.currency,
    };
  }
}
