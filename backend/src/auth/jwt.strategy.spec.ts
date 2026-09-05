import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

describe('JwtStrategy.validate', () => {
  const config = {
    getOrThrow: () => 'test-secret',
  } as unknown as ConfigService;

  function buildStrategy(findUnique: jest.Mock) {
    const prisma = { user: { findUnique } } as unknown as PrismaService;
    return new JwtStrategy(config, prisma);
  }

  const payload = { sub: 'u1', email: 'a@b.cl', role: 'ADMIN' };

  it('devuelve el usuario cuando existe', async () => {
    const strategy = buildStrategy(
      jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@b.cl',
        name: 'Dueño',
        role: 'ADMIN',
      }),
    );

    await expect(strategy.validate(payload)).resolves.toEqual({
      id: 'u1',
      email: 'a@b.cl',
      name: 'Dueño',
      role: 'ADMIN',
    });
  });

  it('401 si el usuario del token ya no existe (token viejo tras borrar la cuenta)', async () => {
    const strategy = buildStrategy(jest.fn().mockResolvedValue(null));

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
