export class Email {
  private readonly value: string;

  constructor(email: string) {
    const trimmed = (email || '').trim().toLowerCase();
    if (!this.validate(trimmed)) {
      throw new Error(`Email inválido: ${email}`);
    }
    this.value = trimmed;
  }

  public getValue(): string {
    return this.value;
  }

  private validate(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
