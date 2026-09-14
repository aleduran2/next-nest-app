import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../common/enums/role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Ese email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    // El role SIEMPRE queda en USER acá. No existe forma de que alguien se
    // auto-asigne ADMIN desde este endpoint público: promover a admin es
    // una acción aparte (ver README), nunca parte del registro.
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashedPassword },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role as Role);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role as Role);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  /**
   * Valida un refresh token contra el hash guardado en la DB y, si es válido,
   * emite un par nuevo (access + refresh) rotando el refresh anterior.
   */
  async refreshTokens(refreshToken: string) {
    let payload: { sub: number; email: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o vencido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Sesión no encontrada');
    }

    const matches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!matches) {
      throw new UnauthorizedException('Refresh token inválido o vencido');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role as Role);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
    return { loggedOut: true };
  }

  private async issueTokens(
    userId: number,
    email: string,
    role: Role,
  ): Promise<TokenPair> {
    // El role viaja DENTRO del JWT: así RolesGuard no necesita ir a buscarlo
    // a la base en cada request, solo lee el token ya firmado.
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });

    return { accessToken, refreshToken };
  }
}
