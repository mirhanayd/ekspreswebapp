import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, gt, inArray, lt, ne } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import Redis from 'ioredis';
import { schema } from '@ekspres/database';
import { DRIZZLE } from '../database/database.module';
import { TransportService } from '../transport/transport.service';
import {
  DriverAssignmentDto,
  DriverAccountStatusDto,
  DriverLocationDto,
  DriverTripStatusDto,
  PassengerBoardingStatusDto,
} from './driver.dto';
import { isTrackingPosition } from '../tracking/tracking.types';
import { validateTrackingSample } from '../tracking/tracking-validation';

@Injectable()
export class DriverService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly transportService: TransportService,
    configService: ConfigService,
  ) {
    this.redis = new Redis(configService.get<string>('REDIS_URL') || 'redis://localhost:6379');
  }

  async listDrivers() {
    return this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        isActive: schema.users.isActive,
      })
      .from(schema.users)
      .where(eq(schema.users.role, 'driver'));
  }

  async setDriverStatus(driverId: string, dto: DriverAccountStatusDto, actorId?: string) {
    const [driver] = await this.db
      .update(schema.users)
      .set({ isActive: dto.isActive, updatedAt: new Date() })
      .where(and(eq(schema.users.id, driverId), eq(schema.users.role, 'driver')))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        isActive: schema.users.isActive,
      });
    if (!driver) throw new NotFoundException('Driver not found');
    await this.writeAudit(actorId, 'driver.status_changed', 'driver', driverId, dto);
    return driver;
  }

  async assignDriver(tripId: string, dto: DriverAssignmentDto, actorId?: string) {
    const driver = await this.db.query.users.findFirst({
      where: and(eq(schema.users.id, dto.driverId), eq(schema.users.role, 'driver')),
    });
    if (!driver) throw new NotFoundException('Driver not found');
    if (!driver.isActive) throw new ConflictException('Driver account is inactive');

    const trip = await this.db.query.trips.findFirst({ where: eq(schema.trips.id, tripId) });
    if (!trip) throw new NotFoundException('Trip not found');

    return this.db.transaction(async (tx) => {
      const conflicts = await tx
        .select({ tripId: schema.tripDrivers.tripId })
        .from(schema.tripDrivers)
        .innerJoin(schema.trips, eq(schema.tripDrivers.tripId, schema.trips.id))
        .where(
          and(
            ne(schema.tripDrivers.tripId, tripId),
            eq(schema.tripDrivers.driverId, dto.driverId),
            lt(schema.trips.departureTime, trip.arrivalTime),
            gt(schema.trips.arrivalTime, trip.departureTime),
          ),
        )
        .limit(1);
      if (conflicts.length) throw new ConflictException('Driver has an overlapping trip');

      const busConflicts = await tx
        .select({ tripId: schema.tripDrivers.tripId })
        .from(schema.tripDrivers)
        .innerJoin(schema.trips, eq(schema.tripDrivers.tripId, schema.trips.id))
        .where(
          and(
            ne(schema.tripDrivers.tripId, tripId),
            eq(schema.trips.busId, trip.busId),
            lt(schema.trips.departureTime, trip.arrivalTime),
            gt(schema.trips.arrivalTime, trip.departureTime),
          ),
        )
        .limit(1);
      if (busConflicts.length) throw new ConflictException('Bus has an overlapping trip');

      const [assignment] = await tx
        .insert(schema.tripDrivers)
        .values({ tripId, driverId: dto.driverId, assignedAt: new Date() })
        .onConflictDoUpdate({
          target: schema.tripDrivers.tripId,
          set: { driverId: dto.driverId, assignedAt: new Date() },
        })
        .returning();
      await this.writeAudit(actorId, 'driver.assigned', 'trip', tripId, {
        driverId: dto.driverId,
      });
      return assignment;
    });
  }

  async unassignDriver(tripId: string, actorId?: string) {
    const [assignment] = await this.db
      .delete(schema.tripDrivers)
      .where(eq(schema.tripDrivers.tripId, tripId))
      .returning();
    if (!assignment) throw new NotFoundException('Trip assignment not found');
    await this.writeAudit(actorId, 'driver.unassigned', 'trip', tripId, {
      driverId: assignment.driverId,
    });
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
    const current = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      columns: { status: true },
    });
    if (!current) throw new NotFoundException('Trip not found');
    const transitions = {
      scheduled: ['boarding'],
      boarding: ['in_transit'],
      in_transit: ['completed'],
      completed: [],
    } as const;
    if (!transitions[current.status as keyof typeof transitions]?.includes(dto.status as never)) {
      throw new ConflictException(`Invalid trip transition: ${current.status} -> ${dto.status}`);
    }
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
    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();
    const previous = await this.redis.get(`tracking:latest:${tripId}`);
    let previousPosition = null;
    if (previous) {
      try {
        const parsed: unknown = JSON.parse(previous);
        previousPosition = isTrackingPosition(parsed) ? parsed : null;
      } catch {
        previousPosition = null;
      }
    }
    const sample = {
      ...dto,
      recordedAt: recordedAt.toISOString(),
    };
    const validationError = validateTrackingSample(sample, previousPosition);
    if (validationError) throw new ConflictException(validationError);

    const sequence = await this.redis.incr(`tracking:sequence:${tripId}`);
    const position = {
      tripId,
      busId: assignment.busId,
      longitude: dto.longitude,
      latitude: dto.latitude,
      speedKph: dto.speedKph,
      headingDeg: dto.headingDeg,
      recordedAt: recordedAt.toISOString(),
      sequence,
      source: 'MOBILE_APP' as const,
    };

    // The database is the durable source of truth. Redis publication is a
    // separate best-effort delivery step and must never precede persistence.
    try {
      await this.db.insert(schema.trackingPositions).values({
        tripId,
        busId: assignment.busId,
        longitude: position.longitude,
        latitude: position.latitude,
        speedKph: position.speedKph,
        headingDeg: position.headingDeg,
        recordedAt,
        sequence,
        source: position.source,
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Duplicate GPS sample');
      }
      throw error;
    }

    const serialized = JSON.stringify(position);
    await this.redis
      .multi()
      .set(`tracking:latest:${tripId}`, serialized, 'EX', 60 * 60 * 6)
      .publish('trip_locations', serialized)
      .exec();

    return position;
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

  private async writeAudit(
    actorId: string | undefined,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.db.insert(schema.driverAuditLogs).values({
      actorId: actorId || null,
      action,
      resourceType,
      resourceId,
      metadata: JSON.stringify(metadata),
    });
  }

  onModuleDestroy() {
    void this.redis.quit();
  }
}
