'use client';

import { useCallback, useState } from 'react';
import { Check, MessageCircle, Phone, RotateCcw, X } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useDriver } from './DriverProvider';
import { statusClasses, statusLabels, stopName, type Passenger } from './demo';

export function PassengerCard({ passenger }: { passenger: Passenger }) {
  const { updatePassenger } = useDriver();
  const [contact, setContact] = useState<'call' | 'message' | null>(null);
  const close = useCallback(() => setContact(null), []);
  return (
    <article className="card overflow-hidden" aria-label={passenger.name}>
      <div className="flex items-center gap-3 p-5">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-tile bg-lime-400 font-display text-xl font-bold"
          aria-label={`Koltuk ${passenger.seat}`}
        >
          {passenger.seat}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="title-md">{passenger.name}</h2>
          <p className="caption mt-1">
            Koltuk {passenger.seat} · {passenger.phone}
          </p>
        </div>
      </div>
      <dl className="facts-strip facts-strip-soft">
        <div className="fact">
          <dt className="fact-label">Biniş</dt>
          <dd className="fact-value">{stopName(passenger.origin)}</dd>
        </div>
        <div className="fact">
          <dt className="fact-label">İniş</dt>
          <dd className="fact-value">{stopName(passenger.destination)}</dd>
        </div>
        <div className="fact">
          <dt className="fact-label">Durum</dt>
          <dd className="mt-1">
            <span className={`badge ${statusClasses[passenger.status]}`} aria-live="polite">
              {statusLabels[passenger.status]}
            </span>
          </dd>
        </div>
      </dl>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setContact('call')}>
            <Phone className="h-4 w-4" aria-hidden />
            Ara
          </button>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={() => setContact('message')}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Mesaj
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            className={`btn btn-sm ${passenger.status === 'boarded' ? 'btn-lime' : 'btn-primary'}`}
            type="button"
            aria-pressed={passenger.status === 'boarded'}
            onClick={() => updatePassenger(passenger.id, 'boarded')}
          >
            <Check className="h-4 w-4" aria-hidden />
            Bindi
          </button>
          <button
            className={`btn btn-sm ${passenger.status === 'missed' ? 'btn-primary' : 'btn-ghost'}`}
            type="button"
            aria-pressed={passenger.status === 'missed'}
            onClick={() => updatePassenger(passenger.id, 'missed')}
          >
            <X className="h-4 w-4" aria-hidden />
            Binmedi
          </button>
        </div>
        {passenger.status !== 'waiting' ? (
          <button
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 text-xs font-semibold text-ink-500"
            type="button"
            onClick={() => updatePassenger(passenger.id, 'waiting')}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Bekleniyor olarak işaretle
          </button>
        ) : null}
      </div>
      <Sheet
        open={contact !== null}
        onClose={close}
        title={contact === 'call' ? 'Yolcuyu ara' : 'Yolcuya mesaj'}
      >
        <p className="title-md">{passenger.name}</p>
        <p className="subtle mt-2">
          {passenger.phone} · Koltuk {passenger.seat}
        </p>
        <p className="alert-info mt-4">
          {contact === 'call'
            ? 'Bu bir sunum demosudur. Gerçek telefon araması başlatılmaz.'
            : 'Örnek mesaj: Otobüsümüz otogara yaklaşıyor. Lütfen biniş noktasında hazır olun. Bu demo mesajı gönderilmez.'}
        </p>
        <button type="button" onClick={close} className="btn btn-primary mt-5 w-full">
          Tamam
        </button>
      </Sheet>
    </article>
  );
}
