import { Module } from '@nestjs/common';
import { USER_SERVICE_CLIENT_PORT } from '../../../domain/ports/outbound/user-service-client.port';
import { UserServiceGrpcAdapter } from './user-service.grpc-adapter';

@Module({
  providers: [
    {
      provide: USER_SERVICE_CLIENT_PORT,
      useClass: UserServiceGrpcAdapter,
    },
  ],
  exports: [USER_SERVICE_CLIENT_PORT],
})
export class UserGrpcClientModule {}
