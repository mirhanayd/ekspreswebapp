'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronLeft, MapPin, Phone, TriangleAlert } from 'lucide-react';
import type { DriverMapPosition } from './DriverProvider';
import { RouteMap } from './RouteMap';
import { dative, formatKm, formatTime, OPERATIONS_PHONE } from '@/lib/format';
import { measureRoute, projectOnRoute, type Coordinates } from '@/lib/route-math';
import { firstNames, stopCounts, type Person, type TripStop } from '@/lib/trip-model';

const PLANNING_SPEED_KPH = 54;
/** Distance at which the arrival button starts to glow. */
const ARRIVING_KM = 1.2;

function Counts({ down, up }: { down: number; up: number }) {
  return (
    <>
      {down > 0 ? (
        <span className="count" data-tone="down">
          <ArrowDown size={12} strokeWidth={3.4} aria-hidden />
          {down}
        </span>
      ) : null}
      {up > 0 ? (
        <span className="count" data-tone="up">
          <ArrowUp size={12} strokeWidth={3.4} aria-hidden />
          {up}
        </span>
      ) : null}
    </>
  );
}

export function RoadScreen({
  visible,
  mapIn,
  coordinates,
  stops,
  people,
  index,
  position,
  sharing,
  onboard,
  plate,
  onHome,
  onArrive,
  onStartGps,
}: {
  visible: boolean;
  mapIn: boolean;
  coordinates: Coordinates;
  stops: TripStop[];
  people: Person[];
  index: number;
  position: DriverMapPosition | null;
  sharing: boolean;
  onboard: number;
  plate: string;
  onHome: () => void;
  onArrive: () => void;
  onStartGps: () => void;
}) {
  const stop = stops[Math.min(index, stops.length - 1)];
  const previous = stops[Math.max(index - 1, 0)];
  const panel = useRef<HTMLElement>(null);
  const [inset, setInset] = useState(384);

  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setInset(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const progress = useMemo(() => {
    if (!position || coordinates.length < 2 || !stop.point || !previous.point) return null;
    const cumulative = measureRoute(coordinates);
    const bus = projectOnRoute(coordinates, cumulative, position).km;
    const from = projectOnRoute(coordinates, cumulative, previous.point).km;
    const to = projectOnRoute(coordinates, cumulative, stop.point).km;
    const speed = position.speedKph >= 25 ? position.speedKph : PLANNING_SPEED_KPH;
    const remaining = Math.max(0, to - bus);
    return {
      remaining,
      minutes: Math.max(1, Math.round((remaining / speed) * 60)),
      percent: to > from ? Math.min(100, Math.max(0, ((bus - from) / (to - from)) * 100)) : 0,
    };
  }, [coordinates, position, previous.point, stop.point]);

  const counts = stopCounts(people, stop.index);
  const downList = people.filter(
    (person) => person.to === stop.index && person.status === 'boarded',
  );
  const upList = people.filter(
    (person) => person.from === stop.index && person.status === 'pending',
  );
  const speed = position ? Math.round(position.speedKph) : null;
  const report = OPERATIONS_PHONE
    ? `sms:${OPERATIONS_PHONE}?body=${encodeURIComponent(`Sefer ${plate}: `)}`
    : '';

  const renderDot = (item: TripStop) => {
    const state = item.index < index ? 'passed' : item.index === index ? 'next' : 'ahead';
    return <span className="map-stop" data-state={state} />;
  };

  const renderBubble = (item: TripStop) => {
    const state = item.index < index ? 'passed' : item.index === index ? 'next' : 'ahead';
    const itemCounts = stopCounts(people, item.index);
    const passed = state === 'passed';
    return (
      <div
        className="bubble"
        data-state={state}
        data-in={mapIn}
        style={{ transitionDelay: mapIn ? `${260 + item.index * 80}ms` : '0ms' }}
      >
        <span className="bubble-name">{item.short}</span>
        <span className="bubble-counts">
          {passed ? (
            <Check size={13} strokeWidth={3.4} className="bubble-tick" aria-label="Geçildi" />
          ) : null}
          <Counts
            down={passed ? itemCounts.downDone : itemCounts.down}
            up={passed ? itemCounts.upDone : itemCounts.up}
          />
        </span>
      </div>
    );
  };

  return (
    <div className="road" data-on={visible} aria-hidden={!visible}>
      <RouteMap
        coordinates={coordinates}
        stops={stops}
        position={position}
        bottomInset={inset}
        zoomTo={visible ? null : stop.point}
        focusIndex={stop.index}
        renderDot={renderDot}
        renderBubble={renderBubble}
      />

      <div className="road-top">
        <button type="button" className="round glass" aria-label="Ana ekrana dön" onClick={onHome}>
          <ChevronLeft size={20} strokeWidth={2.4} aria-hidden />
        </button>
        {sharing ? (
          <span className="glass pill">
            <i className="pulse-dot" aria-hidden />
            Yolda{speed === null ? '' : ` · ${speed} km/s`}
          </span>
        ) : (
          <button type="button" className="glass pill pill-warn" onClick={onStartGps}>
            <i aria-hidden />
            GPS kapalı · Aç
          </button>
        )}
        <span className="glass pill pill-end">Araçta {onboard}</span>
      </div>

      <section ref={panel} className="road-panel" aria-label="Sonraki durak">
        <span aria-hidden className="grip" />
        <div className="next">
          <div>
            <span className="eyebrow">Sonraki durak</span>
            <h2>{stop.name}</h2>
            <span className="next-distance">
              {progress
                ? `${formatKm(progress.remaining)} km · ≈ ${progress.minutes} dk`
                : 'Konum bekleniyor'}
            </span>
          </div>
          <div className="next-eta">
            <strong className="num">{formatTime(stop.time)}</strong>
            <span>planlanan varış</span>
          </div>
        </div>

        <div className="leg">
          <span>{previous.short}</span>
          <div className="leg-bar" aria-hidden>
            <b style={{ width: `${progress?.percent ?? 0}%` }} />
            <em style={{ left: `${progress?.percent ?? 0}%` }} />
          </div>
          <span className="leg-next">{stop.short}</span>
        </div>

        <div className="next-counts">
          <div>
            <span className="next-label" data-tone="down">
              <ArrowDown size={14} strokeWidth={3} aria-hidden />
              İnecek
            </span>
            <strong className="num">{counts.down}</strong>
            <small>{firstNames(downList)}</small>
          </div>
          <div>
            <span className="next-label" data-tone="up">
              <ArrowUp size={14} strokeWidth={3} aria-hidden />
              Binecek
            </span>
            <strong className="num">{counts.up}</strong>
            <small>{firstNames(upList)}</small>
          </div>
        </div>

        <div className="road-actions">
          {OPERATIONS_PHONE ? (
            <>
              <a
                className="square"
                href={`tel:${OPERATIONS_PHONE}`}
                aria-label="Operasyon merkezini ara"
              >
                <Phone size={21} aria-hidden />
              </a>
              <a className="square warn" href={report} aria-label="Sorun bildir">
                <TriangleAlert size={21} aria-hidden />
              </a>
            </>
          ) : null}
          <button
            type="button"
            className="arrive"
            data-near={progress ? progress.remaining < ARRIVING_KM : false}
            onClick={onArrive}
          >
            {dative(stop.short)} vardım
            <MapPin size={20} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      </section>
    </div>
  );
}
