import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaTransactionRepository } from './prisma-transaction.repository';
import { TRANSACTION_REPOSITORY_PORT } from '../../../domain/ports/outbound/transaction-repository.port';

@Module({
  providers: [
    PrismaService,
    {
      provide: TRANSACTION_REPOSITORY_PORT,
      useClass: PrismaTransactionRepository,
    },
  ],
  exports: [PrismaService, TRANSACTION_REPOSITORY_PORT],
})
export class PrismaModule {}
