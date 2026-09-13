'use client';

import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { useDriver } from '@/features/driver/DriverProvider';
import { DriverScreen } from '@/features/driver/DriverUI';
import { PassengerCard } from '@/features/driver/PassengerCard';
import type { PassengerStatus } from '@/features/driver/demo';

const filters: { value: PassengerStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'waiting', label: 'Bekleyen' },
  { value: 'boarded', label: 'Bindi' },
  { value: 'missed', label: 'Binmedi' },
];

export default function PassengersPage() {
  const { passengers } = useDriver();
  const [filter, setFilter] = useState<PassengerStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const visible = passengers.filter(
    (p) =>
      (filter === 'all' || p.status === filter) &&
      `${p.name} ${p.seat}`
        .toLocaleLowerCase('tr-TR')
        .includes(query.trim().toLocaleLowerCase('tr-TR')),
  );
  return (
    <DriverScreen title="Yolcuların burada." eyebrow="Aktif sefer · 16 yolcu">
      <div>
        <label htmlFor="passenger-search" className="field-label">
          Yolcu veya koltuk ara
        </label>
        <div className="relative">
          <span className="field-icon">
            <Search aria-hidden />
          </span>
          <input
            id="passenger-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ad soyad veya koltuk numarası"
            className="field field-with-icon"
            type="search"
          />
        </div>
      </div>
      <div className="rail-scroll" role="group" aria-label="Yolcu durumu filtresi">
        {filters.map((item) => (
          <button
            className={`chip chip-sm ${filter === item.value ? 'chip-active' : ''}`}
            type="button"
            key={item.value}
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
            <span className="num opacity-70">
              {passengers.filter((p) => item.value === 'all' || p.status === item.value).length}
            </span>
          </button>
        ))}
      </div>
      <p className="caption" aria-live="polite">
        {visible.length} yolcu gösteriliyor
      </p>
      {visible.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((p) => (
            <PassengerCard passenger={p} key={p.id} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Users className="h-8 w-8 text-ink-400" aria-hidden />
          <h2 className="title-md mt-4">Yolcu bulunamadı</h2>
          <p className="subtle mt-2">Aramanı veya durum filtresini değiştirebilirsin.</p>
          <button
            className="btn btn-primary mt-5"
            type="button"
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
          >
            Filtreleri temizle
          </button>
        </div>
      )}
    </DriverScreen>
  );
}
