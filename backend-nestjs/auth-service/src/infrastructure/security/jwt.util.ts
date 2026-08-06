import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { appConfig } from '../config/app.config';
import { TokenServicePort, TokenPayload } from '../../domain/ports/outbound/token.service.port';

@Injectable()
export class JwtUtil implements TokenServicePort {
  private readonly secretKey: Buffer;
  private readonly expiration: string;

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {
    const rawSecret = this.config.jwt.secret;
    try {
      this.secretKey = Buffer.from(rawSecret, 'base64');
    } catch {
      this.secretKey = Buffer.from(rawSecret, 'utf-8');
    }
    this.expiration = this.config.jwt.expiration;
  }

  generateToken(payload: TokenPayload): string {
    return jwt.sign(
      {
        sub: payload.email,
        role: payload.role,
        userId: payload.userId ? payload.userId.toString() : '0',
      },
      this.secretKey,
      {
        algorithm: 'HS256',
        expiresIn: this.expiration as any,
      },
    );
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        algorithms: ['HS256'],
      }) as any;
      return {
        userId: BigInt(decoded.userId || '0'),
        email: decoded.sub,
        role: decoded.role,
      };
    } catch {
      return null;
    }
  }

  getEmailFromToken(token: string): string | null {
    const payload = this.verifyToken(token);
    return payload ? payload.email : null;
  }
}
