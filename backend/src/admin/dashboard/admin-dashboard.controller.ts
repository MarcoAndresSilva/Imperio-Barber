import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminDashboardService } from './admin-dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }
}
