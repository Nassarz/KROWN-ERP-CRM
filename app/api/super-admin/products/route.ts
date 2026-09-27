import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';
import { cached } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cross-tenant menu/product catalogue for the super-admin Products tab.

async function buildSummary() {
  const sql = getSql();
  const [totals, byOrg, byCategory, efrisMapped] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE available)::int AS available,
        COUNT(*) FILTER (WHERE NOT available)::int AS unavailable,
        COUNT(*) FILTER (WHERE deduct_from_inventory)::int AS inventory_linked,
        COALESCE(AVG(price), 0) AS avg_price,
        COALESCE(SUM(price), 0) AS catalogue_value
      FROM products`,
    sql`
      SELECT p.organization_id, org.name AS organization_name,
        COUNT(*)::int AS product_count,
        COUNT(*) FILTER (WHERE NOT p.available)::int AS unavailable_count
      FROM products p
      LEFT JOIN organizations org ON org.id = p.organization_id
      GROUP BY 1, 2 ORDER BY product_count DESC`,
    sql`
      SELECT COALESCE(NULLIF(category, ''), 'Uncategorised') AS category,
        COUNT(*)::int AS count
      FROM products
      GROUP BY 1 ORDER BY count DESC`,
    sql`SELECT COUNT(*)::int AS count FROM efris_products`,
  ]);

  const t = totals[0] || {};
  return {
    total: Number(t.total ?? 0),
    available: Number(t.available ?? 0),
    unavailable: Number(t.unavailable ?? 0),
    inventoryLinked: Number(t.inventory_linked ?? 0),
    avgPrice: Math.round(Number(t.avg_price ?? 0)),
    catalogueValue: Number(t.catalogue_value ?? 0),
    efrisMapped: Number(efrisMapped[0]?.count ?? 0),
    byOrg: byOrg.map((r: any) => ({
      organizationId: r.organization_id,
      organizationName: r.organization_name,
      count: Number(r.product_count),
      unavailable: Number(r.unavailable_count),
    })),
    byCategory: byCategory.map((r: any) => ({ category: r.category, count: Number(r.count) })),
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
  const availability = sp.get('available')?.trim() || 'all'; // all | available | unavailable
  const limit = Math.min(Math.max(parseInt(sp.get('limit') || '25', 10) || 25, 1), 100);
  const page = Math.max(parseInt(sp.get('page') || '1', 10) || 1, 1);
  const offset = (page - 1) * limit;

  try {
    const sql = getSql();
    const [rows, count, summary] = await Promise.all([
      sql`
        SELECT p.id, p.organization_id, org.name AS organization_name, p.branch_name,
          p.name, p.price, p.category, p.available, p.requires_kitchen,
          p.deduct_from_inventory, p.image, p.created_at,
          (SELECT COUNT(*)::int FROM efris_products ep WHERE ep.product_id = p.id) AS efris_mapped
        FROM products p
        LEFT JOIN organizations org ON org.id = p.organization_id
        WHERE (${searchPattern}::text IS NULL
            OR p.name ILIKE ${searchPattern}
            OR p.category ILIKE ${searchPattern}
            OR org.name ILIKE ${searchPattern}
            OR p.branch_name ILIKE ${searchPattern})
          AND (${orgId}::text = 'all' OR p.organization_id::text = ${orgId})
          AND (${availability} = 'all'
            OR (${availability} = 'available' AND p.available)
            OR (${availability} = 'unavailable' AND NOT p.available))
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}`,
      sql`
        SELECT COUNT(*)::int AS total
        FROM products p
        LEFT JOIN organizations org ON org.id = p.organization_id
        WHERE (${searchPattern}::text IS NULL
            OR p.name ILIKE ${searchPattern}
            OR p.category ILIKE ${searchPattern}
            OR org.name ILIKE ${searchPattern}
            OR p.branch_name ILIKE ${searchPattern})
          AND (${orgId}::text = 'all' OR p.organization_id::text = ${orgId})
          AND (${availability} = 'all'
            OR (${availability} = 'available' AND p.available)
            OR (${availability} = 'unavailable' AND NOT p.available))`,
      cached('sa:products:summary:v1', 15_000, buildSummary),
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
    return NextResponse.json({ error: error?.message || 'Failed to load products' }, { status: 500 });
  }
}
