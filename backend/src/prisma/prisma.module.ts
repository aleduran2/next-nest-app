import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() para no tener que importar PrismaModule en cada módulo
// que necesite hablar con la base de datos.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
