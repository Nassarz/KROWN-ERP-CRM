// GET /api/efris/queue — durable queue view
import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';
import { resolveEfrisOrganizationId } from '@/lib/services/efris-tenant.service';
import { getSql } from '@/lib/neon-server';

export async function GET(request: NextRequest) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (!hasPermission(ctx.role, 'efris:view')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

  try {
    const organizationId = await resolveEfrisOrganizationId(ctx, request.nextUrl.searchParams.get('organizationId'));
    if (!organizationId) return NextResponse.json({ data: null, error: 'organizationId is required' }, { status: 400 });
    const sql = getSql();
    const status = request.nextUrl.searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10) || 50, 200);

    const rows = status
      ? await sql`
          SELECT q.*, t.order_id, t.krown_reference, t.gross_amount, t.fiscal_status AS tx_fiscal_status
          FROM efris_queue q
          LEFT JOIN efris_transactions t ON t.id = q.transaction_id AND t.organization_id = q.organization_id
          WHERE q.organization_id = ${organizationId} AND q.status = ${status}
          ORDER BY COALESCE(q.next_attempt_at, q.created_at) ASC
          LIMIT ${limit}
        `
      : await sql`
          SELECT q.*, t.order_id, t.krown_reference, t.gross_amount, t.fiscal_status AS tx_fiscal_status
          FROM efris_queue q
          LEFT JOIN efris_transactions t ON t.id = q.transaction_id AND t.organization_id = q.organization_id
          WHERE q.organization_id = ${organizationId}
          ORDER BY COALESCE(q.next_attempt_at, q.created_at) ASC
          LIMIT ${limit}
        `;

    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'Failed to load queue' }, { status: 500 });
  }
}
