export interface UserProps {
  id?: bigint;
  email: string;
  password: string;
  role?: string;
  verified?: boolean;
  verificationToken?: string | null;
  totpSecret?: string | null;
  totpEnabled?: boolean;
}

export class User {
  private props: UserProps;

  constructor(props: UserProps) {
    this.props = {
      ...props,
      role: props.role || 'USER',
      verified: props.verified ?? false,
      totpEnabled: props.totpEnabled ?? false,
      verificationToken: props.verificationToken ?? null,
      totpSecret: props.totpSecret ?? null,
    };
  }

  get id(): bigint | undefined {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get password(): string {
    return this.props.password;
  }

  get role(): string {
    return this.props.role!;
  }

  get verified(): boolean {
    return this.props.verified!;
  }

  get verificationToken(): string | null {
    return this.props.verificationToken!;
  }

  get totpSecret(): string | null {
    return this.props.totpSecret!;
  }

  get totpEnabled(): boolean {
    return this.props.totpEnabled!;
  }

  public verifyEmail(): void {
    this.props.verified = true;
    this.props.verificationToken = null;
  }

  public enableTotp(secret: string): void {
    this.props.totpSecret = secret;
    this.props.totpEnabled = true;
  }

  public disableTotp(): void {
    this.props.totpSecret = null;
    this.props.totpEnabled = false;
  }

  public updateVerificationToken(token: string): void {
    this.props.verificationToken = token;
  }

  public toJSON() {
    return {
      id: this.props.id ? this.props.id.toString() : undefined,
      email: this.props.email,
      role: this.props.role,
      verified: this.props.verified,
      totpEnabled: this.props.totpEnabled,
    };
  }
}
