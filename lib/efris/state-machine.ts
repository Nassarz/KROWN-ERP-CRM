// ============================================================================
// KROWN ERP — EFRIS fiscal state machine
// Explicit states. NEVER reduced to a boolean. "Fiscalized" is only reported
// after URA has returned a successful fiscal result.
// ============================================================================

import type { FiscalStatus, SubmissionStatus } from './types';

export const FISCAL_STATUSES: FiscalStatus[] = [
  'not_applicable',
  'pending',
  'queued',
  'preparing',
  'submitting',
  'submitted',
  'fiscalized',
  'rejected',
  'retrying',
  'unknown',
  'cancelled',
  'credit_pending',
  'credited',
  'debit_pending',
  'debited',
  'manual_review',
];

export const SUBMISSION_STATUSES: SubmissionStatus[] = [
  'not_started',
  'submitted',
  'accepted',
  'rejected',
  'unknown',
  'failed',
];

const TRANSITIONS: Record<FiscalStatus, FiscalStatus[]> = {
  not_applicable: ['pending', 'cancelled'],
  pending: ['queued', 'preparing', 'submitting', 'cancelled', 'manual_review'],
  queued: ['preparing', 'submitting', 'cancelled', 'manual_review'],
  preparing: ['submitting', 'cancelled', 'manual_review'],
  submitting: ['submitted', 'unknown', 'rejected', 'fiscalized', 'retrying', 'manual_review'],
  submitted: ['fiscalized', 'unknown', 'rejected', 'manual_review'],
  fiscalized: ['credit_pending', 'debit_pending', 'manual_review'],
  rejected: ['manual_review', 'cancelled'],
  retrying: ['preparing', 'submitting', 'manual_review', 'cancelled'],
  unknown: ['fiscalized', 'rejected', 'retrying', 'manual_review'],
  cancelled: [],
  credit_pending: ['credited', 'manual_review'],
  credited: [],
  debit_pending: ['debited', 'manual_review'],
  debited: [],
  manual_review: ['retrying', 'fiscalized', 'rejected', 'cancelled', 'unknown'],
};

/** Terminal states: no further automatic transitions */
export const TERMINAL_FISCAL_STATUSES: FiscalStatus[] = [
  'fiscalized',
  'credited',
  'debited',
  'cancelled',
];

/** States requiring human attention */
export const ATTENTION_FISCAL_STATUSES: FiscalStatus[] = [
  'unknown',
  'rejected',
  'manual_review',
];

export function canTransition(from: FiscalStatus, to: FiscalStatus): boolean {
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function assertTransition(from: FiscalStatus, to: FiscalStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid EFRIS state transition: ${from} → ${to}`);
  }
}

/** Status shown to users (badge labels + UI) */
export const FISCAL_STATUS_LABELS: Record<FiscalStatus, string> = {
  not_applicable: 'Not applicable',
  pending: 'Pending',
  queued: 'Queued',
  preparing: 'Preparing',
  submitting: 'Submitting',
  submitted: 'Submitted',
  fiscalized: 'Fiscalized',
  rejected: 'Rejected',
  retrying: 'Retrying',
  unknown: 'Needs reconciliation',
  cancelled: 'Cancelled',
  credit_pending: 'Credit pending',
  credited: 'Credited',
  debit_pending: 'Debit pending',
  debited: 'Debited',
  manual_review: 'Manual review',
};

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  not_started: 'Not started',
  submitted: 'Submitted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  unknown: 'Unknown',
  failed: 'Failed',
};

/** Visual tone per fiscal status (for badges) */
export type EfrisStatusTone = 'success' | 'warning' | 'error' | 'neutral' | 'info';

export const FISCAL_STATUS_TONES: Record<FiscalStatus, EfrisStatusTone> = {
  not_applicable: 'neutral',
  pending: 'neutral',
  queued: 'info',
  preparing: 'info',
  submitting: 'info',
  submitted: 'info',
  fiscalized: 'success',
  rejected: 'error',
  retrying: 'warning',
  unknown: 'warning',
  cancelled: 'neutral',
  credit_pending: 'warning',
  credited: 'success',
  debit_pending: 'warning',
  debited: 'success',
  manual_review: 'error',
};

/**
 * Whether the transaction is safe to reconcile-by-query (instead of resubmit).
 * Unknown outcomes must be queried FIRST — never blindly resubmitted.
 */
export function requiresReconciliation(status: FiscalStatus): boolean {
  return status === 'unknown';
}

/** Whether a new submission may be started for this status */
export function canSubmit(status: FiscalStatus): boolean {
  return ['pending', 'queued', 'retrying', 'rejected', 'manual_review'].includes(status);
}

/** Whether a credit note may be raised against this transaction */
export function canCredit(status: FiscalStatus): boolean {
  return status === 'fiscalized';
}
