import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminBarbersService } from './admin-barbers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduleDayDto } from './dto/update-schedule.dto';

describe('AdminBarbersService', () => {
  let service: AdminBarbersService;
  let prisma: {
    barber: { findUnique: jest.Mock; create: jest.Mock };
    barberSchedule: { findMany: jest.Mock; upsert: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      barber: { findUnique: jest.fn(), create: jest.fn() },
      barberSchedule: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminBarbersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(AdminBarbersService);
  });

  it('create: traduce un P2002 (slug/whatsapp duplicado) a 409', async () => {
    prisma.barber.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create({
        name: 'Nuevo Barbero',
        slug: 'nuevo-barbero',
        photoUrl: 'barbers/nuevo.jpg',
        whatsappPhone: '56900000000',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('findOneOrThrow: 404 si el barbero no existe', async () => {
    prisma.barber.findUnique.mockResolvedValue(null);

    await expect(service.findOneOrThrow('no-existe')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('replaceSchedule: rechaza un horario que no cubre los 7 días', async () => {
    prisma.barber.findUnique.mockResolvedValue({ id: 'b1' });

    const days: ScheduleDayDto[] = [
      { weekday: 0, isWorkingDay: false, startMinute: 0, endMinute: 0 },
    ];

    await expect(
      service.replaceSchedule('b1', { days }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replaceSchedule: rechaza un día laboral con hora de término antes que la de inicio', async () => {
    prisma.barber.findUnique.mockResolvedValue({ id: 'b1' });

    const days: ScheduleDayDto[] = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isWorkingDay: true,
      startMinute: 600,
      endMinute: weekday === 3 ? 500 : 1200, // día 3 queda invertido a propósito
    }));

    await expect(
      service.replaceSchedule('b1', { days }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replaceSchedule: acepta los 7 días válidos y hace upsert de cada uno', async () => {
    prisma.barber.findUnique.mockResolvedValue({ id: 'b1' });

    const days: ScheduleDayDto[] = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isWorkingDay: weekday !== 0,
      startMinute: 600,
      endMinute: 1200,
    }));

    await service.replaceSchedule('b1', { days });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.barberSchedule.upsert).toHaveBeenCalledTimes(7);
  });
});
