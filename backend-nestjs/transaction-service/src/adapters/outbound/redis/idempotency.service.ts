import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../adapters/outbound/persistence/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyService.name);
  private redisClient: Redis;
  private readonly IDEMPOTENCY_PREFIX = 'transaction:idempotency:';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

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

  async isDuplicateKey(idempotencyKey?: string, userId?: bigint): Promise<boolean> {
    if (!idempotencyKey || idempotencyKey.trim() === '') {
      return false;
    }
    // 1. Fast check Redis
    try {
      const existsInRedis = await this.redisClient.exists(this.IDEMPOTENCY_PREFIX + idempotencyKey);
      if (existsInRedis === 1) {
        return true;
      }
    } catch (err: any) {
      this.logger.warn(`Redis fallback para idempotencia: ${err.message}`);
    }

    // 2. Durable check MySQL if userId is provided
    if (userId) {
      const record = await this.prisma.idempotencyRecord.findUnique({
        where: {
          user_key_unique: {
            userId,
            key: idempotencyKey,
          },
        },
      });
      if (record) {
        return true;
      }
    }

    return false;
  }

  async registerKey(idempotencyKey?: string, userId?: bigint, ttlHours: number = 24): Promise<void> {
    if (!idempotencyKey || idempotencyKey.trim() === '') {
      return;
    }

    // 1. Register in Redis
    try {
      const ttlSeconds = ttlHours * 3600;
      await this.redisClient.set(
        this.IDEMPOTENCY_PREFIX + idempotencyKey,
        'PROCESSED',
        'EX',
        ttlSeconds,
      );
    } catch (err: any) {
      this.logger.error(`Error registrando idempotencia en Redis: ${err.message}`);
    }

    // 2. Persist in MySQL
    if (userId) {
      try {
        await this.prisma.idempotencyRecord.upsert({
          where: {
            user_key_unique: {
              userId,
              key: idempotencyKey,
            },
          },
          create: {
            userId,
            key: idempotencyKey,
            status: 'COMPLETED',
          },
          update: {
            status: 'COMPLETED',
          },
        });
      } catch (err: any) {
        this.logger.error(`Error guardando idempotencia durable en MySQL: ${err.message}`);
      }
    }
  }

  async removeKey(idempotencyKey?: string, userId?: bigint): Promise<void> {
    if (idempotencyKey && idempotencyKey.trim() !== '') {
      try {
        await this.redisClient.del(this.IDEMPOTENCY_PREFIX + idempotencyKey);
      } catch (err: any) {
        // ignore
      }
      if (userId) {
        try {
          await this.prisma.idempotencyRecord.deleteMany({
            where: {
              userId,
              key: idempotencyKey,
            },
          });
        } catch (err: any) {
          // ignore
        }
      }
    }
  }
}
