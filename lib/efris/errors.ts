// ============================================================================
// KROWN ERP — EFRIS error model
// Classified failures drive retry/queue decisions. Sensitive information is
// NEVER included in error messages or audit logs.
// ============================================================================

import type { EfrisFailureCategory } from './types';

/** Human-readable, non-technical messages for primary UI surfaces */
export const EFRIS_USER_MESSAGES: Record<string, string> = {
  // Generic user-facing guidance (no raw technical text)
  submission_failed: "We couldn't confirm this fiscal receipt with EFRIS.",
  timeout: 'Connection was interrupted while waiting for confirmation.',
  network: 'Could not reach the EFRIS service.',
  auth: 'EFRIS rejected the device credentials.',
  validation: 'The fiscal receipt data was rejected by EFRIS.',
  configuration: 'EFRIS is not fully configured for this restaurant.',
  security: 'There is a problem with the fiscal security certificates.',
  unknown: 'The status of this fiscal receipt could not be confirmed.',
  rejected: 'EFRIS rejected this fiscal receipt.',
};

export class EfrisError extends Error {
  readonly category: EfrisFailureCategory;
  readonly returnCode: string | null;
  readonly retryable: boolean;
  /** When true the submission outcome is unknown — reconcile, do NOT blindly retry */
  readonly outcomeUnknown: boolean;

  constructor(opts: {
    message: string;
    category?: EfrisFailureCategory;
    returnCode?: string | null;
    retryable?: boolean;
    outcomeUnknown?: boolean;
    cause?: unknown;
  }) {
    super(opts.message);
    this.name = 'EfrisError';
    this.category = opts.category ?? 'UNKNOWN';
    this.returnCode = opts.returnCode ?? null;
    this.retryable = opts.retryable ?? false;
    this.outcomeUnknown = opts.outcomeUnknown ?? false;
    if (opts.cause) this.cause = opts.cause;
  }
}

/** Map raw transport/service errors into classified EfrisError instances */
export function classifyEfrisError(error: unknown): EfrisError {
  if (error instanceof EfrisError) return error;
  const raw = error as { message?: string; code?: string; name?: string } | undefined;
  const message = raw?.message || 'Unknown EFRIS error';
  const code = raw?.code || raw?.name || '';

  // Timeout after submit: outcome unknown → reconcile, never blind-retry
  if (/timeout|ETIMEDOUT|ABORT/i.test(`${code} ${message}`)) {
    return new EfrisError({
      message,
      category: 'TIMEOUT',
      retryable: true,
      outcomeUnknown: true,
      cause: error,
    });
  }

  // Transport failures before/without confirmation
  if (/ECONNREFUSED|ECONNRESET|ENETUNREACH|EHOSTUNREACH|EPIPE|socket hang up|fetch failed|network/i.test(`${code} ${message}`)) {
    return new EfrisError({
      message,
      category: 'NETWORK',
      retryable: true,
      outcomeUnknown: true,
      cause: error,
    });
  }

  // Authentication / login failures
  if (/auth|login|unauthorized|credential|password/i.test(`${code} ${message}`)) {
    return new EfrisError({ message, category: 'AUTHENTICATION', retryable: false, cause: error });
  }

  // Security / signature / encryption failures
  if (/sign|encrypt|decrypt|certificate|key|AES|RSA/i.test(`${code} ${message}`)) {
    return new EfrisError({ message, category: 'SECURITY', retryable: false, cause: error });
  }

  // Validation failures from URA
  if (/invalid|cannot be empty|format|length|exceed|validate/i.test(message)) {
    return new EfrisError({ message, category: 'VALIDATION', retryable: false, cause: error });
  }

  // Configuration problems
  if (/configure|not configured|missing.*(tin|device|config)/i.test(message)) {
    return new EfrisError({ message, category: 'CONFIGURATION', retryable: false, cause: error });
  }

  return new EfrisError({ message, category: 'UNKNOWN', retryable: false, cause: error });
}

/** Map an EFRIS returnStateInfo returnCode to a failure classification */
export function classifyReturnCode(returnCode: string, returnMessage: string): EfrisFailureCategory {
  if (!returnCode || returnCode === '00') return 'UNKNOWN';
  // Non-zero return codes from URA are rejections; refine by message
  if (/password|login|auth|credential|session/i.test(returnMessage)) return 'AUTHENTICATION';
  if (/sign|encrypt|decrypt|certificate|key/i.test(returnMessage)) return 'SECURITY';
  if (/reject/i.test(returnMessage)) return 'EFRIS_REJECTION';
  if (/invalid|format|length|required|empty|exceed/i.test(returnMessage)) return 'VALIDATION';
  return 'EFRIS_REJECTION';
}

/** User-safe message for a classified error (no raw technical text) */
export function userSafeEfrisMessage(error: EfrisError): string {
  switch (error.category) {
    case 'TIMEOUT':
      return `${EFRIS_USER_MESSAGES.timeout} ${EFRIS_USER_MESSAGES.unknown}`;
    case 'NETWORK':
      return `${EFRIS_USER_MESSAGES.network} ${EFRIS_USER_MESSAGES.submission_failed}`;
    case 'AUTHENTICATION':
      return EFRIS_USER_MESSAGES.auth;
    case 'SECURITY':
      return EFRIS_USER_MESSAGES.security;
    case 'VALIDATION':
      return EFRIS_USER_MESSAGES.validation;
    case 'CONFIGURATION':
      return EFRIS_USER_MESSAGES.configuration;
    case 'EFRIS_REJECTION':
      return EFRIS_USER_MESSAGES.rejected;
    default:
      return EFRIS_USER_MESSAGES.submission_failed;
  }
}
