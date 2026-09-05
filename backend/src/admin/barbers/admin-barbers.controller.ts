import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminBarbersService } from './admin-barbers.service';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateTimeOffDto } from './dto/create-time-off.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin/barbers')
export class AdminBarbersController {
  constructor(private readonly service: AdminBarbersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateBarberDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBarberDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  @Get(':id/schedule')
  findSchedule(@Param('id') id: string) {
    return this.service.findSchedule(id);
  }

  @Put(':id/schedule')
  replaceSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.service.replaceSchedule(id, dto);
  }

  @Get(':id/time-off')
  findTimeOff(@Param('id') id: string) {
    return this.service.findTimeOff(id);
  }

  @Post(':id/time-off')
  @HttpCode(201)
  addTimeOff(@Param('id') id: string, @Body() dto: CreateTimeOffDto) {
    return this.service.addTimeOff(id, dto);
  }

  @Delete(':id/time-off/:exceptionId')
  removeTimeOff(
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
  ) {
    return this.service.removeTimeOff(id, exceptionId);
  }
}
