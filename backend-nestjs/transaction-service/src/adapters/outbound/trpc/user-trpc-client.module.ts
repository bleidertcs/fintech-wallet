import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserServiceTrpcAdapter } from './user-service.trpc-adapter';
import { USER_SERVICE_CLIENT_PORT } from '../../../domain/ports/outbound/user-service-client.port';

@Module({
  imports: [ConfigModule],
  providers: [
    UserServiceTrpcAdapter,
    {
      provide: USER_SERVICE_CLIENT_PORT,
      useClass: UserServiceTrpcAdapter,
    },
  ],
  exports: [USER_SERVICE_CLIENT_PORT],
})
export class UserTrpcClientModule {}
