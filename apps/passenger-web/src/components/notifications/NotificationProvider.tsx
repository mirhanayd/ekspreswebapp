'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNav } from '@/components/nav/NavProvider';
import {
  disablePush,
  enablePush,
  playChime,
  pushPermission,
  registerServiceWorker,
  type PushPermission,
} from '@/lib/push-client';

export type NotificationPrefs = { km5: boolean; km1: boolean; sound: boolean };
export type AlightingBannerData = {
  id: string;
  threshold: 5 | 1;
  title: string;
  body: string;
  url?: string;
};

type SettingsState = { open: boolean; subtitle: string | null };

type NotificationApi = {
  prefs: NotificationPrefs;
  notifyAny: boolean;
  permission: PushPermission;
  banner: AlightingBannerData | null;
  bannerVisible: boolean;
  settings: SettingsState;
  setPref: (key: keyof NotificationPrefs, value: boolean) => void;
  /** The single "İniş bildirimleri" switch used at checkout: both distances at once. */
  setNotify: (value: boolean) => void;
  openSettings: (subtitle?: string) => void;
  closeSettings: () => void;
  dismissBanner: () => void;
  /** Asks the server right away whether an alert is waiting (used when the map crosses 5 km / 1 km). */
  checkBanners: () => void;
};

const DEFAULT_PREFS: NotificationPrefs = { km5: true, km1: true, sound: true };
const BANNER_MS = 5600;
const POLL_MS = 12_000;

const NotificationContext = createContext<NotificationApi | null>(null);

async function savePrefs(patch: Partial<NotificationPrefs>) {
  try {
    await fetch('/api/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  } catch {
    // The optimistic value stays; the next load shows what the server holds.
  }
}

/**
 * Owns alighting-notification state for the whole app: the passenger's 5 km /
 * 1 km / sound switches, the push subscription, the settings sheet and the
 * in-app banner. Alerts are decided on the server; this only displays them,
 * from a service-worker message while the app is open or from a short poll
 * when the device has no push delivery.
 */
export function NotificationProvider({
  authenticated,
  children,
}: {
  authenticated: boolean;
  children: React.ReactNode;
}) {
  const nav = useNav();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const [permission, setPermission] = useState<PushPermission>('default');
  const [banner, setBanner] = useState<AlightingBannerData | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({ open: false, subtitle: null });
  const seen = useRef(new Set<string>());
  const hideTimer = useRef<number | undefined>(undefined);
  const pollNow = useRef<() => void>(() => undefined);

  useEffect(() => {
    setPermission(pushPermission());
    void registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    void fetch('/api/notifications/preferences', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((value: NotificationPrefs | null) => {
        if (value && !cancelled) setPrefs(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  const acknowledge = useCallback((id: string) => {
    void fetch('/api/notifications/alighting/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => undefined);
  }, []);

  const show = useCallback(
    (next: AlightingBannerData) => {
      if (seen.current.has(next.id)) return;
      seen.current.add(next.id);
      window.clearTimeout(hideTimer.current);
      setBanner(next);
      setBannerVisible(true);
      if (prefsRef.current.sound) {
        playChime();
        // Browsers refuse vibration before the first tap; skipping it keeps the console clean.
        if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.([200, 100, 200]);
      }
      hideTimer.current = window.setTimeout(() => setBannerVisible(false), BANNER_MS);
      acknowledge(next.id);
    },
    [acknowledge],
  );

  // Push delivered while a window is visible: the service worker hands it to us.
  useEffect(() => {
    if (!authenticated || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        payload?: {
          dispatchId: string;
          threshold: 5 | 1;
          title: string;
          body: string;
          url?: string;
        };
      };
      if (data?.type !== 'alighting-push' || !data.payload) return;
      show({
        id: data.payload.dispatchId,
        threshold: data.payload.threshold,
        title: data.payload.title,
        body: data.payload.body,
        url: data.payload.url,
      });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [authenticated, show]);

  // Alerts that had no push delivery arrive as banners from the server's dispatch log.
  useEffect(() => {
    if (!authenticated) return;
    let stopped = false;
    const poll = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch('/api/notifications/alighting', { cache: 'no-store' });
        if (!response.ok || stopped) return;
        const { banners } = (await response.json()) as {
          banners: Array<{
            id: string;
            threshold: 5 | 1;
            title: string;
            body: string;
            tripId: string;
            ticketId: string;
          }>;
        };
        for (const item of banners) {
          show({
            id: item.id,
            threshold: item.threshold,
            title: item.title,
            body: item.body,
            url: `/trips/${item.tripId}/live?ticketId=${item.ticketId}`,
          });
        }
      } catch {
        // Offline or signed out; try again on the next tick.
      }
    };
    pollNow.current = () => void poll();
    void poll();
    const timer = window.setInterval(poll, POLL_MS);
    const onVisible = () => void poll();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      pollNow.current = () => undefined;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [authenticated, show]);

  const applyPrefs = useCallback(async (patch: Partial<NotificationPrefs>) => {
    const next = { ...prefsRef.current, ...patch };
    setPrefs(next);
    const wantsAlerts = next.km5 || next.km1;
    const enabling = (patch.km5 || patch.km1) && wantsAlerts;
    // Permission prompts must start inside the tap that caused them, so this runs before any await.
    if (enabling) setPermission(await enablePush());
    else if (!wantsAlerts) void disablePush();
    await savePrefs(patch);
  }, []);

  const openSettings = useCallback(
    (subtitle?: string) => {
      if (!authenticated) {
        nav.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      setSettings({ open: true, subtitle: subtitle ?? null });
    },
    [authenticated, nav],
  );

  const value = useMemo<NotificationApi>(
    () => ({
      prefs,
      notifyAny: prefs.km5 || prefs.km1,
      permission,
      banner,
      bannerVisible,
      settings,
      setPref: (key, next) => void applyPrefs({ [key]: next }),
      setNotify: (next) => void applyPrefs({ km5: next, km1: next }),
      openSettings,
      closeSettings: () => setSettings((current) => ({ ...current, open: false })),
      dismissBanner: () => {
        window.clearTimeout(hideTimer.current);
        setBannerVisible(false);
      },
      checkBanners: () => pollNow.current(),
    }),
    [applyPrefs, banner, bannerVisible, openSettings, permission, prefs, settings],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const api = useContext(NotificationContext);
  if (!api) throw new Error('useNotifications must be used inside NotificationProvider');
  return api;
}
