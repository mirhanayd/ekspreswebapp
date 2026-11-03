/*
 * Passenger PWA service worker.
 * Receives Web Push alerts for the alighting stop (5 km / 1 km). It caches nothing:
 * tickets, positions and every API response are personal and must always be fresh.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function parsePayload(event) {
  try {
    return event.data ? event.data.json() : null;
  } catch {
    return null;
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePayload(event);
  if (!payload || !payload.title) return;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const visible = windows.filter((client) => client.visibilityState === 'visible');
      if (visible.length) {
        // The app is open: it shows its own banner, so the system tray stays quiet.
        for (const client of visible) client.postMessage({ type: 'alighting-push', payload });
        return;
      }
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        icon: '/icons/icon-192.png',
        badge: '/icons/favicon-32.png',
        lang: 'tr',
        renotify: false,
        requireInteraction: payload.threshold === 1,
        // Silent still vibrates on most phones; sound-off passengers get neither a chime nor a buzz.
        silent: payload.sound === false,
        vibrate: payload.sound === false ? undefined : [200, 100, 200],
        data: { url: payload.url || '/', dispatchId: payload.dispatchId },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || '/',
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
