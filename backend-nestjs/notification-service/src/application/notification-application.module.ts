import { Module } from '@nestjs/common';
import { DatabaseModule } from '../adapters/outbound/database/database.module';
import { EmailModule } from '../adapters/outbound/email/email.module';
import { UserGrpcClientModule } from '../adapters/outbound/grpc/user-grpc-client.module';
import { NOTIFICATION_SERVICE_PORT } from '../domain/ports/inbound/notification-service.port';
import { NotificationUseCases } from './use-cases/notification.use-cases';

@Module({
  imports: [DatabaseModule, EmailModule, UserGrpcClientModule],
  providers: [
    {
      provide: NOTIFICATION_SERVICE_PORT,
      useClass: NotificationUseCases,
    },
  ],
  exports: [NOTIFICATION_SERVICE_PORT],
})
export class NotificationApplicationModule {}
