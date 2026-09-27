// ============================================================================
// KROWN ERP — EFRIS reconciliation service
// For transactions whose outcome is UNKNOWN, query EFRIS using documented
// reference interfaces (T107/T108/T117) instead of resubmitting. Never
// creates a second fiscal invoice. Moves:
//     unknown → fiscalized   (evidence: URA has the invoice)
//     unknown → confirmed_failed → rejected
// only when evidence supports it. Full event history is kept.
// ============================================================================

import { getSql } from '@/lib/neon-server';
import { generateId } from '@/lib/id';
import { redactJson } from '@/lib/efris/security';
import type { EfrisTransactionRow } from '@/lib/efris/types';
import type { EfrisAdapter } from '@/lib/efris/adapters/adapter';
import type { EnvelopeOptions } from '@/lib/efris/envelope';
import { classifyEfrisError, EfrisError } from '@/lib/efris/errors';
import { getFiscalTransaction } from './efris-transaction.service';
import { logAuditEvent } from '@/lib/audit';

export interface ReconciliationResult {
  transaction: EfrisTransactionRow;
  resolved: boolean;
  outcome: 'fiscalized' | 'confirmed_failed' | 'still_unknown';
  error: EfrisError | null;
}

/**
 * Reconcile an unknown transaction by querying URA with the krown reference.
 * The query uses T107 (normal invoice/receipt query) — the documented
 * reference for looking up issued fiscal documents.
 */
export async function reconcileFiscalTransaction(input: {
  organizationId: string;
  transactionId: string;
  actor: { userId: string; role: string; userEmail?: string };
  adapter: EfrisAdapter;
  envelopeOptions: EnvelopeOptions;
}): Promise<ReconciliationResult> {
  const sql = getSql();
  const tx = await getFiscalTransaction(input.organizationId, input.transactionId);
  if (!tx) throw new Error('EFRIS transaction not found');
  if (tx.fiscalStatus !== 'unknown' && tx.fiscalStatus !== 'retrying' && tx.fiscalStatus !== 'manual_review') {
    throw new Error(`Transaction is not pending reconciliation (current: ${tx.fiscalStatus})`);
  }

  const queryJson = {
    pageNo: '1',
    pageSize: '10',
    referenceNo: tx.krownReference,
    deviceNo: input.envelopeOptions.deviceNo,
    startDate: new Date(tx.createdAt).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  };

  const started = Date.now();
  try {
    const result = await input.adapter.reconcile('T107', input.envelopeOptions, queryJson);
    const durationMs = Date.now() - started;

    await sql`
      INSERT INTO efris_submissions (
        id, organization_id, transaction_id, attempt_number, interface_code,
        status, return_code, return_message, redacted_response, duration_ms, created_at
      ) VALUES (
        ${generateId()}, ${input.organizationId}, ${input.transactionId},
        ${tx.attemptCount + 1}, 'T107',
        ${result.success ? 'succeeded' : 'error'},
        ${result.returnCode}, ${result.returnMessage},
        ${JSON.stringify(redactJson(result.raw))}::jsonb, ${durationMs}, NOW()
      )
    `;

    const records = extractRecords(result.content);
    const match = records.find((r: any) =>
      r?.referenceNo === tx.krownReference ||
      r?.invoiceNo === tx.invoiceNo ||
      r?.oriInvoiceNo === tx.invoiceNo,
    );

    if (result.success && match) {
      await sql`
        UPDATE efris_transactions SET
          fiscal_status = 'fiscalized',
          submission_status = 'accepted',
          invoice_no = COALESCE(${String(match.invoiceNo ?? '') || null}, invoice_no),
          antifake_code = COALESCE(${String(match.antifakeCode ?? '') || null}, antifake_code),
          error_code = NULL, error_message = NULL,
          updated_at = NOW()
        WHERE id = ${input.transactionId} AND organization_id = ${input.organizationId}
      `;
      await sql`
        INSERT INTO efris_events (
          id, organization_id, transaction_id, event_type, fiscal_status,
          actor_id, actor_role, metadata, created_at
        ) VALUES (
          ${generateId()}, ${input.organizationId}, ${input.transactionId},
          'reconciled_fiscalized', 'fiscalized',
          ${input.actor.userId}, ${input.actor.role},
          ${JSON.stringify({ method: 'T107', referenceNo: tx.krownReference })}::jsonb, NOW()
        )
      `;
      await sql`UPDATE efris_queue SET status='completed', updated_at=NOW() WHERE organization_id=${input.organizationId} AND transaction_id=${input.transactionId} AND operation='reconcile' AND status IN ('pending','in_progress','retrying')`;
      await logAuditEvent({
        organizationId: input.organizationId,
        userId: input.actor.userId,
        userEmail: input.actor.userEmail ?? '',
        actorRole: input.actor.role,
        action: 'EFRIS_RECONCILED_FISCALIZED',
        targetType: 'efris_transaction',
        targetId: input.transactionId,
        details: { method: 'T107', referenceNo: tx.krownReference },
      }).catch(() => {});
      return {
        transaction: (await getFiscalTransaction(input.organizationId, input.transactionId))!,
        resolved: true,
        outcome: 'fiscalized',
        error: null,
      };
    }

    if (result.success && !match) {
      // URA answered but does not have this document → confirmed failed.
      await sql`
        UPDATE efris_transactions SET
          fiscal_status = 'rejected',
          submission_status = 'rejected',
          error_message = 'Confirmed not fiscalized by EFRIS (no matching document found)',
          updated_at = NOW()
        WHERE id = ${input.transactionId} AND organization_id = ${input.organizationId}
      `;
      await sql`
        INSERT INTO efris_events (
          id, organization_id, transaction_id, event_type, fiscal_status,
          actor_id, actor_role, metadata, created_at
        ) VALUES (
          ${generateId()}, ${input.organizationId}, ${input.transactionId},
          'reconciled_not_found', 'rejected',
          ${input.actor.userId}, ${input.actor.role}, '{}'::jsonb, NOW()
        )
      `;
      await logAuditEvent({
        organizationId: input.organizationId,
        userId: input.actor.userId,
        userEmail: input.actor.userEmail ?? '',
        actorRole: input.actor.role,
        action: 'EFRIS_RECONCILED_NOT_FOUND',
        targetType: 'efris_transaction',
        targetId: input.transactionId,
        details: { method: 'T107' },
      }).catch(() => {});
      return {
        transaction: (await getFiscalTransaction(input.organizationId, input.transactionId))!,
        resolved: true,
        outcome: 'confirmed_failed',
        error: null,
      };
    }

    return {
      transaction: (await getFiscalTransaction(input.organizationId, input.transactionId))!,
      resolved: false,
      outcome: 'still_unknown',
      error: null,
    };
  } catch (e: any) {
    const error = classifyEfrisError(e);
    await sql`
      INSERT INTO efris_events (
        id, organization_id, transaction_id, event_type, fiscal_status,
        actor_id, actor_role, metadata, created_at
      ) VALUES (
        ${generateId()}, ${input.organizationId}, ${input.transactionId},
        'reconciliation_error', ${tx.fiscalStatus},
        ${input.actor.userId}, ${input.actor.role},
        ${JSON.stringify({ category: error.category })}::jsonb, NOW()
      )
    `;
    return {
      transaction: (await getFiscalTransaction(input.organizationId, input.transactionId))!,
      resolved: false,
      outcome: 'still_unknown',
      error,
    };
  }
}

function extractRecords(content: unknown): any[] {
  if (!content || typeof content !== 'object') return [];
  const c = content as Record<string, any>;
  if (Array.isArray(c.records)) return c.records;
  if (Array.isArray(c.rows)) return c.rows;
  if (Array.isArray(c.list)) return c.list;
  return [];
}

/** List transactions needing reconciliation for an organization */
export async function listNeedingReconciliation(organizationId: string, limit = 50) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, organization_id, order_id, krown_reference, fiscal_status,
           attempt_count, last_attempt_at, error_message, created_at
    FROM efris_transactions
    WHERE organization_id = ${organizationId} AND fiscal_status IN ('unknown','retrying','manual_review')
    ORDER BY created_at DESC
    LIMIT ${Math.min(limit, 200)}
  `;
  return rows;
}
