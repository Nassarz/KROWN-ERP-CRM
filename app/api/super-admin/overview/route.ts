// Aggregated super-admin overview: runs the dashboard's 8 data sources
// server-side in one round trip, in parallel, with a short TTL cache.
// Fixes >5s dashboard loads caused by a client-side fan-out of 8 APIs.

import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { cached } from '@/lib/cache';

import { GET as getOrgs } from '@/app/api/super-admin/orgs/route';
import { GET as getStaff } from '@/app/api/staff/route';
import { GET as getDevices } from '@/app/api/devices/route';
import { GET as getAlerts } from '@/app/api/security/alerts/route';
import { GET as getHealth } from '@/app/api/health/route';
import { GET as getFlags } from '@/app/api/feature-flags/route';
import { GET as getAnalytics } from '@/app/api/super-admin/analytics/route';
import { GET as getAudit } from '@/app/api/audit/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTL_MS = 15_000;

function syntheticRequest(authHeader: string | null, path: string): NextRequest {
  const headers = new Headers();
  if (authHeader) headers.set('authorization', authHeader);
  return new NextRequest(new Request(`http://internal${path}`, { method: 'GET', headers }));
}

interface OverviewPayload {
  orgs: any[];
  staff: any[];
  devices: any[];
  alerts: any[];
  health: any;
  flags: any[];
  analytics: any;
  audit: any[];
}

async function inner(handler: (req: NextRequest) => Promise<Response>, path: string, auth: string | null): Promise<any> {
  try {
    const res = await handler(syntheticRequest(auth, path));
    if (!res.ok) return null;
    const json = await res.json();
    // Most routes return { data }; /api/health returns the object directly.
    return json && typeof json === 'object' && 'data' in json ? json.data : json;
  } catch {
    return null;
  }
}

async function buildOverview(auth: string | null): Promise<OverviewPayload> {
  const [orgs, staff, devices, alerts, health, flags, analytics, audit] = await Promise.all([
    inner(getOrgs as any, '/api/super-admin/orgs', auth),
    inner(getStaff as any, '/api/staff?limit=100', auth),
    inner(getDevices as any, '/api/devices', auth),
    inner(getAlerts as any, '/api/security/alerts?limit=50', auth),
    inner(getHealth as any, '/api/health', auth),
    inner(getFlags as any, '/api/feature-flags', auth),
    inner(getAnalytics as any, '/api/super-admin/analytics', auth),
    inner(getAudit as any, '/api/audit?limit=100', auth),
  ]);

  return {
    orgs: orgs || [],
    staff: staff || [],
    devices: devices || [],
    alerts: alerts || [],
    health,
    flags: flags || [],
    analytics,
    audit: audit || [],
  };
}

export async function GET(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const auth = request.headers.get('authorization');
  const started = Date.now();

  // SA-visible platform data is identical for every super admin → one shared
  // cache entry, refreshed every 15s, keeps tab switches near-instant.
  const data = await cached<OverviewPayload>('sa:overview:v1', TTL_MS, () => buildOverview(auth));

  return NextResponse.json(
    { data, meta: { durationMs: Date.now() - started, cachedTtlMs: TTL_MS } },
    { headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=30' } }
  );
}
