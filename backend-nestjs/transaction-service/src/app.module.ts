import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from './adapters/outbound/persistence/prisma.module';
import { UserTrpcClientModule } from './adapters/outbound/trpc/user-trpc-client.module';
import { RedisModule } from './adapters/outbound/redis/redis.module';
import { KafkaModule } from './adapters/outbound/kafka/kafka.module';
import { TransactionController } from './adapters/inbound/rest/transaction.controller';
import { HealthController } from './adapters/inbound/rest/health.controller';
import { TransactionUseCases } from './application/use-cases/transaction.use-cases';
import { TRANSACTION_SERVICE_PORT } from './domain/ports/inbound/transaction-service.port';
import { OutboxService } from './infrastructure/outbox/outbox.service';
import { OutboxPublisherService } from './infrastructure/outbox/outbox-publisher.service';
import { TransferMoneyCommandHandler } from './application/commands/transfer-money.handler';
import { GetTransactionHistoryQueryHandler } from './application/queries/get-transaction-history.handler';

const CommandHandlers = [TransferMoneyCommandHandler];
const QueryHandlers = [GetTransactionHistoryQueryHandler];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CqrsModule,
    PrismaModule,
    UserTrpcClientModule,
    RedisModule,
    KafkaModule,
  ],
  controllers: [TransactionController, HealthController],
  providers: [
    OutboxService,
    OutboxPublisherService,
    TransactionUseCases,
    {
      provide: TRANSACTION_SERVICE_PORT,
      useClass: TransactionUseCases,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class AppModule {}
