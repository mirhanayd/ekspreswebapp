import { Controller, Get } from '@nestjs/common';
import { ApplicationStatus, HealthCheckResponse } from '@ekspres/contracts';

@Controller()
export class AppController {
  @Get('status')
  getStatus(): HealthCheckResponse {
    return {
      service: 'api',
      status: ApplicationStatus.OK,
      timestamp: new Date().toISOString(),
    };
  }
}
