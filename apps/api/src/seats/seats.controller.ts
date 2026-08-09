import { Controller, Get, Post, Delete, Param, Body, Req } from '@nestjs/common';
import { SeatsService } from './seats.service';
import { Public } from '../auth/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

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

  @Public()
  @Post('trip/:tripId/generate')
  @ApiOperation({ summary: 'Generate seats for a trip (admin/seed)' })
  generateSeats(@Param('tripId') tripId: string) {
    return this.seatsService.generateSeatsForTrip(tripId);
  }

  @Public() // For demo purposes; in production this would require auth
  @Post('hold')
  @ApiOperation({ summary: 'Create a seat hold' })
  createHold(@Body() body: { tripId: string; seatNo: string; userId: string }) {
    return this.seatsService.createHold(body.tripId, body.seatNo, body.userId);
  }

  @Public() // For demo purposes
  @Delete('hold/:holdId')
  @ApiOperation({ summary: 'Release a seat hold' })
  releaseHold(@Param('holdId') holdId: string, @Body() body: { userId: string }) {
    return this.seatsService.releaseHold(holdId, body.userId);
  }
}
