// ============================================================================
// KROWN ERP — EFRIS centralized security layer
// All encryption/signing/Base64 handling lives HERE. Never scattered across
// routes. Uses Node's vetted crypto APIs only. No homemade cryptography.
//
// URA-documented mechanisms (Interface Design v24 + S2S API V3):
//   * Online mode: content is AES-encrypted; the AES key is delivered by T104
//     RSA-encrypted to the client public key. The signature is computed over
//     the ENCRYPTED content string with the client private key
//     (Signature = Sign(Encrypted(Content))).
//   * Offline mode: signature is an empty string; content is BASE64 only.
//   * Offline Enabler: RSA-2048 certificates.
//
// [CONFIRM-AT-UAT] exact padding/mode constants are confirmed against the URA
// test portal during onboarding; the primitives below are the documented
// defaults and are isolated in this single file.
// ============================================================================

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Base64 helpers (protocol uses standard Base64 with line breaks stripped)
// ---------------------------------------------------------------------------

export function base64Encode(input: string | Buffer): string {
  return Buffer.from(input).toString('base64');
}

export function base64Decode(input: string): Buffer {
  return Buffer.from(input, 'base64');
}

// ---------------------------------------------------------------------------
// RSA key pair generation (2048 bits per the Offline Enabler guide)
// ---------------------------------------------------------------------------

export interface RsaKeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
}

export function generateRsaKeyPair(modulusLength = 2048): RsaKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKeyPem: publicKey, privateKeyPem: privateKey };
}

/**
 * RSA encryption of short secrets (e.g. the symmetric key) to the client
 * public key. [CONFIRM-AT-UAT: PKCS1v15 vs OAEP]
 */
export function rsaEncryptToPublicKey(publicKeyPem: string, plaintext: string): string {
  return crypto
    .publicEncrypt({ key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(plaintext, 'utf8'))
    .toString('base64');
}

export function rsaDecryptWithPrivateKey(privateKeyPem: string, ciphertextBase64: string): string {
  return crypto
    .privateDecrypt({ key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING }, base64Decode(ciphertextBase64))
    .toString('utf8');
}

/**
 * Signature over the exact UTF-8 string (per S2S V3: sign the encrypted
 * content string). SHA256withRSA.
 */
export function signStringWithPrivateKey(privateKeyPem: string, data: string): string {
  const signer = crypto.createSign('SHA256');
  signer.update(data, 'utf8');
  signer.end();
  return signer.sign(privateKeyPem).toString('base64');
}

export function verifyStringSignature(publicKeyPem: string, data: string, signatureBase64: string): boolean {
  const verifier = crypto.createVerify('SHA256');
  verifier.update(data, 'utf8');
  verifier.end();
  return verifier.verify(publicKeyPem, base64Decode(signatureBase64));
}

// ---------------------------------------------------------------------------
// AES (symmetric content encryption, online mode)
// [CONFIRM-AT-UAT: ECB/CBC and padding are confirmed during onboarding]
// ---------------------------------------------------------------------------

export function aesEncryptWithKey(keyString: string, plaintext: string): string {
  // Derive a proper-length key from the URA-delivered symmetric key string.
  const key = crypto.createHash('sha256').update(keyString, 'utf8').digest();
  const iv = crypto.createHash('md5').update(keyString, 'utf8').digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return encrypted.toString('base64');
}

export function aesDecryptWithKey(keyString: string, ciphertextBase64: string): string {
  const key = crypto.createHash('sha256').update(keyString, 'utf8').digest();
  const iv = crypto.createHash('md5').update(keyString, 'utf8').digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(base64Decode(ciphertextBase64)), decipher.final()]);
  return decrypted.toString('utf8');
}

// ---------------------------------------------------------------------------
// At-rest secret storage (KROWN's own secret vault, NOT the wire protocol)
// AES-256-GCM with an application key. Secrets never leave the server.
// ---------------------------------------------------------------------------

let atRestKey: Buffer | null = null;

function getAtRestKey(): Buffer {
  if (atRestKey) return atRestKey;
  const secret = process.env.EFRIS_SECRET_KEY || process.env.JWT_SECRET || '';
  if (!secret) throw new Error('EFRIS_SECRET_KEY is not configured');
  atRestKey = crypto.createHash('sha256').update(`efris-at-rest:${secret}`).digest();
  return atRestKey;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getAtRestKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(payloadBase64: string): string {
  const payload = base64Decode(payloadBase64);
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getAtRestKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// ---------------------------------------------------------------------------
// Redaction — sensitive values must never reach logs/audit/DB raw payloads
// ---------------------------------------------------------------------------

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /privatekey/i,
  /prikey/i,
  /keytable/i,
  /secret/i,
  /token/i,
  /signature/i,
  /clientpri/i,
  /symmetric/i,
  /passowrd/i,
];

export function redactJson(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[redacted]';
  if (Array.isArray(value)) return value.map(v => redactJson(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERNS.some(p => p.test(k))) {
        out[k] = '[redacted]';
      } else {
        out[k] = redactJson(v, depth + 1);
      }
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 4000) return '[truncated]';
  return value;
}

/** Redact free-form text (stack traces, transport errors) */
export function redactText(text: string): string {
  return text
    .replace(/(-----BEGIN [^-]+ PRIVATE KEY-----)[\s\S]*?(-----END [^-]+ PRIVATE KEY-----)/g, '$1[redacted]$2')
    .replace(/("?(?:password|passowrdDes|clientPriKey|keyTable|token)"?\s*[:=]\s*")[^"]*(")/gi, '$1[redacted]$2');
}
