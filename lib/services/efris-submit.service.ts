// ============================================================================
// KROWN ERP — EFRIS submission orchestrator
// Rebuilds the T109/T110 wire payload from persisted transaction data and
// submits through the correct adapter. Used by the POS fiscalization hook,
// manual retry, and credit-note flows.
// ============================================================================

import { getSql } from '@/lib/neon-server';
import type { EfrisAdapter } from '@/lib/efris/adapters/adapter';
import type { EnvelopeOptions } from '@/lib/efris/envelope';
import { buildInvoiceContent, buildCreditNoteContent, type KrownOrderForFiscalization, type SellerProfile } from '@/lib/efris/mapper';
import { getFiscalTransaction, submitFiscalTransaction } from './efris-transaction.service';
import type { EfrisTransactionRow } from '@/lib/efris/types';
import { TAX_CATEGORY_STANDARD } from '@/lib/efris/constants';

export interface RebuildInput {
  organizationId: string;
  transactionId: string;
  actor: { userId: string; role: string; userEmail?: string };
  adapter: EfrisAdapter;
  envelopeOptions: EnvelopeOptions;
  seller: SellerProfile;
  creditNote?: { invoiceNo: string; oriInvoiceId?: string | null; reason?: string; reasonCode?: string };
}

export async function rebuildAndSubmit(input: RebuildInput) {
  const sql = getSql();
  const tx = await getFiscalTransaction(input.organizationId, input.transactionId);
  if (!tx) throw new Error('EFRIS transaction not found');

  const [items, orderRows] = await Promise.all([
    sql`SELECT * FROM efris_transaction_items WHERE transaction_id = ${input.transactionId} AND organization_id = ${input.organizationId} ORDER BY created_at ASC`,
    sql`SELECT * FROM orders WHERE id = ${tx.orderId} AND organization_id = ${input.organizationId} LIMIT 1`,
  ]);
  if (!orderRows.length) throw new Error('Order not found');

  const order = orderRows[0] as any;
  const itemRows = items as any[];

  const krownOrder: KrownOrderForFiscalization = {
    orderId: tx.orderId,
    krownReference: tx.krownReference,
    branchName: order.branch_name || '',
    branchId: tx.branchId,
    deviceNo: input.envelopeOptions.deviceNo,
    tin: input.envelopeOptions.tin,
    brn: input.envelopeOptions.brn || '',
    operatorName: tx.operatorName || input.actor.userId,
    buyerTin: tx.buyerTin,
    buyerName: tx.buyerName,
    buyerPhone: (order as any).customer_phone || null,
    currency: tx.currency,
    items: itemRows.map((item: any) => ({
      productId: item.product_id,
      name: item.item_name,
      itemCode: item.item_code,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      total: Number(item.total),
      taxCategory: (item.tax_category || TAX_CATEGORY_STANDARD) as any,
      taxRate: Number(item.tax_rate),
      taxAmount: Number(item.tax_amount),
      goodsCategoryId: item.commodity_goods_id,
      categoryName: item.category_name,
    })),
    subtotal: tx.netAmount ?? 0,
    tax: tx.taxAmount ?? 0,
    total: tx.grossAmount ?? 0,
  };

  const innerJson = input.creditNote
    ? buildCreditNoteContent(
        krownOrder,
        input.seller,
        { invoiceNo: input.creditNote.invoiceNo, oriInvoiceId: input.creditNote.oriInvoiceId },
        { reason: input.creditNote.reason, reasonCode: input.creditNote.reasonCode },
      )
    : buildInvoiceContent(krownOrder, input.seller);

  return submitFiscalTransaction({
    organizationId: input.organizationId,
    transactionId: input.transactionId,
    actor: input.actor,
    adapter: input.adapter,
    envelopeOptions: input.envelopeOptions,
    innerJson,
  });
}

/** Build the seller profile from a configuration + organization row */
export async function buildSellerProfile(organizationId: string, cfg: {
  tin: string;
  brn: string;
  taxpayerName: string | null;
}): Promise<SellerProfile> {
  const sql = getSql();
  const orgRows = await sql`SELECT id, name, contact_phone, contact_email, address FROM organizations WHERE id = ${organizationId} LIMIT 1`;
  const org = orgRows.length ? (orgRows[0] as any) : null;
  return {
    tin: cfg.tin,
    brn: cfg.brn || '',
    legalName: cfg.taxpayerName || '',
    businessName: cfg.taxpayerName || org?.name || '',
    address: org?.address || '',
    mobilePhone: org?.contact_phone || '',
    linePhone: org?.contact_phone || '',
    emailAddress: org?.contact_email || '',
    placeOfBusiness: org?.address || '',
    referenceNo: '',
    branchId: '',
  };
}

export function fiscalTransactionIsFiscalized(tx: EfrisTransactionRow | null): boolean {
  return !!tx && tx.fiscalStatus === 'fiscalized';
}
