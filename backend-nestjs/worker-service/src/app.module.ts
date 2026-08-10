import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { WorkerApplicationModule } from './application/worker-application.module';
import { WorkerController } from './adapters/inbound/rest/worker.controller';
import { HealthController } from './adapters/inbound/rest/health.controller';
import { KafkaWorkerConsumer } from './adapters/inbound/kafka/kafka-consumer.service';
import { DatabaseModule } from './adapters/outbound/database/database.module';
import { PdfModule } from './adapters/outbound/pdf/pdf.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TerminusModule,
    DatabaseModule,
    PdfModule,
    WorkerApplicationModule,
  ],
  controllers: [WorkerController, HealthController],
  providers: [KafkaWorkerConsumer],
})
export class AppModule {}
