import { Calendar, MapPin, Search } from 'lucide-react';
import { API_BASE_URL } from '@/lib/server-api';

type Location = { id: string; name: string; type: string };

export default async function Home() {
  let locations: Location[] = [];
  try {
    const response = await fetch(`${API_BASE_URL}/transport/locations`, { cache: 'no-store' });
    if (response.ok) locations = await response.json();
  } catch {
    // The form remains visible with an actionable infrastructure message.
  }
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <section className="flex flex-1 items-center bg-zinc-950 px-4 py-20 text-white">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-400">
              Siirt Kurtalan Ekspres
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Güvenli ve konforlu yolculuk
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-zinc-300">
              Siirt’ten Diyarbakır’a kolayca sefer bulun, koltuğunuzu seçin ve demo biletinizi alın.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-2xl md:p-6">
            {locations.length > 0 ? (
              <form className="grid grid-cols-1 gap-4 md:grid-cols-4" action="/search">
                <LocationSelect label="Nereden" name="originId" locations={locations} />
                <LocationSelect label="Nereye" name="destinationId" locations={locations} />
                <label className="block text-sm font-medium text-gray-700">
                  <span className="mb-1 block">Tarih</span>
                  <span className="relative block">
                    <Calendar className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      name="date"
                      defaultValue={tomorrow}
                      min={new Date().toISOString().slice(0, 10)}
                      required
                      className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-3 text-gray-900"
                    />
                  </span>
                </label>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800"
                  >
                    <Search className="h-5 w-5" /> Sefer Ara
                  </button>
                </div>
              </form>
            ) : (
              <p className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
                Sefer noktaları yüklenemedi. API ve demo verisinin çalıştığını doğrulayın.
              </p>
            )}
          </div>
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
    <label className="block text-sm font-medium text-gray-700">
      <span className="mb-1 block">{label}</span>
      <span className="relative block">
        <MapPin className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <select
          name={name}
          required
          defaultValue=""
          className="w-full appearance-none rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-3 text-gray-900"
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
