import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedPrincipal } from '../auth/authenticated-principal';
import {
  DriverLocationSchema,
  DriverTripStatusSchema,
  PassengerBoardingStatusSchema,
} from './driver.dto';
import { DriverService } from './driver.service';

@ApiTags('Driver')
@ApiBearerAuth()
@Roles('driver')
@Controller('driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('trips')
  @ApiOperation({ summary: 'List trips assigned to the authenticated driver' })
  listTrips(@CurrentUser() user: AuthenticatedPrincipal) {
    return this.driverService.listTrips(user.userId);
  }

  @Get('trips/:tripId')
  @ApiOperation({ summary: 'Get assigned trip, stops and passenger manifest' })
  getTrip(@Param('tripId') tripId: string, @CurrentUser() user: AuthenticatedPrincipal) {
    return this.driverService.getTrip(user.userId, tripId);
  }

  @Patch('trips/:tripId/status')
  @ApiOperation({ summary: 'Update assigned trip operational status' })
  updateTripStatus(
    @Param('tripId') tripId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    return this.driverService.updateTripStatus(
      user.userId,
      tripId,
      DriverTripStatusSchema.parse(body),
    );
  }

  @Patch('trips/:tripId/passengers/:ticketId')
  @ApiOperation({ summary: 'Mark a passenger as pending, boarded or no-show' })
  updatePassengerStatus(
    @Param('tripId') tripId: string,
    @Param('ticketId') ticketId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    return this.driverService.updatePassengerStatus(
      user.userId,
      tripId,
      ticketId,
      PassengerBoardingStatusSchema.parse(body),
    );
  }

  @Post('trips/:tripId/location')
  @ApiOperation({ summary: 'Publish mobile GPS for an assigned trip' })
  publishLocation(
    @Param('tripId') tripId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    return this.driverService.publishLocation(
      user.userId,
      tripId,
      DriverLocationSchema.parse(body),
    );
  }
}
