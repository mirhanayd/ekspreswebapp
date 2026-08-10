import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { SeatsService } from './seats.service';
import { Public } from '../auth/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedPrincipal } from '../auth/authenticated-principal';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Seats')
@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Public()
  @Get('trip/:tripId')
  @ApiOperation({ summary: 'Get seat map for a trip' })
  getSeatMap(@Param('tripId') tripId: string) {
    return this.seatsService.getSeatMap(tripId);
  }

  @Post('trip/:tripId/generate')
  @Roles('admin')
  @ApiOperation({ summary: 'Generate seats for a trip (admin/seed)' })
  generateSeats(@Param('tripId') tripId: string) {
    return this.seatsService.generateSeatsForTrip(tripId);
  }

  @Post('hold')
  @ApiOperation({ summary: 'Create a seat hold' })
  createHold(
    @Body() body: { tripId: string; seatNo: string },
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    return this.seatsService.createHold(body.tripId, body.seatNo, user.userId);
  }

  @Delete('hold/:holdId')
  @ApiOperation({ summary: 'Release a seat hold' })
  releaseHold(@Param('holdId') holdId: string, @CurrentUser() user: AuthenticatedPrincipal) {
    return this.seatsService.releaseHold(holdId, user.userId);
  }
}
