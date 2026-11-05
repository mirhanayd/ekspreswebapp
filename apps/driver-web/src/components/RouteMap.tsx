'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { DriverMapPosition } from './DriverProvider';
import type { LngLat } from '@/lib/geo';
import { measureRoute, splitAtPosition, type Coordinates } from '@/lib/route-math';
import type { TripStop } from '@/lib/trip-model';

// Copied from maplibre-gl by scripts/copy-maplibre-worker.mjs; see the note there.
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

const ARRIVAL_ZOOM = 13.6;
const ARRIVAL_MS = 820;

function mapStyle(): string | maplibregl.StyleSpecification {
  const custom = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  if (custom) return custom;
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (mapTilerKey) {
    return {
      version: 8,
      sources: {
        'maptiler-raster': {
          type: 'raster',
          tiles: [
            `https://api.maptiler.com/maps/streets-v2-dark/256/{z}/{x}/{y}.png?key=${mapTilerKey}`,
          ],
          tileSize: 256,
          attribution: '© MapTiler © OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'maptiler-raster', type: 'raster', source: 'maptiler-raster' }],
    };
  }
  return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
}

const line = (coordinates: Coordinates) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates },
});

type Slot = {
  stop: TripStop;
  dot: HTMLElement;
  bubble: HTMLElement;
  marker: maplibregl.Marker;
};

const BUBBLE_OFFSET = 16;
const BUBBLE_TIER = 62;
const BUBBLE_GAP = 6;

/**
 * The road view's map. Stops are DOM markers filled through portals, so their counts stay ordinary
 * React. The camera frames the whole route above the bottom panel; `zoomTo` flies into a stop on
 * arrival while the parent fades the map out.
 */
export function RouteMap({
  coordinates,
  stops,
  position,
  bottomInset,
  zoomTo,
  renderDot,
  renderBubble,
}: {
  coordinates: Coordinates;
  stops: TripStop[];
  position: DriverMapPosition | null;
  bottomInset: number;
  zoomTo: LngLat | null;
  renderDot: (stop: TripStop) => React.ReactNode;
  renderBubble: (stop: TripStop) => React.ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const bus = useRef<maplibregl.Marker | null>(null);
  const busBody = useRef<HTMLElement | null>(null);
  const latest = useRef(position);
  latest.current = position;
  const insetRef = useRef(bottomInset);
  insetRef.current = bottomInset;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [ready, setReady] = useState(false);

  const cumulative = useMemo(() => measureRoute(coordinates), [coordinates]);

  const frame = useCallback(() => {
    const instance = map.current;
    if (!instance || coordinates.length < 2) return;
    const bounds = coordinates.reduce(
      (value, coordinate) => value.extend(coordinate),
      new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
    );
    instance.fitBounds(bounds, {
      padding: { top: 130, bottom: insetRef.current + 34, left: 56, right: 56 },
      maxZoom: 11,
      duration: 0,
    });
  }, [coordinates]);

  const paintRoute = useCallback(
    (instance: maplibregl.Map, current: DriverMapPosition | null) => {
      const split = current
        ? splitAtPosition(coordinates, cumulative, current)
        : { done: [], todo: coordinates };
      (instance.getSource('route-done') as maplibregl.GeoJSONSource | undefined)?.setData(
        line(split.done),
      );
      (instance.getSource('route-todo') as maplibregl.GeoJSONSource | undefined)?.setData(
        line(split.todo),
      );
    },
    [coordinates, cumulative],
  );

  useEffect(() => {
    if (!container.current || coordinates.length < 2) return;
    const instance = new maplibregl.Map({
      container: container.current,
      style: mapStyle(),
      center: coordinates[0],
      zoom: 8,
      attributionControl: { compact: true },
    });
    map.current = instance;

    let added = false;
    const setup = () => {
      if (added) return;
      added = true;
      instance.addSource('route', { type: 'geojson', data: line(coordinates) });
      instance.addSource('route-done', { type: 'geojson', data: line([]) });
      instance.addSource('route-todo', { type: 'geojson', data: line(coordinates) });
      const round = { 'line-cap': 'round', 'line-join': 'round' } as const;
      instance.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: round,
        paint: { 'line-color': '#08090B', 'line-width': 11 },
      });
      instance.addLayer({
        id: 'route-done',
        type: 'line',
        source: 'route-done',
        layout: round,
        paint: { 'line-color': '#5B616D', 'line-width': 4 },
      });
      instance.addLayer({
        id: 'route-todo',
        type: 'line',
        source: 'route-todo',
        layout: round,
        paint: { 'line-color': '#F3F4F6', 'line-width': 4.5 },
      });

      setSlots(
        stops.flatMap((stop) => {
          if (!stop.point) return [];
          const at: [number, number] = [stop.point.longitude, stop.point.latitude];
          const dot = document.createElement('div');
          const bubble = document.createElement('div');
          new maplibregl.Marker({ element: dot }).setLngLat(at).addTo(instance);
          const marker = new maplibregl.Marker({
            element: bubble,
            anchor: 'bottom',
            offset: [0, -BUBBLE_OFFSET],
          })
            .setLngLat(at)
            .addTo(instance);
          return [{ stop, dot, bubble, marker }];
        }),
      );

      const element = document.createElement('div');
      element.className = 'map-bus';
      element.innerHTML =
        '<span class="map-bus-pulse"></span><span class="map-bus-body"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7.5 17L12 15.5 4.5 20z" fill="#fff"/></svg></span>';
      busBody.current = element.querySelector<HTMLElement>('.map-bus-body');
      const start = latest.current;
      bus.current = new maplibregl.Marker({ element })
        .setLngLat(start ? [start.longitude, start.latitude] : coordinates[0])
        .addTo(instance);

      frame();
      paintRoute(instance, latest.current);
      setReady(true);
    };
    // `load` waits for every first tile; the route and stops must not.
    instance.once('style.load', setup);
    instance.once('load', setup);

    return () => {
      setReady(false);
      setSlots([]);
      bus.current = null;
      busBody.current = null;
      instance.remove();
      map.current = null;
    };
  }, [coordinates, frame, paintRoute, stops]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready || !position) return;
    bus.current?.setLngLat([position.longitude, position.latitude]);
    if (busBody.current) busBody.current.style.transform = `rotate(${position.headingDeg}deg)`;
    paintRoute(instance, position);
  }, [paintRoute, position, ready]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;
    if (!zoomTo) {
      frame();
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    instance.flyTo({
      center: [zoomTo.longitude, zoomTo.latitude],
      zoom: ARRIVAL_ZOOM,
      duration: reduced ? 0 : ARRIVAL_MS,
      essential: true,
    });
  }, [frame, ready, zoomTo]);

  useEffect(() => {
    if (ready && !zoomTo) frame();
  }, [bottomInset, frame, ready, zoomTo]);

  // Stops can sit closer on screen than a bubble is wide, so neighbours stack on tiers with a stem.
  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready || !slots.length) return;
    const declutter = () => {
      const tiers: number[] = [];
      const ordered = slots
        .map((slot) => ({
          slot,
          x: instance.project(slot.marker.getLngLat()).x,
          width: slot.bubble.offsetWidth,
        }))
        .sort((a, b) => a.x - b.x);
      for (const { slot, x, width } of ordered) {
        const left = x - width / 2;
        let tier = tiers.findIndex((right) => left > right + BUBBLE_GAP);
        if (tier < 0) tier = tiers.length;
        tiers[tier] = x + width / 2;
        const lift = tier * BUBBLE_TIER;
        slot.marker.setOffset([0, -BUBBLE_OFFSET - lift]);
        slot.bubble.style.setProperty('--stem', `${lift}px`);
      }
    };
    const frameId = requestAnimationFrame(declutter);
    instance.on('moveend', declutter);
    return () => {
      cancelAnimationFrame(frameId);
      instance.off('moveend', declutter);
    };
  }, [ready, slots]);

  return (
    <div className="map-fill">
      <div ref={container} className="map-canvas" role="img" aria-label="Sefer rota haritası" />
      {slots.map((slot) => createPortal(renderDot(slot.stop), slot.dot, `dot-${slot.stop.id}`))}
      {slots.map((slot) =>
        createPortal(renderBubble(slot.stop), slot.bubble, `bubble-${slot.stop.id}`),
      )}
    </div>
  );
}
