'use client';

// Client-side web push helper: registers the service worker, subscribes to
// push with VAPID, and registers the endpoint with the API.

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export type PushEnableResult = 'enabled' | 'denied' | 'unsupported' | 'unconfigured' | 'error';

/**
 * Prompt (if needed) and register this browser for push.
 * Safe to call on every dashboard mount — no-op when already subscribed.
 */
export async function enablePush(token: string): Promise<PushEnableResult> {
  if (!pushSupported()) return 'unsupported';
  if (!token) return 'error';

  try {
    const keyRes = await fetch('/api/push/subscribe', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const keyData = await keyRes.json().catch(() => ({}));
    if (!keyData?.publicKey) return 'unconfigured';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const registration = await navigator.serviceWorker.register('/sw.js').catch(() => null);
    if (!registration) return 'error';

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as unknown as BufferSource,
      });
    }

    const json = subscription.toJSON();
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh || '', auth: json.keys?.auth || '' },
      }),
    });
    return res.ok ? 'enabled' : 'error';
  } catch {
    return 'error';
  }
}
