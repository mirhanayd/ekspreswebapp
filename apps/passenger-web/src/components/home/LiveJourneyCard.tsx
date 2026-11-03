'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { toLngLat } from '@/lib/geo';
import { formatKm } from '@/lib/format';
import { measureRoute, projectOnRoute, remainingToStop } from '@/lib/route-progress';

type Bootstrap = {
  seatNo?: string;
  routeGeometry: { coordinates: Array<[number, number]> };
  latestPosition: { longitude: number; latitude: number } | null;
  alighting: { name: string; coordinates: unknown } | null;
  trip: {
    route: {
      origin: { name: string };
      destination: { name: string };
      stops?: Array<{ id: string; location?: { name?: string; coordinates?: unknown } }>;
    };
  };
};

const REFRESH_MS = 15_000;

/**
 * "Yolculuğun" card: the passenger's bus that is on the road right now, with the
 * remaining distance to their own stop. Position comes from the same
 * ticket-scoped bootstrap the tracking screen uses.
 */
export function LiveJourneyCard({
  ticketId,
  routeLabel,
  departureLabel,
  seatNo,
}: {
  ticketId: string;
  routeLabel: string;
  /** Formatted on the server so it matches the stored wall-clock time. */
  departureLabel: string;
  seatNo: string;
}) {
  const { notifyAny } = useNotifications();
  const [data, setData] = useState<Bootstrap | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/tracking/tickets/${ticketId}/bootstrap`, {
          cache: 'no-store',
        });
        if (response.ok && !stopped) setData((await response.json()) as Bootstrap);
      } catch {
        // Keep the previous reading; the card still opens the tracking screen.
      }
    };
    void load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [ticketId]);

  const progress = useMemo(() => {
    if (!data?.latestPosition || !data.alighting) return null;
    const coordinates = data.routeGeometry.coordinates;
    const metrics = measureRoute(coordinates);
    const stop = toLngLat(data.alighting.coordinates);
    if (!stop) return null;
    const result = remainingToStop(coordinates, metrics, data.latestPosition, stop);
    if (!result || !result.stopKm) return null;
    const marks = (data.trip.route.stops ?? [])
      .map((item) => {
        const point = toLngLat(item.location?.coordinates);
        const projection = point ? projectOnRoute(coordinates, metrics, point) : null;
        return projection
          ? { name: item.location?.name ?? '', fraction: projection.travelledKm / result.stopKm }
          : null;
      })
      .filter((mark): mark is { name: string; fraction: number } =>
        Boolean(mark && mark.fraction > 0.06 && mark.fraction < 0.94),
      );
    return {
      remainingKm: result.remainingKm,
      fraction: Math.min(1, Math.max(0, result.travelledKm / result.stopKm)),
      marks,
    };
  }, [data]);

  const [from, to] = routeLabel.split(' → ');

  return (
    <div className="flex flex-col gap-[14px] rounded-3xl border border-sk-line bg-white px-4 pb-[14px] pt-4 text-left">
      <span className="flex w-full items-center justify-between gap-2.5">
        <span className="chip gap-2 bg-sk-tint tracking-[0.08em] text-sk-brandInk">
          <span aria-hidden className="live-dot h-2 w-2 text-sk-brand" />
          CANLI
        </span>
        <span className="text-[13px] text-sk-ink2">
          Bugün {departureLabel} · Koltuk {seatNo}
        </span>
      </span>
      <span className="flex w-full items-baseline justify-between gap-3">
        <span className="text-[21px] font-extrabold">{routeLabel}</span>
        {progress ? (
          <span className="text-[15px] font-extrabold">
            {formatKm(progress.remainingKm)} km kaldı
          </span>
        ) : null}
      </span>

      <span aria-hidden className="relative block h-[30px] w-full">
        <span className="absolute left-1.5 right-1.5 top-[5px] h-[3px] rounded-sm bg-[#E6E6E1]" />
        <span
          className="absolute left-1.5 top-[5px] h-[3px] rounded-sm bg-sk-ink"
          style={{
            width: `calc((100% - 12px) * ${progress?.fraction ?? 0})`,
            transition: 'width 500ms linear',
          }}
        />
        <span className="absolute left-0 top-0 h-[13px] w-[13px] rounded-full bg-sk-ink" />
        {progress?.marks.map((mark) => (
          <span
            key={mark.name}
            className="absolute top-0 h-[13px] w-[13px] rounded-full bg-sk-ink"
            style={{ left: `calc((100% - 12px) * ${mark.fraction})` }}
          />
        ))}
        <span className="absolute right-0 top-0 box-border h-[13px] w-[13px] rounded-full border-[3px] border-sk-brand bg-white" />
        <span
          className="absolute -top-1 box-border h-[21px] w-[21px] rounded-full border-[3px] border-white bg-sk-brand"
          style={{
            left: `calc((100% - 12px) * ${progress?.fraction ?? 0})`,
            marginLeft: -4,
            boxShadow: '0 2px 8px rgba(200,35,27,.45)',
            transition: 'left 500ms linear',
          }}
        />
        <span className="absolute left-0 top-[17px] text-[11px] font-bold text-sk-ink3">
          {from}
        </span>
        {progress?.marks.map((mark) => (
          <span
            key={`l-${mark.name}`}
            className="absolute top-[17px] text-[11px] font-bold text-sk-ink3"
            style={{ left: `calc((100% - 12px) * ${mark.fraction} - 14px)` }}
          >
            {mark.name.split(' ')[0]}
          </span>
        ))}
        <span className="absolute right-0 top-[17px] text-[11px] font-extrabold text-sk-brandInk">
          {to}
        </span>
      </span>

      <span className="flex w-full items-center justify-between gap-2.5 border-t border-sk-hair pt-3">
        <span className="inline-flex items-center gap-2 text-[13px] text-sk-ink2">
          <Bell size={16} aria-hidden />
          {notifyAny ? 'İnişe 5 ve 1 km kala haber vereceğiz' : 'İniş bildirimleri kapalı'}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-extrabold text-sk-brandInk">
          Canlı izle
          <ChevronRight size={16} strokeWidth={2.6} aria-hidden />
        </span>
      </span>
    </div>
  );
}
