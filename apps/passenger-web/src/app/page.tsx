import {
  ArrowRight,
  Calendar,
  Clock3,
  MapPin,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/server-api';

type Location = { id: string; name: string; type: string };

export default async function Home() {
  let locations: Location[] = [];
  try {
    const response = await fetch(`${API_BASE_URL}/transport/locations`, { cache: 'no-store' });
    if (response.ok) locations = await response.json();
  } catch {
    // Keep the branded search state visible with an actionable data message below.
  }
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="bg-stone-50">
      <section className="relative overflow-hidden bg-slate-950 px-4 pb-28 pt-16 text-white sm:pb-32 sm:pt-24">
        <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_75%_15%,rgba(220,38,38,.8),transparent_28%),linear-gradient(120deg,transparent_45%,rgba(255,255,255,.05)_45%,rgba(255,255,255,.05)_46%,transparent_46%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-red-400">
              <Sparkles className="h-4 w-4" /> Siirt'ten yola çık
            </p>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Yolculuğun kolay,
              <br />
              <span className="text-red-500">yerin hazır.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Seferini bul, gerçek koltuk planından seçimini yap ve otobüsünü yol boyunca canlı
              izle.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-200">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-red-400" /> Güvenli bilet
              </span>
              <span className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-red-400" /> Hızlı işlem
              </span>
              <span className="flex items-center gap-2">
                <Route className="h-5 w-5 text-red-400" /> Canlı takip
              </span>
            </div>
          </div>
          <div className="hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur lg:block">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold">Siirt Otogarı</span>
              <span className="rounded-full bg-red-700 px-3 py-1 text-xs font-bold">Yarın</span>
            </div>
            <div className="my-8 flex items-center">
              <span className="h-4 w-4 rounded-full border-4 border-red-500 bg-white" />
              <span className="h-0.5 flex-1 bg-gradient-to-r from-red-500 to-slate-600" />
              <span className="grid h-12 w-12 place-items-center rounded-full bg-red-700 text-2xl shadow-xl">
                🚌
              </span>
              <span className="h-0.5 flex-1 bg-slate-600" />
              <span className="h-4 w-4 rounded-full border-4 border-slate-500 bg-white" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Kurtalan • Batman</span>
              <span className="font-bold">Diyarbakır</span>
            </div>
          </div>
        </div>
      </section>

      <section
        id="sefer-ara"
        className="relative z-10 mx-auto -mt-16 max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="surface-card p-4 sm:p-6 lg:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Biletini bul</p>
              <h2 className="mt-1 text-xl font-black sm:text-2xl">Nereye gidiyorsun?</h2>
            </div>
            <span className="hidden text-sm text-slate-500 sm:block">Tek yön • Demo ödeme</span>
          </div>
          {locations.length ? (
            <form
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_.85fr_auto]"
              action="/search"
            >
              <LocationSelect label="Nereden" name="originId" locations={locations} />
              <LocationSelect label="Nereye" name="destinationId" locations={locations} />
              <label className="block text-sm font-bold text-slate-700">
                <span className="mb-2 block">Yolculuk tarihi</span>
                <span className="relative block">
                  <Calendar className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-red-700" />
                  <input
                    type="date"
                    name="date"
                    defaultValue={tomorrow}
                    min={new Date().toISOString().slice(0, 10)}
                    required
                    className="field-control pl-11"
                  />
                </span>
              </label>
              <div className="flex items-end">
                <button type="submit" className="primary-action w-full whitespace-nowrap lg:w-auto">
                  <Search className="h-5 w-5" /> Sefer Ara
                </button>
              </div>
            </form>
          ) : (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
              Sefer noktaları yüklenemedi. API ve demo verisinin çalıştığını doğrulayın.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['01', 'Seferini bul', 'Siirt, Kurtalan ve bölge hatlarında güncel demo seferleri.'],
            ['02', 'Koltuğunu seç', '2+1 otobüs planında uygun koltuğu anında ayır.'],
            ['03', 'Yolculuğu izle', 'Aktif biletinle aracı gerçek rota üzerinde canlı takip et.'],
          ].map(([number, title, copy]) => (
            <article key={number} className="surface-card group p-6">
              <span className="text-3xl font-black text-red-700/25 transition group-hover:text-red-700">
                {number}
              </span>
              <h3 className="mt-5 text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              <ArrowRight className="mt-5 h-5 w-5 text-red-700" />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function LocationSelect({
  label,
  name,
  locations,
}: {
  label: string;
  name: string;
  locations: Location[];
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      <span className="mb-2 block">{label}</span>
      <span className="relative block">
        <MapPin className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-red-700" />
        <select
          name={name}
          required
          defaultValue=""
          className="field-control appearance-none pl-11"
        >
          <option value="" disabled>
            Terminal seçin
          </option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
