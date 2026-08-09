import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '@ekspres/database';
import { eq, count, sum } from 'drizzle-orm';

@Injectable()
export class AdminService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getDashboardMetrics() {
    // Total Revenue (all completed orders)
    const revenueResult = await this.db
      .select({ total: sum(schema.orders.totalAmount) })
      .from(schema.orders)
      .where(eq(schema.orders.status, 'completed'));

    // Active Trips
    const activeTripsResult = await this.db
      .select({ count: count() })
      .from(schema.trips)
      .where(eq(schema.trips.status, 'in_transit'));

    // Daily Bookings (total completed orders count) - simplified for demo
    const bookingsResult = await this.db
      .select({ count: count() })
      .from(schema.orders)
      .where(eq(schema.orders.status, 'completed'));

    return {
      totalRevenue: Number(revenueResult[0]?.total || 0),
      activeTrips: Number(activeTripsResult[0]?.count || 0),
      dailyBookings: Number(bookingsResult[0]?.count || 0),
    };
  }
}
