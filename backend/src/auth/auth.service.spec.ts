import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let findUnique: jest.Mock;
  let update: jest.Mock;
  let signAsync: jest.Mock;

  const password = 'clave-super-segura';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash(password);
  });

  beforeEach(async () => {
    findUnique = jest.fn();
    update = jest.fn();
    signAsync = jest.fn().mockResolvedValue('signed.jwt.token');

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: { user: { findUnique, update } } },
        { provide: JwtService, useValue: { signAsync } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('devuelve un accessToken con credenciales válidas (y normaliza el email)', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.cl',
      role: 'ADMIN',
      passwordHash,
    });

    await expect(service.login({ email: 'A@B.cl', password })).resolves.toEqual(
      { accessToken: 'signed.jwt.token' },
    );
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.cl' } });
    expect(signAsync).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'a@b.cl',
      role: 'ADMIN',
    });
  });

  it('401 si la contraseña es incorrecta', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.cl',
      role: 'ADMIN',
      passwordHash,
    });

    await expect(
      service.login({ email: 'a@b.cl', password: 'otra-clave' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('401 si el email no existe (sin revelar cuál falló)', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nadie@b.cl', password }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(signAsync).not.toHaveBeenCalled();
  });

  describe('changePassword', () => {
    it('401 si la contraseña actual no es correcta', async () => {
      findUnique.mockResolvedValue({ id: 'u1', passwordHash });

      await expect(
        service.changePassword('u1', {
          currentPassword: 'no-es-esta',
          newPassword: 'otra-clave-nueva',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(update).not.toHaveBeenCalled();
    });

    it('actualiza el hash cuando la contraseña actual es correcta', async () => {
      findUnique.mockResolvedValue({ id: 'u1', passwordHash });
      update.mockResolvedValue({});

      await expect(
        service.changePassword('u1', {
          currentPassword: password,
          newPassword: 'otra-clave-nueva',
        }),
      ).resolves.toEqual({ ok: true });

      expect(update).toHaveBeenCalledTimes(1);
      const [[{ where, data }]] = update.mock.calls;
      expect(where).toEqual({ id: 'u1' });
      expect(data.passwordHash).not.toBe(passwordHash);
    });
  });
});
