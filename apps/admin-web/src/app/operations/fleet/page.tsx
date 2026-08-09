import FleetMapView from './FleetMapView';
import { cookies } from 'next/headers';

async function getActiveTrips() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  
  if (!token) return [];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  try {
    const res = await fetch(`${apiUrl}/trips?status=in_transit`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

export default async function FleetPage() {
  const trips = await getActiveTrips();
  return <FleetMapView initialTrips={trips} />;
}
