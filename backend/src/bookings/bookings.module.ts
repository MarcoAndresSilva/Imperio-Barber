import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { AvailabilityService } from './availability.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, AvailabilityService],
  exports: [AvailabilityService],
})
export class BookingsModule {}
