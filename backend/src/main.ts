import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita CORS para que el frontend de Next.js (puerto 3000)
  // pueda consumir esta API (puerto 4000).
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Valida automáticamente los DTOs de entrada (title requerido, etc.)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`🚀 Backend NestJS corriendo en http://localhost:${port}`);
}

bootstrap();
