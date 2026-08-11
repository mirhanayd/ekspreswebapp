import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Radio } from 'lucide-react';
import LiveMapView from './LiveMapView';
import { API_BASE_URL, authenticatedApiFetch } from '@/lib/server-api';

export const metadata = { title: 'Canlı takip' };

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
      <div className="page shell grid place-items-center">
        <div className="card max-w-md p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-ink-400">
            <Radio className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="title-md mt-4">Canlı takip kullanılamıyor</h1>
          <p className="subtle mt-2">
            {payload.message || 'Bu bilet şu anda canlı takip için uygun değil.'}
          </p>
          <p className="mt-3 text-2xs leading-5 text-ink-500">
            Canlı takip yalnızca aktif biletlerde ve sefer biniş aşamasına geçtiğinde açılır.
          </p>
          <Link href={`/tickets/${ticketId}`} className="btn btn-secondary mt-6">
            Bilete dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-var(--app-header-h)-var(--app-nav-h))] w-full overflow-hidden bg-ink-100">
      <LiveMapView bootstrap={await response.json()} socketOrigin={new URL(API_BASE_URL).origin} />
    </div>
  );
}
