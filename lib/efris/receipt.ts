// ============================================================================
// KROWN ERP — EFRIS receipt helpers
// Maps fiscal transaction / POS fiscal result onto a receipt-safe payload.
// Never includes secrets or raw request/response envelopes.
// ============================================================================

export interface ReceiptFiscalPayload {
  applicable: boolean;
  fiscalized: boolean;
  pending?: boolean;
  needsAttention?: boolean;
  needsReconciliation?: boolean;
  status?: string | null;
  fiscalDocumentNumber?: string | null;
  antifakeCode?: string | null;
  verificationCode?: string | null;
  qrCodeData?: string | null;
  invoiceNo?: string | null;
  krownReference?: string | null;
  deviceNumber?: string | null;
  taxpayerTin?: string | null;
  environment?: string | null;
  integrationMode?: string | null;
  cashierMessage?: string | null;
}

function pick(obj: any, ...keys: string[]): any {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

/** Build receipt fiscal block from a pay/split API `efris` field (PosFiscalResult). */
export function fiscalResultToReceipt(efris: any): ReceiptFiscalPayload | null {
  if (!efris || efris.applicable === false) return null;
  const tx = efris.transaction;
  const fiscalized = !!efris.fiscalized;
  return {
    applicable: true,
    fiscalized,
    pending: !!efris.pending,
    needsAttention: !!efris.needsAttention,
    needsReconciliation: !!efris.needsReconciliation,
    status: efris.status ?? tx?.fiscalStatus ?? null,
    fiscalDocumentNumber: efris.fiscalDocumentNumber ?? tx?.fiscalDocumentNumber ?? null,
    antifakeCode: pick(tx, 'antifakeCode') ?? null,
    verificationCode: pick(tx, 'verificationCode') ?? null,
    qrCodeData: pick(tx, 'qrCodeData') ?? null,
    invoiceNo: pick(tx, 'invoiceNo') ?? null,
    krownReference: pick(tx, 'krownReference') ?? null,
    cashierMessage: efris.cashierMessage ?? null,
  };
}

/** Build receipt fiscal block from a raw efris_transactions row / EfrisTransactionRow. */
export function fiscalTransactionToReceipt(tx: any, extra?: { deviceNumber?: string | null; taxpayerTin?: string | null; environment?: string | null; integrationMode?: string | null }): ReceiptFiscalPayload | null {
  if (!tx) return null;
  const status = tx.fiscal_status ?? tx.fiscalStatus ?? null;
  if (status === 'not_applicable') return null;
  const fiscalized = status === 'fiscalized';
  return {
    applicable: true,
    fiscalized,
    pending: ['pending', 'queued', 'preparing', 'submitting', 'submitted', 'retrying', 'credit_pending', 'debit_pending'].includes(status),
    needsAttention: ['unknown', 'rejected', 'manual_review'].includes(status),
    needsReconciliation: status === 'unknown',
    status,
    fiscalDocumentNumber: tx.fiscal_document_number ?? tx.fiscalDocumentNumber ?? null,
    antifakeCode: tx.antifake_code ?? tx.antifakeCode ?? null,
    verificationCode: tx.verification_code ?? tx.verificationCode ?? null,
    qrCodeData: tx.qr_code_data ?? tx.qrCodeData ?? null,
    invoiceNo: tx.invoice_no ?? tx.invoiceNo ?? null,
    krownReference: tx.krown_reference ?? tx.krownReference ?? null,
    deviceNumber: extra?.deviceNumber ?? null,
    taxpayerTin: extra?.taxpayerTin ?? null,
    environment: extra?.environment ?? null,
    integrationMode: extra?.integrationMode ?? null,
    cashierMessage: fiscalized ? 'fiscalized' : status === 'unknown' ? 'attention' : 'pending',
  };
}

/**
 * Attach fiscal payload onto an order object used by the thermal receipt renderer.
 * Existing `order.efris` wins (already printed once from pay response).
 */
export function withFiscal(order: any, fiscal: ReceiptFiscalPayload | null | undefined): any {
  if (!order || !fiscal) return order;
  return { ...order, efris: fiscal };
}

/** True when the order should attempt to load / print EFRIS receipt details. */
export function shouldShowFiscal(order: any): boolean {
  if (!order) return false;
  if (order.efris?.applicable) return true;
  if (order.fiscalDocumentNumber || order.fiscal_document_number) return true;
  return false;
}
