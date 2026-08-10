import { Module } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaWorkerRepository } from './prisma-worker.repository';
import { WORKER_REPOSITORY_PORT } from '../../../domain/ports/worker-repository.port';

@Module({
  providers: [
    PrismaService,
    {
      provide: WORKER_REPOSITORY_PORT,
      useClass: PrismaWorkerRepository,
    },
  ],
  exports: [PrismaService, WORKER_REPOSITORY_PORT],
})
export class DatabaseModule {}
