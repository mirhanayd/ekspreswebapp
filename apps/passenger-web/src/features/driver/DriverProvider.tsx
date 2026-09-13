'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initialPassengers, stops, type PassengerStatus } from './demo';

function useDemoState() {
  const [passengers, setPassengers] = useState(initialPassengers);
  const [activeIndex, setActiveIndex] = useState(2);
  const [sharing, setSharing] = useState(true);
  const [age, setAge] = useState(8);
  const completed = activeIndex === stops.length;
  const nextStop = stops[activeIndex];
  useEffect(() => {
    const timer = window.setInterval(
      () => setAge((value) => (sharing ? (value + 1) % 11 : value + 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [sharing]);
  const counts = {
    total: passengers.length,
    boarded: passengers.filter((p) => p.status === 'boarded').length,
    waiting: passengers.filter((p) => p.status === 'waiting').length,
    missed: passengers.filter((p) => p.status === 'missed').length,
  };
  function updatePassenger(id: string, status: PassengerStatus) {
    setPassengers((current) => current.map((p) => (p.id === id ? { ...p, status } : p)));
  }
  function selectStop(index: number) {
    if (index >= 0 && index <= stops.length) setActiveIndex(index);
  }
  function toggleSharing() {
    setSharing((value) => !value);
    setAge(0);
  }
  function reset() {
    setPassengers(initialPassengers);
    setActiveIndex(2);
    setSharing(true);
    setAge(8);
  }
  return {
    passengers,
    activeIndex,
    nextStop,
    completed,
    sharing,
    age,
    counts,
    updatePassenger,
    selectStop,
    toggleSharing,
    reset,
    progress: completed ? 100 : nextStop.progress,
  };
}

const DriverContext = createContext<ReturnType<typeof useDemoState> | null>(null);
export function DriverProvider({ children }: { children: React.ReactNode }) {
  const state = useDemoState();
  return <DriverContext.Provider value={state}>{children}</DriverContext.Provider>;
}
export function useDriver() {
  const context = useContext(DriverContext);
  if (!context) throw new Error('DriverProvider is required');
  return context;
}
