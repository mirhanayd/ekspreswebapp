import { redirect } from 'next/navigation';
import LiveMapView from './LiveMapView';
import { API_BASE_URL, authenticatedApiFetch } from '@/lib/server-api';

export default async function LiveTrackingPage({
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ticketId?: string }>;
}) {
  const { ticketId } = await searchParams;
  if (!ticketId) redirect('/tickets');

  const response = await authenticatedApiFetch(`/tracking/tickets/${ticketId}/bootstrap`);
  if (!response || response.status === 401) {
    redirect(`/login?returnTo=${encodeURIComponent(`/tickets/${ticketId}`)}`);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Canlı takip kullanılamıyor</h1>
          <p className="mt-2 text-gray-600">
            {payload.message || 'Bu bilet canlı takip için uygun değil.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-gray-50">
      <LiveMapView bootstrap={await response.json()} socketOrigin={new URL(API_BASE_URL).origin} />
    </div>
  );
}
