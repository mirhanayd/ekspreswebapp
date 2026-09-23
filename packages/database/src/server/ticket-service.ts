import { and, desc, eq } from 'drizzle-orm';
import * as schema from '../schema/index.js';
import { signJwtPayload } from './auth.js';
import { serverDatabase } from './database.js';
import { ServerError } from './errors.js';

const QR_TTL_SECONDS = 300;
type Database = ReturnType<typeof serverDatabase>;

function uuid(value: string, field: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ServerError(400, `${field} geçerli bir UUID olmalıdır.`);
  }
  return value;
}

function safeTicket<T extends { qrTokenHash?: string | null }>(ticket: T) {
  const { qrTokenHash: _qrTokenHash, ...safe } = ticket;
  void _qrTokenHash;
  return safe;
}

export function createTicketQrPayload(ticket: { id: string; ticketNo: string; tripId: string }) {
  const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000);
  return {
    payload: signJwtPayload(
      {
        purpose: 'ticket-qr',
        sub: ticket.id,
        ticketNo: ticket.ticketNo,
        tripId: ticket.tripId,
      },
      QR_TTL_SECONDS,
    ),
    expiresAt: expiresAt.toISOString(),
  };
}

const ticketRelations = {
  trip: { with: { route: { with: { origin: true, destination: true } }, bus: true } },
  tripSeat: true,
  order: true,
} as const;

export function createTicketService(database: () => Database = serverDatabase) {
  return {
    async getMyTickets(userId: string) {
      uuid(userId, 'userId');
      const tickets = await database().query.tickets.findMany({
        where: eq(schema.tickets.userId, userId),
        with: ticketRelations,
        orderBy: [desc(schema.tickets.issuedAt)],
      });
      type Ticket = Omit<(typeof tickets)[number], 'qrTokenHash'>;
      const groups: Record<'active' | 'past' | 'cancelled', Ticket[]> = {
        active: [],
        past: [],
        cancelled: [],
      };
      const now = new Date();
      for (const ticket of tickets) {
        const safe = safeTicket(ticket);
        if (ticket.status === 'cancelled') groups.cancelled.push(safe);
        else if (
          ticket.trip.departureTime < now &&
          !['boarding', 'in_transit'].includes(ticket.trip.status)
        ) {
          groups.past.push(safe);
        } else groups.active.push(safe);
      }
      return groups;
    },

    async getTicketDetail(ticketId: string, userId: string) {
      uuid(ticketId, 'ticketId');
      uuid(userId, 'userId');
      const ticket = await database().query.tickets.findFirst({
        where: eq(schema.tickets.id, ticketId),
        with: ticketRelations,
      });
      if (!ticket) throw new ServerError(404, 'Bilet bulunamadı.');
      if (ticket.userId !== userId) throw new ServerError(403, 'Bu bilete erişim yetkiniz yok.');
      return safeTicket(ticket);
    },

    async getTicketQr(ticketId: string, userId: string) {
      uuid(ticketId, 'ticketId');
      uuid(userId, 'userId');
      const ticket = await database().query.tickets.findFirst({
        where: and(eq(schema.tickets.id, ticketId), eq(schema.tickets.userId, userId)),
      });
      if (!ticket) throw new ServerError(404, 'Bilet bulunamadı.');
      if (ticket.status !== 'active') throw new ServerError(409, 'Bilet aktif değil.');
      return createTicketQrPayload(ticket);
    },
  };
}

export const ticketService = createTicketService();
