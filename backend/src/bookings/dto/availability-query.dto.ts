import { IsDateString, IsUUID } from 'class-validator';

export class AvailabilityQueryDto {
  @IsUUID()
  serviceId: string;

  @IsDateString()
  date: string; // "YYYY-MM-DD"
}
