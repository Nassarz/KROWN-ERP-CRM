import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';
import { cached } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cross-tenant order list + platform summary for the super-admin Orders tab.
// Read-only, super_admin enforced.

async function buildSummary() {
  const sql = getSql();
  const [totals, byStatus, byMethod, byDay] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid,
        COUNT(*) FILTER (WHERE payment_status IN ('pending','partial','partially_paid'))::int AS awaiting,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS last_7d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS last_30d,
        COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0) AS revenue,
        COALESCE(AVG(total) FILTER (WHERE payment_status = 'paid'), 0) AS avg_order_value
      FROM orders`,
    sql`SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status ORDER BY count DESC`,
    sql`
      SELECT COALESCE(NULLIF(payment_method, ''), 'unspecified') AS method,
        COUNT(*)::int AS count,
        COALESCE(SUM(paid_amount), 0) AS amount
      FROM orders
      WHERE payment_status = 'paid'
      GROUP BY 1 ORDER BY count DESC`,
    sql`
      SELECT to_char(created_at, 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS count,
        COALESCE(SUM(total), 0) AS revenue
      FROM orders
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY 1 ORDER BY 1 ASC`,
  ]);

  return {
    total: Number(totals[0]?.total ?? 0),
    paid: Number(totals[0]?.paid ?? 0),
    awaiting: Number(totals[0]?.awaiting ?? 0),
    last7d: Number(totals[0]?.last_7d ?? 0),
    last30d: Number(totals[0]?.last_30d ?? 0),
    revenue: Number(totals[0]?.revenue ?? 0),
    avgOrderValue: Math.round(Number(totals[0]?.avg_order_value ?? 0)),
    byStatus: byStatus.map((r: any) => ({ status: r.status, count: Number(r.count) })),
    byMethod: byMethod.map((r: any) => ({ method: r.method, count: Number(r.count), amount: Number(r.amount) })),
    byDay: byDay.map((r: any) => ({ date: r.date, count: Number(r.count), revenue: Number(r.revenue) })),
  };
}

export async function GET(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const search = sp.get('search')?.trim() || null;
  const searchPattern = search ? `%${search}%` : null;
  const status = sp.get('status')?.trim() || 'all';
  const paymentStatus = sp.get('paymentStatus')?.trim() || 'all';
  const orgId = sp.get('organizationId')?.trim() || 'all';
  const limit = Math.min(Math.max(parseInt(sp.get('limit') || '25', 10) || 25, 1), 100);
  const page = Math.max(parseInt(sp.get('page') || '1', 10) || 1, 1);
  const offset = (page - 1) * limit;

  try {
    const sql = getSql();
    const [rows, count, summary] = await Promise.all([
      sql`
        SELECT o.id, o.organization_id, org.name AS organization_name, o.branch_name,
          o.table_number, o.type, o.status, o.payment_status, o.payment_method,
          o.total, o.paid_amount, o.tax, o.subtotal,
          COALESCE(jsonb_array_length(o.items), 0) AS item_count,
          o.created_at
        FROM orders o
        LEFT JOIN organizations org ON org.id = o.organization_id
        WHERE (${searchPattern}::text IS NULL
            OR o.id::text ILIKE ${searchPattern}
            OR o.branch_name ILIKE ${searchPattern}
            OR org.name ILIKE ${searchPattern}
            OR o.table_number ILIKE ${searchPattern})
          AND (${status} = 'all' OR lower(o.status) = lower(${status}))
          AND (${paymentStatus} = 'all' OR lower(o.payment_status) = lower(${paymentStatus}))
          AND (${orgId}::text = 'all' OR o.organization_id::text = ${orgId})
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}`,
      sql`
        SELECT COUNT(*)::int AS total
        FROM orders o
        LEFT JOIN organizations org ON org.id = o.organization_id
        WHERE (${searchPattern}::text IS NULL
            OR o.id::text ILIKE ${searchPattern}
            OR o.branch_name ILIKE ${searchPattern}
            OR org.name ILIKE ${searchPattern}
            OR o.table_number ILIKE ${searchPattern})
          AND (${status} = 'all' OR lower(o.status) = lower(${status}))
          AND (${paymentStatus} = 'all' OR lower(o.payment_status) = lower(${paymentStatus}))
          AND (${orgId}::text = 'all' OR o.organization_id::text = ${orgId})`,
      cached('sa:orders:summary:v1', 15_000, buildSummary),
    ]);

    const response = NextResponse.json({
      data: {
        rows,
        summary,
        meta: { total: Number(count[0]?.total ?? 0), page, limit },
      },
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load orders' }, { status: 500 });
  }
}
