# KROWN ERP — EFRIS System-to-System Integration

## Implementation TODO / Work Tracking

Legend: [ ] Not started · [~] In progress · [x] Completed · [!] Blocked

## Environment

- Working copy: `/home/intcode-ug/PROJECTS/OPEN-CODE/KROWN-restaurant-main` (DEVELOPMENT)
- [!] This working copy has NO `.git` repository. A `feature/efris-integration`
      branch could not be created. All work is done in the development working
      directory. Commits/branching must be re-established by the team (GitHub:
      intcodeug-prog/KROWN-restaurant).
- Database: Neon DEVELOPMENT branch (`ep-mute-sound-avth2hg7`, dev creds in .env).
  PRODUCTION IS READ-ONLY FOR THIS TASK — no production DB changes have been made.

## URA documentation (authoritative sources)

- Interface Design for EFRIS v24 → `/tmp/opencode/efris-docs/interface-design.txt`
- Offline-Mode Enabler Installation Guide v1 → `offline-guide.txt`
- Business Requirements v1 → `business-req.txt`
- System to System API V3 → `s2s-api.txt`

Key facts (see also `docs/efris/URA_REQUIREMENTS.md`): envelope AP04, online
AES+RSA, offline empty signature, T109 upload, T117 reconcile, tax A/B/C/D/E,
receipt FD no + antifake + QR + verification.

## PHASE 1 — Repository audit + architecture

[x] Auth/RBAC, orders, pay, print_jobs, products, feature flags, audit, URA docs
[x] Phase 1 complete.

## PHASE 2 — Database schema (DEVELOPMENT only)

[x] `db/migrations/20260922_efris_foundation.sql` applied to DEVELOPMENT
    (efris_configurations, efris_devices, efris_products, efris_transactions,
     efris_transaction_items, efris_submissions, efris_queue,
     efris_dictionary_versions, efris_events, efris_time_sync)

## PHASE 3 — Domain types + state machine

[x] `lib/efris/{types,constants,errors,state-machine}.ts`

## PHASE 4 — Mock EFRIS provider

[x] `lib/efris/adapters/mock.adapter.ts` + global scenario switch
    (`POST /api/efris/dev/scenario`)

## PHASE 5 — Security/envelope layer

[x] `lib/efris/{security,envelope}.ts`

## PHASE 6/7 — Online + Offline adapters

[x] `lib/efris/adapters/{online,offline}.ts` (live UTA credentials still blocked)

## PHASE 8 — EFRIS APIs/services

[x] All `lib/services/efris-*.service.ts` + `app/api/efris/*` with RBAC

## PHASE 9 — Restaurant Admin EFRIS Control Center

[x] `components/efris-control-center.tsx` wired in `components/admin.tsx`
    (Overview / Transactions / Products / Queue / Configuration / Diagnostics / Audit)

## PHASE 10 — Product fiscal mapping

[x] Within control center (`/api/efris/products`)

## PHASE 11 — Transaction explorer + queue + reconciliation

[x] Within control center + E2E failure path (timeout-after-submit → reconcile)

## PHASE 12 — POS payment integration

[x] `fiscalizePaidOrder` on pay/split; payment never rolls back on fiscal failure
[x] E2E happy path: pay → fiscalized, double-pay guard

## PHASE 13 — Receipt/Printing integration

[x] `lib/efris/receipt.ts` receipt-safe payload mapping
[x] `lib/printer.ts` EFRIS block (FDN, invoice, antifake, verify, QR, sandbox)
[x] Pay/split responses attach `efris` onto order for immediate print
    (`lib/dataStore-hardening.ts`)
[x] Reprint path: `GET /api/orders/[id]/fiscal` + manager receipts load + printTicket lazy load
[x] Cashier modern RBAC: `orders:split_pay`, `print_jobs:create`

## PHASE 14 — Super Admin diagnostics

[x] `restaurant-detail` API returns `efris` block (enabled/status/TIN/device/
    counts/recent — no secrets)
[x] `components/super-admin.tsx` EFRIS Fiscal Diagnostics panel in org detail

## PHASE 15 — Tests / docs / isolation

[x] Unit tests: envelope, validation, state machine, idempotency, error
    classification, retry decisions, crypto helpers (`lib/efris/__tests__/*`,
    vitest — `npm test`)
[x] Integration E2E: `/tmp/opencode/efris-e2e.mjs`, `efris-failure-e2e.mjs`
[x] Receipt fiscal load unit-mappable via `lib/efris/receipt.ts`
[x] Docs: `docs/efris/{ARCHITECTURE,API,URA_REQUIREMENTS,TODO}.md`
[~] Tenant isolation stress (Restaurant A vs B) — covered by org-scoped SQL +
    unique (org, order) index; formal dual-org E2E deferred (single dev org)
[x] lint + tsc + next build verification (run at end of session)

## PHASE 16 — Staging/UAT preparation

[!] UAT endpoints/credentials — see `docs/efris/URA_REQUIREMENTS.md`

## BLOCKERS (from URA)

[!] UAT endpoint + credentials (test TIN, test device, test certificates) — missing
[!] Production endpoint/credentials — missing (not needed for development)
[!] git repository in working copy — cannot create feature branch
