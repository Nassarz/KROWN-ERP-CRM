// ============================================================================
// KROWN ERP — EFRIS adapter contract
// Online (AP04 System-to-System), Offline (local enabler) and Mock providers
// all implement this interface. Adapters translate internal domain calls into
// URA wire envelopes; they never talk to the database directly.
// ============================================================================

import type { EfrisInterfaceCode } from '../types';
import type { EnvelopeOptions } from '../envelope';

export interface EfrisCallResult<T = unknown> {
  success: boolean;
  /** Decoded inner response content (parsed JSON) */
  content: T | null;
  returnCode: string;
  returnMessage: string;
  dataExchangeId: string;
  /** Raw envelope (may be redacted by caller before persistence) */
  raw: unknown;
  durationMs: number;
}

export interface EfrisSubmitReceiptInput {
  innerJson: unknown;
  envelopeOptions: EnvelopeOptions;
}

/**
 * Every adapter implementation MUST:
 *  - be stateless with respect to tenants (callers pass explicit identity)
 *  - never log secrets
 *  - surface transport errors as exceptions so the service layer can classify
 */
export interface EfrisAdapter {
  readonly id: string;
  readonly mode: 'online' | 'offline' | 'mock';
  /** T101 — get server time */
  getServerTime(options: EnvelopeOptions): Promise<EfrisCallResult<{ currentTime: string }>>;
  /** T102 — client initialization (server public key + white-box client key) */
  initialize(options: EnvelopeOptions, otp?: string): Promise<EfrisCallResult>;
  /** T103 — login, returns taxpayer/device/dictionary info */
  login(options: EnvelopeOptions): Promise<EfrisCallResult>;
  /** T104 — get symmetric key + signature information */
  getSymmetricKey(options: EnvelopeOptions, aesKey: string, clientPrivateKeyPem: string | null): Promise<EfrisCallResult<{ passowrdDes: string; sign: string }>>;
  /** Generic interface call (used by dictionary sync, queries, etc.) */
  call<T = unknown>(interfaceCode: EfrisInterfaceCode, options: EnvelopeOptions, innerJson: unknown | null): Promise<EfrisCallResult<T>>;
  /** T109/T110 — submit fiscal content */
  submitReceipt(input: EfrisSubmitReceiptInput, aesKey?: string | null, clientPrivateKeyPem?: string | null): Promise<EfrisCallResult>;
  /** T117 — reconciliation query */
  reconcile(interfaceCode: EfrisInterfaceCode, options: EnvelopeOptions, queryJson: unknown): Promise<EfrisCallResult>;
  /** Reachability/health probe */
  probe(): Promise<{ reachable: boolean; latencyMs: number; detail?: string }>;
}

export interface EfrisAdapterConfig {
  baseUrl: string;
  timeoutMs: number;
}
