import { startTelemetry, createWinstonLogger } from './infrastructure/telemetry';
startTelemetry();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: createWinstonLogger(),
  });
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Worker Service API')
    .setDescription('Servicio de Procesamiento Asíncrono de Extractos PDF y Auditoría de FinTech Wallet')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('worker/docs', app, document);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3005;
  await app.listen(port);
  logger.log(`Worker Service (NestJS) ejecutándose en puerto ${port}`);
}
bootstrap();
