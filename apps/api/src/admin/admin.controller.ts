import { Controller, Get, Param } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  async getDashboardMetrics() {
    return this.adminService.getDashboardMetrics();
  }

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('transport')
  getTransportOperations() {
    return this.adminService.getTransportOperations();
  }

  @Get('tickets')
  getTickets() {
    return this.adminService.getTickets();
  }

  @Get('tickets/:id')
  getTicket(@Param('id') id: string) {
    return this.adminService.getTicket(id);
  }

  @Get('fleet')
  getFleet() {
    return this.adminService.getFleet();
  }

  @Get('reports')
  getReports() {
    return this.adminService.getReports();
  }
}
