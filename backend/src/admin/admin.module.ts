import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { AdminBookingsController } from './bookings/admin-bookings.controller';
import { AdminBookingsService } from './bookings/admin-bookings.service';
import { AdminBarbersController } from './barbers/admin-barbers.controller';
import { AdminBarbersService } from './barbers/admin-barbers.service';
import { AdminServicesController } from './services/admin-services.controller';
import { AdminServicesService } from './services/admin-services.service';

@Module({
  imports: [BookingsModule],
  controllers: [
    AdminBookingsController,
    AdminBarbersController,
    AdminServicesController,
  ],
  providers: [AdminBookingsService, AdminBarbersService, AdminServicesService],
})
export class AdminModule {}
