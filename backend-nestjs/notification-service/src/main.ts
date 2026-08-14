import { startTelemetry, createWinstonLogger } from './infrastructure/telemetry';
startTelemetry();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  // Configurar Swagger UI
  const config = new DocumentBuilder()
    .setTitle('Notification Service API')
    .setDescription('Microservicio de Notificaciones y Alertas por Correo (FinTech Wallet)')
    .setVersion('1.0')
    .addTag('Notifications')
    .addTag('Health')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Exponer Swagger en /notifications/docs y en /api-docs para compatibilidad
  SwaggerModule.setup('notifications/docs', app, document);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3004;
  await app.listen(port);
  logger.log(`[Notification Service] corriendo en el puerto ${port}`);
  logger.log(`[Swagger UI] disponible en http://localhost:${port}/notifications/docs`);
}
bootstrap();
