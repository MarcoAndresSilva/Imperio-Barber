import { Controller, Get, Param, Query } from '@nestjs/common';
import { BarbersService } from './barbers.service';
import { AvailabilityService } from '../bookings/availability.service';
import { AvailabilityQueryDto } from '../bookings/dto/availability-query.dto';

@Controller('barbers')
export class BarbersController {
  constructor(
    private readonly barbersService: BarbersService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Get()
  findAll() {
    return this.barbersService.findAllActive();
  }

  @Get(':id/schedule')
  findSchedule(@Param('id') id: string) {
    return this.barbersService.findSchedule(id);
  }

  @Get(':id/availability')
  getAvailability(@Param('id') id: string, @Query() query: AvailabilityQueryDto) {
    return this.availabilityService.getAvailableSlots(id, query.serviceId, query.date);
  }
}
