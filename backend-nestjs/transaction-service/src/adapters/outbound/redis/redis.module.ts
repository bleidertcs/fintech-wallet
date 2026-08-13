import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../persistence/prisma.module';
import { IdempotencyService } from './idempotency.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class RedisModule {}
