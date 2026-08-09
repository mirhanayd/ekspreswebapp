import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '@ekspres/database';
import { eq, desc, and } from 'drizzle-orm';

@Injectable()
export class TicketsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

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
      } else if (new Date(ticket.trip.departureTime) < now) {
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

    // In a real app, generate a fresh short-lived JWT or signed URL
    // Here we return the token hash/string which the UI will render as QR
    return { qrToken: ticket.qrTokenHash };
  }
}
