import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '@ekspres/database';
import { eq } from 'drizzle-orm';

@Injectable()
export class TransportService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  async getLocations() {
    return this.db.query.locations.findMany();
  }

  async getRoutes() {
    return this.db.query.routes.findMany({
      with: {
        // In the future we will include origin, destination via relations,
        // but for now we'll just return raw routes
      }
    });
  }

  async getTrips(dateStr?: string) {
    // If a date is provided, filter by it. For now, return all trips.
    return this.db.query.trips.findMany();
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
