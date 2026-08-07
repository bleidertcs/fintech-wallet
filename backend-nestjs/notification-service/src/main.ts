import { initTracing } from './infrastructure/telemetry/tracing';

// Inicializar trazado de OpenTelemetry antes de cargar NestJS
initTracing();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { createWinstonLogger } from './infrastructure/logger/winston.logger';

async function bootstrap() {
  const winstonLogger = createWinstonLogger();
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({ instance: winstonLogger }),
  });

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
  winstonLogger.info(`[Notification Service] corriendo en el puerto ${port}`);
  winstonLogger.info(`[Swagger UI] disponible en http://localhost:${port}/notifications/docs`);
}
bootstrap();
