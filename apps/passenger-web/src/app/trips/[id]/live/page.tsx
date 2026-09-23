import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Radio } from 'lucide-react';
import { ServerError, trackingService } from '@ekspres/database';
import LiveMapView from './LiveMapView';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getAccessToken } from '@/lib/server-api';
import { requirePassengerToken } from '@/lib/server-auth';

export const metadata = { title: 'Canlı takip' };

export default async function LiveTrackingPage({
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ticketId?: string }>;
}) {
  const { ticketId } = await searchParams;
  if (!ticketId) redirect('/tickets');

  let bootstrap;
  try {
    const principal = await requirePassengerToken(await getAccessToken());
    bootstrap = await trackingService.getBootstrap(ticketId, principal.id);
  } catch (error) {
    if (error instanceof ServerError && error.status === 401) {
      redirect(`/login?returnTo=${encodeURIComponent(`/tickets/${ticketId}`)}`);
    }
    const message = error instanceof ServerError ? error.message : undefined;
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
              {message || 'Bu bilet şu anda canlı takip için uygun değil.'}
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
      <LiveMapView bootstrap={bootstrap} />
    </div>
  );
}
