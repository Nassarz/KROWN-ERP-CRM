// ============================================================================
// KROWN ERP — Mock EFRIS adapter (DEVELOPMENT ONLY)
// Deterministic scenario provider so the entire KROWN workflow can be built
// and tested before real URA UAT credentials exist. Simulated results are
// ALWAYS visibly marked as sandbox/simulation in the UI.
//
// NEVER used in production. NEVER labels simulated transactions as real
// URA fiscal receipts.
// ============================================================================

import crypto from 'node:crypto';
import type { EfrisAdapter, EfrisCallResult, EfrisSubmitReceiptInput } from './adapter';
import type { EfrisInterfaceCode } from '../types';
import type { EnvelopeOptions } from '../envelope';
import { createEnvelopeBuilder } from '../envelope';

export type MockScenario =
  | 'success'
  | 'rejection'
  | 'timeout-before-submit'
  | 'timeout-after-submit'
  | 'authentication-error'
  | 'validation-error'
  | 'unknown'
  | 'slow-response';

export interface MockEfrisAdapterOptions {
  scenario?: MockScenario;
  /** artificial latency in ms */
  latencyMs?: number;
  /** when set, the adapter throws transport errors for this scenario */
  failTransportFor?: MockScenario[];
}

const DEFAULT_LATENCY = 120;

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export class MockEfrisAdapter implements EfrisAdapter {
  readonly id = 'mock-efris';
  readonly mode = 'mock' as const;
  private scenario: MockScenario;
  private latencyMs: number;

  constructor(opts: MockEfrisAdapterOptions = {}) {
    this.scenario = opts.scenario ?? 'success';
    this.latencyMs = opts.latencyMs ?? DEFAULT_LATENCY;
  }

  setScenario(scenario: MockScenario) {
    this.scenario = scenario;
  }

  getScenario(): MockScenario {
    return this.scenario;
  }

  private async simulate(): Promise<void> {
    if (this.scenario === 'timeout-before-submit') {
      await delay(Math.max(this.latencyMs, 5000));
      throw new Error('ETIMEDOUT: mock timeout before submission');
    }
    if (this.scenario === 'timeout-after-submit') {
      await delay(800);
      throw new Error('ETIMEDOUT: mock timeout after submission (outcome unknown)');
    }
    if (this.scenario === 'slow-response') await delay(3000);
    else await delay(this.latencyMs);
  }

  private simulatedReturnCode(): { returnCode: string; returnMessage: string } {
    switch (this.scenario) {
      case 'success':
      case 'slow-response':
        return { returnCode: '00', returnMessage: 'Successful' };
      case 'rejection':
        return { returnCode: '1902', returnMessage: 'Invoice rejected: invalid taxpayer status' };
      case 'authentication-error':
        return { returnCode: '1301', returnMessage: 'Login failed: invalid credentials' };
      case 'validation-error':
        return { returnCode: '1001', returnMessage: 'basicInformation-->operator:cannot be empty!' };
      default:
        return { returnCode: '00', returnMessage: 'Successful' };
    }
  }

  private wrap<T>(
    options: EnvelopeOptions,
    interfaceCode: EfrisInterfaceCode,
    contentJson: unknown | null,
  ): EfrisCallResult<T> {
    const builder = createEnvelopeBuilder({ ...options, interfaceCode });
    const ctx = builder.buildPlain(contentJson ?? {});
    const state = this.simulatedReturnCode();
    const result: EfrisCallResult<T> = {
      success: state.returnCode === '00',
      content: (state.returnCode === '00' ? (contentJson as T) : null),
      returnCode: state.returnCode,
      returnMessage: state.returnMessage,
      dataExchangeId: ctx.dataExchangeId,
      raw: { ...ctx.envelope, returnStateInfo: state },
      durationMs: this.latencyMs,
    };
    return result;
  }

  private throwIfErrorScenario(): void {
    if (this.scenario === 'authentication-error' || this.scenario === 'validation-error') {
      throw new Error('EFRIS returned error (see returnStateInfo)');
    }
  }

  async getServerTime(options: EnvelopeOptions): Promise<EfrisCallResult<{ currentTime: string }>> {
    await this.simulate();
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const currentTime = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    return this.wrap(options, 'T101', { currentTime });
  }

  async initialize(options: EnvelopeOptions): Promise<EfrisCallResult> {
    await this.simulate();
    this.throwIfErrorScenario();
    return this.wrap(options, 'T102', {
      clientPriKey: 'mock-encrypted-client-private-key',
      serverPubKey: 'mock-server-public-key',
      keyTable: 'mock-whitebox-key-table',
    });
  }

  async login(options: EnvelopeOptions): Promise<EfrisCallResult> {
    await this.simulate();
    this.throwIfErrorScenario();
    return this.wrap(options, 'T103', {
      device: {
        deviceModel: 'VIRTUAL',
        deviceNo: options.deviceNo,
        deviceStatus: '252',
        deviceType: '1',
        validPeriod: '01/01/2099',
        offlineAmount: '10000000000',
        offlineDays: '90',
        offlineValue: '1000000000000',
      },
      taxpayer: {
        tin: options.tin,
        ninBrn: options.brn || '',
        legalName: 'Mock Taxpayer',
        businessName: 'Mock Restaurant (EFRIS Sandbox)',
      },
      taxType: [{ taxTypeName: 'Value Added Tax', taxTypeCode: '301', registrationDate: '', cancellationDate: '' }],
      dictionaryVersion: '1',
      commodityCategoryVersion: '1',
      exciseDutyVersion: '1',
      taxpayerBranchVersion: '1',
      whetherEnableServerStock: '0',
      webServiceURL: 'https://sandbox.local/efris/1.0/',
      environment: '0',
    });
  }

  async getSymmetricKey(
    options: EnvelopeOptions,
  ): Promise<EfrisCallResult<{ passowrdDes: string; sign: string }>> {
    await this.simulate();
    this.throwIfErrorScenario();
    return this.wrap(options, 'T104', {
      passowrdDes: 'mock-symmetric-key',
      sign: 'mock-signature-value',
    });
  }

  async call<T = unknown>(
    interfaceCode: EfrisInterfaceCode,
    options: EnvelopeOptions,
    innerJson: unknown | null,
  ): Promise<EfrisCallResult<T>> {
    await this.simulate();
    if (this.scenario === 'authentication-error') {
      const state = this.simulatedReturnCode();
      return { success: false, content: null, returnCode: state.returnCode, returnMessage: state.returnMessage, dataExchangeId: crypto.randomUUID().replace(/-/g, ''), raw: { returnStateInfo: state }, durationMs: this.latencyMs };
    }
    return this.wrap(options, interfaceCode, innerJson ?? {});
  }

  async submitReceipt(input: EfrisSubmitReceiptInput): Promise<EfrisCallResult> {
    const started = Date.now();
    if (this.scenario === 'timeout-before-submit') {
      await delay(5000);
      throw new Error('ETIMEDOUT: mock timeout before submit');
    }
    await this.simulate();

    if (this.scenario === 'unknown') {
      // Simulate "response lost" — URA may or may not have accepted.
      throw new Error('ECONNRESET: connection lost after submission (outcome unknown)');
    }
    if (this.scenario === 'authentication-error' || this.scenario === 'validation-error') {
      const state = this.simulatedReturnCode();
      return {
        success: false,
        content: null,
        returnCode: state.returnCode,
        returnMessage: state.returnMessage,
        dataExchangeId: crypto.randomUUID().replace(/-/g, ''),
        raw: { returnStateInfo: state },
        durationMs: Date.now() - started,
      };
    }

    const builder = createEnvelopeBuilder({ ...input.envelopeOptions, interfaceCode: 'T109' });
    const ctx = builder.buildPlain(input.innerJson ?? {});
    const state = this.simulatedReturnCode();
    const content = {
      invoiceNo: state.returnCode === '00' ? `SIM-${String(Date.now()).slice(-8)}` : '',
      antifakeCode: 'SIM-ANTIFAKE-0001',
      qrCode: 'SIM-QR-CODE-DATA',
      verificationCode: 'SIM-VERIFY-0001',
      fiscalDocumentNumber: `SIM-FDN-${Date.now()}`,
    };
    return {
      success: state.returnCode === '00',
      content,
      returnCode: state.returnCode,
      returnMessage: state.returnMessage,
      dataExchangeId: ctx.dataExchangeId,
      raw: { ...ctx.envelope, returnStateInfo: state },
      durationMs: Date.now() - started,
    };
  }

  async reconcile(interfaceCode: EfrisInterfaceCode, options: EnvelopeOptions, queryJson: unknown): Promise<EfrisCallResult> {
    // Reconciliation is a QUERY, not a submit. Timeout/unknown submit scenarios
    // must not block the lookup that resolves them.
    await delay(this.latencyMs);
    if (this.scenario === 'rejection' || this.scenario === 'validation-error') {
      const state = this.simulatedReturnCode();
      return { success: false, content: null, returnCode: state.returnCode, returnMessage: state.returnMessage, dataExchangeId: crypto.randomUUID().replace(/-/g, ''), raw: { returnStateInfo: state }, durationMs: this.latencyMs };
    }
    // Successful query: return the matching document the reference asks for
    // (the mock always "finds" a prior submission, matching how URA T107
    // responds once a fiscal document exists).
    const q = (queryJson || {}) as Record<string, unknown>;
    const builder = createEnvelopeBuilder({ ...options, interfaceCode });
    const ctx = builder.buildPlain({
      records: [{
        referenceNo: q.referenceNo ?? '',
        invoiceNo: `SIM-${String(Date.now()).slice(-8)}`,
        antifakeCode: 'SIM-ANTIFAKE-0001',
        oriInvoiceNo: q.referenceNo ?? '',
        isInvalid: '2',
        isRefund: '0',
      }],
    });
    return {
      success: true,
      content: {
        records: [{
          referenceNo: q.referenceNo ?? '',
          invoiceNo: `SIM-${String(Date.now()).slice(-8)}`,
          antifakeCode: 'SIM-ANTIFAKE-0001',
          oriInvoiceNo: q.referenceNo ?? '',
          isInvalid: '2',
          isRefund: '0',
        }],
      },
      returnCode: '00',
      returnMessage: 'Successful',
      dataExchangeId: ctx.dataExchangeId,
      raw: { ...ctx.envelope, returnStateInfo: { returnCode: '00', returnMessage: 'Successful' } },
      durationMs: this.latencyMs,
    };
  }

  async probe(): Promise<{ reachable: boolean; latencyMs: number; detail?: string }> {
    await this.simulate();
    return { reachable: true, latencyMs: this.latencyMs, detail: 'Mock EFRIS adapter (sandbox simulation)' };
  }
}
