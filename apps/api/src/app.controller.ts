import { Controller, Get } from '@nestjs/common';
import { ApplicationStatus, HealthCheckResponse } from '@ekspres/contracts';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  @Get('status')
  @Public()
  getStatus(): HealthCheckResponse {
    return {
      service: 'api',
      status: ApplicationStatus.OK,
      timestamp: new Date().toISOString(),
    };
  }
}
