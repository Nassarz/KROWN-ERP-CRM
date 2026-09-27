# EFRIS System-to-System — Architecture (KROWN ERP)

## Overview

KROWN implements Uganda Revenue Authority (URA) EFRIS as a **system-to-system (AP04)**
fiscalization layer that runs **after** a successful payment, never before, and never
rolls back a paid order.

```
Cashier pays order
       │
       ▼
 POST /api/orders/[id]/pay
       │
       ├─ payOrder()  → orders.payment_status = paid   (committed)
       │
       └─ fiscalizePaidOrder()  (best-effort, after commit)
              │
              ├─ skip if EFRIS disabled / not configured
              ├─ idempotent: one fiscal tx per paid order (unique index)
              ├─ create efris_transactions (pending)
              ├─ adapter.submitReceipt()  T109 envelope
              │     sandbox → Mock adapter (SIM-* documents)
              │     uat/production → Online AES+RSA or Offline enabler
              └─ update fiscal_status → fiscalized | rejected | unknown
                        │
                        ├─ fiscalized → FDN, invoiceNo, antifake, QR on receipt
                        ├─ rejected   → queue/manual_review (order stays paid)
                        └─ unknown    → reconcile (T117), NEVER blind resubmit
```

## Modules

| Path | Responsibility |
|------|----------------|
| `lib/efris/types.ts` | Wire protocol + domain types (T109 content, envelope, transaction row) |
| `lib/efris/constants.ts` | Interface codes, tax categories, prefixes |
| `lib/efris/errors.ts` | `EfrisError` + failure classification (TIMEOUT/NETWORK/REJECTION/…) |
| `lib/efris/state-machine.ts` | Allowed `fiscal_status` transitions |
| `lib/efris/security.ts` | AES/RSA/base64, redaction of secrets in logs |
| `lib/efris/envelope.ts` | Outer envelope build/parse, signature of encrypted content |
| `lib/efris/mapper.ts` | Order → T109 inner JSON (seller/buyer/goods/tax/summary) |
| `lib/efris/client.ts` | Adapter resolution (mock/online/offline) by config |
| `lib/efris/adapters/*` | Mock (sandbox scenarios), Online, Offline (127.0.0.1:9880) |
| `lib/efris/receipt.ts` | Receipt-safe fiscal payload (no secrets) |
| `lib/services/efris-*.service.ts` | Config, transactions, submit, reconcile, products, time, POS hook |
| `app/api/efris/*` | Restaurant Admin Control Center APIs (RBAC `efris:*`) |
| `app/api/orders/[id]/pay\|split` | Payment + fiscalization hooks |
| `app/api/orders/[id]/fiscal` | Receipt reprint fiscal data (orders:view) |
| `components/efris-control-center.tsx` | Overview / Transactions / Products / Queue / Config / Diagnostics / Audit |
| `app/api/super-admin/restaurant-detail` | Platform diagnostics (no secrets) |

## Payment never rolls back

`fiscalizePaidOrder` catches all errors, logs `EFRIS_POS_FISCALIZATION_ERROR`, and
returns `cashierMessage: 'attention'` while `orders` remains `paid`.

## Idempotency

Unique partial index: one `invoice`/`receipt`/`debit_note` per
`(organization_id, order_id)`. Replay returns the existing transaction.

## Unknown outcomes

Adapter timeout **after** submit → `fiscal_status = 'unknown'` + reconcile queue.
Reconciliation (T117) looks up by KROWN reference; only then promotes to
`fiscalized` or `rejected`.

## Receipt

`lib/printer.ts` appends an EFRIS block on paid customer/split receipts when
`order.efris` (from pay response) or `GET /api/orders/[id]/fiscal` (reprint)
provides FDN, invoice no, antifake, verify code, QR payload, device/TIN, sandbox
marker.

## Environment / adapters

| environment | adapter |
|-------------|---------|
| `sandbox` | Mock (deterministic scenarios; set via `POST /api/efris/dev/scenario`) |
| `uat` / `production` + mode `online` | Online (AES+RSA, T104 keys) |
| `uat` / `production` + mode `offline` | Offline enabler HTTP |

**Blocked for live URA:** UAT endpoint, test TIN/device, certificates — see
`URA_REQUIREMENTS.md`.

## Security

- Secrets encrypted at rest (`lib/efris/security.ts`), never returned by APIs.
- All queries scoped by `organization_id`.
- Super admin diagnostics expose TIN/device/status only — no keys.
- Redacted request/response snapshots stored in `efris_submissions` for audit.
