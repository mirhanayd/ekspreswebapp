'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const DURATION_MS = 3000;
export const SPLASH_SESSION_KEY = 'ske-splash-shown';

/**
 * Opening animation. Holds the screen for three seconds while the app loads:
 * the wordmark and tagline rise, a coach drives the dashed route across, and
 * the overlay dissolves.
 *
 * The markup is server-rendered so it covers the very first paint rather than
 * appearing once React hydrates. The inline script in the document head has
 * already marked the document when this session has seen it, and the matching
 * CSS hides the overlay before it can flash; this component then removes it
 * from the tree. Reduced-motion visitors get the still frame.
 */
export function SplashScreen() {
  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const alreadyShown = document.documentElement.classList.contains('splash-done');
    if (alreadyShown) {
      setDone(true);
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const leave = window.setTimeout(() => setLeaving(true), DURATION_MS - 450);
    const finish = window.setTimeout(() => setDone(true), DURATION_MS);

    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(finish);
      document.body.style.overflow = overflow;
    };
  }, []);

  if (done) return null;

  return (
    <div
      role="status"
      aria-label="Siirt Kurtalan Ekspres yükleniyor"
      className={`splash ${leaving ? 'splash-leaving' : ''}`}
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
