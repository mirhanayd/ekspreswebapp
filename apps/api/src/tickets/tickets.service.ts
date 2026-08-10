import {
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '@ekspres/database';
import { eq, desc, and } from 'drizzle-orm';

@Injectable()
export class TicketsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private jwtService: JwtService,
  ) {}

  async getMyTickets(userId: string) {
    const userTickets = await this.db.query.tickets.findMany({
      where: eq(schema.tickets.userId, userId),
      with: {
        trip: {
          with: {
            route: {
              with: {
                origin: true,
                destination: true,
              },
            },
            bus: true,
          },
        },
        tripSeat: true,
        order: true,
      },
      orderBy: [desc(schema.tickets.issuedAt)],
    });

    const now = new Date();
    const active: typeof userTickets = [];
    const past: typeof userTickets = [];
    const cancelled: typeof userTickets = [];

    for (const ticket of userTickets) {
      if (ticket.status === 'cancelled') {
        cancelled.push(ticket);
      } else if (
        new Date(ticket.trip.departureTime) < now &&
        !['boarding', 'in_transit'].includes(ticket.trip.status)
      ) {
        past.push(ticket);
      } else {
        active.push(ticket);
      }
    }

    return { active, past, cancelled };
  }

  async getTicketDetail(ticketId: string, userId: string) {
    const ticket = await this.db.query.tickets.findFirst({
      where: eq(schema.tickets.id, ticketId),
      with: {
        trip: {
          with: {
            route: {
              with: {
                origin: true,
                destination: true,
              },
            },
            bus: true,
          },
        },
        tripSeat: true,
        order: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Enforce ownership
    if (ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  async getTicketQr(ticketId: string, userId: string) {
    const ticket = await this.db.query.tickets.findFirst({
      where: eq(schema.tickets.id, ticketId),
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }
    if (ticket.status !== 'active') throw new ConflictException('Ticket is not active');

    const expiresInSeconds = 5 * 60;
    return {
      payload: this.jwtService.sign(
        {
          purpose: 'ticket-qr',
          sub: ticket.id,
          ticketNo: ticket.ticketNo,
          tripId: ticket.tripId,
        },
        { expiresIn: expiresInSeconds },
      ),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }
}
