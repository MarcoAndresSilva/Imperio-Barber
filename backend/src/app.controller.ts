import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Sin rate limit: Render lo consulta periódicamente como health check.
  @SkipThrottle()
  @Get('health')
  getHealth(): Promise<{ status: 'ok'; db: 'up' }> {
    return this.appService.getHealth();
  }
}
