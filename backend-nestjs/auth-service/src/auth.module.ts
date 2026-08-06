import { Module } from '@nestjs/common';
import { AuthController } from './adapters/inbound/rest';
import { AuthUseCases } from './application/use-cases';
import { PrismaUserRepository, PrismaModule } from './adapters/outbound/persistence';
import { RedisTokenBlacklistAdapter, RedisModule } from './adapters/outbound/redis';
import { UserProfileHttpClient } from './adapters/outbound/http';
import { NodemailerEmailAdapter } from './adapters/outbound/email';
import { JwtUtil } from './infrastructure/security';
import { AUTH_SERVICE_PORT } from './domain/ports/inbound';
import {
  USER_REPOSITORY_PORT,
  TOKEN_SERVICE_PORT,
  EMAIL_SERVICE_PORT,
  USER_PROFILE_CLIENT_PORT,
  CACHE_SERVICE_PORT,
} from './domain/ports/outbound';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_SERVICE_PORT,
      useClass: AuthUseCases,
    },
    {
      provide: USER_REPOSITORY_PORT,
      useClass: PrismaUserRepository,
    },
    {
      provide: TOKEN_SERVICE_PORT,
      useClass: JwtUtil,
    },
    {
      provide: EMAIL_SERVICE_PORT,
      useClass: NodemailerEmailAdapter,
    },
    {
      provide: USER_PROFILE_CLIENT_PORT,
      useClass: UserProfileHttpClient,
    },
    {
      provide: CACHE_SERVICE_PORT,
      useClass: RedisTokenBlacklistAdapter,
    },
    AuthUseCases,
    PrismaUserRepository,
    JwtUtil,
    NodemailerEmailAdapter,
    UserProfileHttpClient,
    RedisTokenBlacklistAdapter,
  ],
  exports: [AUTH_SERVICE_PORT, TOKEN_SERVICE_PORT, CACHE_SERVICE_PORT],
})
export class AuthModule {}
