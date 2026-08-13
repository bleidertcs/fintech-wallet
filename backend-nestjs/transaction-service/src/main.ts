import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Transaction Service API')
    .setDescription('Microservicio de Gestión de Transacciones Financieras')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('transactions/docs', app, document);
  SwaggerModule.setup('api-docs', app, document);

  const httpPort = process.env.PORT || 3003;
  await app.listen(httpPort);

  logger.log(`Transaction Service iniciado exitosamente en puerto ${httpPort}`);
}

bootstrap();
