// ============================================================================
// KROWN ERP — EFRIS wire protocol + domain types
// Wire field names follow the official URA "Interface Design for EFRIS v24"
// document EXACTLY. Internal KROWN domain types use clean TypeScript naming.
// ============================================================================

// ---------------------------------------------------------------------------
// Envelope (outer protocol layer)
// ---------------------------------------------------------------------------

export interface EfrisDataDescription {
  /** 0 = plain text, 1 = ciphertext */
  codeType: '0' | '1';
  /** 1 = RSA, 2 = AES (takes effect when codeType = 1) */
  encryptCode: '1' | '2';
  /** 0 = uncompressed, 1 = compressed */
  zipCode: '0' | '1';
}

export interface EfrisData {
  /** Inner message. Empty for header-only interfaces; otherwise BASE64 encoded. */
  content: string;
  /** Signature value. Required in online mode; empty string in offline mode. */
  signature: string;
  dataDescription: EfrisDataDescription;
}

export interface EfrisGlobalInfo {
  /** AP04 = system-to-system */
  appId: 'AP01' | 'AP04' | 'AP05';
  version: string;
  /** UUID, max 32 chars */
  dataExchangeId: string;
  interfaceCode: EfrisInterfaceCode;
  /** Requester code, TP for taxpayer */
  requestCode: 'TP';
  /** yyyy-MM-dd HH:mm:ss, UTC+3 */
  requestTime: string;
  /** Responder code, TA */
  responseCode: 'TA';
  userName: string;
  deviceMAC: string;
  deviceNo: string;
  tin: string;
  brn: string;
  taxpayerID: string;
  longitude: string;
  latitude: string;
  /** 0 not agent, 1 agent USSD, 2 agency invoicing */
  agentType: '0' | '1' | '2';
  extendField?: Record<string, unknown>;
}

export interface EfrisReturnStateInfo {
  returnCode: string;
  returnMessage: string;
}

export interface EfrisEnvelope {
  data: EfrisData;
  globalInfo: EfrisGlobalInfo;
  returnStateInfo: EfrisReturnStateInfo;
}

// ---------------------------------------------------------------------------
// Interface codes (from "Webservice interface code table", Interface Design v24)
// ---------------------------------------------------------------------------

export type EfrisInterfaceCode =
  | 'T101' // Get server time
  | 'T102' // Client initialization (server public key, white-box client key)
  | 'T103' // Log in (taxpayer/device/dictionary info)
  | 'T104' // Get symmetric key and signature information
  | 'T105' // Forget password
  | 'T106' // Invoice/Receipt query
  | 'T107' // Query normal invoice/receipt
  | 'T108' // Invoice details
  | 'T109' // Invoice/receipt/debit-note upload
  | 'T110' // Credit note application
  | 'T111' // Credit/cancel debit note application list query
  | 'T112' // Credit note application details
  | 'T113' // Credit note issue approval
  | 'T114' // Credit note application cancel
  | 'T115' // System dictionary update
  | 'T116' // Z-report daily report upload
  | 'T117' // Invoice reconciliation
  | 'T118' // Query taxpayer information by TIN
  | 'T119' // TIN validation
  | 'T120' // Acquiring exchange rate
  | 'T121' // Get all exchange rates
  | 'T122' // Query commodity category
  | 'T123' // Query commodity category pagination
  | 'T124' // Query excise duty
  | 'T125' // Get excise duty codes
  | 'T126' // Goods/services inquiry (by goods code)
  | 'T127' // Goods/services inquiry
  | 'T128' // Query stock quantity by goods id
  | 'T129' // Batch invoice upload
  | 'T130' // Goods/services upload
  | 'T131' // Goods stock maintenance
  | 'T132' // Upload exception log
  | 'T133' // TCS upgrade files
  | 'T134' // Commodity category incremental update
  | 'T135' // Get TCS latest version
  | 'T136' // Certificate public key upload
  | 'T137' // Check taxpayer type
  | 'T138' // Get all branches
  | 'T139' // Goods stock transfer
  | 'T144' // Goods/services inquiry by goods code
  | 'T145' // Goods stock records query
  | 'T146' // Goods stock records query (current branch)
  | 'T147' // Goods stock records detail query
  | 'T148' // Goods stock adjust records query
  | 'T149' // Goods stock adjust detail query
  | 'T160' // Query fuel type
  | 'T162' // Upload shift information
  | 'T163' // Upload EDC disconnection data
  | 'T164' // Update buyer details
  | 'T166' // EDC invoice/receipt inquiry
  | 'T170' // Query EDC UoM exchange rate
  | 'T171' // Fuel nozzle status upload
  | 'T172' // Query EDC device version
  | 'T173' // Account creation for USSD
  | 'T175' // Upload device issuing status
  | 'T176' // Negative stock configuration inquiry
  | 'T177'; // Negative stock configuration upload

// ---------------------------------------------------------------------------
// T109 / T110 inner content (invoice / credit-note payload)
// Field names per Interface Design v24 validation rules.
// ---------------------------------------------------------------------------

export interface EfrisBasicInformation {
  /** Server-assigned when modeCode = 1; empty string otherwise */
  invoiceNo: string;
  antifakeCode: string;
  /** MUST equal the outer-packet deviceNo */
  deviceNo: string;
  /** yyyy-MM-dd HH:mm:ss */
  issuedDate: string;
  /** max 150 chars */
  operator: string;
  /** ISO code, e.g. UGX, max 10 chars */
  currency: string;
  /** 1 invoice, 2 receipt, 3 debit note, 4 credit note — exact dictionary confirmed at UAT */
  invoiceType: string;
  /** Required when invoiceType = 4 */
  oriInvoiceId?: string;
  invoiceKind: string;
  /** 103 = System to System */
  dataSource: string;
  invoiceIndustryCode: string;
  payWay: string;
}

export interface EfrisBuyerDetails {
  buyerTin: string;
  buyerNinBrn: string;
  buyerPassportNum: string;
  buyerLegalName: string;
  buyerBusinessName: string;
  buyerAddress: string;
  buyerEmail: string;
  buyerMobilePhone: string;
  buyerLinePhone: string;
  buyerPlaceOfBusi: string;
  buyerType: string;
  buyerCitizenship: string;
  buyerSector: string;
  buyerReferenceNo: string;
}

export interface EfrisGoodsDetail {
  item: string;
  itemCode: string;
  qty: string;
  unitOfMeasure: string;
  unitPrice: string;
  total: string;
  taxRate: string;
  tax: string;
  discountTotal: string;
  discountTaxRate: string;
  /** 0 discount line, 1 discounted line, 2 normal line */
  discountFlag: '0' | '1' | '2';
  /** 1 deemed, 2 not deemed */
  deemedFlag: '1' | '2';
  /** 1 excise, 2 no excise */
  exciseFlag: '1' | '2';
  categoryId: string;
  categoryName: string;
  goodsCategoryId: string;
  goodsCategoryName: string;
  exciseRate: string;
  exciseRule: string;
  exciseTax: string;
  pack: string;
  stick: string;
  exciseUnit: string;
  exciseCurrency: string;
  exciseRateName: string;
  /** 101 = has piece unit, 102 = no */
  havePieceUnit: '101' | '102';
  pieceMeasureUnit: string;
  pieceScaledValue: string;
  packageScaledValue: string;
  remarks: string;
}

export interface EfrisTaxDetail {
  taxCategory: string;
  taxCategoryName: string;
  netAmount: string;
  taxRate: string;
  taxAmount: string;
  grossAmount: string;
  exciseUnit: string;
  exciseCurrency: string;
  taxRateName: string;
}

export interface EfrisSummary {
  netAmount: string;
  taxAmount: string;
  grossAmount: string;
  itemCount: string;
  /** 1 = server assigns invoice number */
  modeCode: '0' | '1';
  remarks: string;
  qrCode: string;
}

export interface EfrisSellerDetails {
  tin: string;
  ninBrn: string;
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

export interface EfrisInvoiceContent {
  basicInformation: EfrisBasicInformation;
  buyerDetails: EfrisBuyerDetails;
  goodsDetails: EfrisGoodsDetail[];
  taxDetails: EfrisTaxDetail[];
  summary: EfrisSummary;
  sellerDetails: EfrisSellerDetails;
  extend?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Common interface responses
// ---------------------------------------------------------------------------

export interface T101Response {
  currentTime: string; // dd/MM/yyyy HH:mm:ss
}

export interface T102Response {
  clientPriKey: string;
  serverPubKey: string;
  keyTable: string;
}

export interface T103DeviceInfo {
  deviceModel: string;
  deviceNo: string;
  deviceStatus: string;
  deviceType: string;
  validPeriod: string;
  offlineAmount: string;
  offlineDays: string;
  offlineValue: string;
}

export interface T103Response {
  device: T103DeviceInfo;
  taxpayer: Record<string, unknown>;
  taxpayerBranch: Record<string, unknown>;
  taxType: Array<{ taxTypeName: string; taxTypeCode: string; registrationDate: string; cancellationDate: string }>;
  dictionaryVersion: string;
  commodityCategoryVersion: string;
  exciseDutyVersion: string;
  taxpayerBranchVersion: string;
  whetherEnableServerStock: string;
  webServiceURL: string;
  environment: string;
}

export interface T104Response {
  /** Encrypted symmetric key (RSA-encrypted to client public key) */
  passowrdDes: string;
  /** Signature value used with the symmetric key */
  sign: string;
}

export interface T109Response {
  invoiceNo: string;
  antifakeCode: string;
  fiscalDocumentNumber?: string;
  qrCode?: string;
  verificationCode?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// KROWN internal domain models (NOT wire models)
// ---------------------------------------------------------------------------

export type EfrisIntegrationMode = 'online' | 'offline';
export type EfrisEnvironment = 'sandbox' | 'uat' | 'production';
export type EfrisConfigStatus =
  | 'not_configured'
  | 'awaiting_setup'
  | 'configured'
  | 'testing'
  | 'active'
  | 'suspended'
  | 'error';

export type FiscalStatus =
  | 'not_applicable'
  | 'pending'
  | 'queued'
  | 'preparing'
  | 'submitting'
  | 'submitted'
  | 'fiscalized'
  | 'rejected'
  | 'retrying'
  | 'unknown'
  | 'cancelled'
  | 'credit_pending'
  | 'credited'
  | 'debit_pending'
  | 'debited'
  | 'manual_review';

export type SubmissionStatus = 'not_started' | 'submitted' | 'accepted' | 'rejected' | 'unknown' | 'failed';

export type EfrisFailureCategory =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'SECURITY'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'EFRIS_REJECTION'
  | 'CONFIGURATION'
  | 'UNKNOWN';

export type EfrisTransactionType = 'invoice' | 'receipt' | 'debit_note' | 'credit_note' | 'z_report';

export type EfrisProductMappingStatus = 'mapped' | 'needs_mapping' | 'invalid' | 'ready' | 'syncing' | 'error';

export type EfrisTaxCategory = 'A' | 'B' | 'C' | 'D' | 'E';

export interface EfrisConfigurationSafe {
  id: string;
  organizationId: string;
  branchId: string | null;
  enabled: boolean;
  integrationMode: EfrisIntegrationMode;
  environment: EfrisEnvironment;
  status: EfrisConfigStatus;
  taxpayerTin: string | null;
  taxpayerName: string | null;
  businessRegistrationNumber: string | null;
  deviceNumber: string | null;
  deviceSerialNumber: string | null;
  offlineEnablerHost: string;
  offlineEnablerPort: number;
  offlineUpdaterPort: number;
  symmetricKeyRefreshedAt: string | null;
  lastSuccessfulCommunication: string | null;
  lastSynchronization: string | null;
  fiscalActivationAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EfrisTransactionRow {
  id: string;
  organizationId: string;
  branchId: string | null;
  orderId: string;
  paymentId: string | null;
  transactionType: EfrisTransactionType;
  interfaceCode: string;
  krownReference: string;
  dataExchangeId: string | null;
  fiscalStatus: FiscalStatus;
  submissionStatus: SubmissionStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  fiscalDocumentNumber: string | null;
  antifakeCode: string | null;
  verificationCode: string | null;
  qrCodeData: string | null;
  invoiceNo: string | null;
  grossAmount: number | null;
  taxAmount: number | null;
  netAmount: number | null;
  currency: string;
  operatorName: string | null;
  buyerTin: string | null;
  buyerName: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  redactedRequest: Record<string, unknown> | null;
  redactedResponse: Record<string, unknown> | null;
  creditNoteParentId: string | null;
  reason: string | null;
  reasonCode: string | null;
  createdAt: string;
  updatedAt: string;
}
