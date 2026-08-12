'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const DURATION_MS = 3000;
const SESSION_KEY = 'ske-splash-shown';

/**
 * Opening animation. Holds the screen for three seconds on the first visit of a
 * session while the app loads: the wordmark fades up, a coach drives the dashed
 * route across, and the whole overlay dissolves.
 *
 * It only ever covers the first paint of a session — a reload inside the same
 * tab goes straight to the app — and it collapses to a still frame when the
 * visitor has asked for reduced motion.
 */
export function SplashScreen() {
  const [state, setState] = useState<'hidden' | 'playing' | 'leaving'>('hidden');

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
    setState('playing');

    const leave = window.setTimeout(() => setState('leaving'), DURATION_MS - 450);
    const done = window.setTimeout(() => setState('hidden'), DURATION_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
    };
  }, []);

  useEffect(() => {
    if (state === 'hidden') return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [state]);

  if (state === 'hidden') return null;

  return (
    <div
      role="status"
      aria-label="Siirt Kurtalan Ekspres yükleniyor"
      className={`splash ${state === 'leaving' ? 'splash-leaving' : ''}`}
    >
      <div className="splash-stage">
        <Image
          src="/brand/logo.png"
          alt="Siirt Kurtalan Ekspres"
          width={900}
          height={244}
          priority
          className="splash-mark h-auto w-56 sm:w-64"
        />

        <p className="splash-tagline">Şehirlerarası yolcu taşımacılığı</p>

        {/* Coach driving the dashed route */}
        <div className="splash-road" aria-hidden>
          <span className="splash-road-line" />
          <span className="splash-coach">
            <svg viewBox="0 0 48 28" className="h-7 w-12" fill="none">
              <rect x="1" y="3" width="40" height="17" rx="4" className="fill-ink-900" />
              <rect x="4.5" y="6.5" width="9" height="6" rx="1.5" className="fill-lime-400" />
              <rect x="15.5" y="6.5" width="9" height="6" rx="1.5" className="fill-lime-400/70" />
              <rect x="26.5" y="6.5" width="9" height="6" rx="1.5" className="fill-lime-400/40" />
              <rect x="41" y="9" width="4" height="7" rx="1.5" className="fill-amber-400" />
              <circle cx="11" cy="22" r="4" className="fill-ink-900" />
              <circle cx="11" cy="22" r="1.6" className="fill-sage-100" />
              <circle cx="32" cy="22" r="4" className="fill-ink-900" />
              <circle cx="32" cy="22" r="1.6" className="fill-sage-100" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
