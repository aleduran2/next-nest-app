import {
  BadRequestException,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Devuelve el perfil del usuario autenticado' })
  @Get('me')
  findMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findMe(user.userId);
  }

  @ApiOperation({ summary: '[Solo admin] Lista todos los usuarios' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({ summary: 'Sube (o reemplaza) el avatar del usuario autenticado' })
  @ApiConsumes('multipart/form-data')
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        // Nunca usamos el nombre original del archivo: evita path traversal
        // (ej. alguien subiendo un archivo llamado "../../algo.js") y
        // colisiones entre usuarios que suben "foto.png" al mismo tiempo.
        filename: (_req, file, callback) => {
          const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
          callback(null, uniqueName);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Solo se aceptan imágenes PNG, JPEG o WEBP',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    // Guardamos solo la ruta pública, no el path absoluto del disco.
    const avatarUrl = `/uploads/${file.filename}`;
    return this.usersService.updateAvatar(user.userId, avatarUrl);
  }
}
