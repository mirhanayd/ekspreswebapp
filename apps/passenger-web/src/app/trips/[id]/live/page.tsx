import LiveMapView from './LiveMapView';
import { notFound } from 'next/navigation';

export default async function LiveTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ticketId?: string }>;
}) {
  const { id } = await params;
  const { ticketId } = await searchParams;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  let trip = null;

  try {
    const res = await fetch(`${apiUrl}/transport/trips/${id}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      trip = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch trip for live tracking', err);
  }

  if (!trip) {
    return notFound();
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-gray-50">
      <LiveMapView trip={trip} ticketId={ticketId} />
    </div>
  );
}
