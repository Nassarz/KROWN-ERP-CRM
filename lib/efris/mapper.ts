// ============================================================================
// KROWN ERP — EFRIS mapper: KROWN domain → URA wire payloads (T109/T110)
// Translates KROWN orders/payments into the EXACT documented wire format.
// KROWN selling prices are NEVER modified — mapping is a pure translation.
// ============================================================================

import type {
  EfrisGoodsDetail,
  EfrisInvoiceContent,
  EfrisSellerDetails,
  EfrisTaxDetail,
} from './types';
import {
  DATA_SOURCE_S2S,
  DEEMED_FLAG_NO,
  DISCOUNT_FLAG_NORMAL,
  EXCISE_FLAG_NO,
  HAVE_PIECE_UNIT_NO,
  INVOICE_INDUSTRY_CODE_GENERAL,
  INVOICE_TYPE_DEBIT_NOTE,
  INVOICE_TYPE_RECEIPT,
  KROWN_VAT_RATE,
  KROWN_VAT_RATE_STRING,
  MODE_CODE_SERVER_INVOICE,
  TAX_CATEGORY_EXEMPT,
  TAX_CATEGORY_STANDARD,
  TAX_CATEGORY_ZERO,
  UNIT_OF_MEASURE_PIECE,
} from './constants';

export interface KrownOrderForFiscalization {
  orderId: string;
  krownReference: string;
  branchName: string;
  branchId: string | null;
  deviceNo: string;
  tin: string;
  brn: string;
  operatorName: string;
  buyerTin?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  currency: string;
  items: Array<{
    productId?: string | null;
    name: string;
    itemCode?: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
    taxCategory: 'A' | 'B' | 'C' | 'D' | 'E';
    taxRate: number;
    taxAmount: number;
    goodsCategoryId?: string | null;
    categoryName?: string | null;
  }>;
  subtotal: number;
  tax: number;
  total: number;
}

export interface SellerProfile {
  tin: string;
  brn: string;
  legalName: string;
  businessName: string;
  address: string;
  mobilePhone: string;
  linePhone: string;
  emailAddress: string;
  placeOfBusiness: string;
  referenceNo: string;
  branchId: string;
}

function money(value: number): string {
  // Two decimals, truncated (per URA validation rules: total = qty*price,
  // two decimals, discarded fraction).
  return (Math.floor(value * 100) / 100).toFixed(2);
}

function quantity(value: number): string {
  // Up to 12 integer chars, 4 decimals
  return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, '');
}

export function buildGoodsDetail(item: KrownOrderForFiscalization['items'][number], index: number): EfrisGoodsDetail {
  return {
    item: item.name.slice(0, 200),
    itemCode: item.itemCode || item.productId?.slice(0, 20) || `KRN-${index + 1}`.slice(0, 20),
    qty: quantity(item.quantity),
    unitOfMeasure: UNIT_OF_MEASURE_PIECE,
    unitPrice: money(item.unitPrice),
    total: money(item.total),
    taxRate: item.taxCategory === TAX_CATEGORY_STANDARD ? KROWN_VAT_RATE_STRING : '0',
    tax: money(item.taxAmount),
    discountTotal: '0',
    discountTaxRate: '0',
    discountFlag: DISCOUNT_FLAG_NORMAL,
    deemedFlag: item.taxCategory === 'D' ? '1' : DEEMED_FLAG_NO,
    exciseFlag: item.taxCategory === 'E' ? '1' : EXCISE_FLAG_NO,
    categoryId: '',
    categoryName: '',
    goodsCategoryId: item.goodsCategoryId || '',
    goodsCategoryName: item.categoryName || '',
    exciseRate: '',
    exciseRule: '',
    exciseTax: '',
    pack: '',
    stick: '',
    exciseUnit: '',
    exciseCurrency: '',
    exciseRateName: '',
    havePieceUnit: HAVE_PIECE_UNIT_NO,
    pieceMeasureUnit: '',
    pieceScaledValue: '',
    packageScaledValue: '',
    remarks: '',
  };
}

export function buildTaxDetails(order: KrownOrderForFiscalization): EfrisTaxDetail[] {
  // Group tax by category (A/B/C/D/E). KROWN computes 18% VAT on subtotal for
  // standard-rated items; zero/exempt categories carry 0.
  const groups = new Map<string, { net: number; tax: number; rate: number }>();
  for (const item of order.items) {
    const key = item.taxCategory;
    const entry = groups.get(key) || { net: 0, tax: 0, rate: item.taxRate };
    entry.net += item.total;
    entry.tax += item.taxAmount;
    groups.set(key, entry);
  }

  const names: Record<string, { category: string; rateName: string }> = {
    A: { category: 'VAT', rateName: 'VAT' },
    B: { category: 'Zero Rated', rateName: 'Zero Rated' },
    C: { category: 'Exempt', rateName: 'Exempt' },
    D: { category: 'Deemed', rateName: 'Deemed' },
    E: { category: 'Excise Duty', rateName: 'Excise Duty' },
  };

  const details: EfrisTaxDetail[] = [];
  for (const [category, entry] of groups) {
    const name = names[category] ?? names.A;
    details.push({
      taxCategory: category,
      taxCategoryName: name.category,
      netAmount: money(entry.net),
      taxRate: entry.rate > 0 ? KROWN_VAT_RATE_STRING : '0',
      taxAmount: money(entry.tax),
      grossAmount: money(entry.net + entry.tax),
      exciseUnit: '',
      exciseCurrency: '',
      taxRateName: name.rateName,
    });
  }
  return details;
}

export function buildSellerDetails(profile: SellerProfile): EfrisSellerDetails {
  return {
    tin: profile.tin,
    ninBrn: profile.brn,
    legalName: profile.legalName,
    businessName: profile.businessName,
    address: profile.address,
    mobilePhone: profile.mobilePhone,
    linePhone: profile.linePhone,
    emailAddress: profile.emailAddress,
    placeOfBusiness: profile.placeOfBusiness,
    referenceNo: profile.referenceNo,
    branchId: profile.branchId,
  };
}

/**
 * Build the T109 inner content for a KROWN sale.
 * modeCode=1 → the server assigns the fiscal invoice number.
 */
export function buildInvoiceContent(
  order: KrownOrderForFiscalization,
  seller: SellerProfile,
  opts: { issuedDate?: Date; invoiceType?: string } = {},
): EfrisInvoiceContent {
  const issuedDate = opts.issuedDate ?? new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const issued = `${issuedDate.getFullYear()}-${pad(issuedDate.getMonth() + 1)}-${pad(issuedDate.getDate())} ${pad(issuedDate.getHours())}:${pad(issuedDate.getMinutes())}:${pad(issuedDate.getSeconds())}`;

  const goodsDetails = order.items.map((item, i) => buildGoodsDetail(item, i));
  const taxDetails = buildTaxDetails(order);

  return {
    basicInformation: {
      invoiceNo: '',
      antifakeCode: '',
      deviceNo: order.deviceNo,
      issuedDate: issued,
      operator: order.operatorName.slice(0, 150),
      currency: order.currency,
      invoiceType: opts.invoiceType || INVOICE_TYPE_RECEIPT,
      invoiceKind: opts.invoiceType || INVOICE_TYPE_RECEIPT,
      dataSource: DATA_SOURCE_S2S,
      invoiceIndustryCode: INVOICE_INDUSTRY_CODE_GENERAL,
      payWay: '1',
    },
    buyerDetails: {
      buyerTin: order.buyerTin || '',
      buyerNinBrn: '',
      buyerPassportNum: '',
      buyerLegalName: order.buyerName || '',
      buyerBusinessName: '',
      buyerAddress: '',
      buyerEmail: '',
      buyerMobilePhone: order.buyerPhone || '',
      buyerLinePhone: '',
      buyerPlaceOfBusi: '',
      buyerType: '1',
      buyerCitizenship: '1',
      buyerSector: '',
      buyerReferenceNo: '',
    },
    goodsDetails,
    taxDetails,
    summary: {
      netAmount: money(order.subtotal),
      taxAmount: money(order.tax),
      grossAmount: money(order.total),
      itemCount: String(order.items.length),
      modeCode: MODE_CODE_SERVER_INVOICE,
      remarks: '',
      qrCode: '',
    },
    sellerDetails: buildSellerDetails(seller),
    extend: {},
  };
}

/** Build T110 credit-note content referencing an original fiscal invoice */
export function buildCreditNoteContent(
  order: KrownOrderForFiscalization,
  seller: SellerProfile,
  originalInvoice: { invoiceNo: string; oriInvoiceId?: string | null },
  opts: { issuedDate?: Date; reason?: string; reasonCode?: string } = {},
): EfrisInvoiceContent {
  const content = buildInvoiceContent(order, seller, {
    issuedDate: opts.issuedDate,
    invoiceType: '4',
  });
  content.basicInformation.invoiceNo = originalInvoice.invoiceNo;
  content.basicInformation.oriInvoiceId = originalInvoice.oriInvoiceId || originalInvoice.invoiceNo;
  content.extend = {
    reason: opts.reason || '',
    reasonCode: opts.reasonCode || '',
  };
  return content;
}

/** Build T109 debit-note content (debit adjustments) */
export function buildDebitNoteContent(
  order: KrownOrderForFiscalization,
  seller: SellerProfile,
  opts: { issuedDate?: Date } = {},
): EfrisInvoiceContent {
  return buildInvoiceContent(order, seller, {
    issuedDate: opts.issuedDate,
    invoiceType: INVOICE_TYPE_DEBIT_NOTE,
  });
}
