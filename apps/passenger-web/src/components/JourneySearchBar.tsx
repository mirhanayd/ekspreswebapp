'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, MapPin, Search } from 'lucide-react';
import { Calendar } from './Calendar';
import { Sheet } from './Sheet';
import type { SearchLocation } from './SearchPanel';
import { dateFromIso, isoDate, placeShortName } from '@/lib/format';
import { nearestLocation } from '@/lib/nearest';

type Picker = null | 'origin' | 'destination' | 'date';

/**
 * The journey editor: origin, destination and date sit side by side in a single
 * bar with a round search control, and the whole bar renders whether or not the
 * locations endpoint answered — an empty list simply leaves the fields waiting
 * rather than hiding the search.
 *
 * The origin defaults to the terminal closest to the device, and stays freely
 * changeable.
 */
export function JourneySearchBar({
  locations,
  defaultOriginId = '',
  defaultDestinationId = '',
  defaultDate,
  onOriginResolved,
}: {
  locations: SearchLocation[];
  defaultOriginId?: string;
  defaultDestinationId?: string;
  defaultDate?: string;
  /** Reports the auto-detected origin so the screen can name the user's area. */
  onOriginResolved?: React.Dispatch<SearchLocation | null>;
}) {
  const router = useRouter();
  const [originId, setOriginId] = useState(defaultOriginId);
  const [destinationId, setDestinationId] = useState(defaultDestinationId);
  const [date, setDate] = useState(defaultDate || isoDate(0));
  const [picker, setPicker] = useState<Picker>(null);
  const [autoOrigin, setAutoOrigin] = useState(false);

  const byId = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const origin = byId.get(originId) ?? null;
  const destination = byId.get(destinationId) ?? null;

  // Default the origin to the closest served terminal, unless one is already set.
  useEffect(() => {
    if (defaultOriginId || autoOrigin || !locations.length) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const match = nearestLocation(locations, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setAutoOrigin(true);
        if (match) {
          setOriginId((current) => current || match.id);
          onOriginResolved?.(match);
        } else {
          onOriginResolved?.(null);
        }
      },
      () => {
        if (!cancelled) {
          setAutoOrigin(true);
          onOriginResolved?.(null);
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );

    return () => {
      cancelled = true;
    };
  }, [locations, defaultOriginId, autoOrigin, onOriginResolved]);

  function submit() {
    const params = new URLSearchParams();
    if (originId) params.set('originId', originId);
    if (destinationId) params.set('destinationId', destinationId);
    if (date) params.set('date', date);
    router.push(`/search?${params.toString()}`);
  }

  const dateLabel = dateFromIso(date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <>
      <div className="flex items-stretch gap-2 rounded-[1.5rem] bg-white p-2 shadow-card">
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,5.25rem)] items-stretch">
          <Slot
            label="Nereden"
            value={origin ? placeShortName(origin.name) : 'Seç'}
            muted={!origin}
            onClick={() => setPicker('origin')}
          />
          <Slot
            label="Nereye"
            value={destination ? placeShortName(destination.name) : 'Seç'}
            muted={!destination}
            divided
            onClick={() => setPicker('destination')}
          />
          <Slot label="Tarih" value={dateLabel} divided onClick={() => setPicker('date')} />
        </div>

        <button
          type="button"
          onClick={submit}
          aria-label="Sefer ara"
          className="grid h-auto w-12 shrink-0 place-items-center self-stretch rounded-[1.125rem] bg-ink-900 text-white transition hover:bg-ink-800"
        >
          <Search className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* Swap, kept out of the bar so the three fields keep their width. */}
      {origin || destination ? (
        <button
          type="button"
          onClick={() => {
            setOriginId(destinationId);
            setDestinationId(originId);
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-ink-500 transition hover:text-ink-900"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
          Yönü değiştir
        </button>
      ) : null}

      <Sheet
        open={picker === 'origin' || picker === 'destination'}
        onClose={() => setPicker(null)}
        title={picker === 'destination' ? 'Nereye gidiyorsun?' : 'Nereden kalkıyorsun?'}
      >
        <LocationList
          locations={locations}
          selectedId={picker === 'destination' ? destinationId : originId}
          excludeId={picker === 'destination' ? originId : destinationId}
          onPick={(id) => {
            if (picker === 'destination') setDestinationId(id);
            else setOriginId(id);
            setPicker(null);
          }}
        />
      </Sheet>

      <Sheet open={picker === 'date'} onClose={() => setPicker(null)} title="Yolculuk tarihi">
        <Calendar
          value={date}
          onSelect={(iso) => {
            setDate(iso);
            setPicker(null);
          }}
        />
      </Sheet>
    </>
  );
}

function Slot({
  label,
  value,
  muted = false,
  divided = false,
  onClick,
}: {
  label: string;
  value: string;
  muted?: boolean;
  divided?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-[1.125rem] px-3 py-2 text-left transition hover:bg-cream-100 ${
        divided ? 'border-l border-ink-900/[0.08]' : ''
      }`}
    >
      <span className="block truncate text-[0.625rem] font-bold uppercase tracking-[0.12em] text-ink-400">
        {label}
      </span>
      <span
        className={`mt-0.5 block truncate font-display text-[0.9375rem] font-bold ${
          muted ? 'text-ink-300' : 'text-ink-900'
        }`}
      >
        {value}
      </span>
    </button>
  );
}

function LocationList({
  locations,
  selectedId,
  excludeId,
  onPick,
}: {
  locations: SearchLocation[];
  selectedId: string;
  excludeId: string;
  onPick: React.Dispatch<string>;
}) {
  const [query, setQuery] = useState('');
  const filtered = locations.filter(
    (location) =>
      location.id !== excludeId &&
      location.name.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')),
  );

  if (!locations.length)
    return (
      <p className="alert-info">
        Terminal listesi şu anda yüklenemedi. Bağlantı geri geldiğinde buradan seçim yapabilirsiniz.
      </p>
    );

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Terminal ara</span>
        <span className="field-icon">
          <MapPin aria-hidden />
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Terminal ara"
          className="field field-with-icon"
        />
      </label>

      <ul className="mt-3 max-h-[45dvh] space-y-1 overflow-y-auto">
        {filtered.length ? (
          filtered.map((location) => (
            <li key={location.id}>
              <button
                type="button"
                onClick={() => onPick(location.id)}
                aria-pressed={location.id === selectedId}
                className={`flex w-full items-center gap-3 rounded-[1.125rem] px-3 py-3 text-left transition ${
                  location.id === selectedId ? 'bg-lime-400' : 'hover:bg-cream-100'
                }`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-900/[0.07] text-ink-700">
                  <MapPin className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[0.9375rem] font-bold text-ink-900">
                    {placeShortName(location.name)}
                  </span>
                  <span className="block truncate text-[0.75rem] text-ink-500">
                    {location.name}
                  </span>
                </span>
              </button>
            </li>
          ))
        ) : (
          <li className="px-3 py-6 text-center text-sm text-ink-500">Sonuç bulunamadı.</li>
        )}
      </ul>
    </div>
  );
}
