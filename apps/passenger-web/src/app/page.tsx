import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Armchair,
  BusFront,
  CircleCheck,
  Clock3,
  MapPin,
  QrCode,
  Radio,
  Search,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import { API_BASE_URL, authenticatedApiFetch } from '@/lib/server-api';
import { SearchPanel, type SearchLocation } from '@/components/SearchPanel';
import {
  formatDayMonth,
  formatDuration,
  formatPrice,
  formatTime,
  isoDate,
  minutesBetween,
  tripStatusLabel,
} from '@/lib/format';

type Location = SearchLocation & { type: string };
type Route = { id: string; name: string; originId: string; destinationId: string };
type TripResult = {
  trip: { id: string; departureTime: string; arrivalTime: string; basePrice: number };
  route: { name: string; originId: string; destinationId: string };
  bus: { model: string; plateNumber: string; seatLayout?: { layout?: string } };
};
type ActiveTicket = {
  id: string;
  ticketNo: string;
  tripSeat: { seatNo: string };
  trip: {
    id: string;
    status: string;
    departureTime: string;
    route: { origin: { name: string }; destination: { name: string } };
  };
};

async function loadJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    // The page keeps its branded shell and shows an actionable data notice.
    return fallback;
  }
}

async function loadActiveTicket(): Promise<ActiveTicket | null> {
  try {
    const response = await authenticatedApiFetch('/tickets');
    if (!response?.ok) return null;
    const data = await response.json();
    return (data.active as ActiveTicket[])?.[0] ?? null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const [locations, routes, trips, activeTicket] = await Promise.all([
    loadJson<Location[]>('/transport/locations', []),
    loadJson<Route[]>('/transport/routes', []),
    loadJson<TripResult[]>('/transport/trips', []),
    loadActiveTicket(),
  ]);

  const names = new Map(locations.map((location) => [location.id, location.name]));
  const popular = routes
    .filter((route) => names.has(route.originId) && names.has(route.destinationId))
    .slice(0, 5);
  const tomorrow = isoDate(1);

  const featured = trips
    .filter((item) => new Date(item.trip.departureTime).getTime() > Date.now())
    .sort(
      (a, b) =>
        new Date(a.trip.departureTime).getTime() - new Date(b.trip.departureTime).getTime(),
    )[0];

  return (
    <>
      {/* ---------------------------------------------------------------- *
       * Hero: greeting, headline, quick routes, featured service card
       * ---------------------------------------------------------------- */}
      <section className="shell-wide pb-8 pt-5 sm:pt-8">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-base font-bold text-ink-900">
            Merhaba{' '}
            <span aria-hidden className="inline-block">
              👋
            </span>
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-2xs font-bold text-ink-700">
            <Clock3 className="h-3.5 w-3.5 text-brand-600" aria-hidden />
            {formatDayMonth(new Date())}
          </span>
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-1.5">
              <BusFront className="h-3.5 w-3.5" aria-hidden />
              Siirt · Kurtalan · Batman · Diyarbakır
            </p>
            <h1 className="title-xl mt-3">
              Yolculuğun kolay,
              <br />
              <span className="text-brand-700">yerin hazır.</span>
            </h1>
          </div>
          <a
            href="#sefer-ara"
            aria-label="Sefer arama formuna git"
            className="icon-btn icon-btn-dark h-14 w-14 sm:h-16 sm:w-16"
          >
            <Search className="h-5 w-5" aria-hidden />
          </a>
        </div>

        {popular.length ? (
          <ul className="hide-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {popular.map((route, index) => (
              <li key={route.id}>
                <Link
                  href={`/search?originId=${route.originId}&destinationId=${route.destinationId}&date=${tomorrow}`}
                  className={`chip ${index === 0 ? 'chip-active' : ''}`}
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {names.get(route.originId)} – {names.get(route.destinationId)}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Featured service */}
        <figure className="relative mt-5 overflow-hidden rounded-[1.75rem] sm:rounded-4xl">
          <div className="relative h-[22rem] w-full sm:h-[24rem] lg:h-[26rem]">
            <Image
              src="/brand/coach.jpg"
              alt="Siirt Kurtalan Ekspres filosuna ait şehirlerarası otobüs"
              fill
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="object-cover"
              priority
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/10"
              aria-hidden
            />
          </div>

          <figcaption className="absolute inset-x-0 bottom-0 p-5 text-center text-white sm:p-7">
            {featured ? (
              <>
                <p className="text-2xs font-bold uppercase tracking-[0.18em] text-brand-300">
                  Öne çıkan sefer · {formatDayMonth(featured.trip.departureTime)}
                </p>
                <p className="mx-auto mt-2 flex max-w-lg flex-wrap items-center justify-center gap-x-2.5 font-display text-xl font-extrabold sm:text-2xl">
                  <span className="truncate">{names.get(featured.route.originId)}</span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                  <span className="truncate">{names.get(featured.route.destinationId)}</span>
                </p>
                <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-ink-200">
                  <li className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                    {formatTime(featured.trip.departureTime)} kalkış
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Armchair className="h-3.5 w-3.5" aria-hidden />
                    {featured.bus.seatLayout?.layout || '2+1'} düzen
                  </li>
                  <li className="flex items-center gap-1.5">
                    <BusFront className="h-3.5 w-3.5" aria-hidden />
                    {formatPrice(featured.trip.basePrice)}
                  </li>
                </ul>
                <span className="duration-pill mt-4">
                  <Clock3 className="h-3 w-3" aria-hidden />
                  {formatDuration(
                    minutesBetween(featured.trip.departureTime, featured.trip.arrivalTime),
                  )}
                </span>
                <div className="mt-4">
                  <Link href={`/trips/${featured.trip.id}`} className="btn btn-outline-invert">
                    Seferi incele
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-extrabold sm:text-2xl">
                  Bölgenin güvenilir ekspres hattı
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-ink-200">
                  Modern filo, 2+1 konforlu koltuk düzeni ve canlı sefer takibi.
                </p>
                <div className="mt-4">
                  <a href="#sefer-ara" className="btn btn-outline-invert">
                    Sefer ara
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                </div>
              </>
            )}
          </figcaption>
        </figure>
      </section>

      {/* ---------------------------------------------------------------- *
       * Search
       * ---------------------------------------------------------------- */}
      <div className="shell-wide">
        <section
          id="sefer-ara"
          aria-labelledby="sefer-ara-baslik"
          className="card scroll-mt-[calc(var(--app-header-h)+1rem)] p-4 sm:p-6"
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Bilet al</p>
              <h2 id="sefer-ara-baslik" className="title-lg mt-1">
                Nereye gidiyorsun?
              </h2>
            </div>
            <span className="badge badge-muted">Tek yön · Yolcu başına fiyat</span>
          </div>

          {locations.length ? (
            <SearchPanel locations={locations} defaultDate={tomorrow} />
          ) : (
            <p role="alert" className="alert-error">
              Sefer noktaları şu anda yüklenemedi. Lütfen bir süre sonra tekrar deneyin.
            </p>
          )}
        </section>
      </div>

      {/* ---------------------------------------------------------------- *
       * Active ticket shortcut
       * ---------------------------------------------------------------- */}
      {activeTicket ? (
        <div className="shell-wide mt-4">
          <article className="panel panel-sheen flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex min-w-0 items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-700">
                <Ticket className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="eyebrow-invert">Yaklaşan yolculuğun</p>
                <p className="mt-1 truncate font-display text-lg font-bold">
                  {activeTicket.trip.route.origin.name} → {activeTicket.trip.route.destination.name}
                </p>
                <p className="mt-0.5 truncate text-sm text-ink-300">
                  {formatDayMonth(activeTicket.trip.departureTime)} ·{' '}
                  {formatTime(activeTicket.trip.departureTime)} · Koltuk{' '}
                  {activeTicket.tripSeat.seatNo} ·{' '}
                  {tripStatusLabel[activeTicket.trip.status] ?? activeTicket.trip.status}
                </p>
              </div>
            </div>
            <Link
              href={`/tickets/${activeTicket.id}`}
              className="btn btn-primary relative w-full shrink-0 sm:w-auto"
            >
              Bileti aç
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </article>
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- *
       * How it works
       * ---------------------------------------------------------------- */}
      <section
        id="nasil-calisir"
        className="mt-10 scroll-mt-[calc(var(--app-header-h)+1rem)] bg-white py-12 sm:py-16"
      >
        <div className="shell-wide">
          <SectionHeader
            eyebrow="Nasıl çalışır?"
            title="Üç adımda biletin cebinde"
            description="Aramadan binişe kadar tüm süreç aynı ekranda ilerler."
          />
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Seferini bul',
                copy: 'Kalkış, varış ve tarihi seç; uygun seferleri saat, süre ve fiyatla karşılaştır.',
                icon: BusFront,
              },
              {
                step: '02',
                title: 'Koltuğunu ayır',
                copy: '2+1 yerleşim planında boş koltuğu seç; yerin ödeme tamamlanana kadar sana ayrılır.',
                icon: Armchair,
              },
              {
                step: '03',
                title: 'Yolculuğu izle',
                copy: 'QR biletin hesabına düşer, sefer başladığında aracı harita üzerinde canlı takip et.',
                icon: Radio,
              },
            ].map(({ step, title, copy, icon: Icon }) => (
              <li key={step} className="card card-pad relative overflow-hidden">
                <span
                  className="absolute -right-1 -top-4 font-display text-6xl font-extrabold text-ink-100"
                  aria-hidden
                >
                  {step}
                </span>
                <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="title-md relative mt-4">{title}</h3>
                <p className="subtle relative mt-1.5">{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- *
       * Service promise
       * ---------------------------------------------------------------- */}
      <section className="shell-wide py-12 sm:py-16">
        <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <SectionHeader
              eyebrow="Neden Siirt Kurtalan Ekspres?"
              title="Bölgeyi bilen ekip, güvenilir sefer"
              description="Yerel hatlarda uzun yıllara dayanan operasyon deneyimi; modern filo ve şeffaf biletleme ile birlikte."
            />
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Stat value={`${locations.length || '—'}`} label="Terminal ve durak" />
              <Stat value={`${routes.length || '—'}`} label="Tanımlı hat" />
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: Armchair,
                title: '2+1 geniş koltuk',
                copy: 'Filo standardı geniş aralıklı, yatabilen koltuk düzeni.',
              },
              {
                icon: ShieldCheck,
                title: 'Güvenli biletleme',
                copy: 'Bilet ve koltuk işlemleri sunucu tarafında doğrulanır.',
              },
              {
                icon: QrCode,
                title: 'Temassız biniş',
                copy: 'QR biletini göster, biniş saniyeler içinde tamamlansın.',
              },
              {
                icon: CircleCheck,
                title: 'Dakik sefer',
                copy: 'Duraklar ve tahmini varış süreleri sefer planında görünür.',
              },
            ].map(({ icon: Icon, title, copy }) => (
              <li key={title} className="card card-pad">
                <Icon className="h-5 w-5 text-brand-700" aria-hidden />
                <h3 className="mt-3 font-display text-base font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-600">{copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="title-lg mt-1.5">{title}</h2>
      {description ? <p className="subtle mt-2">{description}</p> : null}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card card-pad">
      <p className="font-display text-3xl font-extrabold text-brand-700">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
    </div>
  );
}
