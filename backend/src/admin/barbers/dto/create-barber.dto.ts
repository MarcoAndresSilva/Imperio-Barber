import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBarberDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug debe ser minúsculas, números y guiones (ej: "juan-perez")',
  })
  slug: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  photoUrl: string;

  @IsString()
  @Matches(/^\d{8,15}$/, {
    message:
      'whatsappPhone debe tener solo dígitos, con código de país (ej: 56912345678)',
  })
  whatsappPhone: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  ratingAverage?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ratingCount?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
