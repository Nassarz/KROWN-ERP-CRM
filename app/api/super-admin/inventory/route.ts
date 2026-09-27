import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';
import { cached } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cross-tenant stock view for the super-admin Inventory tab: ingredients with
// low-stock thresholds, stock valuation, and the latest movements feed.

async function buildSummary() {
  const sql = getSql();
  const [totals, lowByOrg, recent] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE min_threshold IS NOT NULL AND min_threshold > 0 AND quantity <= min_threshold)::int AS low_stock,
        COUNT(*) FILTER (WHERE quantity <= 0)::int AS out_of_stock,
        COALESCE(SUM(quantity * COALESCE(cost_per_unit_ugx, 0)), 0) AS stock_value,
        (SELECT COUNT(*)::int FROM inventory_movements WHERE created_at > NOW() - INTERVAL '7 days') AS movements_7d
      FROM ingredients`,
    sql`
      SELECT i.organization_id, org.name AS organization_name,
        COUNT(*)::int AS ingredient_count,
        COUNT(*) FILTER (WHERE i.min_threshold IS NOT NULL AND i.min_threshold > 0 AND i.quantity <= i.min_threshold)::int AS low_stock
      FROM ingredients i
      LEFT JOIN organizations org ON org.id = i.organization_id
      GROUP BY 1, 2 ORDER BY low_stock DESC, ingredient_count DESC`,
    sql`
      SELECT m.id, m.ingredient_name, m.type, m.quantity_change, m.quantity_after,
        m.branch_name, m.organization_id, org.name AS organization_name,
        m.performed_by, m.created_at
      FROM inventory_movements m
      LEFT JOIN organizations org ON org.id = m.organization_id
      ORDER BY m.created_at DESC
      LIMIT 8`,
  ]);

  const t = totals[0] || {};
  return {
    total: Number(t.total ?? 0),
    lowStock: Number(t.low_stock ?? 0),
    outOfStock: Number(t.out_of_stock ?? 0),
    stockValue: Number(t.stock_value ?? 0),
    movements7d: Number(t.movements_7d ?? 0),
    byOrg: lowByOrg.map((r: any) => ({
      organizationId: r.organization_id,
      organizationName: r.organization_name,
      count: Number(r.ingredient_count),
      lowStock: Number(r.low_stock),
    })),
    recent: recent.map((r: any) => ({
      id: r.id,
      ingredientName: r.ingredient_name,
      type: r.type,
      quantityChange: Number(r.quantity_change ?? 0),
      quantityAfter: Number(r.quantity_after ?? 0),
      branchName: r.branch_name,
      organizationId: r.organization_id,
      organizationName: r.organization_name,
      performedBy: r.performed_by,
      createdAt: r.created_at,
    })),
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
  const orgId = sp.get('organizationId')?.trim() || 'all';
  const stockFilter = sp.get('stock')?.trim() || 'all'; // all | low | out | ok
  const limit = Math.min(Math.max(parseInt(sp.get('limit') || '25', 10) || 25, 1), 100);
  const page = Math.max(parseInt(sp.get('page') || '1', 10) || 1, 1);
  const offset = (page - 1) * limit;

  try {
    const sql = getSql();
    // Filters use the parameterised idiom shared by the other SA list routes;
    // stockFilter is constrained to the four literals above before use.
    const rows = await sql`
      SELECT i.id, i.organization_id, org.name AS organization_name, i.branch_name,
        i.name, i.quantity, i.unit, i.min_threshold, i.category, i.supplier,
        i.cost_per_unit_ugx,
        (i.quantity * COALESCE(i.cost_per_unit_ugx, 0)) AS stock_value,
        CASE
          WHEN i.quantity <= 0 THEN 'out'
          WHEN i.min_threshold IS NOT NULL AND i.min_threshold > 0 AND i.quantity <= i.min_threshold THEN 'low'
          ELSE 'ok'
        END AS stock_state,
        i.updated_at
      FROM ingredients i
      LEFT JOIN organizations org ON org.id = i.organization_id
      WHERE (${searchPattern}::text IS NULL
          OR i.name ILIKE ${searchPattern}
          OR i.category ILIKE ${searchPattern}
          OR i.supplier ILIKE ${searchPattern}
          OR org.name ILIKE ${searchPattern}
          OR i.branch_name ILIKE ${searchPattern})
        AND (${orgId}::text = 'all' OR i.organization_id::text = ${orgId})
        AND (${stockFilter} = 'all'
          OR (${stockFilter} = 'out' AND i.quantity <= 0)
          OR (${stockFilter} = 'low' AND i.min_threshold IS NOT NULL AND i.min_threshold > 0 AND i.quantity <= i.min_threshold AND i.quantity > 0)
          OR (${stockFilter} = 'ok' AND NOT (i.quantity <= 0 OR (i.min_threshold IS NOT NULL AND i.min_threshold > 0 AND i.quantity <= i.min_threshold))))
      ORDER BY
        CASE WHEN i.min_threshold IS NOT NULL AND i.min_threshold > 0 AND i.quantity <= i.min_threshold THEN 0 ELSE 1 END,
        i.updated_at DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}`;

    const count = await sql`
      SELECT COUNT(*)::int AS total
      FROM ingredients i
      LEFT JOIN organizations org ON org.id = i.organization_id
      WHERE (${searchPattern}::text IS NULL
          OR i.name ILIKE ${searchPattern}
          OR i.category ILIKE ${searchPattern}
          OR i.supplier ILIKE ${searchPattern}
          OR org.name ILIKE ${searchPattern}
          OR i.branch_name ILIKE ${searchPattern})
        AND (${orgId}::text = 'all' OR i.organization_id::text = ${orgId})
        AND (${stockFilter} = 'all'
          OR (${stockFilter} = 'out' AND i.quantity <= 0)
          OR (${stockFilter} = 'low' AND i.min_threshold IS NOT NULL AND i.min_threshold > 0 AND i.quantity <= i.min_threshold AND i.quantity > 0)
          OR (${stockFilter} = 'ok' AND NOT (i.quantity <= 0 OR (i.min_threshold IS NOT NULL AND i.min_threshold > 0 AND i.quantity <= i.min_threshold))))`;

    const summary = await cached('sa:inventory:summary:v1', 15_000, buildSummary);

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
    return NextResponse.json({ error: error?.message || 'Failed to load inventory' }, { status: 500 });
  }
}
