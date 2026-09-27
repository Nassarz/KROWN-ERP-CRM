// ============================================================================
// KROWN ERP — EFRIS POS fiscalization hook
// Runs as part of the payment workflow, but NEVER blocks or rolls back a
// successful payment:
//   payment → fiscalize (best effort) → receipt data
// If fiscalization fails/unknowns, the order stays PAID and the fiscal
// transaction is queued for reconciliation. The cashier is NEVER told to
// charge the customer again.
// ============================================================================

import { getSql } from '@/lib/neon-server';
import type { TenantContext } from '@/lib/tenant';
import { getEfrisConfigWithSecrets, isEfrisActive } from './efris-config.service';
import { createFiscalTransaction, getFiscalTransactionByOrder } from './efris-transaction.service';
import { resolveEfrisAdapter } from '@/lib/efris/client';
import { rebuildAndSubmit, buildSellerProfile } from './efris-submit.service';
import type { EfrisTransactionRow, FiscalStatus } from '@/lib/efris/types';
import { logAuditEvent } from '@/lib/audit';

export interface PosFiscalResult {
  /** true when EFRIS is active for this restaurant */
  applicable: boolean;
  transaction: EfrisTransactionRow | null;
  fiscalized: boolean;
  pending: boolean;
  needsAttention: boolean;
  needsReconciliation: boolean;
  status: FiscalStatus | null;
  fiscalDocumentNumber: string | null;
  /** Safe status for the cashier UI */
  cashierMessage: 'fiscalized' | 'pending' | 'attention' | 'not_applicable';
}

export async function fiscalizePaidOrder(ctx: TenantContext, orderId: string): Promise<PosFiscalResult> {
  const sql = getSql();
  const notApplicable: PosFiscalResult = {
    applicable: false, transaction: null, fiscalized: false, pending: false,
    needsAttention: false, needsReconciliation: false, status: null,
    fiscalDocumentNumber: null, cashierMessage: 'not_applicable',
  };

  try {
    const active = await isEfrisActive(ctx.organizationId);
    if (!active) return notApplicable;

    const config = await getEfrisConfigWithSecrets(ctx.organizationId);
    if (!config || !config.taxpayerTin || !config.deviceNumber) return notApplicable;

    const orderRows = await sql`SELECT * FROM orders WHERE id = ${orderId} AND organization_id = ${ctx.organizationId} LIMIT 1`;
    if (!orderRows.length) return notApplicable;
    const order = orderRows[0] as any;

    // Only fiscalize PAID orders — a kitchen order is NOT a fiscal sale.
    if (order.payment_status !== 'paid') return notApplicable;

    // Idempotent: if a fiscal transaction already exists for this order,
    // never create a second one.
    const existing = await getFiscalTransactionByOrder(ctx.organizationId, orderId);
    if (existing) {
      const done = existing.fiscalStatus === 'fiscalized';
      return {
        applicable: true,
        transaction: existing,
        fiscalized: done,
        pending: !done && ['pending', 'queued', 'preparing', 'submitting', 'submitted', 'retrying'].includes(existing.fiscalStatus),
        needsAttention: ['unknown', 'rejected', 'manual_review'].includes(existing.fiscalStatus),
        needsReconciliation: existing.fiscalStatus === 'unknown',
        status: existing.fiscalStatus,
        fiscalDocumentNumber: existing.fiscalDocumentNumber,
        cashierMessage: done ? 'fiscalized' : existing.fiscalStatus === 'unknown' ? 'attention' : 'pending',
      };
    }

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const products = await sql`SELECT id, name, category FROM products WHERE organization_id = ${ctx.organizationId} AND id = ANY(${(items as any[]).map((i: any) => i.productId)})`;
    const productMap = new Map((products as any[]).map(p => [p.id, p]));

    // Product fiscal mappings (tax categories, commodity codes)
    const mappings = await sql`SELECT product_id, tax_category, commodity_goods_id, unit_of_measure FROM efris_products WHERE organization_id = ${ctx.organizationId} AND product_id = ANY(${(items as any[]).map((i: any) => i.productId)})`;
    const mappingMap = new Map((mappings as any[]).map(m => [m.product_id, m]));

    const subtotal = Number(order.subtotal || 0);
    const tax = Number(order.tax || 0);
    const total = Number(order.total || 0);

    const created = await createFiscalTransaction(
      {
        organizationId: ctx.organizationId,
        branchId: order.restaurant_id ?? ctx.branchId,
        orderId,
        transactionType: 'receipt',
        grossAmount: total,
        taxAmount: tax,
        netAmount: subtotal,
        currency: 'UGX',
        operatorName: ctx.userId,
        buyerTin: order.tin_number ?? null,
        buyerName: order.company_name ?? null,
        items: (items as any[]).map((item: any) => {
          const product = productMap.get(item.productId);
          const mapping = mappingMap.get(item.productId);
          const unitPrice = Number(item.unitPrice || 0);
          const lineTotal = unitPrice * Number(item.quantity || 1);
          const taxCategory = (mapping?.tax_category as any) || 'A';
          const taxRate = taxCategory === 'A' || taxCategory === 'D' ? 0.18 : 0;
          return {
            productId: item.productId,
            itemName: item.name || product?.name || 'Item',
            itemCode: product?.id?.slice(0, 20) || null,
            quantity: Number(item.quantity || 1),
            unitPrice,
            total: lineTotal,
            taxRate,
            taxAmount: Math.round(lineTotal * taxRate),
            taxCategory,
            categoryName: product?.category || null,
            goodsCategoryId: mapping?.commodity_goods_id || null,
          };
        }),
      },
      { actor: { userId: ctx.userId, role: ctx.role } },
    );

    if (created.replayed) {
      return {
        applicable: true,
        transaction: created.transaction,
        fiscalized: created.transaction.fiscalStatus === 'fiscalized',
        pending: true,
        needsAttention: ['unknown', 'rejected', 'manual_review'].includes(created.transaction.fiscalStatus),
        needsReconciliation: created.transaction.fiscalStatus === 'unknown',
        status: created.transaction.fiscalStatus,
        fiscalDocumentNumber: created.transaction.fiscalDocumentNumber,
        cashierMessage: created.transaction.fiscalStatus === 'unknown' ? 'attention' : 'pending',
      };
    }

    // Submit through the adapter. Sandbox environment uses the Mock adapter
    // (visibly simulated). Payment is NOT rolled back on any failure.
    const adapter = resolveEfrisAdapter({
      environment: config.environment,
      integrationMode: config.integrationMode,
      offlineEnablerHost: config.offlineEnablerHost,
      offlineEnablerPort: config.offlineEnablerPort,
    });

    const seller = await buildSellerProfile(ctx.organizationId, {
      tin: config.taxpayerTin,
      brn: config.businessRegistrationNumber || '',
      taxpayerName: config.taxpayerName,
    });

    const result = await rebuildAndSubmit({
      organizationId: ctx.organizationId,
      transactionId: created.transaction.id,
      actor: { userId: ctx.userId, role: ctx.role },
      adapter,
      envelopeOptions: {
        interfaceCode: 'T109',
        tin: config.taxpayerTin,
        brn: config.businessRegistrationNumber || '',
        deviceNo: config.deviceNumber,
        userName: 'admin',
      },
      seller,
    });

    return {
      applicable: true,
      transaction: result.transaction,
      fiscalized: result.fiscalized,
      pending: !result.fiscalized && !result.needsReconciliation,
      needsAttention: result.needsReconciliation || result.transaction.fiscalStatus === 'rejected' || result.transaction.fiscalStatus === 'manual_review',
      needsReconciliation: result.needsReconciliation,
      status: result.transaction.fiscalStatus,
      fiscalDocumentNumber: result.transaction.fiscalDocumentNumber,
      cashierMessage: result.fiscalized ? 'fiscalized' : result.needsReconciliation ? 'attention' : 'pending',
    };
  } catch (e: any) {
    // Fiscalization failure must NEVER roll back a payment. Log and report
    // "attention" so a manager can act later.
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      userEmail: '',
      actorRole: ctx.role,
      action: 'EFRIS_POS_FISCALIZATION_ERROR',
      targetType: 'order',
      targetId: orderId,
      details: { safeMessage: String(e?.message || '').slice(0, 300) },
    }).catch(() => {});
    return { ...notApplicable, applicable: true, needsAttention: true, cashierMessage: 'attention' };
  }
}
