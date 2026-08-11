import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { schema } from '@ekspres/database';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import { TrackingLatestService } from '../tracking/tracking-latest.service';

type FleetFreshness = 'live' | 'delayed' | 'stale' | 'offline';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly trackingLatest: TrackingLatestService,
  ) {}

  async getDashboardMetrics() {
    const overview = await this.getOverview();
    return {
      totalRevenue: overview.revenueMinor / 100,
      activeTrips: overview.activeTrips,
      dailyBookings: overview.ticketsToday,
    };
  }

  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [orderTotals, activeTrips, ticketsToday, passengerCount, fleet] = await Promise.all([
      this.db
        .select({
          revenueMinor: sql<number>`coalesce(sum(${schema.orders.totalMinor}), 0)::int`,
          paidOrders: count(),
        })
        .from(schema.orders)
        .where(eq(schema.orders.status, 'paid')),
      this.db
        .select({ value: count() })
        .from(schema.trips)
        .where(sql`${schema.trips.status} in ('boarding', 'in_transit')`),
      this.db
        .select({ value: count() })
        .from(schema.tickets)
        .where(gte(schema.tickets.issuedAt, today)),
      this.db
        .select({ value: count() })
        .from(schema.users)
        .where(eq(schema.users.role, 'passenger')),
      this.getFleet(),
    ]);

    return {
      revenueMinor: Number(orderTotals[0]?.revenueMinor || 0),
      paidOrders: Number(orderTotals[0]?.paidOrders || 0),
      activeTrips: Number(activeTrips[0]?.value || 0),
      ticketsToday: Number(ticketsToday[0]?.value || 0),
      passengers: Number(passengerCount[0]?.value || 0),
      liveVehicles: fleet.filter((item) => item.freshness === 'live').length,
      generatedAt: new Date().toISOString(),
    };
  }

  async getTransportOperations() {
    const originName = sql<string>`(
      select name from locations where id = ${schema.routes.originId}
    )`;
    const destinationName = sql<string>`(
      select name from locations where id = ${schema.routes.destinationId}
    )`;

    const [locations, routes, buses, trips] = await Promise.all([
      this.db.select().from(schema.locations).orderBy(schema.locations.name),
      this.db
        .select({
          id: schema.routes.id,
          name: schema.routes.name,
          originId: schema.routes.originId,
          originName,
          destinationId: schema.routes.destinationId,
          destinationName,
        })
        .from(schema.routes)
        .orderBy(schema.routes.name),
      this.db
        .select({
          id: schema.buses.id,
          plateNumber: schema.buses.plateNumber,
          model: schema.buses.model,
          totalSeats: schema.buses.totalSeats,
          activeTrips: sql<number>`(
            select count(*)::int from trips
            where bus_id = ${schema.buses.id} and status in ('boarding', 'in_transit')
          )`,
        })
        .from(schema.buses)
        .orderBy(schema.buses.plateNumber),
      this.db
        .select({
          id: schema.trips.id,
          routeName: schema.routes.name,
          originName,
          destinationName,
          plateNumber: schema.buses.plateNumber,
          departureTime: schema.trips.departureTime,
          arrivalTime: schema.trips.arrivalTime,
          status: schema.trips.status,
          basePrice: schema.trips.basePrice,
          totalSeats: schema.buses.totalSeats,
          soldSeats: sql<number>`(
            select count(*)::int from tickets
            where trip_id = ${schema.trips.id} and status != 'cancelled'
          )`,
        })
        .from(schema.trips)
        .innerJoin(schema.routes, eq(schema.trips.routeId, schema.routes.id))
        .innerJoin(schema.buses, eq(schema.trips.busId, schema.buses.id))
        .orderBy(desc(schema.trips.departureTime)),
    ]);

    return { locations, routes, buses, trips };
  }

  async getTickets() {
    return this.ticketQuery().orderBy(desc(schema.tickets.issuedAt)).limit(100);
  }

  async getTicket(id: string) {
    const [ticket] = await this.ticketQuery().where(eq(schema.tickets.id, id)).limit(1);
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async getFleet() {
    const rows = await this.db
      .select({
        tripId: schema.trips.id,
        busId: schema.buses.id,
        plateNumber: schema.buses.plateNumber,
        model: schema.buses.model,
        routeName: schema.routes.name,
        originName: sql<string>`(
          select name from locations where id = ${schema.routes.originId}
        )`,
        destinationName: sql<string>`(
          select name from locations where id = ${schema.routes.destinationId}
        )`,
        departureTime: schema.trips.departureTime,
        arrivalTime: schema.trips.arrivalTime,
        status: schema.trips.status,
        routeGeometry: sql<string | null>`ST_AsGeoJSON(${schema.routes.geometry})`,
      })
      .from(schema.trips)
      .innerJoin(schema.routes, eq(schema.trips.routeId, schema.routes.id))
      .innerJoin(schema.buses, eq(schema.trips.busId, schema.buses.id))
      .where(sql`${schema.trips.status} in ('boarding', 'in_transit')`)
      .orderBy(schema.trips.departureTime);

    return Promise.all(
      rows.map(async (row) => {
        const latest = await this.trackingLatest.get(row.tripId);
        const ageSeconds = latest
          ? Math.max(0, Math.floor((Date.now() - new Date(latest.recordedAt).getTime()) / 1000))
          : null;
        return {
          ...row,
          routeGeometry: row.routeGeometry ? JSON.parse(row.routeGeometry) : null,
          latest,
          ageSeconds,
          freshness: this.getFreshness(ageSeconds),
        };
      }),
    );
  }

  async getReports() {
    const [dailySales, tripStatuses, ticketStatuses, occupancy] = await Promise.all([
      this.db
        .select({
          date: sql<string>`to_char(date_trunc('day', ${schema.payments.paidAt}), 'YYYY-MM-DD')`,
          tickets: count(),
          revenueMinor: sql<number>`coalesce(sum(${schema.payments.amountMinor}), 0)::int`,
        })
        .from(schema.payments)
        .where(
          and(eq(schema.payments.status, 'success'), sql`${schema.payments.paidAt} is not null`),
        )
        .groupBy(sql`date_trunc('day', ${schema.payments.paidAt})`)
        .orderBy(desc(sql`date_trunc('day', ${schema.payments.paidAt})`))
        .limit(7),
      this.db
        .select({ status: schema.trips.status, value: count() })
        .from(schema.trips)
        .groupBy(schema.trips.status),
      this.db
        .select({ status: schema.tickets.status, value: count() })
        .from(schema.tickets)
        .groupBy(schema.tickets.status),
      this.db
        .select({
          seats: count(),
          sold: sql<number>`count(*) filter (where ${schema.tripSeats.status} = 'purchased')::int`,
        })
        .from(schema.tripSeats),
    ]);

    const seats = Number(occupancy[0]?.seats || 0);
    const sold = Number(occupancy[0]?.sold || 0);
    return {
      dailySales: dailySales.map((row) => ({
        ...row,
        tickets: Number(row.tickets),
        revenueMinor: Number(row.revenueMinor),
      })),
      tripStatuses: tripStatuses.map((row) => ({ ...row, value: Number(row.value) })),
      ticketStatuses: ticketStatuses.map((row) => ({ ...row, value: Number(row.value) })),
      occupancy: { seats, sold, percent: seats ? Math.round((sold / seats) * 100) : 0 },
      generatedAt: new Date().toISOString(),
    };
  }

  private ticketQuery() {
    return this.db
      .select({
        id: schema.tickets.id,
        ticketNo: schema.tickets.ticketNo,
        status: schema.tickets.status,
        issuedAt: schema.tickets.issuedAt,
        passenger: sql<string>`${schema.users.firstName} || ' ' || ${schema.users.lastName}`,
        passengerEmail: schema.users.email,
        seatNo: schema.tripSeats.seatNo,
        tripId: schema.trips.id,
        routeName: schema.routes.name,
        originName: sql<string>`(
          select name from locations where id = ${schema.routes.originId}
        )`,
        destinationName: sql<string>`(
          select name from locations where id = ${schema.routes.destinationId}
        )`,
        departureTime: schema.trips.departureTime,
        tripStatus: schema.trips.status,
        orderNo: schema.orders.orderNo,
        amountMinor: schema.orders.totalMinor,
        currency: schema.orders.currency,
      })
      .from(schema.tickets)
      .innerJoin(schema.users, eq(schema.tickets.userId, schema.users.id))
      .innerJoin(schema.trips, eq(schema.tickets.tripId, schema.trips.id))
      .innerJoin(schema.routes, eq(schema.trips.routeId, schema.routes.id))
      .innerJoin(schema.tripSeats, eq(schema.tickets.tripSeatId, schema.tripSeats.id))
      .innerJoin(schema.orders, eq(schema.tickets.orderId, schema.orders.id));
  }

  private getFreshness(ageSeconds: number | null): FleetFreshness {
    if (ageSeconds === null || ageSeconds > 180) return 'offline';
    if (ageSeconds > 60) return 'stale';
    if (ageSeconds > 15) return 'delayed';
    return 'live';
  }
}
