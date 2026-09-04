import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Anti-spam: crear reservas bloquea horarios, así que se limita fuerte
  // (5 cada 10 min por IP) por encima del límite global.
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @Get('confirm/:token')
  getByToken(@Param('token') token: string) {
    return this.bookingsService.getByToken(token);
  }

  @Post('confirm/:token/accept')
  @HttpCode(200)
  accept(@Param('token') token: string) {
    return this.bookingsService.accept(token);
  }

  @Post('confirm/:token/reject')
  @HttpCode(200)
  reject(@Param('token') token: string) {
    return this.bookingsService.reject(token);
  }
}
