/** Browser-side Web Push helpers. The VAPID public key is fetched from the server, never bundled. */

export type PushPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function pushPermission(): PushPermission {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission as PushPermission;
}

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

function keyToBytes(base64Url: string) {
  const padded = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function hasPushSubscription() {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try {
    return Boolean(await currentSubscription());
  } catch {
    return false;
  }
}

/**
 * Asks for permission (this must run from a tap), subscribes and stores the
 * subscription for the signed-in passenger. Returns the resulting permission.
 */
export async function enablePush(): Promise<PushPermission> {
  if (!pushSupported()) return 'unsupported';
  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== 'granted') return permission as PushPermission;

  try {
    const keyResponse = await fetch('/api/push/vapid-key');
    if (!keyResponse.ok) return 'granted'; // Banners still work; the server has no push provider.
    const { publicKey } = (await keyResponse.json()) as { publicKey: string };
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyToBytes(publicKey),
      }));
    await fetch('/api/push/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });
  } catch {
    // A failed subscription must not block the preference change; the banner path still works.
  }
  return 'granted';
}

export async function disablePush() {
  if (!pushSupported()) return;
  try {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await fetch('/api/push/subscription', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  } catch {
    // Best effort; the server also drops subscriptions the push service reports as gone.
  }
}

/** Short two-note chime; browsers may refuse it before the first tap, which is fine. */
export function playChime() {
  try {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const audio = new Context();
    [880, 1175].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + index * 0.16;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.32);
    });
    window.setTimeout(() => void audio.close(), 900);
  } catch {
    // Audio is a nicety.
  }
}
