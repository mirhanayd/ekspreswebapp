'use client';

import { useEffect, useState } from 'react';

/** The current time, refreshed on an interval; 0 until mounted so server and client markup match. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
