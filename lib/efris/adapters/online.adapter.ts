// ============================================================================
// KROWN ERP — EFRIS online adapter (AP04 System-to-System)
// Posts the documented JSON envelope to URA over HTTPS.
//
// [AWAITING URA CONFIGURATION] The exact per-interface URL paths and the
// base URL are confirmed during UAT onboarding. The Interface Design v24
// references https://api.ura.go.ug/efris/1.0/ (production) and the test
// portal https://efristest.ura.go.ug. This adapter is fully implemented and
// remains dormant until valid UAT endpoints/credentials exist.
// ============================================================================

import type { EfrisAdapter, EfrisCallResult, EfrisSubmitReceiptInput } from './adapter';
import type { EfrisInterfaceCode } from '../types';
import type { EnvelopeOptions } from '../envelope';
import { createEnvelopeBuilder, parseEnvelopeResponse } from '../envelope';
import { redactText } from '../security';

export interface OnlineEfrisAdapterOptions {
  baseUrl: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export class OnlineEfrisAdapter implements EfrisAdapter {
  readonly id = 'online-efris';
  readonly mode = 'online' as const;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(opts: OnlineEfrisAdapterOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async post(interfaceCode: EfrisInterfaceCode, envelope: unknown): Promise<EfrisCallResult> {
    const started = Date.now();
    // [AWAITING URA CONFIGURATION] URL path strategy confirmed at UAT.
    // The generic pattern posts to the versioned root; URA may require
    // per-interface paths.
    const url = `${this.baseUrl}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e: any) {
      // Transport failures (timeout, refused, reset) must bubble up raw so
      // the service layer can classify them (NETWORK/TIMEOUT → outcome
      // unknown). Messages are redacted of any secret material.
      throw new Error(redactText(e?.message || String(e)));
    }

    const durationMs = Date.now() - started;
    let raw: unknown = null;
    try {
      raw = await response.json();
    } catch {
      raw = null;
    }

    if (!response.ok) {
      throw new Error(`EFRIS HTTP ${response.status} for ${interfaceCode}`);
    }

    const parsed = parseEnvelopeResponse(raw);
    return {
      success: parsed.isSuccess,
      content: parsed.decodedContent,
      returnCode: parsed.returnStateInfo.returnCode,
      returnMessage: parsed.returnStateInfo.returnMessage,
      dataExchangeId: (parsed.envelope?.globalInfo as any)?.dataExchangeId ?? '',
      raw,
      durationMs,
    };
  }

  async getServerTime(options: EnvelopeOptions): Promise<EfrisCallResult<{ currentTime: string }>> {
    const ctx = createEnvelopeBuilder({ ...options, interfaceCode: 'T101' }).buildEmpty();
    return this.post('T101', ctx.envelope) as Promise<EfrisCallResult<{ currentTime: string }>>;
  }

  async initialize(options: EnvelopeOptions, otp?: string): Promise<EfrisCallResult> {
    const ctx = createEnvelopeBuilder({ ...options, interfaceCode: 'T102' }).buildPlain(otp ? { otp } : {});
    return this.post('T102', ctx.envelope);
  }

  async login(options: EnvelopeOptions): Promise<EfrisCallResult> {
    const ctx = createEnvelopeBuilder({ ...options, interfaceCode: 'T103' }).buildEmpty();
    return this.post('T103', ctx.envelope);
  }

  async getSymmetricKey(
    options: EnvelopeOptions,
    _aesKey: string,
    _clientPrivateKeyPem: string | null,
  ): Promise<EfrisCallResult<{ passowrdDes: string; sign: string }>> {
    const ctx = createEnvelopeBuilder({ ...options, interfaceCode: 'T104' }).buildEmpty();
    return this.post('T104', ctx.envelope) as Promise<EfrisCallResult<{ passowrdDes: string; sign: string }>>;
  }

  async call<T = unknown>(
    interfaceCode: EfrisInterfaceCode,
    options: EnvelopeOptions,
    innerJson: unknown | null,
  ): Promise<EfrisCallResult<T>> {
    const ctx = createEnvelopeBuilder({ ...options, interfaceCode }).buildPlain(innerJson ?? {});
    return this.post(interfaceCode, ctx.envelope) as Promise<EfrisCallResult<T>>;
  }

  async submitReceipt(
    input: EfrisSubmitReceiptInput,
    aesKey?: string | null,
    clientPrivateKeyPem?: string | null,
  ): Promise<EfrisCallResult> {
    const builder = createEnvelopeBuilder({ ...input.envelopeOptions, interfaceCode: 'T109' });
    let ctx;
    if (aesKey) {
      ctx = builder.buildEncryptedAndSigned(input.innerJson, aesKey, clientPrivateKeyPem ?? null);
    } else {
      // Online mode always encrypts; without a key the caller is misconfigured.
      throw new Error('Online EFRIS submission requires a symmetric AES key (T104)');
    }
    return this.post('T109', ctx.envelope);
  }

  async reconcile(interfaceCode: EfrisInterfaceCode, options: EnvelopeOptions, queryJson: unknown): Promise<EfrisCallResult> {
    const builder = createEnvelopeBuilder({ ...options, interfaceCode });
    const ctx = builder.buildPlain(queryJson ?? {});
    return this.post(interfaceCode, ctx.envelope);
  }

  async probe(): Promise<{ reachable: boolean; latencyMs: number; detail?: string }> {
    const started = Date.now();
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(5000),
      });
      return { reachable: response.status < 500, latencyMs: Date.now() - started };
    } catch (e: any) {
      return { reachable: false, latencyMs: Date.now() - started, detail: redactText(e?.message || String(e)) };
    }
  }
}
