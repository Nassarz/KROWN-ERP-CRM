// ============================================================================
// KROWN ERP — EFRIS envelope construction
// Builds/parses the documented outer protocol:
//   { data: { content, signature, dataDescription }, globalInfo, returnStateInfo }
// ============================================================================

import crypto from 'node:crypto';
import type {
  EfrisData,
  EfrisDataDescription,
  EfrisEnvelope,
  EfrisGlobalInfo,
  EfrisInterfaceCode,
} from './types';
import {
  CODE_TYPE_CIPHERTEXT,
  CODE_TYPE_PLAIN,
  EFRIS_APP_ID,
  EFRIS_CLIENT_VERSION,
  EFRIS_DEVICE_MAC,
  EFRIS_REQUEST_CODE,
  EFRIS_RESPONSE_CODE,
  EFRIS_TAXPAYER_ID,
  ENCRYPT_CODE_AES,
  ZIP_CODE_UNCOMPRESSED,
} from './constants';
import { aesEncryptWithKey, signStringWithPrivateKey } from './security';

/** Request time format: yyyy-MM-dd HH:mm:ss (documented requestTime format) */
export function formatEfrisRequestTime(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export interface EnvelopeOptions {
  interfaceCode: EfrisInterfaceCode;
  tin: string;
  brn?: string;
  deviceNo: string;
  userName?: string;
  deviceMAC?: string;
  longitude?: string;
  latitude?: string;
  dataExchangeId?: string;
  version?: string;
  agentType?: '0' | '1' | '2';
  extendField?: Record<string, unknown>;
  requestTime?: Date;
}

export interface BuiltContent {
  content: string;
  signature: string;
  dataDescription: EfrisDataDescription;
}

export interface EnvelopeContext {
  envelope: EfrisEnvelope;
  dataExchangeId: string;
  requestTime: string;
}

export interface EnvelopeBuilder {
  options: EnvelopeOptions;
  dataExchangeId: string;
  requestTime: string;
  buildPlain(contentJson: unknown): EnvelopeContext;
  buildEncryptedAndSigned(innerJson: unknown, aesKey: string, clientPrivateKeyPem: string | null): EnvelopeContext;
  buildOfflineBase64(innerJson: unknown): EnvelopeContext;
  buildEmpty(): EnvelopeContext;
}

export function createEnvelopeBuilder(options: EnvelopeOptions): EnvelopeBuilder {
  const dataExchangeId = options.dataExchangeId || crypto.randomUUID().replace(/-/g, '');
  const requestTime = formatEfrisRequestTime(options.requestTime ?? new Date());

  const globalInfo: EfrisGlobalInfo = {
    appId: EFRIS_APP_ID,
    version: options.version || EFRIS_CLIENT_VERSION,
    dataExchangeId,
    interfaceCode: options.interfaceCode,
    requestCode: EFRIS_REQUEST_CODE,
    requestTime,
    responseCode: EFRIS_RESPONSE_CODE,
    userName: options.userName || '',
    deviceMAC: options.deviceMAC || EFRIS_DEVICE_MAC,
    deviceNo: options.deviceNo,
    tin: options.tin,
    brn: options.brn || '',
    taxpayerID: EFRIS_TAXPAYER_ID,
    longitude: options.longitude || '0',
    latitude: options.latitude || '0',
    agentType: options.agentType || '0',
    ...(options.extendField ? { extendField: options.extendField } : {}),
  };

  function wrap(data: EfrisData): EnvelopeContext {
    return {
      envelope: {
        data,
        globalInfo,
        returnStateInfo: { returnCode: '', returnMessage: '' },
      },
      dataExchangeId,
      requestTime,
    };
  }

  return {
    options,
    dataExchangeId,
    requestTime,
    buildPlain(contentJson: unknown): EnvelopeContext {
      const json = JSON.stringify(contentJson ?? {});
      const content = json === '{}' ? '' : Buffer.from(json, 'utf8').toString('base64');
      return wrap({
        content,
        signature: '',
        dataDescription: { codeType: CODE_TYPE_PLAIN, encryptCode: ENCRYPT_CODE_AES, zipCode: ZIP_CODE_UNCOMPRESSED },
      });
    },
    buildEncryptedAndSigned(innerJson: unknown, aesKey: string, clientPrivateKeyPem: string | null): EnvelopeContext {
      // Online mode: AES-encrypt the inner JSON, then sign the ENCRYPTED
      // content string with the client private key (S2S V3).
      const json = JSON.stringify(innerJson ?? {});
      const encrypted = aesEncryptWithKey(aesKey, json);
      const content = Buffer.from(encrypted, 'utf8').toString('base64');
      const signature = clientPrivateKeyPem ? signStringWithPrivateKey(clientPrivateKeyPem, encrypted) : '';
      return wrap({
        content,
        signature,
        dataDescription: { codeType: CODE_TYPE_CIPHERTEXT, encryptCode: ENCRYPT_CODE_AES, zipCode: ZIP_CODE_UNCOMPRESSED },
      });
    },
    buildOfflineBase64(innerJson: unknown): EnvelopeContext {
      // Offline mode: signature empty, content only BASE64-encoded.
      const json = JSON.stringify(innerJson ?? {});
      const content = json === '{}' ? '' : Buffer.from(json, 'utf8').toString('base64');
      return wrap({
        content,
        signature: '',
        dataDescription: { codeType: CODE_TYPE_PLAIN, encryptCode: ENCRYPT_CODE_AES, zipCode: ZIP_CODE_UNCOMPRESSED },
      });
    },
    buildEmpty(): EnvelopeContext {
      return wrap({
        content: '',
        signature: '',
        dataDescription: { codeType: CODE_TYPE_PLAIN, encryptCode: ENCRYPT_CODE_AES, zipCode: ZIP_CODE_UNCOMPRESSED },
      });
    },
  };
}

/** Parse an envelope response and return the decoded inner message (if any) */
export function parseEnvelopeResponse(raw: unknown): {
  envelope: EfrisEnvelope;
  returnStateInfo: { returnCode: string; returnMessage: string };
  decodedContent: unknown;
  isSuccess: boolean;
} {
  const env = raw as EfrisEnvelope;
  const returnStateInfo = env?.returnStateInfo ?? { returnCode: '', returnMessage: '' };
  const isSuccess = returnStateInfo.returnCode === '00' || returnStateInfo.returnCode === '';
  let decodedContent: unknown = null;
  const content = env?.data?.content;
  if (content) {
    try {
      decodedContent = JSON.parse(Buffer.from(content, 'base64').toString('utf8'));
    } catch {
      decodedContent = null;
    }
  }
  return { envelope: env, returnStateInfo, decodedContent, isSuccess };
}
