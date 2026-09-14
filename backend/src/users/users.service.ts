import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Nunca devolvemos password ni hashedRefreshToken al cliente,
// ni siquiera al propio dueño de la cuenta.
const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_USER_FIELDS,
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  /** Solo para admins: lista básica de todos los usuarios. */
  findAll() {
    return this.prisma.user.findMany({
      select: PUBLIC_USER_FIELDS,
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateAvatar(userId: number, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: PUBLIC_USER_FIELDS,
    });
  }
}
