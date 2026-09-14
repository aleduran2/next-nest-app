import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TasksModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    // Límite general: 100 requests por minuto por IP para toda la API.
    // Los endpoints sensibles (como /auth/login) sobreescriben esto con
    // un límite más estricto usando el decorator @Throttle().
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    AuthModule,
    UsersModule,
    TasksModule,
  ],
  providers: [
    // Guard global: se aplica a TODAS las rutas automáticamente,
    // no hace falta poner @UseGuards(ThrottlerGuard) en cada controller.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
