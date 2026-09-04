import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Barber, BookingStatus, Service } from '../../generated/prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { activeBookingsWhere } from './active-bookings.query';
import {
  dateFromDateStr,
  formatDateEsCl,
  formatMinutesToHHMM,
  weekdayFromDateStr,
} from './date.util';

const ACTIVE_TRANSACTION_ISOLATION = 'Serializable' as const;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get pendingTtlMinutes(): number {
    const raw = this.config.get<string>('BOOKING_PENDING_TTL_MINUTES');
    return raw ? Number(raw) : 25;
  }

  async create(dto: CreateBookingDto) {
    const [barber, service] = await Promise.all([
      this.prisma.barber.findUnique({ where: { id: dto.barberId } }),
      this.prisma.service.findUnique({ where: { id: dto.serviceId } }),
    ]);

    if (!barber || !barber.active) {
      throw new NotFoundException('Barbero no encontrado.');
    }
    if (!service || !service.active) {
      throw new NotFoundException('Servicio no encontrado.');
    }

    const weekday = weekdayFromDateStr(dto.date);
    const schedule = await this.prisma.barberSchedule.findUnique({
      where: { barberId_weekday: { barberId: barber.id, weekday } },
    });

    if (!schedule || !schedule.isWorkingDay) {
      throw new BadRequestException('El barbero no atiende ese día.');
    }

    const endMinute = dto.startMinute + service.durationMinutes;

    if (dto.startMinute < schedule.startMinute || endMinute > schedule.endMinute) {
      throw new BadRequestException(
        'El horario elegido está fuera del rango de atención de ese día.',
      );
    }

    const now = new Date();
    const dateValue = dateFromDateStr(dto.date);
    const expiresAt = new Date(now.getTime() + this.pendingTtlMinutes * 60_000);
    const confirmationToken = randomUUID();

    const booking = await this.runWithConflictHandling(() =>
      this.prisma.$transaction(
        async (tx) => {
          const overlapping = await tx.booking.findFirst({
            where: {
              ...activeBookingsWhere(barber.id, dateValue, now),
              startMinute: { lt: endMinute },
              endMinute: { gt: dto.startMinute },
            },
          });

          if (overlapping) {
            throw new ConflictException('Ese horario ya no está disponible, elige otro.');
          }

          return tx.booking.create({
            data: {
              barberId: barber.id,
              serviceId: service.id,
              customerName: dto.customerName,
              customerPhone: dto.customerPhone,
              date: dateValue,
              startMinute: dto.startMinute,
              endMinute,
              priceClpSnapshot: service.priceClp,
              confirmationToken,
              expiresAt,
            },
          });
        },
        { isolationLevel: ACTIVE_TRANSACTION_ISOLATION },
      ),
    );

    return {
      bookingId: booking.id,
      confirmationToken: booking.confirmationToken,
      expiresAt: booking.expiresAt,
      whatsappUrl: this.buildWhatsappUrl({
        barber,
        service,
        dateStr: dto.date,
        startMinute: dto.startMinute,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        confirmationToken,
      }),
    };
  }

  async getByToken(token: string) {
    const booking = await this.findByTokenOrThrow(token);
    return this.applyLazyExpiration(booking);
  }

  async accept(token: string) {
    return this.transition(token, 'CONFIRMED');
  }

  async reject(token: string) {
    return this.transition(token, 'REJECTED');
  }

  /** Cambia el estado de una reserva PENDING de forma atómica: si dos requests entran
   * casi a la vez, solo uno matchea `status: 'PENDING'` en el updateMany y el otro
   * recibe count 0 -> 409 (antes ambos podían pasar el check-then-update). */
  private async transition(token: string, to: 'CONFIRMED' | 'REJECTED') {
    // 404 si no existe; expira en el acto si ya venció, para dar el mensaje correcto.
    await this.applyLazyExpiration(await this.findByTokenOrThrow(token));

    const { count } = await this.prisma.booking.updateMany({
      where: { confirmationToken: token, status: 'PENDING' },
      data: { status: to },
    });

    if (count === 0) {
      const current = await this.findByTokenOrThrow(token);
      throw new ConflictException(
        `Esta reserva ya está en estado ${current.status}.`,
      );
    }

    return this.prisma.booking.findUnique({
      where: { confirmationToken: token },
    });
  }

  /** Barrido de respaldo: el chequeo lazy libera el horario al instante para quien consulte,
   * pero esto asegura que el estado en la BD también quede correcto aunque nadie vuelva a mirar. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStalePendingBookings() {
    await this.prisma.booking.updateMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
  }

  private async findByTokenOrThrow(token: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { confirmationToken: token },
      include: { barber: true, service: true },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }

    return booking;
  }

  private async applyLazyExpiration<T extends { id: string; status: BookingStatus; expiresAt: Date }>(
    booking: T,
  ): Promise<T> {
    if (booking.status === 'PENDING' && booking.expiresAt.getTime() < Date.now()) {
      return { ...booking, ...(await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'EXPIRED' },
      })) };
    }
    return booking;
  }

  private async runWithConflictHandling<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      // P2034: conflicto de escritura/deadlock bajo aislamiento Serializable — misma
      // situación que el chequeo explícito de arriba, solo que detectada por Postgres.
      if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2034') {
        throw new ConflictException('Ese horario ya no está disponible, elige otro.');
      }
      throw err;
    }
  }

  private buildWhatsappUrl(params: {
    barber: Pick<Barber, 'whatsappPhone' | 'name'>;
    service: Pick<Service, 'name' | 'priceClp'>;
    dateStr: string;
    startMinute: number;
    customerName: string;
    customerPhone: string;
    confirmationToken: string;
  }): string {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
    const confirmUrl = `${frontendUrl}/confirmar/${params.confirmationToken}`;
    const fecha = formatDateEsCl(params.dateStr);
    const hora = formatMinutesToHHMM(params.startMinute);
    const precio = params.service.priceClp.toLocaleString('es-CL');

    const text =
      `Hola ${params.barber.name}, tienes una nueva solicitud de hora en Imperio Barber.\n\n` +
      `Cliente: ${params.customerName}\n` +
      `Teléfono: ${params.customerPhone}\n` +
      `Servicio: ${params.service.name} ($${precio})\n` +
      `Fecha: ${fecha}\n` +
      `Hora: ${hora}\n\n` +
      `Confirma o rechaza esta hora acá: ${confirmUrl}`;

    const phone = params.barber.whatsappPhone.replace(/\D/g, '');
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }
}
