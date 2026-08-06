import { Module } from '@nestjs/common';
import { RedisTokenBlacklistAdapter } from './redis-token-blacklist.adapter';
import { CACHE_SERVICE_PORT } from '../../../domain/ports/outbound/cache.service.port';

@Module({
  providers: [
    {
      provide: CACHE_SERVICE_PORT,
      useClass: RedisTokenBlacklistAdapter,
    },
    RedisTokenBlacklistAdapter,
  ],
  exports: [CACHE_SERVICE_PORT, RedisTokenBlacklistAdapter],
})
export class RedisModule {}
