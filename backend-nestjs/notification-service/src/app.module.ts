import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationApplicationModule } from './application/notification-application.module';
import { NotificationController } from './adapters/inbound/rest/notification.controller';
import { HealthController } from './adapters/inbound/rest/health.controller';
import { KafkaConsumerService } from './adapters/inbound/kafka/kafka-consumer.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NotificationApplicationModule,
  ],
  controllers: [NotificationController, HealthController],
  providers: [KafkaConsumerService],
})
export class AppModule {}
