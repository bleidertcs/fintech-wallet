import { initTracing } from './infrastructure/telemetry/tracing';
initTracing();

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { WinstonLogger } from './infrastructure/logger/winston.logger';
import { join } from 'path';

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

  const grpcPort = process.env.GRPC_PORT || '50051';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(__dirname, 'adapters/inbound/grpc/proto/user.proto'),
      url: `0.0.0.0:${grpcPort}`,
    },
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('User Service API')
    .setDescription('Microservicio de Gestión de Perfiles de Usuario y KYC')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('users/docs', app, document);
  SwaggerModule.setup('api-docs', app, document);

  await app.startAllMicroservices();
  const httpPort = process.env.PORT || 3002;
  await app.listen(httpPort);

  logger.log(`User Service iniciado exitosamente (REST: http://localhost:${httpPort}, gRPC: 0.0.0.0:${grpcPort})`);
  logger.log(`Documentación Swagger disponible en http://localhost/users/docs o http://localhost:${httpPort}/users/docs`);
}

bootstrap();
