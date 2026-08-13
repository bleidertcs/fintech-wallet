export class UserId {
  constructor(public readonly value: bigint | number) {
    if (!value || Number(value) <= 0) {
      throw new Error('El UserId debe ser un identificador numérico válido.');
    }
  }

  toNumber(): number {
    return Number(this.value);
  }

  toBigInt(): bigint {
    return BigInt(this.value);
  }

  equals(other: UserId): boolean {
    return this.toNumber() === other.toNumber();
  }
}
