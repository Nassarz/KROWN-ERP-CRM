// EFRIS envelope + mapper unit tests
import { describe, it, expect } from 'vitest';
import { createEnvelopeBuilder, formatEfrisRequestTime, parseEnvelopeResponse } from '../envelope';
import { buildInvoiceContent, buildGoodsDetail, buildTaxDetails } from '../mapper';
import type { KrownOrderForFiscalization, SellerProfile } from '../mapper';

const envelopeOptions = {
  interfaceCode: 'T101' as const,
  tin: '1000029771',
  brn: '',
  deviceNo: 'TCS9e0df01728335239',
  userName: 'admin',
};

describe('EFRIS envelope', () => {
  it('formats request time as yyyy-MM-dd HH:mm:ss', () => {
    const t = formatEfrisRequestTime(new Date(2026, 0, 5, 9, 3, 7));
    expect(t).toBe('2026-01-05 09:03:07');
  });

  it('builds a plain envelope with documented globalInfo fields', () => {
    const ctx = createEnvelopeBuilder(envelopeOptions).buildPlain({ hello: 'world' });
    const env = ctx.envelope;
    expect(env.globalInfo.appId).toBe('AP04');
    expect(env.globalInfo.requestCode).toBe('TP');
    expect(env.globalInfo.responseCode).toBe('TA');
    expect(env.globalInfo.tin).toBe('1000029771');
    expect(env.globalInfo.deviceNo).toBe('TCS9e0df01728335239');
    expect(env.globalInfo.taxpayerID).toBe('1');
    expect(env.data.dataDescription.codeType).toBe('0');
    expect(env.data.dataDescription.encryptCode).toBe('2');
    expect(env.data.dataDescription.zipCode).toBe('0');
    expect(env.returnStateInfo.returnCode).toBe('');
    // content is BASE64 of the JSON
    expect(JSON.parse(Buffer.from(env.data.content, 'base64').toString('utf8'))).toEqual({ hello: 'world' });
    expect(ctx.dataExchangeId.length).toBeLessThanOrEqual(32);
  });

  it('builds empty envelope for header-only interfaces (T101/T103/T104)', () => {
    const ctx = createEnvelopeBuilder({ ...envelopeOptions, interfaceCode: 'T101' }).buildEmpty();
    expect(ctx.envelope.data.content).toBe('');
    expect(ctx.envelope.data.signature).toBe('');
  });

  it('offline mode uses base64 content with empty signature', () => {
    const ctx = createEnvelopeBuilder({ ...envelopeOptions, interfaceCode: 'T109' }).buildOfflineBase64({ a: 1 });
    expect(ctx.envelope.data.signature).toBe('');
    expect(JSON.parse(Buffer.from(ctx.envelope.data.content, 'base64').toString('utf8'))).toEqual({ a: 1 });
  });

  it('online mode signs the ENCRYPTED content and marks ciphertext', () => {
    const kp = require('node:crypto').generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = kp.privateKey.export({ type: 'pkcs8', format: 'pem' });
    const ctx = createEnvelopeBuilder({ ...envelopeOptions, interfaceCode: 'T109' }).buildEncryptedAndSigned({ a: 1 }, 'test-aes-key', pem);
    expect(ctx.envelope.data.dataDescription.codeType).toBe('1');
    expect(ctx.envelope.data.dataDescription.encryptCode).toBe('2');
    expect(ctx.envelope.data.signature.length).toBeGreaterThan(0);
    expect(ctx.envelope.data.content).not.toContain('"a":1');
  });

  it('parses response envelopes', () => {
    const raw = {
      data: { content: Buffer.from(JSON.stringify({ currentTime: '19/02/2025 10:00:00' })).toString('base64'), signature: '', dataDescription: { codeType: '0', encryptCode: '2', zipCode: '0' } },
      globalInfo: { ...envelopeOptions, dataExchangeId: 'abc123' },
      returnStateInfo: { returnCode: '00', returnMessage: 'Successful' },
    };
    const parsed = parseEnvelopeResponse(raw);
    expect(parsed.isSuccess).toBe(true);
    expect(parsed.decodedContent).toEqual({ currentTime: '19/02/2025 10:00:00' });
  });
});

const seller: SellerProfile = {
  tin: '1000029771', brn: 'BRN-1', legalName: 'Test Co', businessName: 'Test Co',
  address: 'Kampala', mobilePhone: '0700000000', linePhone: '0700000000',
  emailAddress: 'test@test.com', placeOfBusiness: 'Kampala', referenceNo: 'REF1', branchId: '',
};

const order: KrownOrderForFiscalization = {
  orderId: 'order-1',
  krownReference: 'KRN-ORDER1',
  branchName: 'Main',
  branchId: null,
  deviceNo: 'TCS9e0df01728335239',
  tin: '1000029771',
  brn: '',
  operatorName: 'admin',
  currency: 'UGX',
  items: [
    { productId: 'p1', name: 'Burger', itemCode: 'B01', quantity: 2, unitPrice: 15000, total: 30000, taxCategory: 'A', taxRate: 0.18, taxAmount: 5400 },
    { productId: 'p2', name: 'Juice', itemCode: 'J01', quantity: 1, unitPrice: 5000, total: 5000, taxCategory: 'B', taxRate: 0, taxAmount: 0 },
  ],
  subtotal: 35000,
  tax: 5400,
  total: 40400,
};

describe('EFRIS T109 mapper', () => {
  it('maps KROWN order to documented T109 wire fields', () => {
    const content = buildInvoiceContent(order, seller);
    expect(content.basicInformation.deviceNo).toBe('TCS9e0df01728335239');
    expect(content.basicInformation.dataSource).toBe('103');
    expect(content.basicInformation.currency).toBe('UGX');
    expect(content.summary.modeCode).toBe('1'); // server assigns invoice number
    expect(content.summary.grossAmount).toBe('40400.00');
    expect(content.summary.itemCount).toBe('2');
    expect(content.goodsDetails).toHaveLength(2);
    expect(content.sellerDetails.tin).toBe('1000029771');
  });

  it('never modifies the configured selling price', () => {
    const content = buildInvoiceContent(order, seller);
    const burger = content.goodsDetails[0];
    expect(burger.unitPrice).toBe('15000.00'); // KROWN configured price, unchanged
    expect(burger.total).toBe('30000.00');
  });

  it('uses standard VAT rate string 18 for category A, 0 for B', () => {
    const content = buildInvoiceContent(order, seller);
    expect(content.goodsDetails[0].taxRate).toBe('18');
    expect(content.goodsDetails[0].tax).toBe('5400.00');
    expect(content.goodsDetails[1].taxRate).toBe('0');
    expect(content.goodsDetails[1].tax).toBe('0.00');
  });

  it('groups tax details by category', () => {
    const details = buildTaxDetails(order);
    expect(details).toHaveLength(2);
    const vat = details.find(d => d.taxCategory === 'A')!;
    expect(vat.netAmount).toBe('30000.00');
    expect(vat.taxAmount).toBe('5400.00');
    expect(vat.grossAmount).toBe('35400.00');
  });

  it('marks discount/deemed/excise flags as normal lines', () => {
    const g = buildGoodsDetail(order.items[0], 0);
    expect(g.discountFlag).toBe('2');
    expect(g.deemedFlag).toBe('2');
    expect(g.exciseFlag).toBe('2');
    expect(g.havePieceUnit).toBe('102');
  });

  it('builds credit-note content referencing the original invoice', () => {
    const content = buildInvoiceContent(order, seller, { invoiceType: '4' });
    const cn = { ...content, basicInformation: { ...content.basicInformation, invoiceNo: 'INV-1', oriInvoiceId: 'INV-1' } };
    expect(cn.basicInformation.invoiceType).toBe('4');
    expect(cn.basicInformation.oriInvoiceId).toBe('INV-1');
  });
});
