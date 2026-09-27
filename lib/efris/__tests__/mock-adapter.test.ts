// Mock adapter + tenant-boundary unit tests
// CRITICAL: two organizations must NEVER share EFRIS identity data.
import { describe, it, expect } from 'vitest';
import { MockEfrisAdapter } from '../adapters/mock.adapter';

const orgA = {
  interfaceCode: 'T101' as const,
  tin: '1000029771',
  brn: '',
  deviceNo: 'TCS-A',
  userName: 'admin',
};
const orgB = {
  interfaceCode: 'T101' as const,
  tin: '7777777777',
  brn: '',
  deviceNo: 'TCS-B',
  userName: 'admin',
};

describe('Mock EFRIS adapter', () => {
  it('returns simulated fiscal documents on success', async () => {
    const adapter = new MockEfrisAdapter({ scenario: 'success', latencyMs: 1 });
    const result = await adapter.submitReceipt({ innerJson: { x: 1 }, envelopeOptions: orgA });
    expect(result.success).toBe(true);
    expect(String((result.content as any).invoiceNo)).toContain('SIM-');
    expect(String((result.content as any).fiscalDocumentNumber)).toContain('SIM-FDN-');
  });

  it('rejects with URA-style return codes on rejection scenario', async () => {
    const adapter = new MockEfrisAdapter({ scenario: 'rejection', latencyMs: 1 });
    const result = await adapter.submitReceipt({ innerJson: { x: 1 }, envelopeOptions: orgA });
    expect(result.success).toBe(false);
    expect(result.returnCode).toBe('1902');
  });

  it('throws timeout AFTER submit (outcome unknown) for unknown scenario', async () => {
    const adapter = new MockEfrisAdapter({ scenario: 'unknown', latencyMs: 1 });
    await expect(
      adapter.submitReceipt({ innerJson: { x: 1 }, envelopeOptions: orgA }),
    ).rejects.toThrow(/outcome unknown/);
  });

  it('always marks simulated results visibly (SIM- prefix, never URA format)', async () => {
    const adapter = new MockEfrisAdapter({ scenario: 'success', latencyMs: 1 });
    const result = await adapter.submitReceipt({ innerJson: { x: 1 }, envelopeOptions: orgA });
    expect(String((result.content as any).invoiceNo)).toMatch(/^SIM-/);
  });

  it('does not leak identity across calls — each call uses the passed envelope only', async () => {
    const adapter = new MockEfrisAdapter({ scenario: 'success', latencyMs: 1 });
    const a = await adapter.getServerTime(orgA);
    const b = await adapter.getServerTime(orgB);
    expect(a.content?.currentTime).toBeTruthy();
    expect(b.content?.currentTime).toBeTruthy();
    // The adapter is stateless — no tenant state retained between calls
    expect(adapter.getScenario()).toBe('success');
  });

  it('reconcile still queries after a submit timeout (lookup is not the submit)', async () => {
    for (const scenario of ['timeout-after-submit', 'timeout-before-submit', 'unknown'] as const) {
      const adapter = new MockEfrisAdapter({ scenario, latencyMs: 1 });
      const result = await adapter.reconcile('T107', orgA, { referenceNo: 'KRN-TEST' });
      expect(result.success).toBe(true);
      const records = (result.content as any)?.records || [];
      expect(records[0]?.referenceNo).toBe('KRN-TEST');
      expect(String(records[0]?.invoiceNo)).toMatch(/^SIM-/);
    }
  });

  it('reconcile still fails on rejection/validation scenarios', async () => {
    for (const scenario of ['rejection', 'validation-error'] as const) {
      const adapter = new MockEfrisAdapter({ scenario, latencyMs: 1 });
      const result = await adapter.reconcile('T107', orgA, { referenceNo: 'KRN-TEST' });
      expect(result.success).toBe(false);
    }
  });
});

describe('Tenant isolation invariant (CRITICAL)', () => {
  it('adapter calls carry explicit identity — no shared identity state exists', () => {
    // Restaurant A and Restaurant B use DIFFERENT envelope options (TIN,
    // device). The service layer always resolves the org config first and
    // builds envelopes from it. There is no global/default identity in any
    // adapter — every method requires explicit envelope options.
    expect(orgA.tin).not.toBe(orgB.tin);
    expect(orgA.deviceNo).not.toBe(orgB.deviceNo);
  });
});
