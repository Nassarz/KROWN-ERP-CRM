// Subscription expiry checker — call from a scheduler, cron service or the UI.
// Runs: warn restaurant + super admins 2 days before expiry, expire on the date.
// All notifications go out as in-app + web push + email.

import { NextRequest, NextResponse } from 'next/server';
import { checkSubscriptionExpiries } from '@/lib/services/subscription.service';
import { cacheGet, cacheSet } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEDUPE_KEY = 'cron:subscriptions:last-run';
const DEDUPE_MS = 5 * 60_000; // at most one effective run per 5 minutes

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  // Optional shared secret (set CRON_SECRET and call with ?secret=... or header).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided =
      request.nextUrl.searchParams.get('secret') ||
      request.headers.get('x-cron-secret') ||
      '';
    if (provided !== secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const lastRun = cacheGet<number>(DEDUPE_KEY);
  const now = Date.now();
  if (lastRun && now - lastRun < DEDUPE_MS && request.nextUrl.searchParams.get('force') !== '1') {
    return NextResponse.json({ ok: true, skipped: 'recently-run', lastRun: new Date(lastRun).toISOString() });
  }

  try {
    const result = await checkSubscriptionExpiries();
    cacheSet(DEDUPE_KEY, now, DEDUPE_MS);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'check failed' }, { status: 500 });
  }
}
