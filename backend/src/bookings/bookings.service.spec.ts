import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BookingsService — transiciones de estado (usadas por el panel, Fase 3)', () => {
  let service: BookingsService;
  let findUnique: jest.Mock;
  let updateMany: jest.Mock;

  beforeEach(async () => {
    findUnique = jest.fn();
    updateMany = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: { booking: { findUnique, updateMany } },
        },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    service = moduleRef.get(BookingsService);
  });

  function booking(
    overrides: Partial<{ status: string; expiresAt: Date }> = {},
  ) {
    return {
      id: 'b1',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60_000),
      ...overrides,
    };
  }

  it('confirmById: PENDING -> CONFIRMED', async () => {
    findUnique
      .mockResolvedValueOnce(booking())
      .mockResolvedValueOnce(booking({ status: 'CONFIRMED' }));
    updateMany.mockResolvedValue({ count: 1 });

    const result = await service.confirmById('b1');

    expect(result?.status).toBe('CONFIRMED');
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', status: 'PENDING' },
      data: { status: 'CONFIRMED' },
    });
  });

  it('confirmById: 409 si ya no está PENDING (dos requests casi simultáneos)', async () => {
    findUnique
      .mockResolvedValueOnce(booking({ status: 'CONFIRMED' }))
      .mockResolvedValueOnce(booking({ status: 'CONFIRMED' }));
    updateMany.mockResolvedValue({ count: 0 });

    await expect(service.confirmById('b1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('cancelById: CONFIRMED -> CANCELLED', async () => {
    findUnique
      .mockResolvedValueOnce(booking({ status: 'CONFIRMED' }))
      .mockResolvedValueOnce(booking({ status: 'CANCELLED' }));
    updateMany.mockResolvedValue({ count: 1 });

    const result = await service.cancelById('b1');

    expect(result?.status).toBe('CANCELLED');
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', status: 'CONFIRMED' },
      data: { status: 'CANCELLED' },
    });
  });

  it('cancelById: 409 si la reserva sigue PENDING (no se puede cancelar sin confirmar antes)', async () => {
    findUnique
      .mockResolvedValueOnce(booking({ status: 'PENDING' }))
      .mockResolvedValueOnce(booking({ status: 'PENDING' }));
    updateMany.mockResolvedValue({ count: 0 });

    await expect(service.cancelById('b1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('cancelById: 404 si la reserva no existe', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.cancelById('no-existe')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
