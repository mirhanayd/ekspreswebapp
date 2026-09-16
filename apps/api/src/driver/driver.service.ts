import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import Redis from 'ioredis';
import { schema } from '@ekspres/database';
import { DRIZZLE } from '../database/database.module';
import { TrackingPosition } from '../tracking/tracking.types';
import { TransportService } from '../transport/transport.service';
import {
  DriverAssignmentDto,
  DriverLocationDto,
  DriverTripStatusDto,
  PassengerBoardingStatusDto,
} from './driver.dto';

@Injectable()
export class DriverService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(DriverService.name);
  private readonly trackingLatestTtlSeconds: number;
  private readonly trackingHistoryIntervalSeconds: number;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly transportService: TransportService,
    configService: ConfigService,
  ) {
    this.redis = new Redis(configService.get<string>('REDIS_URL') || 'redis://localhost:6379');
    this.trackingLatestTtlSeconds = configService.get<number>('TRACKING_LATEST_TTL_SECONDS', 120);
    this.trackingHistoryIntervalSeconds = configService.get<number>(
      'TRACKING_HISTORY_INTERVAL_SECONDS',
      30,
    );
  }

  async listDrivers() {
    return this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.users)
      .where(eq(schema.users.role, 'driver'));
  }

  async assignDriver(tripId: string, dto: DriverAssignmentDto) {
    const driver = await this.db.query.users.findFirst({
      where: and(eq(schema.users.id, dto.driverId), eq(schema.users.role, 'driver')),
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const trip = await this.db.query.trips.findFirst({ where: eq(schema.trips.id, tripId) });
    if (!trip) throw new NotFoundException('Trip not found');

    const [assignment] = await this.db
      .insert(schema.tripDrivers)
      .values({ tripId, driverId: dto.driverId, assignedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.tripDrivers.tripId,
        set: { driverId: dto.driverId, assignedAt: new Date() },
      })
      .returning();

    return assignment;
  }

  async unassignDriver(tripId: string) {
    const [assignment] = await this.db
      .delete(schema.tripDrivers)
      .where(eq(schema.tripDrivers.tripId, tripId))
      .returning();
    if (!assignment) throw new NotFoundException('Trip assignment not found');
    return { removed: true };
  }

  async listTrips(driverId: string) {
    const assignments = await this.db
      .select({ tripId: schema.tripDrivers.tripId })
      .from(schema.tripDrivers)
      .where(eq(schema.tripDrivers.driverId, driverId));

    return Promise.all(
      assignments.map(async ({ tripId }) => {
        const trip = await this.transportService.getTripDetails(tripId);
        const manifest = await this.getManifest(tripId);
        return {
          ...trip,
          passengerSummary: {
            total: manifest.length,
            boarded: manifest.filter((passenger) => passenger.boardingStatus === 'boarded').length,
            noShow: manifest.filter((passenger) => passenger.boardingStatus === 'no_show').length,
          },
        };
      }),
    );
  }

  async getTrip(driverId: string, tripId: string) {
    await this.assertAssignment(driverId, tripId);
    const trip = await this.transportService.getTripDetails(tripId);
    const manifest = await this.getManifest(tripId);
    const stops = trip.route.stops.map((stop) => ({
      ...stop,
      passengers: manifest.filter(
        (passenger) => (passenger.boardingLocationId || trip.route.originId) === stop.locationId,
      ),
    }));

    return { ...trip, route: { ...trip.route, stops }, manifest };
  }

  async updateTripStatus(driverId: string, tripId: string, dto: DriverTripStatusDto) {
    await this.assertAssignment(driverId, tripId);
    const [trip] = await this.db
      .update(schema.trips)
      .set({ status: dto.status })
      .where(eq(schema.trips.id, tripId))
      .returning();
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async updatePassengerStatus(
    driverId: string,
    tripId: string,
    ticketId: string,
    dto: PassengerBoardingStatusDto,
  ) {
    await this.assertAssignment(driverId, tripId);
    const ticket = await this.db.query.tickets.findFirst({
      where: and(
        eq(schema.tickets.id, ticketId),
        eq(schema.tickets.tripId, tripId),
        ne(schema.tickets.status, 'cancelled'),
      ),
    });
    if (!ticket) throw new NotFoundException('Passenger ticket not found');

    const [boarding] = await this.db
      .insert(schema.passengerBoarding)
      .values({
        ticketId,
        status: dto.status,
        updatedBy: driverId,
        boardedAt: dto.status === 'boarded' ? new Date() : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.passengerBoarding.ticketId,
        set: {
          status: dto.status,
          updatedBy: driverId,
          boardedAt: dto.status === 'boarded' ? new Date() : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return boarding;
  }

  async publishLocation(driverId: string, tripId: string, dto: DriverLocationDto) {
    const assignment = await this.assertAssignment(driverId, tripId);
    const sequenceKey = `tracking:sequence:${tripId}`;
    const sequence = await this.redis.incr(sequenceKey);
    await this.redis.expire(sequenceKey, Math.max(this.trackingLatestTtlSeconds, 86400));

    const position: TrackingPosition = {
      tripId,
      busId: assignment.busId,
      longitude: dto.longitude,
      latitude: dto.latitude,
      speedKph: dto.speedKph,
      headingDeg: dto.headingDeg,
      recordedAt: dto.recordedAt || new Date().toISOString(),
      sequence,
      source: 'MOBILE_APP',
    };

    const serialized = JSON.stringify(position);
    await this.redis
      .multi()
      .set(`tracking:latest:${tripId}`, serialized, 'EX', this.trackingLatestTtlSeconds)
      .publish('trip_locations', serialized)
      .exec();

    await this.persistTrackingHistory(position);
    return position;
  }

  private async persistTrackingHistory(position: TrackingPosition) {
    const gateKey = `tracking:history:gate:${position.tripId}`;
    const acquired = await this.redis
      .set(gateKey, '1', 'EX', this.trackingHistoryIntervalSeconds, 'NX')
      .catch((error: Error) => {
        this.logger.warn(`Tracking history gate unavailable: ${error.message}`);
        return null;
      });

    if (acquired !== 'OK') return;

    try {
      await this.db
        .insert(schema.trackingPositions)
        .values({
          tripId: position.tripId,
          busId: position.busId,
          position: {
            type: 'Point',
            coordinates: [position.longitude, position.latitude],
          },
          speedKph: position.speedKph,
          headingDeg: position.headingDeg,
          recordedAt: new Date(position.recordedAt),
          sequence: position.sequence,
          source: position.source,
        })
        .onConflictDoNothing();
    } catch (error) {
      this.logger.warn(
        `Tracking history snapshot failed for trip ${position.tripId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async assertAssignment(driverId: string, tripId: string) {
    const [assignment] = await this.db
      .select({
        tripId: schema.tripDrivers.tripId,
        busId: schema.trips.busId,
      })
      .from(schema.tripDrivers)
      .innerJoin(schema.trips, eq(schema.tripDrivers.tripId, schema.trips.id))
      .where(and(eq(schema.tripDrivers.driverId, driverId), eq(schema.tripDrivers.tripId, tripId)))
      .limit(1);

    if (!assignment) throw new ForbiddenException('Trip is not assigned to this driver');
    return assignment;
  }

  private async getManifest(tripId: string) {
    const rows = await this.db
      .select({
        ticketId: schema.tickets.id,
        ticketNo: schema.tickets.ticketNo,
        seatNo: schema.tripSeats.seatNo,
        firstName: schema.orders.passengerFirstName,
        lastName: schema.orders.passengerLastName,
        phone: schema.orders.passengerPhone,
        email: schema.orders.passengerEmail,
        boardingLocationId: schema.orders.boardingLocationId,
        alightingLocationId: schema.orders.alightingLocationId,
        boardingStatus: schema.passengerBoarding.status,
      })
      .from(schema.tickets)
      .innerJoin(schema.orders, eq(schema.tickets.orderId, schema.orders.id))
      .innerJoin(schema.tripSeats, eq(schema.tickets.tripSeatId, schema.tripSeats.id))
      .leftJoin(schema.passengerBoarding, eq(schema.passengerBoarding.ticketId, schema.tickets.id))
      .where(
        and(eq(schema.tickets.tripId, tripId), inArray(schema.tickets.status, ['active', 'used'])),
      );

    return rows.map((row) => ({ ...row, boardingStatus: row.boardingStatus || 'pending' }));
  }

  onModuleDestroy() {
    void this.redis.quit();
  }
}
