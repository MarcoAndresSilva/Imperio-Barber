import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueConstraintError } from '../../common/prisma-errors.util';
import { dateFromDateStr } from '../../bookings/date.util';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateTimeOffDto } from './dto/create-time-off.dto';

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

@Injectable()
export class AdminBarbersService {
  constructor(private readonly prisma: PrismaService) {}

  /** A diferencia de `BarbersService.findAllActive` (público), acá se listan
   * también los inactivos: el panel necesita poder reactivarlos. */
  findAll() {
    return this.prisma.barber.findMany({ orderBy: { name: 'asc' } });
  }

  async findOneOrThrow(id: string) {
    const barber = await this.prisma.barber.findUnique({ where: { id } });
    if (!barber) {
      throw new NotFoundException('Barbero no encontrado.');
    }
    return barber;
  }

  create(dto: CreateBarberDto) {
    return this.withUniqueConflictHandling(() =>
      this.prisma.barber.create({ data: dto }),
    );
  }

  async update(id: string, dto: UpdateBarberDto) {
    await this.findOneOrThrow(id);
    return this.withUniqueConflictHandling(() =>
      this.prisma.barber.update({ where: { id }, data: dto }),
    );
  }

  /** No se borra de verdad: las reservas pasadas quedan con su `barberId` intacto.
   * "Eliminar" desde el panel es dejarlo inactivo (no sale en el sitio público). */
  async deactivate(id: string) {
    await this.findOneOrThrow(id);
    return this.prisma.barber.update({
      where: { id },
      data: { active: false },
    });
  }

  async findSchedule(id: string) {
    await this.findOneOrThrow(id);
    return this.prisma.barberSchedule.findMany({
      where: { barberId: id },
      orderBy: { weekday: 'asc' },
    });
  }

  async replaceSchedule(id: string, dto: UpdateScheduleDto) {
    await this.findOneOrThrow(id);
    this.assertCoversEveryWeekdayOnce(dto.days);

    for (const day of dto.days) {
      if (day.isWorkingDay && day.startMinute >= day.endMinute) {
        throw new BadRequestException(
          `Día ${day.weekday}: la hora de inicio debe ser antes que la de término.`,
        );
      }
    }

    await this.prisma.$transaction(
      dto.days.map((day) =>
        this.prisma.barberSchedule.upsert({
          where: { barberId_weekday: { barberId: id, weekday: day.weekday } },
          update: {
            isWorkingDay: day.isWorkingDay,
            startMinute: day.startMinute,
            endMinute: day.endMinute,
          },
          create: {
            barberId: id,
            weekday: day.weekday,
            isWorkingDay: day.isWorkingDay,
            startMinute: day.startMinute,
            endMinute: day.endMinute,
          },
        }),
      ),
    );

    return this.findSchedule(id);
  }

  private assertCoversEveryWeekdayOnce(days: UpdateScheduleDto['days']): void {
    const weekdays = days.map((d) => d.weekday);
    const uniqueWeekdays = new Set(weekdays);
    const coversAll = ALL_WEEKDAYS.every((w) => uniqueWeekdays.has(w));

    if (uniqueWeekdays.size !== 7 || weekdays.length !== 7 || !coversAll) {
      throw new BadRequestException(
        'El horario debe traer exactamente un día por cada weekday (0 a 6), sin repetidos.',
      );
    }
  }

  async findTimeOff(id: string) {
    await this.findOneOrThrow(id);
    return this.prisma.scheduleException.findMany({
      where: { barberId: id },
      orderBy: { date: 'asc' },
    });
  }

  async addTimeOff(id: string, dto: CreateTimeOffDto) {
    await this.findOneOrThrow(id);
    try {
      return await this.prisma.scheduleException.create({
        data: {
          barberId: id,
          date: dateFromDateStr(dto.date),
          reason: dto.reason,
        },
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(
          'Ya hay un día libre registrado para esa fecha.',
        );
      }
      throw err;
    }
  }

  async removeTimeOff(barberId: string, exceptionId: string): Promise<void> {
    const exception = await this.prisma.scheduleException.findUnique({
      where: { id: exceptionId },
    });

    if (!exception || exception.barberId !== barberId) {
      throw new NotFoundException('Día libre no encontrado.');
    }

    await this.prisma.scheduleException.delete({ where: { id: exceptionId } });
  }

  private async withUniqueConflictHandling<T>(
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(
          'Ya existe un barbero con ese slug o WhatsApp.',
        );
      }
      throw err;
    }
  }
}
