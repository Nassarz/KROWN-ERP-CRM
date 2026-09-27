// GET /api/efris/transactions/[id] — transaction detail
import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';
import { resolveEfrisOrganizationId } from '@/lib/services/efris-tenant.service';
import { getSql } from '@/lib/neon-server';
import { getFiscalTransaction } from '@/lib/services/efris-transaction.service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (!hasPermission(ctx.role, 'efris:view')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

  try {
    const { id } = await params;
    const organizationId = await resolveEfrisOrganizationId(ctx, request.nextUrl.searchParams.get('organizationId'));
    if (!organizationId) return NextResponse.json({ data: null, error: 'organizationId is required' }, { status: 400 });
    const sql = getSql();
    const tx = await getFiscalTransaction(organizationId, id);
    if (!tx) return NextResponse.json({ data: null, error: 'Transaction not found' }, { status: 404 });

    const [items, events, submissions, orderRows] = await Promise.all([
      sql`SELECT * FROM efris_transaction_items WHERE transaction_id = ${id} AND organization_id = ${organizationId} ORDER BY created_at ASC`,
      sql`SELECT * FROM efris_events WHERE transaction_id = ${id} AND organization_id = ${organizationId} ORDER BY created_at ASC`,
      sql`SELECT id, attempt_number, interface_code, status, failure_category, return_code, return_message, duration_ms, created_at FROM efris_submissions WHERE transaction_id = ${id} AND organization_id = ${organizationId} ORDER BY attempt_number ASC`,
      sql`SELECT id, table_number, branch_name, total, payment_method, created_at FROM orders WHERE id = ${tx.orderId} AND organization_id = ${organizationId} LIMIT 1`,
    ]);

    return NextResponse.json({
      data: {
        transaction: tx,
        items,
        events,
        submissions,
        order: orderRows.length ? orderRows[0] : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'Failed to load transaction' }, { status: 500 });
  }
}
