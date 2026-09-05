import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScheduleDayDto {
  /** 0 = domingo .. 6 = sábado, igual que `BarberSchedule.weekday`. */
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @IsBoolean()
  isWorkingDay: boolean;

  @IsInt()
  @Min(0)
  @Max(1440)
  startMinute: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute: number;
}

/** El horario semanal completo se reemplaza de una: siempre los 7 días, uno por
 * cada `weekday` (0-6), validado en `AdminBarbersService.replaceSchedule`. */
export class UpdateScheduleDto {
  @ValidateNested({ each: true })
  @Type(() => ScheduleDayDto)
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  days: ScheduleDayDto[];
}
