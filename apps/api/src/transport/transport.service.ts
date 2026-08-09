import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '@ekspres/database';
import { eq } from 'drizzle-orm';

@Injectable()
export class TransportService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getLocations() {
    return this.db.query.locations.findMany();
  }

  async getRoutes() {
    return this.db.query.routes.findMany({
      with: {
        // In the future we will include origin, destination via relations,
        // but for now we'll just return raw routes
      },
    });
  }

  async getTrips(dateStr?: string, originId?: string, destinationId?: string) {
    let query = this.db.select({
      trip: schema.trips,
      route: schema.routes,
      bus: schema.buses,
    })
    .from(schema.trips)
    .innerJoin(schema.routes, eq(schema.trips.routeId, schema.routes.id))
    .innerJoin(schema.buses, eq(schema.trips.busId, schema.buses.id));

    // Wait, Drizzle dynamic queries should ideally use a `where` array. 
    // But since this is a basic search for the demo MVP, we will fetch the trips that match the route,
    // and if origin/destination are given, we will just filter them down using JS or DB constraints.
    // For now we'll do a simple filtering since the DB constraints require joining `route_stops`.
    
    let results = await query;
    
    if (originId) {
      results = results.filter(r => r.route.originId === originId);
    }
    
    if (destinationId) {
      results = results.filter(r => r.route.destinationId === destinationId);
    }
    
    if (dateStr) {
      const targetDate = new Date(dateStr).toISOString().split('T')[0];
      results = results.filter(r => {
        const tripDate = new Date(r.trip.departureTime).toISOString().split('T')[0];
        return tripDate === targetDate;
      });
    }
    
    return results;
  }

  async getTripDetails(tripId: string) {
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }
}
