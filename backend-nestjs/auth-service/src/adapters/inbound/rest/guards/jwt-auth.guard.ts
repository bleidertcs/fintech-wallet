import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { TOKEN_SERVICE_PORT, TokenServicePort } from '../../../../domain/ports/outbound/token.service.port';
import { CACHE_SERVICE_PORT, CacheServicePort } from '../../../../domain/ports/outbound/cache.service.port';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE_PORT)
    private readonly tokenService: TokenServicePort,
    @Inject(CACHE_SERVICE_PORT)
    private readonly cacheService: CacheServicePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);

    const isBlacklisted = await this.cacheService.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token is revoked');
    }

    const payload = this.tokenService.verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = payload;
    return true;
  }
}
