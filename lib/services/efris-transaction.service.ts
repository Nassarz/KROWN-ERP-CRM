// ============================================================================
// KROWN ERP — EFRIS transaction service
// The core fiscal transaction engine:
//   * database-backed idempotency (one fiscal invoice per paid order)
//   * explicit state machine (never a boolean)
//   * classified failures → queue/retry decisions
//   * unknown outcomes → reconciliation, NEVER blind resubmission
// Every query is scoped by organization_id.
// ============================================================================

import { getSql } from '@/lib/neon-server';
import { generateId } from '@/lib/id';
import type {
  EfrisFailureCategory,
  EfrisTransactionRow,
  EfrisTransactionType,
  FiscalStatus,
} from '@/lib/efris/types';
import {
  assertTransition,
  canCredit,
  canSubmit,
  requiresReconciliation,
} from '@/lib/efris/state-machine';
import { classifyEfrisError, EfrisError, classifyReturnCode } from '@/lib/efris/errors';
import { redactJson } from '@/lib/efris/security';
import { EFRIS_REFERENCE_PREFIX } from '@/lib/efris/constants';
import type { EfrisAdapter } from '@/lib/efris/adapters/adapter';
import type { EnvelopeOptions } from '@/lib/efris/envelope';
import { logAuditEvent } from '@/lib/audit';

export interface CreateFiscalTransactionInput {
  organizationId: string;
  branchId: string | null;
  orderId: string;
  paymentId?: string | null;
  transactionType: EfrisTransactionType;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  currency?: string;
  operatorName?: string | null;
  buyerTin?: string | null;
  buyerName?: string | null;
  items: Array<{
    productId?: string | null;
    itemName: string;
    itemCode?: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
    taxRate: number;
    taxAmount: number;
    taxCategory: string;
    categoryName?: string | null;
    goodsCategoryId?: string | null;
  }>;
}

export interface SubmitFiscalTransactionInput {
  organizationId: string;
  transactionId: string;
  actor: { userId: string; role: string; userEmail?: string };
  adapter: EfrisAdapter;
  envelopeOptions: EnvelopeOptions;
  innerJson: unknown;
}

function rowToTransaction(row: any): EfrisTransactionRow {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id ?? null,
    orderId: row.order_id,
    paymentId: row.payment_id ?? null,
    transactionType: row.transaction_type,
    interfaceCode: row.interface_code,
    krownReference: row.krown_reference,
    dataExchangeId: row.data_exchange_id ?? null,
    fiscalStatus: row.fiscal_status,
    submissionStatus: row.submission_status,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at ?? null,
    nextRetryAt: row.next_retry_at ?? null,
    fiscalDocumentNumber: row.fiscal_document_number ?? null,
    antifakeCode: row.antifake_code ?? null,
    verificationCode: row.verification_code ?? null,
    qrCodeData: row.qr_code_data ?? null,
    invoiceNo: row.invoice_no ?? null,
    grossAmount: row.gross_amount == null ? null : Number(row.gross_amount),
    taxAmount: row.tax_amount == null ? null : Number(row.tax_amount),
    netAmount: row.net_amount == null ? null : Number(row.net_amount),
    currency: row.currency,
    operatorName: row.operator_name ?? null,
    buyerTin: row.buyer_tin ?? null,
    buyerName: row.buyer_name ?? null,
    errorCode: row.error_code ?? null,
    errorMessage: row.error_message ?? null,
    redactedRequest: row.redacted_request ?? null,
    redactedResponse: row.redacted_response ?? null,
    creditNoteParentId: row.credit_note_parent_id ?? null,
    reason: row.reason ?? null,
    reasonCode: row.reason_code ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Idempotent transaction creation. A paid KROWN order can produce exactly
 * ONE fiscal invoice — enforced by a DB partial unique index and by the
 * krown_reference unique constraint. Duplicate calls return the existing row.
 */
export async function createFiscalTransaction(
  input: CreateFiscalTransactionInput,
  opts: { actor?: { userId: string; role: string; userEmail?: string } } = {},
): Promise<{ transaction: EfrisTransactionRow; replayed: boolean }> {
  const sql = getSql();
  const krownReference = `${EFRIS_REFERENCE_PREFIX}-${input.orderId.replace(/-/g, '').slice(0, 12).toUpperCase()}`;

  // Idempotency: if an invoice/receipt/debit-note already exists for this
  // order, return it unchanged. Credit notes may legitimately repeat.
  const existing = await sql`
    SELECT * FROM efris_transactions
    WHERE organization_id = ${input.organizationId}
      AND order_id = ${input.orderId}
      AND transaction_type = ${input.transactionType}
    LIMIT 1
  `;
  if (existing.length) {
    return { transaction: rowToTransaction(existing[0]), replayed: true };
  }

  const id = generateId();
  const inserted = await sql`
    INSERT INTO efris_transactions (
      id, organization_id, branch_id, order_id, payment_id, transaction_type,
      krown_reference, fiscal_status, submission_status, gross_amount,
      tax_amount, net_amount, currency, operator_name, buyer_tin, buyer_name,
      created_at, updated_at
    ) VALUES (
      ${id}, ${input.organizationId}, ${input.branchId}, ${input.orderId},
      ${input.paymentId ?? null}, ${input.transactionType}, ${krownReference},
      'pending', 'not_started', ${input.grossAmount}, ${input.taxAmount},
      ${input.netAmount}, ${input.currency ?? 'UGX'},
      ${input.operatorName ?? null}, ${input.buyerTin ?? null}, ${input.buyerName ?? null},
      NOW(), NOW()
    )
    RETURNING *
  `;

  for (const item of input.items) {
    await sql`
      INSERT INTO efris_transaction_items (
        id, organization_id, transaction_id, product_id, item_name, item_code,
        quantity, unit_price, total, tax_rate, tax_amount, tax_category,
        category_name, commodity_goods_id, created_at
      ) VALUES (
        ${generateId()}, ${input.organizationId}, ${id}, ${item.productId ?? null},
        ${item.itemName}, ${item.itemCode ?? null}, ${item.quantity},
        ${item.unitPrice}, ${item.total}, ${item.taxRate}, ${item.taxAmount},
        ${item.taxCategory}, ${item.categoryName ?? null}, ${item.goodsCategoryId ?? null},
        NOW()
      )
    `;
  }

  await logAuditEvent({
    organizationId: input.organizationId,
    userId: opts.actor?.userId ?? '',
    userEmail: opts.actor?.userEmail ?? '',
    actorRole: opts.actor?.role ?? 'system',
    action: 'EFRIS_TRANSACTION_CREATED',
    targetType: 'efris_transaction',
    targetId: id,
    details: {
      orderId: input.orderId,
      transactionType: input.transactionType,
      krownReference,
      grossAmount: input.grossAmount,
    },
  }).catch(() => {});

  return { transaction: rowToTransaction(inserted[0]), replayed: false };
}

export async function getFiscalTransaction(organizationId: string, transactionId: string): Promise<EfrisTransactionRow | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM efris_transactions WHERE id = ${transactionId} AND organization_id = ${organizationId} LIMIT 1`;
  return rows.length ? rowToTransaction(rows[0]) : null;
}

export async function getFiscalTransactionByOrder(organizationId: string, orderId: string): Promise<EfrisTransactionRow | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM efris_transactions
    WHERE organization_id = ${organizationId} AND order_id = ${orderId}
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows.length ? rowToTransaction(rows[0]) : null;
}

export async function listFiscalTransactions(
  organizationId: string,
  opts: { branchId?: string; status?: FiscalStatus; transactionType?: EfrisTransactionType; search?: string; limit?: number; offset?: number } = {},
): Promise<{ transactions: EfrisTransactionRow[]; total: number }> {
  const sql = getSql();
  const conditions = [`organization_id = ${organizationId}`];
  if (opts.branchId) conditions.push(`branch_id = ${opts.branchId}`);
  if (opts.status) conditions.push(`fiscal_status = ${opts.status}`);
  if (opts.transactionType) conditions.push(`transaction_type = ${opts.transactionType}`);
  if (opts.search) conditions.push(`(krown_reference ILIKE ${'%' + opts.search + '%'} OR fiscal_document_number ILIKE ${'%' + opts.search + '%'} OR invoice_no ILIKE ${'%' + opts.search + '%'})`);
  const where = conditions.join(' AND ');
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);

  const totalRows = await sql(`SELECT COUNT(*)::int AS total FROM efris_transactions WHERE ${where}`);
  const total = Number((totalRows as any[])[0]?.total ?? 0);
  const rows = await sql(`SELECT * FROM efris_transactions WHERE ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
  return { transactions: (rows as any[]).map(rowToTransaction), total };
}

export interface SubmissionOutcome {
  transaction: EfrisTransactionRow;
  /** true when fiscalization succeeded */
  fiscalized: boolean;
  /** true when the outcome is unknown and reconciliation is required */
  needsReconciliation: boolean;
  error: EfrisError | null;
}

/**
 * Submit a fiscal transaction to the adapter with full state management.
 * Rules:
 *   * NEVER resubmit an unknown outcome blindly — mark unknown and queue
 *     reconciliation.
 *   * Permanent validation failures are recorded, not retried forever.
 *   * Fiscalized only after a confirmed successful response.
 */
export async function submitFiscalTransaction(input: SubmitFiscalTransactionInput): Promise<SubmissionOutcome> {
  const sql = getSql();
  const current = await getFiscalTransaction(input.organizationId, input.transactionId);
  if (!current) throw new Error('EFRIS transaction not found');
  if (!canSubmit(current.fiscalStatus) && current.fiscalStatus !== 'pending') {
    throw new Error(`Cannot submit transaction in state "${current.fiscalStatus}"`);
  }
  if (current.fiscalStatus === 'unknown') {
    throw new Error('Transaction outcome is unknown — reconcile before resubmitting');
  }

  assertTransition(current.fiscalStatus, 'submitting');
  const attempt = current.attemptCount + 1;
  await sql`
    UPDATE efris_transactions SET
      fiscal_status = 'submitting', attempt_count = ${attempt},
      last_attempt_at = NOW(), updated_at = NOW()
    WHERE id = ${input.transactionId} AND organization_id = ${input.organizationId}
  `;

  const started = Date.now();
  try {
    const result = await input.adapter.submitReceipt(
      { innerJson: input.innerJson, envelopeOptions: input.envelopeOptions },
      null,
      null,
    );

    const durationMs = Date.now() - started;
    await sql`
      INSERT INTO efris_submissions (
        id, organization_id, transaction_id, attempt_number, interface_code,
        data_exchange_id, status, return_code, return_message,
        redacted_request, redacted_response, duration_ms, created_at
      ) VALUES (
        ${generateId()}, ${input.organizationId}, ${input.transactionId}, ${attempt},
        'T109', ${result.dataExchangeId || null},
        ${result.success ? 'succeeded' : 'rejected'},
        ${result.returnCode}, ${result.returnMessage},
        ${JSON.stringify(redactJson(input.innerJson))}::jsonb,
        ${JSON.stringify(redactJson(result.raw))}::jsonb,
        ${durationMs}, NOW()
      )
    `;

    if (result.success) {
      const content = (result.content ?? {}) as Record<string, any>;
      await sql`
        UPDATE efris_transactions SET
          fiscal_status = 'fiscalized',
          submission_status = 'accepted',
          data_exchange_id = ${result.dataExchangeId || null},
          fiscal_document_number = ${String(content.fiscalDocumentNumber ?? content.invoiceNo ?? '') || null},
          invoice_no = ${String(content.invoiceNo ?? '') || null},
          antifake_code = ${String(content.antifakeCode ?? '') || null},
          verification_code = ${String(content.verificationCode ?? '') || null},
          qr_code_data = ${String(content.qrCode ?? '') || null},
          error_code = NULL, error_message = NULL,
          next_retry_at = NULL,
          updated_at = NOW()
        WHERE id = ${input.transactionId} AND organization_id = ${input.organizationId}
      `;
      await completeQueueItem(sql, input.organizationId, input.transactionId, 'submit');
      await recordEvent(sql, input.organizationId, input.transactionId, 'fiscalized', 'fiscalized', input.actor);
      return { transaction: (await getFiscalTransaction(input.organizationId, input.transactionId))!, fiscalized: true, needsReconciliation: false, error: null };
    }

    // URA rejected the submission
    const category = classifyReturnCode(result.returnCode, result.returnMessage);
    await sql`
      UPDATE efris_transactions SET
        fiscal_status = 'rejected',
        submission_status = 'rejected',
        error_code = ${result.returnCode},
        error_message = ${result.returnMessage},
        updated_at = NOW()
      WHERE id = ${input.transactionId} AND organization_id = ${input.organizationId}
    `;
    await failQueueItem(sql, input.organizationId, input.transactionId, 'submit', category, result.returnMessage);
    await recordEvent(sql, input.organizationId, input.transactionId, 'rejected', 'rejected', input.actor);
    return {
      transaction: (await getFiscalTransaction(input.organizationId, input.transactionId))!,
      fiscalized: false,
      needsReconciliation: false,
      error: new EfrisError({ message: result.returnMessage, category, returnCode: result.returnCode }),
    };
  } catch (e: any) {
    const durationMs = Date.now() - started;
    const error = classifyEfrisError(e);
    await sql`
      INSERT INTO efris_submissions (
        id, organization_id, transaction_id, attempt_number, interface_code,
        status, failure_category, redacted_request, duration_ms, created_at
      ) VALUES (
        ${generateId()}, ${input.organizationId}, ${input.transactionId}, ${attempt},
        'T109', ${error.outcomeUnknown ? 'unknown' : 'error'},
        ${error.category}, ${JSON.stringify(redactJson(input.innerJson))}::jsonb,
        ${durationMs}, NOW()
      )
    `;

    if (error.outcomeUnknown) {
      // NEVER blind resubmit. Mark unknown and queue reconciliation.
      await sql`
        UPDATE efris_transactions SET
          fiscal_status = 'unknown',
          submission_status = 'unknown',
          error_message = ${error.message},
          updated_at = NOW()
        WHERE id = ${input.transactionId} AND organization_id = ${input.organizationId}
      `;
      await queueOperation(sql, input.organizationId, input.transactionId, 'reconcile');
      await recordEvent(sql, input.organizationId, input.transactionId, 'outcome_unknown', 'unknown', input.actor);
      return {
        transaction: (await getFiscalTransaction(input.organizationId, input.transactionId))!,
        fiscalized: false,
        needsReconciliation: true,
        error,
      };
    }

    const retryable = error.category === 'NETWORK' || error.category === 'TIMEOUT' || error.category === 'UNKNOWN';
    const nextStatus: FiscalStatus = retryable ? 'retrying' : 'rejected';
    await sql`
      UPDATE efris_transactions SET
        fiscal_status = ${nextStatus},
        submission_status = 'failed',
        error_message = ${error.message},
        next_retry_at = ${retryable ? null : null},
        updated_at = NOW()
      WHERE id = ${input.transactionId} AND organization_id = ${input.organizationId}
    `;
    if (retryable) {
      await queueOperation(sql, input.organizationId, input.transactionId, 'submit');
    } else {
      await failQueueItem(sql, input.organizationId, input.transactionId, 'submit', error.category, error.message);
    }
    await recordEvent(sql, input.organizationId, input.transactionId, retryable ? 'retrying' : 'rejected', nextStatus, input.actor);
    return {
      transaction: (await getFiscalTransaction(input.organizationId, input.transactionId))!,
      fiscalized: false,
      needsReconciliation: false,
      error,
    };
  }
}

// ---------------------------------------------------------------------------
// Queue helpers (durable, DB-backed)
// ---------------------------------------------------------------------------

async function queueOperation(
  sql: any,
  organizationId: string,
  transactionId: string,
  operation: 'submit' | 'reconcile' | 'credit_note' | 'debit_note' | 'dictionary_sync' | 'z_report',
) {
  await sql`
    INSERT INTO efris_queue (
      id, organization_id, transaction_id, operation, status, attempt_count,
      created_at, updated_at
    ) VALUES (
      ${generateId()}, ${organizationId}, ${transactionId}, ${operation},
      'pending', 0, NOW(), NOW()
    )
    ON CONFLICT DO NOTHING
  `;
}

async function completeQueueItem(sql: any, organizationId: string, transactionId: string, operation: string) {
  await sql`
    UPDATE efris_queue SET status = 'completed', updated_at = NOW()
    WHERE organization_id = ${organizationId} AND transaction_id = ${transactionId}
      AND operation = ${operation} AND status IN ('pending','in_progress','retrying')
  `;
}

async function failQueueItem(
  sql: any,
  organizationId: string,
  transactionId: string,
  operation: string,
  category: EfrisFailureCategory,
  message: string,
) {
  await sql`
    UPDATE efris_queue SET
      status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retrying' END,
      failure_category = ${category},
      last_error = ${message?.slice(0, 500) ?? null},
      next_attempt_at = NOW() + (make_interval(secs => LEAST(3600, 60 * power(2, attempt_count)))),
      updated_at = NOW()
    WHERE organization_id = ${organizationId} AND transaction_id = ${transactionId}
      AND operation = ${operation} AND status IN ('pending','in_progress','retrying')
  `;
}

async function recordEvent(
  sql: any,
  organizationId: string,
  transactionId: string,
  eventType: string,
  fiscalStatus: string,
  actor?: { userId: string; role: string },
) {
  await sql`
    INSERT INTO efris_events (
      id, organization_id, transaction_id, event_type, fiscal_status,
      actor_id, actor_role, metadata, created_at
    ) VALUES (
      ${generateId()}, ${organizationId}, ${transactionId}, ${eventType},
      ${fiscalStatus}, ${actor?.userId ?? null}, ${actor?.role ?? null}, '{}'::jsonb, NOW()
    )
  `;
}

// ---------------------------------------------------------------------------
// Credit note eligibility helpers
// ---------------------------------------------------------------------------

export async function canRaiseCreditNote(organizationId: string, transactionId: string): Promise<boolean> {
  const tx = await getFiscalTransaction(organizationId, transactionId);
  if (!tx) return false;
  return canCredit(tx.fiscalStatus);
}

export function transactionNeedsReconciliation(tx: EfrisTransactionRow): boolean {
  return requiresReconciliation(tx.fiscalStatus);
}
