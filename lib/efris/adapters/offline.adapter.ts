// ============================================================================
// KROWN ERP — EFRIS offline adapter (Offline-Mode Enabler)
// Talks to the locally-installed URA Offline Enabler service.
//
// Documented endpoints (Offline-Mode Enabler Installation Guide v1):
//   http://127.0.0.1:9880/efristcs                      — service health page
//   http://127.0.0.1:9880/efristcs/ws/tcsapp/getInformation — API endpoint
//   http://127.0.0.1:9980/...                           — updater service
//
// IMPORTANT: one enabler server is associated with ONE taxpayer/TIN. KROWN
// therefore maps each configured restaurant installation to its OWN enabler
// host/port — never a shared identity.
//
// [AWAITING URA CONFIGURATION] The enabler API request/response envelope
// details are confirmed during UAT. Offline mode requests use the same
// envelope format as online, with an empty signature and BASE64-only content
// (S2S API V3).
// ============================================================================

import type { EfrisAdapter, EfrisCallResult, EfrisSubmitReceiptInput } from './adapter';
import type { EfrisInterfaceCode } from '../types';
import type { EnvelopeOptions } from '../envelope';
import { createEnvelopeBuilder, parseEnvelopeResponse } from '../envelope';
import { redactText } from '../security';

export interface OfflineEfrisAdapterOptions {
  host?: string;
  port?: number;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class OfflineEfrisAdapter implements EfrisAdapter {
  readonly id = 'offline-efris';
  readonly mode = 'offline' as const;
  private host: string;
  private port: number;
  private timeoutMs: number;

  constructor(opts: OfflineEfrisAdapterOptions = {}) {
    this.host = opts.host ?? '127.0.0.1';
    this.port = opts.port ?? 9880;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  get baseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  private async post(envelope: unknown): Promise<EfrisCallResult> {
    const started = Date.now();
    const url = `${this.baseUrl}/efristcs/ws/tcsapp/getInformation`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e: any) {
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
      throw new Error(`Offline enabler HTTP ${response.status}`);
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
    return this.post(ctx.envelope) as Promise<EfrisCallResult<{ currentTime: string }>>;
  }

  async initialize(options: EnvelopeOptions, otp?: string): Promise<EfrisCallResult> {
    const ctx = createEnvelopeBuilder({ ...options, interfaceCode: 'T102' }).buildOfflineBase64(otp ? { otp } : {});
    return this.post(ctx.envelope);
  }

  async login(options: EnvelopeOptions): Promise<EfrisCallResult> {
    const ctx = createEnvelopeBuilder({ ...options, interfaceCode: 'T103' }).buildOfflineBase64({});
    return this.post(ctx.envelope);
  }

  async getSymmetricKey(): Promise<EfrisCallResult<{ passowrdDes: string; sign: string }>> {
    // The offline enabler handles key material locally; T104 is an
    // online-mode interface. Return a neutral success.
    return {
      success: true,
      content: { passowrdDes: '', sign: '' },
      returnCode: '00',
      returnMessage: 'Not applicable in offline mode',
      dataExchangeId: '',
      raw: null,
      durationMs: 0,
    };
  }

  async call<T = unknown>(
    interfaceCode: EfrisInterfaceCode,
    options: EnvelopeOptions,
    innerJson: unknown | null,
  ): Promise<EfrisCallResult<T>> {
    const ctx = createEnvelopeBuilder({ ...options, interfaceCode }).buildOfflineBase64(innerJson ?? {});
    return this.post(ctx.envelope) as Promise<EfrisCallResult<T>>;
  }

  async submitReceipt(input: EfrisSubmitReceiptInput): Promise<EfrisCallResult> {
    const builder = createEnvelopeBuilder({ ...input.envelopeOptions, interfaceCode: 'T109' });
    const ctx = builder.buildOfflineBase64(input.innerJson ?? {});
    return this.post(ctx.envelope);
  }

  async reconcile(interfaceCode: EfrisInterfaceCode, options: EnvelopeOptions, queryJson: unknown): Promise<EfrisCallResult> {
    const builder = createEnvelopeBuilder({ ...options, interfaceCode });
    const ctx = builder.buildOfflineBase64(queryJson ?? {});
    return this.post(ctx.envelope);
  }

  async probe(): Promise<{ reachable: boolean; latencyMs: number; detail?: string }> {
    const started = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/efristcs`, {
        signal: AbortSignal.timeout(5000),
      });
      return { reachable: response.ok, latencyMs: Date.now() - started };
    } catch (e: any) {
      return { reachable: false, latencyMs: Date.now() - started, detail: redactText(e?.message || String(e)) };
    }
  }
}
