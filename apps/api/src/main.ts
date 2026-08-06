import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Safe default configurable port
  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`API is running on: http://localhost:${port}`);
}
bootstrap();
