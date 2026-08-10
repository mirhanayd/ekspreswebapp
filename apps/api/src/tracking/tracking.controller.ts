import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '../auth/authenticated-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TrackingAccessService } from './tracking-access.service';

@ApiTags('Tracking')
@ApiBearerAuth()
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingAccessService: TrackingAccessService) {}

  @Get('tickets/:ticketId/bootstrap')
  @ApiOperation({ summary: 'Get an entitled live tracking snapshot and scoped socket token' })
  getBootstrap(@Param('ticketId') ticketId: string, @CurrentUser() user: AuthenticatedPrincipal) {
    return this.trackingAccessService.getBootstrap(ticketId, user.userId);
  }
}
