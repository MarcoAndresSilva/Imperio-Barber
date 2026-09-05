import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let findUnique: jest.Mock;
  let signAsync: jest.Mock;

  const password = 'clave-super-segura';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash(password);
  });

  beforeEach(async () => {
    findUnique = jest.fn();
    signAsync = jest.fn().mockResolvedValue('signed.jwt.token');

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: { user: { findUnique } } },
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
});
