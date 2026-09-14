import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Uso: @Roles(Role.ADMIN) arriba de un endpoint (después de @UseGuards con
 * JwtAuthGuard y RolesGuard). Guarda la lista de roles permitidos como
 * metadata, que después lee RolesGuard con Reflector.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
