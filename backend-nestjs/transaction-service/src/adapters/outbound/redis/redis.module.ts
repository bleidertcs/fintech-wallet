import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdempotencyService } from './idempotency.service';

@Module({
  imports: [ConfigModule],
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class RedisModule {}
