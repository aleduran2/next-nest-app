import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Habilita CORS para que el frontend de Next.js (puerto 3000)
  // pueda consumir esta API (puerto 4000).
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Valida automáticamente los DTOs de entrada (title requerido, etc.)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Formatea TODOS los errores de la API con la misma forma
  // { statusCode, error, message, path, timestamp }, incluyendo los 500
  // no anticipados (sin filtrar stack traces al cliente).
  app.useGlobalFilters(new AllExceptionsFilter());

  // Sirve los archivos subidos (avatares) como archivos estáticos:
  // http://localhost:4000/uploads/<nombre-de-archivo>
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  // --- Swagger / OpenAPI ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tasks API')
    .setDescription(
      'API de ejemplo con auth JWT (access + refresh tokens), roles, subida de archivos y CRUD de tareas por usuario.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Pegá acá el accessToken que devuelve /auth/login',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`🚀 Backend NestJS corriendo en http://localhost:${port}`);
  console.log(`📘 Swagger docs en http://localhost:${port}/api/docs`);
}

bootstrap();
