import { User } from '../../entities/user.entity';

export const AUTH_SERVICE_PORT = Symbol('AUTH_SERVICE_PORT');

export interface AuthResult {
  token?: string | null;
  user: User;
  requiresTotp?: boolean;
}

export interface TotpSetupResult {
  secret: string;
  qrCodeUrl: string;
}

export interface AuthServicePort {
  register(email: string, password: string, name?: string): Promise<User>;
  login(email: string, password: string): Promise<AuthResult>;
  verifyEmail(token: string): Promise<boolean>;
  getMe(userId: bigint): Promise<User>;
  setupTotp(userId: bigint): Promise<TotpSetupResult>;
  verifyTotp(userId: bigint, code: string): Promise<boolean>;
  enableTotp(userId: bigint, code: string): Promise<boolean>;
  disableTotp(userId: bigint): Promise<boolean>;
  getUserByEmail(email: string): Promise<User>;
  resendVerification(email: string): Promise<void>;
  changePassword(email: string, oldPass: string, newPass: string): Promise<void>;
  promoteToAdmin(email: string): Promise<void>;
}
