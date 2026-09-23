import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import * as schema from '../schema/index.js';
import { serverDatabase } from './database.js';
import { ServerError } from './errors.js';

type Database = ReturnType<typeof serverDatabase>;
type FleetFreshness = 'live' | 'delayed' | 'stale' | 'offline';

function uuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ServerError(400, 'Geçersiz bilet kimliği.');
  }
  return value;
}

export function adminFleetFreshness(ageSeconds: number | null): FleetFreshness {
  if (ageSeconds === null || ageSeconds > 180) return 'offline';
  if (ageSeconds > 60) return 'stale';
  if (ageSeconds > 15) return 'delayed';
  return 'live';
}

export function createAdminService(database: () => Database = serverDatabase) {
  const ticketQuery = () =>
    database()
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
        originName: sql<string>`(select name from locations where id = ${schema.routes.originId})`,
        destinationName: sql<string>`(select name from locations where id = ${schema.routes.destinationId})`,
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

  const service = {
    async getFleet() {
      const rows = await database()
        .select({
          tripId: schema.trips.id,
          busId: schema.buses.id,
          plateNumber: schema.buses.plateNumber,
          model: schema.buses.model,
          routeName: schema.routes.name,
          originName: sql<string>`(select name from locations where id = ${schema.routes.originId})`,
          destinationName: sql<string>`(select name from locations where id = ${schema.routes.destinationId})`,
          departureTime: schema.trips.departureTime,
          arrivalTime: schema.trips.arrivalTime,
          status: schema.trips.status,
          routeGeometry: sql<string | null>`ST_AsGeoJSON(${schema.routes.geometry})`,
          longitude: sql<number | null>`ST_X(latest.position)`,
          latitude: sql<number | null>`ST_Y(latest.position)`,
          speedKph: sql<number | null>`latest.speed_kph`,
          headingDeg: sql<number | null>`latest.heading_deg`,
          recordedAt: sql<Date | null>`latest.recorded_at`,
          sequence: sql<number | null>`latest.sequence`,
        })
        .from(schema.trips)
        .innerJoin(schema.routes, eq(schema.trips.routeId, schema.routes.id))
        .innerJoin(schema.buses, eq(schema.trips.busId, schema.buses.id))
        .leftJoin(
          sql`lateral (
            select position, speed_kph, heading_deg, recorded_at, sequence
            from tracking_positions
            where trip_id = ${schema.trips.id}
            order by recorded_at desc
            limit 1
          ) latest`,
          sql`true`,
        )
        .where(sql`${schema.trips.status} in ('boarding', 'in_transit')`)
        .orderBy(schema.trips.departureTime);
      return rows.map((row) => {
        const ageSeconds = row.recordedAt
          ? Math.max(0, Math.floor((Date.now() - row.recordedAt.getTime()) / 1000))
          : null;
        const latest =
          row.recordedAt && row.longitude !== null && row.latitude !== null
            ? {
                tripId: row.tripId,
                busId: row.busId,
                longitude: row.longitude,
                latitude: row.latitude,
                speedKph: row.speedKph ?? 0,
                headingDeg: row.headingDeg ?? 0,
                recordedAt: row.recordedAt.toISOString(),
                sequence: row.sequence ?? 0,
              }
            : null;
        return {
          tripId: row.tripId,
          busId: row.busId,
          plateNumber: row.plateNumber,
          model: row.model,
          routeName: row.routeName,
          originName: row.originName,
          destinationName: row.destinationName,
          departureTime: row.departureTime.toISOString(),
          arrivalTime: row.arrivalTime.toISOString(),
          status: row.status,
          routeGeometry: row.routeGeometry ? JSON.parse(row.routeGeometry) : null,
          latest,
          ageSeconds,
          freshness: adminFleetFreshness(ageSeconds),
        };
      });
    },

    async getOverview() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [orders, activeTrips, ticketsToday, passengers, fleet] = await Promise.all([
        database()
          .select({
            revenueMinor: sql<number>`coalesce(sum(${schema.orders.totalMinor}), 0)::int`,
            paidOrders: count(),
          })
          .from(schema.orders)
          .where(eq(schema.orders.status, 'paid')),
        database()
          .select({ value: count() })
          .from(schema.trips)
          .where(sql`${schema.trips.status} in ('boarding', 'in_transit')`),
        database()
          .select({ value: count() })
          .from(schema.tickets)
          .where(gte(schema.tickets.issuedAt, today)),
        database()
          .select({ value: count() })
          .from(schema.users)
          .where(eq(schema.users.role, 'passenger')),
        service.getFleet(),
      ]);
      return {
        revenueMinor: Number(orders[0]?.revenueMinor || 0),
        paidOrders: Number(orders[0]?.paidOrders || 0),
        activeTrips: Number(activeTrips[0]?.value || 0),
        ticketsToday: Number(ticketsToday[0]?.value || 0),
        passengers: Number(passengers[0]?.value || 0),
        liveVehicles: fleet.filter((item) => item.freshness === 'live').length,
        generatedAt: new Date().toISOString(),
      };
    },

    async getMetrics() {
      const value = await service.getOverview();
      return {
        totalRevenue: value.revenueMinor / 100,
        activeTrips: value.activeTrips,
        dailyBookings: value.ticketsToday,
      };
    },

    async getTransport() {
      const originName = sql<string>`(select name from locations where id = ${schema.routes.originId})`;
      const destinationName = sql<string>`(select name from locations where id = ${schema.routes.destinationId})`;
      const [locations, routes, buses, trips] = await Promise.all([
        database().select().from(schema.locations).orderBy(schema.locations.name),
        database()
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
        database()
          .select({
            id: schema.buses.id,
            plateNumber: schema.buses.plateNumber,
            model: schema.buses.model,
            totalSeats: schema.buses.totalSeats,
            activeTrips: sql<number>`(select count(*)::int from trips where bus_id = ${schema.buses.id} and status in ('boarding', 'in_transit'))`,
          })
          .from(schema.buses)
          .orderBy(schema.buses.plateNumber),
        database()
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
            soldSeats: sql<number>`(select count(*)::int from tickets where trip_id = ${schema.trips.id} and status != 'cancelled')`,
          })
          .from(schema.trips)
          .innerJoin(schema.routes, eq(schema.trips.routeId, schema.routes.id))
          .innerJoin(schema.buses, eq(schema.trips.busId, schema.buses.id))
          .orderBy(desc(schema.trips.departureTime)),
      ]);
      return JSON.parse(JSON.stringify({ locations, routes, buses, trips }));
    },

    async getTickets() {
      return JSON.parse(
        JSON.stringify(await ticketQuery().orderBy(desc(schema.tickets.issuedAt)).limit(100)),
      );
    },

    async getTicket(id: string) {
      const [ticket] = await ticketQuery()
        .where(eq(schema.tickets.id, uuid(id)))
        .limit(1);
      if (!ticket) throw new ServerError(404, 'Bilet bulunamadı.');
      return JSON.parse(JSON.stringify(ticket));
    },

    async getReports() {
      const [dailySales, tripStatuses, ticketStatuses, occupancy] = await Promise.all([
        database()
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
        database()
          .select({ status: schema.trips.status, value: count() })
          .from(schema.trips)
          .groupBy(schema.trips.status),
        database()
          .select({ status: schema.tickets.status, value: count() })
          .from(schema.tickets)
          .groupBy(schema.tickets.status),
        database()
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
    },
  };
  return service;
}

export const adminService = createAdminService();
