// Tiny in-memory TTL cache used to keep hot super-admin reads under ~5s.
// Safe per Node process; the load balancer may run several instances, each
// with its own warm cache (stale window is short by design).

type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();
const MAX_KEYS = 500;

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  if (store.size >= MAX_KEYS) {
    // Drop the oldest quarter of entries (Map preserves insertion order).
    let toDrop = Math.ceil(MAX_KEYS / 4);
    for (const k of store.keys()) {
      store.delete(k);
      if (--toDrop <= 0) break;
    }
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheClear(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

/** Memoize an async producer for ttlMs. Concurrent callers share one promise. */
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, producer: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const p = (async () => {
    try {
      const value = await producer();
      cacheSet(key, value, ttlMs);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}
