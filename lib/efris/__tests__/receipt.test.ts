// Receipt fiscal payload mapping tests
import { describe, it, expect } from 'vitest';
import {
  fiscalResultToReceipt,
  fiscalTransactionToReceipt,
  withFiscal,
  shouldShowFiscal,
} from '../receipt';

describe('fiscalResultToReceipt', () => {
  it('returns null when not applicable', () => {
    expect(fiscalResultToReceipt(null)).toBeNull();
    expect(fiscalResultToReceipt({ applicable: false })).toBeNull();
  });

  it('maps PosFiscalResult + transaction row', () => {
    const out = fiscalResultToReceipt({
      applicable: true,
      fiscalized: true,
      pending: false,
      needsAttention: false,
      needsReconciliation: false,
      status: 'fiscalized',
      fiscalDocumentNumber: 'SIM-FDN-1',
      cashierMessage: 'fiscalized',
      transaction: {
        invoiceNo: 'SIM-79132169',
        antifakeCode: 'SIM-ANTIFAKE-0001',
        verificationCode: 'SIM-VERIFY-0001',
        qrCodeData: 'SIM-QR-CODE-DATA',
        krownReference: 'KROWN-TX-1',
        fiscalDocumentNumber: 'SIM-FDN-1',
      },
    });
    expect(out).toMatchObject({
      applicable: true,
      fiscalized: true,
      fiscalDocumentNumber: 'SIM-FDN-1',
      invoiceNo: 'SIM-79132169',
      antifakeCode: 'SIM-ANTIFAKE-0001',
      verificationCode: 'SIM-VERIFY-0001',
      qrCodeData: 'SIM-QR-CODE-DATA',
      cashierMessage: 'fiscalized',
    });
  });

  it('flags unknown status as needing reconciliation', () => {
    const out = fiscalResultToReceipt({
      applicable: true,
      fiscalized: false,
      pending: false,
      needsAttention: true,
      needsReconciliation: true,
      status: 'unknown',
      fiscalDocumentNumber: null,
      transaction: { fiscalStatus: 'unknown' },
    });
    expect(out?.needsReconciliation).toBe(true);
    expect(out?.fiscalized).toBe(false);
  });
});

describe('fiscalTransactionToReceipt', () => {
  it('maps snake_case DB row', () => {
    const out = fiscalTransactionToReceipt({
      fiscal_status: 'fiscalized',
      fiscal_document_number: 'SIM-FDN-9',
      antifake_code: 'AF',
      verification_code: 'VC',
      qr_code_data: 'QR',
      invoice_no: 'SIM-1',
      krown_reference: 'REF-1',
    }, { deviceNumber: 'D001', taxpayerTin: '1000000001', environment: 'sandbox' });
    expect(out).toMatchObject({
      fiscalized: true,
      fiscalDocumentNumber: 'SIM-FDN-9',
      deviceNumber: 'D001',
      environment: 'sandbox',
    });
  });

  it('returns null for not_applicable', () => {
    expect(fiscalTransactionToReceipt({ fiscal_status: 'not_applicable' })).toBeNull();
  });
});

describe('withFiscal / shouldShowFiscal', () => {
  it('attaches efris onto order', () => {
    const order = withFiscal({ id: 'o1' }, { applicable: true, fiscalized: true, fiscalDocumentNumber: 'X' });
    expect(order.efris.fiscalDocumentNumber).toBe('X');
    expect(shouldShowFiscal(order)).toBe(true);
  });

  it('does not show fiscal without payload', () => {
    expect(shouldShowFiscal({ id: 'o1' })).toBe(false);
    expect(shouldShowFiscal(null)).toBe(false);
  });
});
