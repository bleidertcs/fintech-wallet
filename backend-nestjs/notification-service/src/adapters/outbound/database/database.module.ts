import { Module } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NOTIFICATION_REPOSITORY_PORT } from '../../../domain/ports/outbound/notification-repository.port';
import { PrismaNotificationRepository } from './prisma-notification.repository';

@Module({
  providers: [
    PrismaService,
    {
      provide: NOTIFICATION_REPOSITORY_PORT,
      useClass: PrismaNotificationRepository,
    },
  ],
  exports: [PrismaService, NOTIFICATION_REPOSITORY_PORT],
})
export class DatabaseModule {}
