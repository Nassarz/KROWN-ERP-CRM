import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';
import { cached } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cross-tenant payment activity for the super-admin Payments tab.
// The platform records payments on orders (no separate payments ledger), so a
// payment row is an order with its payment outcome, method and amounts.

async function buildSummary() {
  const sql = getSql();
  const [window, byMethod, byOrg, trend] = await Promise.all([
    sql`
      SELECT
        COALESCE(SUM(paid_amount) FILTER (WHERE payment_status = 'paid' AND created_at >= CURRENT_DATE), 0) AS today,
        COALESCE(SUM(paid_amount) FILTER (WHERE payment_status = 'paid' AND created_at > NOW() - INTERVAL '7 days'), 0) AS last_7d,
        COALESCE(SUM(paid_amount) FILTER (WHERE payment_status = 'paid' AND created_at > NOW() - INTERVAL '30 days'), 0) AS last_30d,
        COALESCE(SUM(total) FILTER (WHERE payment_status IN ('pending','partial','partially_paid')), 0) AS outstanding,
        COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid_count,
        COUNT(*) FILTER (WHERE payment_status IN ('pending','partial','partially_paid'))::int AS pending_count
      FROM orders`,
    sql`
      SELECT COALESCE(NULLIF(payment_method, ''), 'unspecified') AS method,
        COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid_count,
        COALESCE(SUM(paid_amount) FILTER (WHERE payment_status = 'paid'), 0) AS amount
      FROM orders
      GROUP BY 1 ORDER BY amount DESC`,
    sql`
      SELECT o.organization_id, org.name AS organization_name,
        COUNT(*) FILTER (WHERE o.payment_status = 'paid')::int AS paid_count,
        COALESCE(SUM(o.paid_amount) FILTER (WHERE o.payment_status = 'paid'), 0) AS amount
      FROM orders o
      LEFT JOIN organizations org ON org.id = o.organization_id
      GROUP BY 1, 2 ORDER BY amount DESC`,
    sql`
      SELECT to_char(created_at, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(paid_amount) FILTER (WHERE payment_status = 'paid'), 0) AS amount,
        COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS count
      FROM orders
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY 1 ORDER BY 1 ASC`,
  ]);

  const w = window[0] || {};
  return {
    today: Number(w.today ?? 0),
    last7d: Number(w.last_7d ?? 0),
    last30d: Number(w.last_30d ?? 0),
    outstanding: Number(w.outstanding ?? 0),
    paidCount: Number(w.paid_count ?? 0),
    pendingCount: Number(w.pending_count ?? 0),
    byMethod: byMethod.map((r: any) => ({ method: r.method, count: Number(r.paid_count), amount: Number(r.amount) })),
    byOrg: byOrg.map((r: any) => ({
      organizationId: r.organization_id,
      organizationName: r.organization_name,
      count: Number(r.paid_count),
      amount: Number(r.amount),
    })),
    trend: trend.map((r: any) => ({ date: r.date, amount: Number(r.amount), count: Number(r.count) })),
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
  const paymentStatus = sp.get('paymentStatus')?.trim() || 'all';
  const method = sp.get('method')?.trim() || 'all';
  const orgId = sp.get('organizationId')?.trim() || 'all';
  const limit = Math.min(Math.max(parseInt(sp.get('limit') || '25', 10) || 25, 1), 100);
  const page = Math.max(parseInt(sp.get('page') || '1', 10) || 1, 1);
  const offset = (page - 1) * limit;

  try {
    const sql = getSql();
    const [rows, count, summary] = await Promise.all([
      sql`
        SELECT o.id AS order_id, o.organization_id, org.name AS organization_name, o.branch_name,
          o.payment_status, o.payment_method, o.total, o.paid_amount,
          o.amount_received, o.change_amount, o.type, o.created_at
        FROM orders o
        LEFT JOIN organizations org ON org.id = o.organization_id
        WHERE (${searchPattern}::text IS NULL
            OR o.id::text ILIKE ${searchPattern}
            OR org.name ILIKE ${searchPattern}
            OR o.branch_name ILIKE ${searchPattern}
            OR o.payment_method ILIKE ${searchPattern})
          AND (${paymentStatus} = 'all' OR lower(o.payment_status) = lower(${paymentStatus}))
          AND (${method} = 'all' OR lower(COALESCE(o.payment_method, '')) = lower(${method}))
          AND (${orgId}::text = 'all' OR o.organization_id::text = ${orgId})
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}`,
      sql`
        SELECT COUNT(*)::int AS total
        FROM orders o
        LEFT JOIN organizations org ON org.id = o.organization_id
        WHERE (${searchPattern}::text IS NULL
            OR o.id::text ILIKE ${searchPattern}
            OR org.name ILIKE ${searchPattern}
            OR o.branch_name ILIKE ${searchPattern}
            OR o.payment_method ILIKE ${searchPattern})
          AND (${paymentStatus} = 'all' OR lower(o.payment_status) = lower(${paymentStatus}))
          AND (${method} = 'all' OR lower(COALESCE(o.payment_method, '')) = lower(${method}))
          AND (${orgId}::text = 'all' OR o.organization_id::text = ${orgId})`,
      cached('sa:payments:summary:v1', 15_000, buildSummary),
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
    return NextResponse.json({ error: error?.message || 'Failed to load payments' }, { status: 500 });
  }
}
