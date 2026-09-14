import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// Mockeamos todo el módulo bcrypt: en unit tests no queremos que el hashing
// real (que es intencionalmente lento) haga los tests más lentos ni que
// dependa de nada externo.
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtMock = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('rechaza el registro si el email ya existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 1, email: 'a@a.com' });

      await expect(
        service.register({ email: 'a@a.com', password: '123456' }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashea la contraseña y devuelve accessToken + refreshToken', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');
      prismaMock.user.create.mockResolvedValue({ id: 1, email: 'a@a.com', role: 'USER' });
      jwtMock.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      prismaMock.user.update.mockResolvedValue({});

      const result = await service.register({
        email: 'a@a.com',
        password: '123456',
      });

      // La contraseña en texto plano nunca debe llegar a Prisma sin pasar por bcrypt
      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 1, email: 'a@a.com', role: 'USER' },
      });
    });
  });

  describe('login', () => {
    it('rechaza si el usuario no existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@x.com', password: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza si la contraseña no coincide', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@a.com',
        password: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'a@a.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devuelve tokens si las credenciales son correctas', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@a.com',
        password: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
      jwtMock.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      prismaMock.user.update.mockResolvedValue({});

      const result = await service.login({
        email: 'a@a.com',
        password: '123456',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });
  });

  describe('refreshTokens', () => {
    it('rechaza un refresh token que no verifica (firma inválida o vencido)', async () => {
      jwtMock.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refreshTokens('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza si el usuario no tiene un refresh token activo', async () => {
      jwtMock.verify.mockReturnValue({ sub: 1, email: 'a@a.com' });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        hashedRefreshToken: null,
      });

      await expect(service.refreshTokens('some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza si el hash no coincide (token ya rotado o robado)', async () => {
      jwtMock.verify.mockReturnValue({ sub: 1, email: 'a@a.com' });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        hashedRefreshToken: 'hash-guardado',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens('some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rota los tokens cuando el refresh token es válido', async () => {
      jwtMock.verify.mockReturnValue({ sub: 1, email: 'a@a.com' });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@a.com',
        hashedRefreshToken: 'hash-guardado',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('nuevo-hash');
      jwtMock.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      prismaMock.user.update.mockResolvedValue({});

      const result = await service.refreshTokens('old-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      // El nuevo hash debe quedar guardado, reemplazando al anterior
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { hashedRefreshToken: 'nuevo-hash' },
      });
    });
  });

  describe('logout', () => {
    it('borra el hashedRefreshToken del usuario', async () => {
      prismaMock.user.update.mockResolvedValue({});

      const result = await service.logout(1);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { hashedRefreshToken: null },
      });
      expect(result).toEqual({ loggedOut: true });
    });
  });
});
