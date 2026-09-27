// EFRIS error classification + redaction unit tests
import { describe, it, expect } from 'vitest';
import { classifyEfrisError, EfrisError, classifyReturnCode, userSafeEfrisMessage } from '../errors';
import { redactJson, redactText, encryptSecret, decryptSecret, generateRsaKeyPair, signStringWithPrivateKey, verifyStringSignature } from '../security';

describe('EFRIS error classification', () => {
  it('classifies timeouts as retryable with unknown outcome', () => {
    const err = classifyEfrisError(new Error('ETIMEDOUT: connect timeout'));
    expect(err.category).toBe('TIMEOUT');
    expect(err.retryable).toBe(true);
    expect(err.outcomeUnknown).toBe(true);
  });

  it('classifies connection resets as network with unknown outcome', () => {
    const err = classifyEfrisError(new Error('ECONNRESET: socket hang up'));
    expect(err.category).toBe('NETWORK');
    expect(err.outcomeUnknown).toBe(true);
  });

  it('classifies auth failures as non-retryable', () => {
    const err = classifyEfrisError(new Error('Authentication failed: invalid credentials'));
    expect(err.category).toBe('AUTHENTICATION');
    expect(err.retryable).toBe(false);
  });

  it('classifies validation rejections', () => {
    const err = classifyEfrisError(new Error('basicInformation-->operator:cannot be empty!'));
    expect(err.category).toBe('VALIDATION');
    expect(err.retryable).toBe(false);
  });

  it('classifies return codes from URA responses', () => {
    expect(classifyReturnCode('1301', 'Login failed: invalid credentials')).toBe('AUTHENTICATION');
    expect(classifyReturnCode('1001', 'basicInformation-->operator:cannot be empty!')).toBe('VALIDATION');
    expect(classifyReturnCode('1902', 'Invoice rejected: invalid taxpayer status')).toBe('EFRIS_REJECTION');
  });

  it('preserves EfrisError instances', () => {
    const original = new EfrisError({ message: 'x', category: 'SECURITY', outcomeUnknown: true });
    const classified = classifyEfrisError(original);
    expect(classified).toBe(original);
  });

  it('produces user-safe messages without raw technical text', () => {
    const msg = userSafeEfrisMessage(classifyEfrisError(new Error('ECONNREFUSED 127.0.0.1:9880')));
    expect(msg).not.toContain('ECONNREFUSED');
    expect(msg).not.toContain('127.0.0.1');
  });
});

describe('EFRIS security layer', () => {
  it('encrypts and decrypts secrets at rest', () => {
    process.env.EFRIS_SECRET_KEY = 'test-master-key';
    const secret = 'my-private-key-material';
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it('signs and verifies strings with RSA keys', () => {
    const kp = generateRsaKeyPair();
    const data = 'encrypted-content-string';
    const sig = signStringWithPrivateKey(kp.privateKeyPem, data);
    expect(verifyStringSignature(kp.publicKeyPem, data, sig)).toBe(true);
    expect(verifyStringSignature(kp.publicKeyPem, data + 'tampered', sig)).toBe(false);
  });

  it('redacts sensitive JSON keys', () => {
    const redacted = redactJson({
      passowrdDes: 'sekret123',
      clientPriKey: 'priv',
      keyTable: 'table',
      plain: 'visible',
      nested: { privateKey: 'nested-secret', ok: 1 },
    }) as Record<string, any>;
    expect(redacted.passowrdDes).toBe('[redacted]');
    expect(redacted.clientPriKey).toBe('[redacted]');
    expect(redacted.keyTable).toBe('[redacted]');
    expect(redacted.nested.privateKey).toBe('[redacted]');
    expect(redacted.plain).toBe('visible');
    expect(redacted.nested.ok).toBe(1);
  });

  it('redacts private key blocks in free text', () => {
    const text = 'error: -----BEGIN RSA PRIVATE KEY-----\nabc123\n-----END RSA PRIVATE KEY----- done';
    const out = redactText(text);
    expect(out).not.toContain('abc123');
    expect(out).toContain('[redacted]');
  });
});
