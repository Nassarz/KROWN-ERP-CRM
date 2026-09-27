// GET /api/efris/transactions — fiscal transaction explorer
import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';
import { resolveEfrisOrganizationId } from '@/lib/services/efris-tenant.service';
import { listFiscalTransactions, getFiscalTransactionByOrder } from '@/lib/services/efris-transaction.service';
import { getSql } from '@/lib/neon-server';

export async function GET(request: NextRequest) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (!hasPermission(ctx.role, 'efris:view')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

  try {
    const organizationId = await resolveEfrisOrganizationId(ctx, request.nextUrl.searchParams.get('organizationId'));
    if (!organizationId) return NextResponse.json({ data: null, error: 'organizationId is required' }, { status: 400 });
    const sql = getSql();
    const orderId = request.nextUrl.searchParams.get('orderId');
    if (orderId) {
      const tx = await getFiscalTransactionByOrder(organizationId, orderId);
      const items = tx
        ? await sql`SELECT * FROM efris_transaction_items WHERE transaction_id = ${tx.id} AND organization_id = ${organizationId} ORDER BY created_at ASC`
        : [];
      const events = tx
        ? await sql`SELECT * FROM efris_events WHERE transaction_id = ${tx.id} AND organization_id = ${organizationId} ORDER BY created_at ASC`
        : [];
      return NextResponse.json({ data: { transaction: tx, items, events } });
    }

    const branchId = request.nextUrl.searchParams.get('branchId') || undefined;
    const status = request.nextUrl.searchParams.get('status') || undefined;
    const transactionType = request.nextUrl.searchParams.get('type') || undefined;
    const search = request.nextUrl.searchParams.get('search') || undefined;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10) || 50;
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10) || 0;

    const result = await listFiscalTransactions(organizationId, {
      branchId,
      status: status as any,
      transactionType: transactionType as any,
      search,
      limit,
      offset,
    });

    // Attach order context (table, branch name, staff) for the explorer
    const orderIds = result.transactions.map(t => t.orderId);
    let orders: any[] = [];
    if (orderIds.length) {
      orders = await sql`
        SELECT id, table_number, branch_name, total, created_at
        FROM orders WHERE organization_id = ${organizationId} AND id = ANY(${orderIds})
      `;
    }
    const orderMap = new Map((orders as any[]).map(o => [o.id, o]));

    return NextResponse.json({
      data: {
        ...result,
        transactions: result.transactions.map(t => ({
          ...t,
          order: orderMap.get(t.orderId) ?? null,
        })),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'Failed to load fiscal transactions' }, { status: 500 });
  }
}
