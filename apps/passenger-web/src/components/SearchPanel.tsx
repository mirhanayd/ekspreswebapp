'use client';

import { useState } from 'react';
import { ArrowUpDown, CalendarDays, MapPin, Search } from 'lucide-react';
import { isoDate } from '@/lib/format';

export type SearchLocation = { id: string; name: string };

const quickDates = [
  { label: 'Bugün', offset: 0 },
  { label: 'Yarın', offset: 1 },
  { label: 'Sonraki gün', offset: 2 },
];

export function SearchPanel({
  locations,
  defaultOriginId = '',
  defaultDestinationId = '',
  defaultDate,
  compact = false,
}: {
  locations: SearchLocation[];
  defaultOriginId?: string;
  defaultDestinationId?: string;
  defaultDate: string;
  compact?: boolean;
}) {
  const [originId, setOriginId] = useState(defaultOriginId);
  const [destinationId, setDestinationId] = useState(defaultDestinationId);
  const [date, setDate] = useState(defaultDate);
  const today = isoDate(0);

  return (
    <form action="/search" className={compact ? 'grid gap-3' : 'grid gap-4'}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end sm:gap-2">
        <LocationField
          label="Nereden"
          name="originId"
          value={originId}
          onChange={setOriginId}
          locations={locations}
        />
        <div className="-my-3 flex justify-center sm:my-0 sm:pb-1">
          <button
            type="button"
            onClick={() => {
              setOriginId(destinationId);
              setDestinationId(originId);
            }}
            aria-label="Kalkış ve varış noktasını değiştir"
            className="grid h-11 w-11 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 shadow-card transition hover:border-brand-300 hover:text-brand-700"
          >
            <ArrowUpDown className="h-4 w-4 sm:rotate-90" aria-hidden />
          </button>
        </div>
        <LocationField
          label="Nereye"
          name="destinationId"
          value={destinationId}
          onChange={setDestinationId}
          locations={locations}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label className="block">
            <span className="field-label">Yolculuk tarihi</span>
            <span className="relative block">
              <span className="field-icon">
                <CalendarDays aria-hidden />
              </span>
              <input
                type="date"
                name="date"
                value={date}
                min={today}
                required
                onChange={(event) => setDate(event.target.value)}
                className="field field-with-icon"
              />
            </span>
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickDates.map(({ label, offset }) => {
              const value = isoDate(offset);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDate(value)}
                  aria-pressed={date === value}
                  className={`chip !min-h-8 !px-3 !text-2xs ${date === value ? 'chip-active' : ''}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <button type="submit" className="btn btn-primary w-full sm:w-auto sm:px-8">
          <Search className="h-4 w-4" aria-hidden />
          Sefer Ara
        </button>
      </div>
    </form>
  );
}

function LocationField({
  label,
  name,
  value,
  onChange,
  locations,
}: {
  label: string;
  name: string;
  value: string;
  onChange: React.Dispatch<React.SetStateAction<string>>;
  locations: SearchLocation[];
}) {
  return (
    <label className="block min-w-0">
      <span className="field-label">{label}</span>
      <span className="relative block">
        <span className="field-icon">
          <MapPin aria-hidden />
        </span>
        <select
          name={name}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="field select field-with-icon"
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
