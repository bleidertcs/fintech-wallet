import { startTelemetry, createWinstonLogger } from './infrastructure/telemetry';

// Inicializar telemetría ANTES de cargar cualquier otro módulo para auto-instrumentar HTTP/Prisma
startTelemetry();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: createWinstonLogger(),
  });

  const logger = new Logger('Bootstrap');

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Auth Service API')
    .setDescription('Servicio de Autenticación y 2FA de FinTech Wallet (NestJS)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Auth Service iniciado exitosamente en http://localhost:${port}`);
  logger.log(`Documentación Swagger disponible en http://localhost:${port}/api-docs`);
}
bootstrap();
