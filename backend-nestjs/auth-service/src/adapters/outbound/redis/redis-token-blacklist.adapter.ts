import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import { appConfig } from '../../../infrastructure/config/app.config';
import { CacheServicePort } from '../../../domain/ports/outbound/cache.service.port';

@Injectable()
export class RedisTokenBlacklistAdapter implements CacheServicePort, OnModuleDestroy {
  private readonly redisClient: Redis;
  private static readonly BLACKLIST_PREFIX = 'token:blacklist:';

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {
    this.redisClient = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      lazyConnect: true,
    });
  }

  async addToBlacklist(token: string, ttlSeconds: number): Promise<void> {
    const key = `${RedisTokenBlacklistAdapter.BLACKLIST_PREFIX}${token}`;
    if (ttlSeconds > 0) {
      await this.redisClient.set(key, 'revoked', 'EX', ttlSeconds);
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const key = `${RedisTokenBlacklistAdapter.BLACKLIST_PREFIX}${token}`;
    const exists = await this.redisClient.exists(key);
    return exists === 1;
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }
}
