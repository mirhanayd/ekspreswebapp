import { Body, Controller, Delete, Get, Param, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '../auth/authenticated-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DriverAccountStatusSchema, DriverAssignmentSchema } from './driver.dto';
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

  @Patch('drivers/:driverId/status')
  @ApiOperation({ summary: 'Activate or deactivate a driver account' })
  setDriverStatus(
    @Param('driverId') driverId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    return this.driverService.setDriverStatus(
      driverId,
      DriverAccountStatusSchema.parse(body),
      user.userId,
    );
  }

  @Put('trips/:tripId/driver')
  @ApiOperation({ summary: 'Assign or replace the driver for a trip' })
  assignDriver(
    @Param('tripId') tripId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    return this.driverService.assignDriver(tripId, DriverAssignmentSchema.parse(body), user.userId);
  }

  @Delete('trips/:tripId/driver')
  @ApiOperation({ summary: 'Remove the current driver assignment from a trip' })
  unassignDriver(@Param('tripId') tripId: string, @CurrentUser() user: AuthenticatedPrincipal) {
    return this.driverService.unassignDriver(tripId, user.userId);
  }
}
