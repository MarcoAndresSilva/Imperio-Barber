import { IsDateString, IsInt, IsUUID, Min, MaxLength, MinLength, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  barberId: string;

  @IsUUID()
  serviceId: string;

  @IsDateString()
  date: string; // "YYYY-MM-DD"

  @IsInt()
  @Min(0)
  startMinute: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  customerName: string;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  customerPhone: string;
}
