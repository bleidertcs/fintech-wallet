import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyService.name);
  private redisClient: Redis;
  private readonly IDEMPOTENCY_PREFIX = 'transaction:idempotency:';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.redisClient = new Redis({
      host,
      port,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redisClient.on('connect', () => {
      this.logger.log(`Conectado exitosamente a Redis en ${host}:${port}`);
    });

    this.redisClient.on('error', (err) => {
      this.logger.error(`Error en la conexión a Redis: ${err.message}`);
    });
  }

  onModuleDestroy() {
    this.redisClient?.disconnect();
  }

  async isDuplicateKey(idempotencyKey?: string): Promise<boolean> {
    if (!idempotencyKey || idempotencyKey.trim() === '') {
      return false;
    }
    const exists = await this.redisClient.exists(this.IDEMPOTENCY_PREFIX + idempotencyKey);
    return exists === 1;
  }

  async registerKey(idempotencyKey?: string, ttlHours: number = 24): Promise<void> {
    if (idempotencyKey && idempotencyKey.trim() !== '') {
      const ttlSeconds = ttlHours * 3600;
      await this.redisClient.set(
        this.IDEMPOTENCY_PREFIX + idempotencyKey,
        'PROCESSED',
        'EX',
        ttlSeconds,
      );
    }
  }

  async removeKey(idempotencyKey?: string): Promise<void> {
    if (idempotencyKey && idempotencyKey.trim() !== '') {
      await this.redisClient.del(this.IDEMPOTENCY_PREFIX + idempotencyKey);
    }
  }
}
