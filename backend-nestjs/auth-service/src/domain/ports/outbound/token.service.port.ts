export const TOKEN_SERVICE_PORT = Symbol('TOKEN_SERVICE_PORT');

export interface TokenPayload {
  userId: bigint;
  email: string;
  role: string;
}

export interface TokenServicePort {
  generateToken(payload: TokenPayload): string;
  verifyToken(token: string): TokenPayload | null;
}
