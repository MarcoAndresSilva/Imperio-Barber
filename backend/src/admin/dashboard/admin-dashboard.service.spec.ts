import { Test } from '@nestjs/testing';
import { AdminDashboardService } from './admin-dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let prisma: {
    booking: { aggregate: jest.Mock; groupBy: jest.Mock };
    service: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      booking: { aggregate: jest.fn(), groupBy: jest.fn() },
      service: { findUnique: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(AdminDashboardService);
  });

  it('getStats: sin reservas confirmadas este mes, devuelve ingresos en 0 y topService null', async () => {
    prisma.booking.aggregate.mockResolvedValue({
      _sum: { priceClpSnapshot: null },
    });
    prisma.booking.groupBy.mockResolvedValue([]);

    const stats = await service.getStats();

    expect(stats).toEqual({ monthRevenueClp: 0, topService: null });
    expect(prisma.service.findUnique).not.toHaveBeenCalled();
  });

  it('getStats: suma los ingresos y arma el topService a partir del groupBy', async () => {
    prisma.booking.aggregate.mockResolvedValue({
      _sum: { priceClpSnapshot: 45000 },
    });
    prisma.booking.groupBy.mockResolvedValue([
      { serviceId: 'svc-1', _count: { serviceId: 3 } },
    ]);
    prisma.service.findUnique.mockResolvedValue({
      id: 'svc-1',
      name: 'Corte + Barba',
    });

    const stats = await service.getStats();

    expect(stats).toEqual({
      monthRevenueClp: 45000,
      topService: { id: 'svc-1', name: 'Corte + Barba', count: 3 },
    });
  });

  it('getStats: filtra por status CONFIRMED y por el mes calendario actual', async () => {
    prisma.booking.aggregate.mockResolvedValue({
      _sum: { priceClpSnapshot: 0 },
    });
    prisma.booking.groupBy.mockResolvedValue([]);

    await service.getStats();

    const [[{ where: aggregateWhere }]] = prisma.booking.aggregate.mock
      .calls as [
      [{ where: { status: string; date: { gte: Date; lt: Date } } }],
    ];
    expect(aggregateWhere.status).toBe('CONFIRMED');
    expect(aggregateWhere.date.gte).toBeInstanceOf(Date);
    expect(aggregateWhere.date.lt).toBeInstanceOf(Date);
  });
});
