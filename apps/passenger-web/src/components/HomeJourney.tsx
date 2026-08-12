'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { JourneySearchBar } from './JourneySearchBar';
import type { SearchLocation } from './SearchPanel';
import { placeShortName } from '@/lib/format';

/**
 * Home lede: the traveller's own area, the heading, and the journey editor.
 *
 * The area line resolves from the device position to the closest terminal we
 * serve; until then, and if the permission is refused, it stays honest about
 * not knowing rather than naming a city the traveller may not be in.
 */
export function HomeJourney({
  locations,
  defaultDate,
}: {
  locations: SearchLocation[];
  defaultDate: string;
}) {
  const [area, setArea] = useState<SearchLocation | null | undefined>(undefined);

  const areaLabel =
    area === undefined
      ? 'Konumun alınıyor…'
      : area === null
        ? 'Konum bulunamadı'
        : `${placeShortName(area.name)} yakınındasın`;

  return (
    <>
      <p className="eyebrow mt-9">
        <MapPin className="h-3.5 w-3.5" aria-hidden />
        <span className="truncate">{areaLabel}</span>
      </p>

      <h1 className="display-1 mt-2">
        Yolculuk
        <br />
        Nereye?
      </h1>

      <div className="mt-6">
        <JourneySearchBar
          locations={locations}
          defaultDate={defaultDate}
          onOriginResolved={setArea}
        />
      </div>
    </>
  );
}
