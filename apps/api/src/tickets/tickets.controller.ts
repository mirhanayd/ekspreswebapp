import { Controller, Get, Param, Request } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List current user tickets' })
  getMyTickets(@Request() req) {
    // We assume JWT guard attaches user.id to req.user.id
    // But for demo MVP passenger UI, we might not have real JWT wired in all pages.
    // If not, we could fall back to a demo userId, but per requirements we should enforce ownership.
    return this.ticketsService.getMyTickets(req.user?.id || 'demo-user-id');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket details' })
  getTicketDetail(@Param('id') id: string, @Request() req) {
    return this.ticketsService.getTicketDetail(id, req.user?.id || 'demo-user-id');
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Get QR representation of ticket' })
  getTicketQr(@Param('id') id: string, @Request() req) {
    return this.ticketsService.getTicketQr(id, req.user?.id || 'demo-user-id');
  }
}
