import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { nowInChile } from '../common/chile-time';
import { PrismaService } from '../prisma/prisma.service';
import {
  Barber,
  BookingStatus,
  Prisma,
  Service,
} from '../../generated/prisma/client';
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

  /** `opts.byStaff`: reserva manual cargada desde el panel (walk-in / teléfono) —
   * el panel de administración (Fase 3) la usa para que quede CONFIRMED directo,
   * sin generar link de WhatsApp (el dueño ya sabe que la creó). */
  async create(dto: CreateBookingDto, opts: { byStaff?: boolean } = {}) {
    // Defensa en profundidad: la UI ya no ofrece fechas pasadas ni horarios ya
    // pasados hoy (no aparecen en /availability), pero eso no evita que alguien
    // le pegue directo a la API con esos valores.
    const { dateStr: todayChile, minuteOfDay: nowMinuteChile } = nowInChile();
    if (dto.date < todayChile) {
      throw new BadRequestException(
        'No se puede reservar en una fecha pasada.',
      );
    }
    if (dto.date === todayChile && dto.startMinute < nowMinuteChile) {
      throw new BadRequestException('Ese horario ya pasó.');
    }

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
    const dateValue = dateFromDateStr(dto.date);
    const [schedule, exception] = await Promise.all([
      this.prisma.barberSchedule.findUnique({
        where: { barberId_weekday: { barberId: barber.id, weekday } },
      }),
      this.prisma.scheduleException.findUnique({
        where: { barberId_date: { barberId: barber.id, date: dateValue } },
      }),
    ]);

    if (!schedule || !schedule.isWorkingDay) {
      throw new BadRequestException('El barbero no atiende ese día.');
    }
    // Día libre cargado desde el panel (Fase 3) — el mismo criterio que ya
    // aplica AvailabilityService al leer disponibilidad, ahora también al crear.
    if (exception) {
      throw new BadRequestException(
        'El barbero tiene ese día bloqueado (día libre).',
      );
    }

    const endMinute = dto.startMinute + service.durationMinutes;

    if (
      dto.startMinute < schedule.startMinute ||
      endMinute > schedule.endMinute
    ) {
      throw new BadRequestException(
        'El horario elegido está fuera del rango de atención de ese día.',
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.pendingTtlMinutes * 60_000);
    const confirmationToken = randomUUID();
    const initialStatus: BookingStatus = opts.byStaff ? 'CONFIRMED' : 'PENDING';

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
            throw new ConflictException(
              'Ese horario ya no está disponible, elige otro.',
            );
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
              status: initialStatus,
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
      status: booking.status,
      expiresAt: booking.expiresAt,
      // Una reserva manual del panel no necesita avisarle al barbero por WhatsApp
      // (él mismo la está cargando).
      whatsappUrl: opts.byStaff
        ? null
        : this.buildWhatsappUrl({
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
    const booking = await this.findOrThrow({ confirmationToken: token });
    return this.applyLazyExpiration(booking);
  }

  async accept(token: string) {
    return this.transition(
      { confirmationToken: token },
      'PENDING',
      'CONFIRMED',
    );
  }

  async reject(token: string) {
    return this.transition({ confirmationToken: token }, 'PENDING', 'REJECTED');
  }

  // --- Usadas por el panel de administración (Fase 3): mismo mecanismo atómico
  // que accept/reject, pero por id de reserva en vez de token público. ---

  async confirmById(id: string) {
    return this.transition({ id }, 'PENDING', 'CONFIRMED');
  }

  async rejectById(id: string) {
    return this.transition({ id }, 'PENDING', 'REJECTED');
  }

  async cancelById(id: string) {
    return this.transition({ id }, 'CONFIRMED', 'CANCELLED');
  }

  /** Cambia el estado de una reserva de `from` a `to` de forma atómica: el
   * `updateMany` lleva `status: from` en el `where`, así que si dos requests entran
   * casi a la vez solo uno matchea y el otro recibe `count: 0` -> 409 (antes el
   * check-then-update dejaba pasar a los dos). */
  private async transition(
    where: Prisma.BookingWhereUniqueInput,
    from: BookingStatus,
    to: BookingStatus,
  ) {
    // 404 si no existe; expira en el acto si ya venció, para dar el mensaje correcto.
    await this.applyLazyExpiration(await this.findOrThrow(where));

    const { count } = await this.prisma.booking.updateMany({
      where: { ...where, status: from },
      data: { status: to },
    });

    if (count === 0) {
      const current = await this.findOrThrow(where);
      throw new ConflictException(
        `Esta reserva ya está en estado ${current.status}.`,
      );
    }

    return this.findOrThrow(where);
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

  private async findOrThrow(where: Prisma.BookingWhereUniqueInput) {
    const booking = await this.prisma.booking.findUnique({
      where,
      include: { barber: true, service: true },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }

    return booking;
  }

  private async applyLazyExpiration<
    T extends { id: string; status: BookingStatus; expiresAt: Date },
  >(booking: T): Promise<T> {
    if (
      booking.status === 'PENDING' &&
      booking.expiresAt.getTime() < Date.now()
    ) {
      return {
        ...booking,
        ...(await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'EXPIRED' },
        })),
      };
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
      if (
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: string }).code === 'P2034'
      ) {
        throw new ConflictException(
          'Ese horario ya no está disponible, elige otro.',
        );
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
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
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
