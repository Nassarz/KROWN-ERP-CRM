import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';
import { logAuditEvent } from '@/lib/audit';

/**
 * Super Admin branch data source.
 * GET: list branches for a restaurant.
 * POST: create a new branch for a restaurant.
 */
export async function GET(request: NextRequest) {
  const ctx = await extractTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const organizationId = request.nextUrl.searchParams.get('organizationId')?.trim();
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT b.id, b.organization_id, b.name, b.location, b.city, b.status,
        (SELECT COUNT(*)::int FROM staff s WHERE s.assigned_branch_id = b.id AND s.status = 'active') AS staff_count,
        (SELECT COUNT(*)::int FROM orders o WHERE o.branch_name = b.name) AS order_count
      FROM branches b
      WHERE b.organization_id = ${organizationId}
      ORDER BY b.name ASC
    `;
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load branches' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await extractTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const organizationId = String(body.organizationId || '').trim();
    const name = String(body.name || '').trim();
    const location = String(body.location || '').trim();
    const city = String(body.city || '').trim();

    if (!organizationId) return NextResponse.json({ error: 'Restaurant is required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });

    const sql = getSql();

    const orgCheck = await sql`SELECT id, name FROM organizations WHERE id = ${organizationId} LIMIT 1`;
    if (!orgCheck.length) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

    const dupe = await sql`SELECT id FROM branches WHERE organization_id = ${organizationId} AND lower(name) = ${name.toLowerCase()} LIMIT 1`;
    if (dupe.length) return NextResponse.json({ error: 'A branch with this name already exists for this restaurant' }, { status: 409 });

    const rows = await sql`
      INSERT INTO branches (id, organization_id, name, location, city, status, created_at, updated_at)
      VALUES (gen_random_uuid(), ${organizationId}, ${name}, ${location || null}, ${city || null}, 'active', NOW(), NOW())
      RETURNING id, organization_id, name, location, city, status, created_at
    `;

    await logAuditEvent({
      organizationId,
      userId: ctx.userId,
      userEmail: 'super_admin',
      actorRole: 'super_admin',
      action: 'SUPER_ADMIN_BRANCH_CREATE',
      targetType: 'branch',
      targetId: rows[0].id,
      details: { name, location, city },
    });

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create branch' }, { status: 500 });
  }
}
