'use client';

import { useMemo } from 'react';
// @ts-ignore
import Map, { Marker, NavigationControl } from 'react-map-gl';

export default function MapView({ stops }: { stops: any[] }) {
  // If there are no stops or the first stop has no coordinates, fallback to center of Turkey
  const initialViewState = useMemo(() => {
    if (stops && stops.length > 0 && stops[0].location?.coordinates?.coordinates) {
      const [lng, lat] = stops[0].location.coordinates.coordinates;
      return {
        longitude: lng,
        latitude: lat,
        zoom: 7,
      };
    }
    return {
      longitude: 35.2433,
      latitude: 38.9637,
      zoom: 5,
    };
  }, [stops]);

  return (
    // @ts-ignore
    <Map
      // @ts-ignore
      initialViewState={initialViewState}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      attributionControl={false}
    >
      {/* @ts-ignore */}
      <NavigationControl position="bottom-right" />

      {stops.map((stop: any, index: number) => {
        if (!stop.location?.coordinates?.coordinates) return null;
        const [lng, lat] = stop.location.coordinates.coordinates;
        return (
          // @ts-ignore
          <Marker
            key={stop.id}
            longitude={lng}
            latitude={lat}
            // @ts-ignore
            anchor="bottom"
          >
            <div className="flex items-center justify-center bg-blue-600 text-white w-6 h-6 rounded-full shadow-lg border-2 border-white transform translate-y-1/2">
              <span className="text-xs font-bold">{index + 1}</span>
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}
