import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeAvailableSlots } from './availability';
import { activeBookingsWhere } from './active-bookings.query';
import { nowInChile } from '../common/chile-time';
import { dateFromDateStr, weekdayFromDateStr } from './date.util';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableSlots(
    barberId: string,
    serviceId: string,
    dateStr: string,
  ) {
    const [barber, service] = await Promise.all([
      this.prisma.barber.findUnique({ where: { id: barberId } }),
      this.prisma.service.findUnique({ where: { id: serviceId } }),
    ]);

    if (!barber || !barber.active) {
      throw new NotFoundException('Barbero no encontrado.');
    }
    if (!service || !service.active) {
      throw new NotFoundException('Servicio no encontrado.');
    }

    const { dateStr: todayChile, minuteOfDay: nowMinuteChile } = nowInChile();
    if (dateStr < todayChile) {
      return [];
    }

    const weekday = weekdayFromDateStr(dateStr);
    const dateValue = dateFromDateStr(dateStr);
    const [schedule, exception] = await Promise.all([
      this.prisma.barberSchedule.findUnique({
        where: { barberId_weekday: { barberId, weekday } },
      }),
      this.prisma.scheduleException.findUnique({
        where: { barberId_date: { barberId, date: dateValue } },
      }),
    ]);

    if (!schedule) {
      return [];
    }

    // Día libre/vacaciones/feriado cargado desde el panel (Fase 3): bloquea el día
    // completo, igual que si `schedule.isWorkingDay` fuera false ese día puntual.
    if (exception) {
      return [];
    }

    const now = new Date();
    const busyBookings = await this.prisma.booking.findMany({
      where: activeBookingsWhere(barberId, dateValue, now),
      select: { startMinute: true, endMinute: true },
    });

    return computeAvailableSlots({
      schedule: {
        isWorkingDay: schedule.isWorkingDay,
        startMinute: schedule.startMinute,
        endMinute: schedule.endMinute,
      },
      busy: busyBookings,
      serviceDurationMinutes: service.durationMinutes,
      isToday: dateStr === todayChile,
      nowMinute: nowMinuteChile,
    });
  }
}
