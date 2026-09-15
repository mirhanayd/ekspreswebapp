import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('api/v1');

  // Use Pino for logging
  app.useLogger(app.get(Logger));
  const logger = app.get(Logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const allowedOrigins = (
    configService.get<string>('WEB_ORIGINS') ||
    configService.get<string>('WEB_ORIGIN') ||
    'http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // OpenAPI Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('Siirt Kurtalan Ekspres API')
    .setDescription('The core backend API for the bus platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, '0.0.0.0');
  logger.log(`API is running on port ${port}`);
  logger.log(`Swagger docs are available at /api/docs`);
}
bootstrap();
