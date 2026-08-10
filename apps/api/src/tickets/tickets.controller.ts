import { Controller, Get, Param } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedPrincipal } from '../auth/authenticated-principal';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List current user tickets' })
  getMyTickets(@CurrentUser() user: AuthenticatedPrincipal) {
    return this.ticketsService.getMyTickets(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket details' })
  getTicketDetail(@Param('id') id: string, @CurrentUser() user: AuthenticatedPrincipal) {
    return this.ticketsService.getTicketDetail(id, user.userId);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Get QR representation of ticket' })
  getTicketQr(@Param('id') id: string, @CurrentUser() user: AuthenticatedPrincipal) {
    return this.ticketsService.getTicketQr(id, user.userId);
  }
}
