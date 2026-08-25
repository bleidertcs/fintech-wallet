export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string = 'VES',
  ) {
    if (amount < 0) {
      throw new Error('El monto no puede ser negativo.');
    }
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('No se pueden sumar montos de monedas distintas.');
    }
    return new Money(Number((this.amount + other.amount).toFixed(2)), this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('No se pueden restar montos de monedas distintas.');
    }
    if (this.amount < other.amount) {
      throw new Error('Saldo insuficiente para realizar la resta.');
    }
    return new Money(Number((this.amount - other.amount).toFixed(2)), this.currency);
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.amount >= other.amount;
  }
}
