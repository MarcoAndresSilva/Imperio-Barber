import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

const BOOKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
] as const;

export class AdminBookingsQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string; // "YYYY-MM-DD"

  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: (typeof BOOKING_STATUSES)[number];

  @IsOptional()
  @IsUUID()
  barberId?: string;
}
