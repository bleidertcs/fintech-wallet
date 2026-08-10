import { Module } from '@nestjs/common';
import { WorkerUseCases } from './use-cases/worker.use-cases';
import { WORKER_SERVICE_PORT } from '../domain/ports/worker-service.port';
import { DatabaseModule } from '../adapters/outbound/database/database.module';
import { PdfModule } from '../adapters/outbound/pdf/pdf.module';

@Module({
  imports: [DatabaseModule, PdfModule],
  providers: [
    {
      provide: WORKER_SERVICE_PORT,
      useClass: WorkerUseCases,
    },
  ],
  exports: [WORKER_SERVICE_PORT],
})
export class WorkerApplicationModule {}
