import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Radio } from 'lucide-react';
import { ServerError, trackingService } from '@ekspres/database';
import LiveTracking from './LiveTracking';
import { BackButton } from '@/components/nav/BackButton';
import { getAccessToken } from '@/lib/server-api';
import { requirePassengerToken } from '@/lib/server-auth';

export const metadata = { title: 'Canlı takip' };
export const dynamic = 'force-dynamic';

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
      <div className="flex min-h-[100dvh] flex-col gap-4 px-4 pt-3.5">
        <BackButton fallback={`/tickets/${ticketId}`} label="Bilete dön" />
        <div className="surface flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-sk-bg text-sk-ink3">
            <Radio size={26} aria-hidden />
          </span>
          <h1 className="m-0 text-lg font-extrabold">Canlı takip kullanılamıyor</h1>
          <p className="m-0 max-w-[270px] text-sm text-sk-ink2">
            {message || 'Bu bilet şu anda canlı takip için uygun değil.'}
          </p>
          <p className="m-0 max-w-[270px] text-[13px] text-sk-ink3">
            Canlı takip yalnızca aktif biletlerde ve sefer biniş aşamasına geçtiğinde açılır.
          </p>
          <Link
            href={`/tickets/${ticketId}`}
            data-nav="back"
            className="btn btn-brand mt-4 no-underline"
          >
            Bilete dön
          </Link>
        </div>
      </div>
    );
  }

  return <LiveTracking bootstrap={bootstrap as never} />;
}
