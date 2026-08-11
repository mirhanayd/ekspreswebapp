import Link from 'next/link';
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
  if (!response || response.status === 401)
    redirect(`/login?returnTo=${encodeURIComponent(`/tickets/${ticketId}`)}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return (
      <div className="page-shell grid place-items-center">
        <div className="surface-card max-w-md p-8 text-center">
          <h1 className="text-xl font-black">Canlı takip kullanılamıyor</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {payload.message || 'Bu bilet canlı takip için uygun değil.'}
          </p>
          <Link href={`/tickets/${ticketId}`} className="secondary-action mt-6">
            Bilete dön
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="h-[calc(100dvh-4.5rem)] w-full overflow-hidden bg-stone-100">
      <LiveMapView bootstrap={await response.json()} socketOrigin={new URL(API_BASE_URL).origin} />
    </div>
  );
}
