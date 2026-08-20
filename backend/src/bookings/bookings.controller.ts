import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

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
