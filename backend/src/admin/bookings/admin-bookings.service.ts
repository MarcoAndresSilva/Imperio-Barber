import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from '../../bookings/bookings.service';
import { CreateBookingDto } from '../../bookings/dto/create-booking.dto';
import { dateFromDateStr } from '../../bookings/date.util';
import { AdminBookingsQueryDto } from './dto/admin-bookings-query.dto';

@Injectable()
export class AdminBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
  ) {}

  findAll(query: AdminBookingsQueryDto) {
    return this.prisma.booking.findMany({
      where: {
        ...(query.date ? { date: dateFromDateStr(query.date) } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.barberId ? { barberId: query.barberId } : {}),
      },
      include: {
        barber: { select: { id: true, name: true, slug: true } },
        service: {
          select: {
            id: true,
            name: true,
            priceClp: true,
            durationMinutes: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startMinute: 'asc' }],
    });
  }

  /** Reserva manual (walk-in / teléfono): reutiliza el mismo `BookingsService.create`
   * del flujo público (misma validación de horario y anti-doble-reserva), marcada
   * `byStaff` para que quede CONFIRMED directo y sin link de WhatsApp. */
  createManual(dto: CreateBookingDto) {
    return this.bookings.create(dto, { byStaff: true });
  }

  confirm(id: string) {
    return this.bookings.confirmById(id);
  }

  reject(id: string) {
    return this.bookings.rejectById(id);
  }

  cancel(id: string) {
    return this.bookings.cancelById(id);
  }
}
