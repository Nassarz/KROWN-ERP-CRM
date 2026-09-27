// EFRIS state machine unit tests
import { describe, it, expect } from 'vitest';
import {
  canTransition,
  assertTransition,
  requiresReconciliation,
  canSubmit,
  canCredit,
  TERMINAL_FISCAL_STATUSES,
  ATTENTION_FISCAL_STATUSES,
} from '../state-machine';

describe('EFRIS fiscal state machine', () => {
  it('allows the full happy path', () => {
    expect(canTransition('not_applicable', 'pending')).toBe(true);
    expect(canTransition('pending', 'submitting')).toBe(true);
    expect(canTransition('submitting', 'fiscalized')).toBe(true);
    expect(canTransition('fiscalized', 'credit_pending')).toBe(true);
    expect(canTransition('credit_pending', 'credited')).toBe(true);
  });

  it('never allows a false fiscalized state', () => {
    expect(canTransition('pending', 'fiscalized')).toBe(false);
    expect(canTransition('queued', 'fiscalized')).toBe(false);
    expect(canTransition('preparing', 'fiscalized')).toBe(false);
    // Only a submission result may produce fiscalized
    expect(canTransition('submitting', 'fiscalized')).toBe(true);
    expect(canTransition('submitted', 'fiscalized')).toBe(true);
    expect(canTransition('unknown', 'fiscalized')).toBe(true); // via reconciliation
  });

  it('unknown outcomes can only resolve via reconciliation or retry paths', () => {
    expect(canTransition('unknown', 'fiscalized')).toBe(true);
    expect(canTransition('unknown', 'rejected')).toBe(true);
    expect(canTransition('unknown', 'manual_review')).toBe(true);
  });

  it('terminal states are locked', () => {
    for (const state of TERMINAL_FISCAL_STATUSES) {
      for (const target of ['fiscalized', 'rejected', 'unknown', 'credited', 'debited'] as const) {
        expect(canTransition(state, target)).toBe(false);
      }
    }
  });

  it('rejected never silently becomes fiscalized', () => {
    expect(canTransition('rejected', 'fiscalized')).toBe(false);
  });

  it('assertTransition throws on invalid transitions', () => {
    expect(() => assertTransition('credited', 'fiscalized')).toThrow(/Invalid EFRIS state transition/);
    expect(() => assertTransition('pending', 'fiscalized')).toThrow(/Invalid EFRIS state transition/);
  });

  it('identifies reconciliation-required states', () => {
    expect(requiresReconciliation('unknown')).toBe(true);
    expect(requiresReconciliation('fiscalized')).toBe(false);
    expect(requiresReconciliation('pending')).toBe(false);
  });

  it('canSubmit only for resubmittable states', () => {
    expect(canSubmit('pending')).toBe(true);
    expect(canSubmit('retrying')).toBe(true);
    expect(canSubmit('rejected')).toBe(true);
    expect(canSubmit('unknown')).toBe(false); // must reconcile first
    expect(canSubmit('fiscalized')).toBe(false);
    expect(canSubmit('credited')).toBe(false);
  });

  it('credit notes only against fiscalized transactions', () => {
    expect(canCredit('fiscalized')).toBe(true);
    expect(canCredit('pending')).toBe(false);
    expect(canCredit('unknown')).toBe(false);
  });

  it('attention states include unknown/rejected/manual_review', () => {
    expect(ATTENTION_FISCAL_STATUSES).toContain('unknown');
    expect(ATTENTION_FISCAL_STATUSES).toContain('rejected');
    expect(ATTENTION_FISCAL_STATUSES).toContain('manual_review');
  });
});
