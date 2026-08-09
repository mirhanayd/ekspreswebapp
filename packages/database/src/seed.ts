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
  const locations = await db.insert(schema.locations).values([
    {
      name: 'Siirt Terminali',
      type: 'terminal',
      coordinates: { type: 'Point', coordinates: [41.9419, 37.9274] }
    },
    {
      name: 'Kurtalan Otogarı',
      type: 'terminal',
      coordinates: { type: 'Point', coordinates: [41.7058, 37.9261] }
    },
    {
      name: 'Batman Otogarı',
      type: 'terminal',
      coordinates: { type: 'Point', coordinates: [41.1322, 37.8812] }
    },
    {
      name: 'Diyarbakır (DİŞTİ)',
      type: 'terminal',
      coordinates: { type: 'Point', coordinates: [40.2189, 37.9144] }
    }
  ]).returning();
  
  console.log('Seeding routes...');
  
  const siirt = locations.find(l => l.name === 'Siirt Terminali')!;
  const diyarbakir = locations.find(l => l.name === 'Diyarbakır (DİŞTİ)')!;
  
  const [route] = await db.insert(schema.routes).values([
    {
      name: 'Siirt - Diyarbakır (Ekspres)',
      originId: siirt.id,
      destinationId: diyarbakir.id,
    }
  ]).returning();
  
  const kurtalan = locations.find(l => l.name === 'Kurtalan Otogarı')!;
  const batman = locations.find(l => l.name === 'Batman Otogarı')!;
  
  await db.insert(schema.routeStops).values([
    { routeId: route.id, locationId: siirt.id, stopOrder: 1, estimatedMinutesFromStart: 0 },
    { routeId: route.id, locationId: kurtalan.id, stopOrder: 2, estimatedMinutesFromStart: 30 },
    { routeId: route.id, locationId: batman.id, stopOrder: 3, estimatedMinutesFromStart: 90 },
    { routeId: route.id, locationId: diyarbakir.id, stopOrder: 4, estimatedMinutesFromStart: 180 },
  ]);
  
  console.log('Seeding buses...');
  
  const [bus] = await db.insert(schema.buses).values([
    {
      plateNumber: '56 SKE 01',
      model: 'Travego 15 SHD',
      seatLayout: { layout: '2+1', seats: 41 },
      totalSeats: 41,
    }
  ]).returning();
  
  console.log('Seeding trips...');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0); // 09:00
  
  const arrival = new Date(tomorrow);
  arrival.setHours(12, 0, 0, 0); // 12:00
  
  await db.insert(schema.trips).values([
    {
      routeId: route.id,
      busId: bus.id,
      departureTime: tomorrow,
      arrivalTime: arrival,
      status: 'scheduled',
      basePrice: 450.00,
    }
  ]);
  
  console.log('Seed complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
