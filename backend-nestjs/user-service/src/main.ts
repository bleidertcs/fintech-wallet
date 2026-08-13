import { initTracing } from './infrastructure/telemetry/tracing';
initTracing();

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { WinstonLogger } from './infrastructure/logger/winston.logger';
import { join } from 'path';

import * as trpcExpress from '@trpc/server/adapters/express';
import { UserTrpcRouter } from './adapters/inbound/trpc/user-trpc.router';

async function bootstrap() {
  const logger = new WinstonLogger('Bootstrap');
  const app = await NestFactory.create(AppModule, { logger });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const trpcRouter = app.get(UserTrpcRouter);
  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: trpcRouter.createRouter(),
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('User Service API')
    .setDescription('Microservicio de Gestión de Perfiles de Usuario y KYC')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('users/docs', app, document);
  SwaggerModule.setup('api-docs', app, document);

  const httpPort = process.env.PORT || 3002;
  await app.listen(httpPort);

  logger.log(`User Service iniciado exitosamente (REST + tRPC: http://localhost:${httpPort})`);
  logger.log(`Documentación Swagger disponible en http://localhost/users/docs o http://localhost:${httpPort}/users/docs`);
}

bootstrap();
