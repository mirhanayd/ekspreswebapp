import { ArrowRight, CreditCard, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import CheckoutForm from './CheckoutForm';
import { API_BASE_URL } from '@/lib/server-api';

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ seatNo?: string; holdId?: string }>;
}) {
  const { id } = await params;
  const { seatNo, holdId } = await searchParams;
  if (!seatNo || !holdId)
    return (
      <div className="page-shell grid place-items-center">
        <div className="surface-card max-w-md p-8 text-center">
          <h1 className="text-xl font-black">Koltuk seçimi gerekli</h1>
          <p className="mt-2 text-sm text-slate-500">
            Ödeme adımına geçmeden önce uygun bir koltuk ayırın.
          </p>
          <Link href={`/trips/${id}/seats`} className="primary-action mt-6">
            Koltuk seçimine dön
          </Link>
        </div>
      </div>
    );
  let routeName = 'Sefer';
  let priceMinor: number | null = null;
  try {
    const [tripResponse, seatResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/transport/trips/${id}`, { cache: 'no-store' }),
      fetch(`${API_BASE_URL}/seats/trip/${id}`, { cache: 'no-store' }),
    ]);
    if (tripResponse.ok && seatResponse.ok) {
      const [trip, seats] = await Promise.all([tripResponse.json(), seatResponse.json()]);
      routeName = `${trip.route?.origin?.name || ''} → ${trip.route?.destination?.name || ''}`;
      priceMinor =
        seats.seats?.find((seat: { seatNo: string }) => seat.seatNo === seatNo)?.priceMinor ?? null;
    }
  } catch {
    // The verified price guard below prevents checkout with incomplete data.
  }
  if (priceMinor === null)
    return (
      <div className="page-shell grid place-items-center">
        <p className="rounded-xl bg-red-50 p-5 font-semibold text-red-800">
          Koltuk fiyatı doğrulanamadı.
        </p>
      </div>
    );
  return (
    <div className="page-shell">
      <div className="mx-auto max-w-3xl space-y-5">
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Link href={`/trips/${id}/seats`} className="hover:text-red-700">
            Koltuk seçimi
          </Link>
          <ArrowRight className="h-4 w-4" />
          <span className="text-slate-900">Yolcu ve ödeme</span>
        </nav>
        <header className="rounded-2xl bg-slate-950 p-6 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-700">
              <CreditCard />
            </span>
            <div>
              <p className="eyebrow !text-red-400">Son adım</p>
              <h1 className="text-2xl font-black">Biletinizi tamamlayın</h1>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <ShieldCheck className="h-4 w-4 text-red-400" /> Fiyat sunucu tarafından doğrulanır.
            Kart bilgisi alınmaz.
          </p>
        </header>
        <div className="surface-card p-5 sm:p-7">
          <CheckoutForm
            tripId={id}
            seatNo={seatNo}
            holdId={holdId}
            priceMinor={priceMinor}
            routeName={routeName}
          />
        </div>
      </div>
    </div>
  );
}
