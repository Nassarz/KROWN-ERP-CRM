// ============================================================================
// KROWN ERP — EFRIS constants
// Values sourced from the official URA "Interface Design for EFRIS v24",
// "How to use the System to System API V3" and the Offline Enabler guide.
// Items needing UAT confirmation are marked [CONFIRM-AT-UAT].
// ============================================================================

/** AP04 = system to system (AP01 taxpayer system, AP05 AskURA) */
export const EFRIS_APP_ID = 'AP04' as const;

/** Requester code TP (taxpayer), responder code TA (URA) */
export const EFRIS_REQUEST_CODE = 'TP' as const;
export const EFRIS_RESPONSE_CODE = 'TA' as const;

/** Default client software version — must match an approved version at UAT */
export const EFRIS_CLIENT_VERSION = '1.1.20191201' as const;

/** Device MAC placeholder used in official examples */
export const EFRIS_DEVICE_MAC = 'FFFFFFFFFFFF' as const;

/** taxpayerID usually set to 1 */
export const EFRIS_TAXPAYER_ID = '1' as const;

/** Server time tolerance between client and URA server (±10 minutes per docs) */
export const EFRIS_MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;

/** AES symmetric key validity window per T104 docs */
export const EFRIS_SYMMETRIC_KEY_TTL_MS = 24 * 60 * 60 * 1000;

/** dataDescription flags */
export const CODE_TYPE_PLAIN = '0' as const;
export const CODE_TYPE_CIPHERTEXT = '1' as const;
export const ENCRYPT_CODE_RSA = '1' as const;
export const ENCRYPT_CODE_AES = '2' as const;
export const ZIP_CODE_UNCOMPRESSED = '0' as const;
export const ZIP_CODE_COMPRESSED = '1' as const;

/**
 * dataSource code: 103 = System-to-System. [CONFIRM-AT-UAT]
 */
export const DATA_SOURCE_S2S = '103' as const;

/**
 * invoiceKind / invoiceType dictionary values. The Interface Design v24
 * validation rules reference invoiceType 1..4 (4 = credit note requires
 * oriInvoiceId). Exact meanings confirmed at UAT. [CONFIRM-AT-UAT]
 */
export const INVOICE_TYPE_RECEIPT = '2' as const;
export const INVOICE_TYPE_INVOICE = '1' as const;
export const INVOICE_TYPE_DEBIT_NOTE = '3' as const;
export const INVOICE_TYPE_CREDIT_NOTE = '4' as const;

/** invoiceIndustryCode 101 = general. [CONFIRM-AT-UAT] */
export const INVOICE_INDUSTRY_CODE_GENERAL = '101' as const;

/**
 * summary.modeCode: 1 = server assigns the invoice number
 * (invoiceNo/antifakeCode must be empty in the request).
 */
export const MODE_CODE_SERVER_INVOICE = '1' as const;

/** discountFlag values: 0 discount line, 1 discounted line, 2 normal line */
export const DISCOUNT_FLAG_LINE = '0' as const;
export const DISCOUNT_FLAG_DISCOUNTED = '1' as const;
export const DISCOUNT_FLAG_NORMAL = '2' as const;

/** deemedFlag: 1 deemed, 2 not deemed */
export const DEEMED_FLAG_YES = '1' as const;
export const DEEMED_FLAG_NO = '2' as const;

/** exciseFlag: 1 excise, 2 no excise */
export const EXCISE_FLAG_YES = '1' as const;
export const EXCISE_FLAG_NO = '2' as const;

/** havePieceUnit: 101 has piece unit, 102 no */
export const HAVE_PIECE_UNIT_YES = '101' as const;
export const HAVE_PIECE_UNIT_NO = '102' as const;

/** unitOfMeasure default: 101 = piece. [CONFIRM-AT-UAT dictionary value] */
export const UNIT_OF_MEASURE_PIECE = '101' as const;

/** KROWN VAT rate used across the existing order engine */
export const KROWN_VAT_RATE = 0.18;
export const KROWN_VAT_RATE_STRING = '18';

/**
 * Tax categories from the Business Requirements:
 * A standard 18%, B zero, C exempt, D deemed 18%, E excise duty.
 */
export const TAX_CATEGORY_STANDARD = 'A' as const;
export const TAX_CATEGORY_ZERO = 'B' as const;
export const TAX_CATEGORY_EXEMPT = 'C' as const;
export const TAX_CATEGORY_DEEMED = 'D' as const;
export const TAX_CATEGORY_EXCISE = 'E' as const;

/**
 * Offline Mode Enabler defaults (Installation Guide v1).
 * One enabler server is associated with ONE taxpayer/TIN.
 * Port 9880 = tax control service, 9980 = updater service.
 * [CONFIGURABLE per installation]
 */
export const OFFLINE_ENABLER_DEFAULT_HOST = '127.0.0.1';
export const OFFLINE_ENABLER_DEFAULT_PORT = 9880;
export const OFFLINE_UPDATER_DEFAULT_PORT = 9980;
export const OFFLINE_ENABLER_HEALTH_PATH = '/efristcs';
export const OFFLINE_ENABLER_API_PATH = '/efristcs/ws/tcsapp/getInformation';

/**
 * URA endpoints [CONFIRM-AT-UAT]:
 * The Interface Design v24 references https://api.ura.go.ug/efris/1.0/ for
 * production and https://efristest.ura.go.ug for the test portal. Exact
 * per-interface URL paths are confirmed during UAT onboarding.
 */
export const EFRIS_PRODUCTION_BASE_URL = 'https://api.ura.go.ug/efris/1.0/';
export const EFRIS_TEST_PORTAL_URL = 'https://efristest.ura.go.ug/efrissite';

/** Return codes */
export const RETURN_CODE_SUCCESS = '00';
export const RETURN_CODE_ERROR = '99';

/** Queue backoff */
export const QUEUE_MAX_ATTEMPTS = 8;
export const QUEUE_BASE_RETRY_DELAY_MS = 2_000;
export const QUEUE_MAX_RETRY_DELAY_MS = 30 * 60 * 1000; // 30 min cap
export const QUEUE_RETRY_JITTER_MS = 500;

/** Idempotency: krown_reference format prefix */
export const EFRIS_REFERENCE_PREFIX = 'KRN';
