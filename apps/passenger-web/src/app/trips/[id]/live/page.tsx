import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Radio } from 'lucide-react';
import LiveMapView from './LiveMapView';
import { ScreenHeader } from '@/components/ScreenHeader';
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
      <div className="canvas-sage min-h-[100dvh]">
        <div className="screen screen-pad">
          <ScreenHeader backHref={`/tickets/${ticketId}`} backLabel="Bilete dön" />
          <div className="empty-state mt-6">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-sage-200 text-ink-400">
              <Radio className="h-7 w-7" aria-hidden />
            </span>
            <h1 className="title-md mt-4">Canlı takip kullanılamıyor</h1>
            <p className="subtle mt-2 max-w-xs">
              {payload.message || 'Bu bilet şu anda canlı takip için uygun değil.'}
            </p>
            <p className="caption mt-3 max-w-xs leading-5">
              Canlı takip yalnızca aktif biletlerde ve sefer biniş aşamasına geçtiğinde açılır.
            </p>
            <Link href={`/tickets/${ticketId}`} className="btn btn-primary mt-6">
              Bilete dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-sage-200">
      <LiveMapView bootstrap={await response.json()} socketOrigin={new URL(API_BASE_URL).origin} />
    </div>
  );
}
