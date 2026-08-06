import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { USER_SERVICE_CLIENT_PORT } from '../../../domain/ports/outbound/user-service-client.port';
import { UserServiceGrpcAdapter } from './user-service.grpc-adapter';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'USER_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'user',
            protoPath: join(__dirname, 'proto/user.proto'),
            url: configService.get<string>('USER_SERVICE_GRPC_URL', 'localhost:50051'),
          },
        }),
      },
    ]),
  ],
  providers: [
    {
      provide: USER_SERVICE_CLIENT_PORT,
      useClass: UserServiceGrpcAdapter,
    },
  ],
  exports: [USER_SERVICE_CLIENT_PORT],
})
export class UserGrpcClientModule {}
