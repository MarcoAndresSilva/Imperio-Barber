import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let prisma: {
    user: {
      create: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(AdminUsersService);
  });

  it('create: traduce un P2002 (email duplicado) a 409', async () => {
    prisma.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create({
        email: 'a@b.cl',
        name: 'Alguien',
        password: 'clave-larga',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('create: normaliza el email a minúsculas', async () => {
    prisma.user.create.mockImplementation(
      (args: { data: { email: string; role: string } }) =>
        Promise.resolve({ id: 'u2', ...args.data }),
    );

    const created = await service.create({
      email: 'ALGUIEN@B.CL',
      name: 'Alguien',
      password: 'clave-larga',
    });

    expect(created).toEqual(
      expect.objectContaining({ email: 'alguien@b.cl', role: 'ADMIN' }),
    );
  });

  it('remove: no se puede eliminar la propia cuenta', async () => {
    await expect(service.remove('u1', 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('remove: no se puede eliminar si es el único usuario', async () => {
    prisma.user.count.mockResolvedValue(1);

    await expect(service.remove('u1', 'u2')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('remove: 404 si el usuario a eliminar no existe', async () => {
    prisma.user.count.mockResolvedValue(2);
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.remove('u1', 'u2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove: elimina cuando hay más de un usuario y no es el propio', async () => {
    prisma.user.count.mockResolvedValue(2);
    prisma.user.findUnique.mockResolvedValue({ id: 'u2' });

    await service.remove('u1', 'u2');

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u2' } });
  });
});
