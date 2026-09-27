// KROWN — in-process sliding-window rate limiter.
// Works per Node instance (the nginx edge limiter provides the global cap).
// Trips notify super admins through the central dispatcher.

const WINDOW_MS = 60_000;

type Bucket = { hits: number[]; notifiedAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number): void {
  if (now - lastSweep < WINDOW_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter(t => now - t < WINDOW_MS);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  blockedNow: boolean; // true only on the request that first crossed the limit
  count: number;
}

/**
 * @param key      unique limiter key, e.g. `login:1.2.3.4`
 * @param limit    max hits per window
 * @param windowMs optional custom window (defaults to 60s)
 */
export function rateLimit(key: string, limit: number, windowMs: number = WINDOW_MS): RateLimitResult {
  const now = Date.now();
  sweep(now);

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [], notifiedAt: 0 };
    buckets.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter(t => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const blockedNow = now - bucket.notifiedAt > windowMs;
    if (blockedNow) bucket.notifiedAt = now;
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + windowMs,
      blockedNow,
      count: bucket.hits.length,
    };
  }

  bucket.hits.push(now);
  return {
    allowed: true,
    remaining: limit - bucket.hits.length,
    resetAt: now + windowMs,
    blockedNow: false,
    count: bucket.hits.length,
  };
}

/** Snapshot for diagnostics (System tab). */
export function rateLimitSnapshot(): Array<{ key: string; hits: number }> {
  const now = Date.now();
  const out: Array<{ key: string; hits: number }> = [];
  for (const [key, bucket] of buckets) {
    const hits = bucket.hits.filter(t => now - t < WINDOW_MS).length;
    if (hits > 0) out.push({ key, hits });
  }
  return out.sort((a, b) => b.hits - a.hits).slice(0, 50);
}

export function clientIpOf(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'local';
}
