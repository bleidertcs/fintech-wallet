import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './adapters/outbound/persistence/prisma.module';
import { UserGrpcClientModule } from './adapters/outbound/grpc/user-grpc-client.module';
import { RedisModule } from './adapters/outbound/redis/redis.module';
import { KafkaModule } from './adapters/outbound/kafka/kafka.module';
import { TransactionController } from './adapters/inbound/rest/transaction.controller';
import { HealthController } from './adapters/inbound/rest/health.controller';
import { TransactionUseCases } from './application/use-cases/transaction.use-cases';
import { TRANSACTION_SERVICE_PORT } from './domain/ports/inbound/transaction-service.port';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    UserGrpcClientModule,
    RedisModule,
    KafkaModule,
  ],
  controllers: [TransactionController, HealthController],
  providers: [
    TransactionUseCases,
    {
      provide: TRANSACTION_SERVICE_PORT,
      useClass: TransactionUseCases,
    },
  ],
})
export class AppModule {}
