import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTimeOffDto {
  @IsDateString()
  date: string; // "YYYY-MM-DD"

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
