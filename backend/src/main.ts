import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // --- Swagger / OpenAPI ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tasks API')
    .setDescription(
      'API de ejemplo con auth JWT (access + refresh tokens) y CRUD de tareas por usuario.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Pegá acá el accessToken que devuelve /auth/login',
      },
      'access-token', // nombre de referencia, se usa en @ApiBearerAuth('access-token')
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
