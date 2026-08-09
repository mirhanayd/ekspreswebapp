import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  console.log('Seeding locations...');

  // Seed basic locations
  const locations = await db
    .insert(schema.locations)
    .values([
      {
        name: 'Siirt Terminali',
        type: 'terminal',
        coordinates: { type: 'Point', coordinates: [41.9419, 37.9274] },
      },
      {
        name: 'Kurtalan Otogarı',
        type: 'terminal',
        coordinates: { type: 'Point', coordinates: [41.7058, 37.9261] },
      },
      {
        name: 'Batman Otogarı',
        type: 'terminal',
        coordinates: { type: 'Point', coordinates: [41.1322, 37.8812] },
      },
      {
        name: 'Diyarbakır (DİŞTİ)',
        type: 'terminal',
        coordinates: { type: 'Point', coordinates: [40.2189, 37.9144] },
      },
    ])
    .returning();

  console.log('Seeding routes...');

  const siirt = locations.find((l) => l.name === 'Siirt Terminali')!;
  const diyarbakir = locations.find((l) => l.name === 'Diyarbakır (DİŞTİ)')!;

  const [route] = await db
    .insert(schema.routes)
    .values([
      {
        name: 'Siirt - Diyarbakır (Ekspres)',
        originId: siirt.id,
        destinationId: diyarbakir.id,
      },
    ])
    .returning();

  const kurtalan = locations.find((l) => l.name === 'Kurtalan Otogarı')!;
  const batman = locations.find((l) => l.name === 'Batman Otogarı')!;

  await db.insert(schema.routeStops).values([
    { routeId: route.id, locationId: siirt.id, stopOrder: 1, estimatedMinutesFromStart: 0 },
    { routeId: route.id, locationId: kurtalan.id, stopOrder: 2, estimatedMinutesFromStart: 30 },
    { routeId: route.id, locationId: batman.id, stopOrder: 3, estimatedMinutesFromStart: 90 },
    { routeId: route.id, locationId: diyarbakir.id, stopOrder: 4, estimatedMinutesFromStart: 180 },
  ]);

  const seatLayoutItems = [];
  // 2+1 layout: columns 1,2 on left, column 4 on right, column 3 is aisle
  // Row 1: driver
  seatLayoutItems.push({ type: 'driver', row: 1, column: 1 });
  for (let row = 2; row <= 14; row++) {
    const leftSeatNo = (row - 2) * 3 + 1;
    seatLayoutItems.push({
      type: 'seat',
      seatNo: String(leftSeatNo),
      row,
      column: 1,
    });
    seatLayoutItems.push({
      type: 'seat',
      seatNo: String(leftSeatNo + 1),
      row,
      column: 2,
    });
    seatLayoutItems.push({ type: 'aisle', row, column: 3 });
    seatLayoutItems.push({
      type: 'seat',
      seatNo: String(leftSeatNo + 2),
      row,
      column: 4,
    });
  }

  const [bus] = await db
    .insert(schema.buses)
    .values([
      {
        plateNumber: '56 SKE 01',
        model: 'Travego 15 SHD',
        seatLayout: {
          layout: '2+1',
          rows: 14,
          columns: 4,
          items: seatLayoutItems,
        },
        totalSeats: 39,
      },
    ])
    .returning();

  console.log('Seeding trips...');

  const trips = [];
  for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
    const dep = new Date();
    dep.setDate(dep.getDate() + dayOffset);
    dep.setHours(9, 0, 0, 0);
    const arr = new Date(dep);
    arr.setHours(12, 0, 0, 0);

    const dep2 = new Date();
    dep2.setDate(dep2.getDate() + dayOffset);
    dep2.setHours(14, 0, 0, 0);
    const arr2 = new Date(dep2);
    arr2.setHours(17, 0, 0, 0);

    trips.push({
      routeId: route.id,
      busId: bus.id,
      departureTime: dep,
      arrivalTime: arr,
      status: 'scheduled',
      basePrice: 450.0,
    });
    trips.push({
      routeId: route.id,
      busId: bus.id,
      departureTime: dep2,
      arrivalTime: arr2,
      status: 'scheduled',
      basePrice: 450.0,
    });
  }

  const insertedTrips = await db.insert(schema.trips).values(trips).returning();

  console.log('Generating seat inventory...');

  const seatSeeds = seatLayoutItems.filter((item) => item.type === 'seat');
  for (const trip of insertedTrips) {
    const seatRows = seatSeeds.map((item) => ({
      tripId: trip.id,
      seatNo: item.seatNo!,
      seatType: 'standard',
      priceMinor: Math.round(trip.basePrice * 100),
      status: 'available',
      version: 1,
    }));
    await db.insert(schema.tripSeats).values(seatRows);
  }

  console.log('Seed complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
