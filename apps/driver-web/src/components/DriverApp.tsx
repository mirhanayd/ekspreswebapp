'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Check } from 'lucide-react';
import { useDriver } from './DriverProvider';
import type { MarkStatus } from './PassengerCard';
import { LeaveSheet, StopScreen } from './StopScreen';
import { TodayScreen } from './TodayScreen';
import {
  initialProgress,
  routeCoordinates,
  tripPeople,
  tripStops,
  type BoardingStatus,
} from '@/lib/trip-model';

// MapLibre is large and only the road view needs it.
const RoadScreen = dynamic(() => import('./RoadScreen').then((module) => module.RoadScreen), {
  ssr: false,
});

type Flow = { stop: number; view: 'durak' | 'yolda' };
type Toast = {
  text: string;
  undo: { ticketId: string; status: BoardingStatus } | null;
};

const TOAST_MS = 3800;
const POP_MS = 300;
const FLOW_KEY = 'ske-driver-flow:';

function readFlow(tripId: string): Flow | null {
  try {
    const saved = window.localStorage.getItem(`${FLOW_KEY}${tripId}`);
    return saved ? (JSON.parse(saved) as Flow) : null;
  } catch {
    return null;
  }
}

/** The server knows the trip status but not the current stop, so that lives on this device. */
function writeFlow(tripId: string, flow: Flow | null) {
  try {
    if (flow) window.localStorage.setItem(`${FLOW_KEY}${tripId}`, JSON.stringify(flow));
    else window.localStorage.removeItem(`${FLOW_KEY}${tripId}`);
  } catch {
    // Without storage the progress is re-derived from the trip and its last GPS fix.
  }
}

/**
 * The driver's one screen: Today, then the trip, which alternates between a stop (seat plan and
 * list) and the road (map). The trip layer is a history entry, so the phone's back gesture leaves
 * it without leaving the app.
 */
export function DriverApp() {
  const {
    driver,
    trip,
    trips,
    loading,
    message,
    notice,
    counts,
    sharing,
    latestPosition,
    setTripStatus,
    setPassengerStatus,
    startLocationSharing,
    switchTrip,
    reload,
  } = useDriver();

  const [screen, setScreen] = useState<'home' | 'trip'>('home');
  const [flow, setFlow] = useState<Flow>({ stop: 0, view: 'durak' });
  const [roadUsed, setRoadUsed] = useState(false);
  const [seatsIn, setSeatsIn] = useState(true);
  const [revealed, setRevealed] = useState(true);
  const [mapIn, setMapIn] = useState(true);
  const [popSeat, setPopSeat] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [toastOn, setToastOn] = useState(false);
  const timers = useRef<number[]>([]);
  const toastTimer = useRef<number | undefined>(undefined);
  const popTimer = useRef<number | undefined>(undefined);
  const tripId = trip?.id ?? null;

  const later = useCallback((run: () => void, ms: number) => {
    timers.current.push(window.setTimeout(run, ms));
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(popTimer.current);
    },
    [],
  );

  const stops = useMemo(() => (trip ? tripStops(trip) : []), [trip]);
  const people = useMemo(() => (trip ? tripPeople(trip) : []), [trip]);
  const coordinatesKey = trip ? JSON.stringify(routeCoordinates(trip, stops)) : '[]';
  const coordinates = useMemo(
    () => JSON.parse(coordinatesKey) as Array<[number, number]>,
    [coordinatesKey],
  );
  // Refreshes return new objects; the map only needs rebuilding when the stops really change.
  const stopsKey = JSON.stringify(stops.map((stop) => [stop.id, stop.point]));
  const mapStops = useMemo(() => stops, [stopsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pick up this trip's saved progress when the driver opens or switches to it.
  useEffect(() => {
    if (!tripId || !trip) return;
    const next =
      readFlow(tripId) ?? initialProgress(trip, tripStops(trip), routeCoordinates(trip, stops));
    setFlow(next);
    setConfirm(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const updateFlow = useCallback(
    (next: Flow) => {
      setFlow(next);
      if (tripId) writeFlow(tripId, next);
    },
    [tripId],
  );

  // The back gesture closes the trip layer. Next.js reloads on history entries it does not own,
  // so the entry keeps the router's own state.
  useEffect(() => {
    const onPop = () => {
      if (!(window.history.state as { skeTrip?: boolean } | null)?.skeTrip) setScreen('home');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const showToast = useCallback((text: string, undo: Toast['undo'] = null) => {
    window.clearTimeout(toastTimer.current);
    setToast({ text, undo });
    setToastOn(true);
    toastTimer.current = window.setTimeout(() => setToastOn(false), TOAST_MS);
  }, []);

  const revealSeats = useCallback(
    (delay: number) => {
      setSeatsIn(false);
      setRevealed(false);
      later(() => setSeatsIn(true), delay);
      later(() => setRevealed(true), delay + 1000);
    },
    [later],
  );

  const showRoad = useCallback(
    (delay: number) => {
      setRoadUsed(true);
      setMapIn(false);
      later(() => setMapIn(true), delay);
    },
    [later],
  );

  // A driver coming back to a running trip keeps sharing GPS without being asked again.
  useEffect(() => {
    if (screen !== 'trip' || sharing || trip?.status !== 'in_transit') return;
    if (!navigator.permissions) return;
    void navigator.permissions
      .query({ name: 'geolocation' })
      .then((state) => {
        if (state.state === 'granted') startLocationSharing();
      })
      .catch(() => undefined);
  }, [screen, sharing, startLocationSharing, trip?.status]);

  const enterTrip = useCallback(async () => {
    if (!trip) return;
    if (trip.status === 'scheduled' && !(await setTripStatus('boarding'))) return;
    const next = readFlow(trip.id) ?? initialProgress(trip, stops, coordinates);
    updateFlow(next);
    window.history.pushState({ ...window.history.state, skeTrip: true }, '');
    setScreen('trip');
    if (next.view === 'durak') revealSeats(300);
    else showRoad(260);
  }, [coordinates, revealSeats, setTripStatus, showRoad, stops, trip, updateFlow]);

  const goHome = useCallback(() => {
    if ((window.history.state as { skeTrip?: boolean } | null)?.skeTrip) window.history.back();
    else setScreen('home');
  }, []);

  const arrive = useCallback(() => {
    updateFlow({ ...flow, view: 'durak' });
    revealSeats(340);
  }, [flow, revealSeats, updateFlow]);

  const stopBack = useCallback(() => {
    if (flow.stop === 0) {
      goHome();
      return;
    }
    updateFlow({ ...flow, view: 'yolda' });
    showRoad(220);
  }, [flow, goHome, showRoad, updateFlow]);

  const mark = useCallback<MarkStatus>(
    (person, status, label) => {
      const previous = person.status;
      setPopSeat(person.seat);
      window.clearTimeout(popTimer.current);
      popTimer.current = window.setTimeout(() => setPopSeat(null), POP_MS);
      void setPassengerStatus(person.id, status).then((saved) => {
        if (saved) showToast(label, { ticketId: person.id, status: previous });
      });
    },
    [setPassengerStatus, showToast],
  );

  const undo = useCallback(() => {
    if (!toast?.undo) return;
    window.clearTimeout(toastTimer.current);
    setToastOn(false);
    void setPassengerStatus(toast.undo.ticketId, toast.undo.status);
  }, [setPassengerStatus, toast]);

  const departStop = useCallback(async () => {
    if (!trip || leaving) return;
    const here = flow.stop;
    const last = here >= stops.length - 1;
    setConfirm(false);
    setLeaving(true);
    try {
      const updates = people.flatMap((person) => {
        if (person.to === here && person.status === 'boarded') {
          return [setPassengerStatus(person.id, 'alighted')];
        }
        if (person.from === here && person.status === 'pending') {
          return [setPassengerStatus(person.id, 'no_show')];
        }
        return [];
      });
      if ((await Promise.all(updates)).includes(false)) return;

      if (last) {
        const carried = people.filter(
          (person) =>
            person.status === 'alighted' || (person.to === here && person.status === 'boarded'),
        ).length;
        if (!(await setTripStatus('completed'))) return;
        writeFlow(trip.id, null);
        goHome();
        showToast(`Sefer tamamlandı · ${carried} yolcu taşındı`);
        return;
      }
      if (here === 0) {
        if (!(await setTripStatus('in_transit'))) return;
        startLocationSharing();
      }
      updateFlow({ stop: here + 1, view: 'yolda' });
      showRoad(260);
    } finally {
      setLeaving(false);
    }
  }, [
    flow.stop,
    goHome,
    leaving,
    people,
    setPassengerStatus,
    setTripStatus,
    showRoad,
    showToast,
    startLocationSharing,
    stops.length,
    trip,
    updateFlow,
  ]);

  const leave = useCallback(() => {
    const waiting = people.some(
      (person) => person.from === flow.stop && person.status === 'pending',
    );
    if (waiting) {
      setToastOn(false);
      setConfirm(true);
    } else void departStop();
  }, [departStop, flow.stop, people]);

  const onTrip = screen === 'trip' && Boolean(trip) && stops.length > 0;
  const atStop = onTrip && flow.view === 'durak';
  const onRoad = onTrip && flow.view === 'yolda';
  const stopIndex = Math.min(flow.stop, Math.max(stops.length - 1, 0));
  const waitingHere = people.filter(
    (person) => person.from === stopIndex && person.status === 'pending',
  );
  const items = trip?.bus.seatLayout?.items ?? [];

  return (
    <div className="app" data-screen={screen}>
      {message || notice ? (
        <div className="banner" role={message ? 'alert' : 'status'}>
          <span>{message || notice}</span>
          {message ? (
            <button type="button" onClick={reload}>
              Yenile
            </button>
          ) : null}
        </div>
      ) : null}

      {loading && !trip ? (
        <div className="splash" role="status">
          Seferler yükleniyor…
        </div>
      ) : (
        <TodayScreen
          visible={screen === 'home'}
          driver={driver}
          trip={trip}
          trips={trips}
          stops={stops}
          people={people}
          stopIndex={stopIndex}
          onEnter={() => void enterTrip()}
          onSelect={(id) => void switchTrip(id)}
        />
      )}

      <section className="trip" data-on={onTrip} aria-hidden={!onTrip} aria-label="Sefer">
        {trip && stops.length ? (
          <>
            {roadUsed ? (
              <RoadScreen
                visible={onRoad}
                mapIn={mapIn}
                coordinates={coordinates}
                stops={mapStops}
                people={people}
                index={stopIndex}
                position={latestPosition}
                sharing={sharing}
                onboard={counts.boarded}
                plate={trip.bus.plateNumber}
                onHome={goHome}
                onArrive={arrive}
                onStartGps={startLocationSharing}
              />
            ) : null}
            <StopScreen
              visible={atStop}
              items={items}
              people={people}
              stops={stops}
              index={stopIndex}
              seatsIn={seatsIn}
              revealed={revealed}
              popSeat={popSeat}
              onBack={stopBack}
              onLeave={leave}
              onMark={mark}
            />
            <LeaveSheet
              open={confirm}
              people={waitingHere}
              onWait={() => setConfirm(false)}
              onGo={() => void departStop()}
            />
          </>
        ) : null}
      </section>

      <div
        className="toast"
        role="status"
        data-on={toastOn}
        data-context={atStop ? 'stop' : onRoad ? 'road' : 'home'}
      >
        <span aria-hidden className="toast-tick">
          <Check size={14} strokeWidth={3.4} />
        </span>
        <span className="toast-text">{toast?.text}</span>
        {toast?.undo ? (
          <button type="button" onClick={undo}>
            Geri al
          </button>
        ) : null}
      </div>
    </div>
  );
}
