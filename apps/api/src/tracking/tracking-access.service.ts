import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';
import { schema } from '@ekspres/database';
import { DRIZZLE } from '../database/database.module';
import { TrackingLatestService } from './tracking-latest.service';
import { TrackingAccessClaims } from './tracking.types';

const TRACKING_TOKEN_TTL_SECONDS = 5 * 60;
const TRACKABLE_TRIP_STATUSES = new Set(['boarding', 'in_transit']);

@Injectable()
export class TrackingAccessService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private jwtService: JwtService,
    private trackingLatestService: TrackingLatestService,
  ) {}

  async getBootstrap(ticketId: string, userId: string) {
    const ticket = await this.db.query.tickets.findFirst({
      where: and(eq(schema.tickets.id, ticketId), eq(schema.tickets.userId, userId)),
      with: {
        trip: {
          with: {
            bus: true,
            route: {
              with: {
                origin: true,
                destination: true,
                stops: { with: { location: true } },
              },
            },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    this.assertTrackable(ticket.status, ticket.trip.status);

    const geometryResult = await this.db.execute<{ geometry: string }>(sql`
      SELECT ST_AsGeoJSON(geometry)::text AS geometry
      FROM routes
      WHERE id = ${ticket.trip.routeId}
    `);
    const routeGeometry = geometryResult.rows[0]?.geometry
      ? JSON.parse(geometryResult.rows[0].geometry)
      : null;
    if (!routeGeometry) throw new ConflictException('Tracking route geometry is unavailable');

    const claims: TrackingAccessClaims = {
      purpose: 'tracking',
      sub: userId,
      ticketId: ticket.id,
      tripId: ticket.tripId,
    };
    return {
      ticketId: ticket.id,
      trip: ticket.trip,
      routeGeometry,
      latestPosition: await this.trackingLatestService.get(ticket.tripId),
      accessToken: this.jwtService.sign(claims, { expiresIn: TRACKING_TOKEN_TTL_SECONDS }),
      accessTokenExpiresAt: new Date(Date.now() + TRACKING_TOKEN_TTL_SECONDS * 1000).toISOString(),
    };
  }

  async authorizeSocketToken(token: string): Promise<TrackingAccessClaims> {
    let claims: TrackingAccessClaims;
    try {
      claims = await this.jwtService.verifyAsync<TrackingAccessClaims>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired tracking access token');
    }
    if (claims.purpose !== 'tracking' || !claims.sub || !claims.ticketId || !claims.tripId) {
      throw new UnauthorizedException('Invalid tracking access token');
    }

    const ticket = await this.db.query.tickets.findFirst({
      where: and(
        eq(schema.tickets.id, claims.ticketId),
        eq(schema.tickets.userId, claims.sub),
        eq(schema.tickets.tripId, claims.tripId),
        eq(schema.tickets.status, 'active'),
      ),
      with: { trip: true },
    });
    if (!ticket || !TRACKABLE_TRIP_STATUSES.has(ticket.trip.status)) {
      throw new UnauthorizedException('Ticket is not entitled to live tracking');
    }
    return claims;
  }

  private assertTrackable(ticketStatus: string, tripStatus: string) {
    if (ticketStatus !== 'active') throw new ConflictException('Ticket is not active');
    if (!TRACKABLE_TRIP_STATUSES.has(tripStatus)) {
      throw new ConflictException('Live tracking is not active for this trip');
    }
  }
}
