import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { nowInChile } from '../../common/chile-time';

export interface DashboardTopService {
  id: string;
  name: string;
  count: number;
}

export interface DashboardStats {
  monthRevenueClp: number;
  topService: DashboardTopService | null;
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Métricas del mes calendario actual (hora de Chile), solo sobre reservas CONFIRMED
   * — no hay forma hoy de distinguir "CONFIRMED que sí llegó" de un no-show real
   * (no existe ese estado en el modelo), así que por ahora estas dos métricas son las
   * que se pueden calcular sin inventar un dato que no tenemos. */
  async getStats(): Promise<DashboardStats> {
    const [year, month] = nowInChile().dateStr.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));
    const monthWhere = {
      status: 'CONFIRMED' as const,
      date: { gte: monthStart, lt: monthEnd },
    };

    const [revenueAgg, topServiceGroup] = await Promise.all([
      this.prisma.booking.aggregate({
        _sum: { priceClpSnapshot: true },
        where: monthWhere,
      }),
      this.prisma.booking.groupBy({
        by: ['serviceId'],
        _count: { serviceId: true },
        where: monthWhere,
        orderBy: { _count: { serviceId: 'desc' } },
        take: 1,
      }),
    ]);

    let topService: DashboardTopService | null = null;
    if (topServiceGroup.length > 0) {
      const service = await this.prisma.service.findUnique({
        where: { id: topServiceGroup[0].serviceId },
        select: { id: true, name: true },
      });
      if (service) {
        topService = {
          id: service.id,
          name: service.name,
          count: topServiceGroup[0]._count.serviceId,
        };
      }
    }

    return {
      monthRevenueClp: revenueAgg._sum.priceClpSnapshot ?? 0,
      topService,
    };
  }
}
