const CACHE_NAME = 'krown-erp-v7-offline-shell';
const OFFLINE_URL = '/';
const CORE_ASSETS = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Web Push (works while the app is fully closed) ─────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'KROWN POS';
  const options = {
    body: data.body || '',
    icon: 'https://i.ibb.co/wh2T8MZ7/file-00000000c36482088cf56fe82910d3c4.png',
    badge: 'https://i.ibb.co/wh2T8MZ7/file-00000000c36482088cf56fe82910d3c4.png',
    tag: data.tag || 'krown',
    renotify: true,
    requireInteraction: data.priority === 'urgent' || data.priority === 'high',
    vibrate: [120, 60, 120],
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  const action = event.action;

  // Incoming-call notifications carry Accept/Decline actions: forward the
  // choice to the open app so the call is answered or declined from the
  // OS notification itself.
  if (action && Array.isArray(data.callActions) && data.callActions.includes(action)) {
    const tag = event.notification.tag;
    event.notification.close();
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
        let sent = null;
        for (const client of list) {
          if ('focus' in client) {
            client.focus();
            sent = client.postMessage({ type: 'call-action', action, tag });
            break;
          }
        }
        return sent || self.clients.openWindow(data.url || '/');
      })
    );
    return;
  }

  event.notification.close();
  const target = data.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

function isApi(pathname) {
  return pathname.startsWith('/api/');
}

function isAuthOrDeviceApi(pathname) {
  return pathname.startsWith('/api/auth/') || pathname.startsWith('/api/devices/');
}

function isNextAsset(pathname) {
  return pathname.startsWith('/_next/static/') || pathname.startsWith('/_next/image');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API responses are handled by lib/sync.ts, which scopes its IndexedDB cache
  // by organization + branch + device. Do not create a second, unscoped API cache
  // in the service worker.
  if (isApi(url.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    // Next.js immutable chunks and static assets are safe to serve cache-first.
    if (isNextAsset(url.pathname)) {
      if (cached) return cached;
      try {
        const network = await fetch(request);
        if (network.ok) event.waitUntil(cache.put(request, network.clone()).catch(() => undefined));
        return network;
      } catch {
        return new Response('', { status: 503, statusText: 'Offline' });
      }
    }

    // Navigations use the latest online document, while retaining the last known
    // document for immediate offline startup. Every successful route visit is
    // cached, so an already-used PWA can reopen without internet.
    if (request.mode === 'navigate') {
      try {
        const network = await fetch(request);
        if (network.ok) event.waitUntil(cache.put(request, network.clone()).catch(() => undefined));
        return network;
      } catch {
        if (cached) return cached;
        const shell = await cache.match(OFFLINE_URL);
        if (shell) return shell;
        return new Response('<!doctype html><title>KROWN</title><body>KROWN is ready to work offline. Reopen the application.</body>', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    }

    // Other same-origin static GETs: return cached immediately when available and
    // refresh the cache in the background; otherwise fetch and cache them.
    if (cached) {
      event.waitUntil(
        fetch(request).then((network) => network.ok ? cache.put(request, network.clone()) : undefined).catch(() => undefined)
      );
      return cached;
    }

    try {
      const network = await fetch(request);
      if (network.ok) event.waitUntil(cache.put(request, network.clone()).catch(() => undefined));
      return network;
    } catch {
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
