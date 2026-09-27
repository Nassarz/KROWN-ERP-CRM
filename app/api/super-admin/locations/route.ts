import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';
import { cached } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Branch distribution by city for the dashboard's Restaurant Distribution map.
// Cities come from real branch rows; unknown cities are returned as-is so the
// UI can list them even when no map pin coordinate is known.

async function buildLocations() {
  const sql = getSql();
  const [cities, totals] = await Promise.all([
    sql`
      SELECT
        COALESCE(NULLIF(TRIM(BOTH FROM city), ''),
                 NULLIF(TRIM(BOTH FROM location), ''),
                 'Unspecified') AS city,
        COUNT(*)::int AS branches,
        COUNT(*) FILTER (WHERE lower(status) = 'active')::int AS active
      FROM branches
      GROUP BY 1
      ORDER BY branches DESC, city ASC`,
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM organizations) AS organizations,
        (SELECT COUNT(*)::int FROM organizations WHERE lower(status) = 'active') AS active_organizations,
        (SELECT COUNT(*)::int FROM branches) AS branches,
        (SELECT COUNT(*)::int FROM branches WHERE lower(status) = 'active') AS active_branches`,
  ]);

  const t = totals[0] || {};
  return {
    cities: cities.map((c: any) => ({ city: c.city, branches: Number(c.branches), active: Number(c.active) })),
    totals: {
      organizations: Number(t.organizations ?? 0),
      activeOrganizations: Number(t.active_organizations ?? 0),
      branches: Number(t.branches ?? 0),
      activeBranches: Number(t.active_branches ?? 0),
    },
  };
}

export async function GET(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  try {
    const data = await cached('sa:locations:v1', 15_000, buildLocations);
    const response = NextResponse.json({ data });
    response.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load locations' }, { status: 500 });
  }
}
