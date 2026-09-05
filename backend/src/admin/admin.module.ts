import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { AdminBookingsController } from './bookings/admin-bookings.controller';
import { AdminBookingsService } from './bookings/admin-bookings.service';
import { AdminBarbersController } from './barbers/admin-barbers.controller';
import { AdminBarbersService } from './barbers/admin-barbers.service';
import { AdminServicesController } from './services/admin-services.controller';
import { AdminServicesService } from './services/admin-services.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';

@Module({
  imports: [BookingsModule],
  controllers: [
    AdminBookingsController,
    AdminBarbersController,
    AdminServicesController,
    AdminUsersController,
  ],
  providers: [
    AdminBookingsService,
    AdminBarbersService,
    AdminServicesService,
    AdminUsersService,
  ],
})
export class AdminModule {}
