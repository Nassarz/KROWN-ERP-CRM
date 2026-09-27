// GET /api/orders/[id]/fiscal — receipt-safe EFRIS fiscal payload for an order.
// Cashiers and managers can re-print with FDN / antifake / QR without efris:view
// (control-center) access. Never returns secrets or raw envelopes.
import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';
import { getSql } from '@/lib/neon-server';
import { getFiscalTransactionByOrder } from '@/lib/services/efris-transaction.service';
import { getEfrisConfigSafe } from '@/lib/services/efris-config.service';
import { fiscalTransactionToReceipt, type ReceiptFiscalPayload } from '@/lib/efris/receipt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Missing tenant context' }, { status: 401 });
  if (!hasPermission(ctx.role, 'orders:view')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const sql = getSql();
    const orderRows = await sql`
      SELECT id, payment_status FROM orders
      WHERE id = ${id} AND organization_id = ${ctx.organizationId}
      LIMIT 1
    `;
    if (!orderRows.length) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const tx = await getFiscalTransactionByOrder(ctx.organizationId, id);
    if (!tx) {
      return NextResponse.json({ data: { efris: null } });
    }

    const config = await getEfrisConfigSafe(ctx.organizationId);
    const efris: ReceiptFiscalPayload | null = fiscalTransactionToReceipt(tx, {
      deviceNumber: config?.deviceNumber ?? null,
      taxpayerTin: config?.taxpayerTin ?? null,
      environment: config?.environment ?? null,
      integrationMode: config?.integrationMode ?? null,
    });

    return NextResponse.json({
      data: {
        efris,
        orderId: id,
        fiscalStatus: tx.fiscalStatus,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load fiscal receipt data' }, { status: 500 });
  }
}
