import { Controller, Get, Param, Query } from '@nestjs/common';
import { TransportService } from './transport.service';
import { Public } from '../auth/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Transport')
@Controller('transport')
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  @Public()
  @Get('locations')
  @ApiOperation({ summary: 'Get all locations (cities, terminals)' })
  getLocations() {
    return this.transportService.getLocations();
  }

  @Public()
  @Get('routes')
  @ApiOperation({ summary: 'Get all configured routes' })
  getRoutes() {
    return this.transportService.getRoutes();
  }

  @Public()
  @Get('trips')
  @ApiOperation({ summary: 'Search available trips' })
  getTrips(
    @Query('date') date?: string,
    @Query('originId') originId?: string,
    @Query('destinationId') destinationId?: string,
  ) {
    return this.transportService.getTrips(date, originId, destinationId);
  }

  @Public()
  @Get('trips/:id')
  @ApiOperation({ summary: 'Get details for a specific trip' })
  getTripDetails(@Param('id') id: string) {
    return this.transportService.getTripDetails(id);
  }
}
