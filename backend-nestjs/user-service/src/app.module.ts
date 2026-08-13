import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './infrastructure/config/app.config';
import { PrismaModule } from './adapters/outbound/persistence/prisma.module';
import { UserUseCases } from './application/use-cases/user.use-cases';
import { UserController } from './adapters/inbound/rest/user.controller';
import { HealthController } from './adapters/inbound/rest/health.controller';
import { AppController } from './app.controller';
import { USER_SERVICE_PORT } from './domain/ports/inbound/user.service.port';

import { UserTrpcRouter } from './adapters/inbound/trpc/user-trpc.router';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    PrismaModule,
  ],
  controllers: [AppController, UserController, HealthController],
  providers: [
    UserTrpcRouter,
    {
      provide: USER_SERVICE_PORT,
      useClass: UserUseCases,
    },
  ],
})
export class AppModule {}
