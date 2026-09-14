import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { DriverAssignmentSchema } from './driver.dto';
import { DriverService } from './driver.service';

@ApiTags('Admin Driver Operations')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/driver-operations')
export class DriverAdminController {
  constructor(private readonly driverService: DriverService) {}

  @Get('drivers')
  @ApiOperation({ summary: 'List available driver accounts' })
  listDrivers() {
    return this.driverService.listDrivers();
  }

  @Put('trips/:tripId/driver')
  @ApiOperation({ summary: 'Assign or replace the driver for a trip' })
  assignDriver(@Param('tripId') tripId: string, @Body() body: unknown) {
    return this.driverService.assignDriver(tripId, DriverAssignmentSchema.parse(body));
  }

  @Delete('trips/:tripId/driver')
  @ApiOperation({ summary: 'Remove the current driver assignment from a trip' })
  unassignDriver(@Param('tripId') tripId: string) {
    return this.driverService.unassignDriver(tripId);
  }
}
