import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  
  // Use Pino for logging
  app.useLogger(app.get(Logger));
  const logger = app.get(Logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3002);

  // OpenAPI Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('Siirt Kurtalan Ekspres API')
    .setDescription('The core backend API for the bus platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`API is running on: http://localhost:${port}`);
  logger.log(`Swagger docs are available at: http://localhost:${port}/api/docs`);
}
bootstrap();
