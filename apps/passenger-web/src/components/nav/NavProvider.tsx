'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** The four bottom-tab roots. Moving between them cross-fades instead of pushing. */
export const TAB_ROOTS = ['/', '/tickets', '/kampanyalar', '/hesap'] as const;
export const isTabRoot = (pathname: string) => (TAB_ROOTS as readonly string[]).includes(pathname);

type Direction = 'push' | 'back' | 'tab';
type NavApi = {
  /** Pushes a screen (slide in); between two tab roots it cross-fades. */
  push: (href: string) => void;
  /** Replaces the current screen with a cross-fade (e.g. after sign-in). */
  replace: (href: string) => void;
  /** Slides back in history, or to `fallback` when this tab opened on the screen. */
  back: (fallback?: string) => void;
};

const NavContext = createContext<NavApi | null>(null);
const DEPTH_KEY = 'ske-nav-depth';
// A navigation that never commits (offline, server error) must not freeze the old frame.
const COMMIT_TIMEOUT_MS = 1500;

type TransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> };
};

function readDepth() {
  try {
    return Number(sessionStorage.getItem(DEPTH_KEY) || 0);
  } catch {
    return 0;
  }
}
function writeDepth(value: number) {
  try {
    sessionStorage.setItem(DEPTH_KEY, String(Math.max(0, value)));
  } catch {
    // Storage can be unavailable; back then falls through to its fallback route.
  }
}

/**
 * Drives screen transitions with the View Transitions API: the browser keeps a
 * snapshot of the outgoing screen while the router commits the next one, and
 * globals.css animates the pair (push, back or tab cross-fade). Reduced-motion
 * visitors and browsers without the API navigate instantly.
 */
export function NavProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const commit = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!commit.current) return;
    const resolve = commit.current;
    commit.current = null;
    // Two frames: let the new screen paint before the browser snapshots it.
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }, [pathname]);

  const go = useCallback(
    (direction: Direction, navigate: () => void, targetPath: string | null) => {
      const doc = document as TransitionDocument;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || !doc.startViewTransition || targetPath === window.location.pathname) {
        navigate();
        return;
      }
      doc.documentElement.dataset.nav = direction;
      const transition = doc.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            const timer = window.setTimeout(resolve, COMMIT_TIMEOUT_MS);
            commit.current = () => {
              window.clearTimeout(timer);
              resolve();
            };
            navigate();
          }),
      );
      void transition.finished.finally(() => {
        delete doc.documentElement.dataset.nav;
      });
    },
    [],
  );

  const api = useMemo<NavApi>(() => {
    const pathOf = (href: string) => new URL(href, window.location.href).pathname;
    return {
      push(href) {
        const path = pathOf(href);
        const direction = isTabRoot(window.location.pathname) && isTabRoot(path) ? 'tab' : 'push';
        writeDepth(readDepth() + 1);
        go(direction, () => router.push(href), path);
      },
      replace(href) {
        go('tab', () => router.replace(href), pathOf(href));
      },
      back(fallback = '/') {
        if (readDepth() > 0) {
          writeDepth(readDepth() - 1);
          go('back', () => router.back(), null);
        } else {
          go('back', () => router.push(fallback), pathOf(fallback));
        }
      },
    };
  }, [go, router]);

  // Plain links (next/link or <a>) get the same transitions without each one opting in.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.(
        'a[href]',
      ) as HTMLAnchorElement | null;
      if (!anchor || (anchor.target && anchor.target !== '_self')) return;
      if (anchor.hasAttribute('download') || anchor.dataset.nav === 'none') return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith('/api/')) return;
      if (url.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      const href = `${url.pathname}${url.search}${url.hash}`;
      if (anchor.dataset.nav === 'back') api.back(href);
      else if (anchor.dataset.nav === 'replace') api.replace(href);
      else api.push(href);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [api]);

  // The system back gesture changes history without us; keep the depth honest.
  useEffect(() => {
    const onPop = () => writeDepth(readDepth() - 1);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return <NavContext.Provider value={api}>{children}</NavContext.Provider>;
}

export function useNav() {
  const api = useContext(NavContext);
  if (!api) throw new Error('useNav must be used inside NavProvider');
  return api;
}
