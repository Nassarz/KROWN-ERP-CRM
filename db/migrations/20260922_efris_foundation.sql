-- ============================================================================
-- KROWN ERP — EFRIS System-to-System Integration Foundation Schema
-- DEVELOPMENT ONLY migration.
-- DO NOT run against production.
--
-- Design principles:
--   * Tenant isolation: every table carries organization_id.
--   * Idempotency:    one fiscal invoice per paid order, enforced by a partial
--                     unique index; krown_reference unique per organization.
--   * Secrets:        encrypted at rest (AES-256-GCM); raw payloads are
--                     redacted before storage.
--   * Explicit fiscal state machine (never a boolean).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. efris_configurations — per-organization (optionally per-branch) config.
--    Secret material is encrypted; NEVER returned to browsers in plaintext.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS efris_configurations (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id               uuid NOT NULL REFERENCES organizations(id),
  branch_id                     uuid REFERENCES branches(id),
  enabled                       boolean NOT NULL DEFAULT false,
  integration_mode              text NOT NULL DEFAULT 'online'
                                CHECK (integration_mode IN ('online','offline')),
  environment                   text NOT NULL DEFAULT 'sandbox'
                                CHECK (environment IN ('sandbox','uat','production')),
  status                        text NOT NULL DEFAULT 'not_configured'
                                CHECK (status IN ('not_configured','awaiting_setup','configured','testing','active','suspended','error')),
  taxpayer_tin                  text,
  taxpayer_name                 text,
  business_registration_number  text,
  device_number                 text,
  device_serial_number          text,
  -- encrypted secrets (AES-256-GCM, base64). Never plaintext.
  encrypted_client_private_key  text,
  encrypted_key_table           text,
  encrypted_server_public_key   text,
  encrypted_symmetric_key       text,
  encrypted_symmetric_key_sign  text,
  symmetric_key_refreshed_at    timestamptz,
  -- offline enabler
  offline_enabler_host          text NOT NULL DEFAULT '127.0.0.1',
  offline_enabler_port          int  NOT NULL DEFAULT 9880,
  offline_updater_port          int  NOT NULL DEFAULT 9980,
  -- communication health
  last_successful_communication timestamptz,
  last_synchronization          timestamptz,
  fiscal_activation_at          timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT NOW(),
  updated_at                    timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_efris_config_org ON efris_configurations (organization_id);
CREATE INDEX IF NOT EXISTS idx_efris_config_status ON efris_configurations (status);

-- ---------------------------------------------------------------------------
-- 2. efris_devices — registered fiscal devices per organization.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS efris_devices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id),
  device_number         text NOT NULL,
  device_serial_number  text,
  device_type           text NOT NULL DEFAULT 'virtual',
  device_model          text,
  status                text NOT NULL DEFAULT 'pending_registration'
                        CHECK (status IN ('pending_registration','active','suspended','decommissioned')),
  encrypted_private_key text,
  encrypted_key_table   text,
  public_key_ref        text,
  valid_period          text,
  offline_amount        text,
  offline_days          text,
  offline_value         text,
  registered_at         timestamptz,
  created_at            timestamptz NOT NULL DEFAULT NOW(),
  updated_at            timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, device_number)
);

CREATE INDEX IF NOT EXISTS idx_efris_devices_org ON efris_devices (organization_id);

-- ---------------------------------------------------------------------------
-- 3. efris_transactions — the fiscal transaction core.
--    One row per KROWN fiscal document attempt per order/payment.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS efris_transactions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id),
  branch_id             uuid,
  order_id              uuid NOT NULL,
  payment_id            uuid,
  transaction_type      text NOT NULL DEFAULT 'receipt'
                        CHECK (transaction_type IN ('invoice','receipt','debit_note','credit_note','z_report')),
  interface_code        text NOT NULL DEFAULT 'T109',
  krown_reference       text NOT NULL,
  data_exchange_id      text,
  fiscal_status         text NOT NULL DEFAULT 'not_applicable'
                        CHECK (fiscal_status IN ('not_applicable','pending','queued','preparing','submitting','submitted','fiscalized','rejected','retrying','unknown','cancelled','credit_pending','credited','debit_pending','debited','manual_review')),
  submission_status     text NOT NULL DEFAULT 'pending'
                        CHECK (submission_status IN ('not_started','submitted','accepted','rejected','unknown','failed')),
  attempt_count         int  NOT NULL DEFAULT 0,
  last_attempt_at       timestamptz,
  next_retry_at         timestamptz,
  fiscal_document_number text,
  antifake_code         text,
  verification_code     text,
  qr_code_data          text,
  invoice_no            text,
  gross_amount          numeric(20,4),
  tax_amount            numeric(20,4),
  net_amount            numeric(20,4),
  currency              text NOT NULL DEFAULT 'UGX',
  operator_name         text,
  buyer_tin             text,
  buyer_name            text,
  error_code            text,
  error_message         text,
  redacted_request      jsonb,
  redacted_response     jsonb,
  credit_note_parent_id uuid REFERENCES efris_transactions(id),
  reason                text,
  reason_code           text,
  created_at            timestamptz NOT NULL DEFAULT NOW(),
  updated_at            timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_efris_krown_reference UNIQUE (organization_id, krown_reference)
);

-- Idempotency: exactly ONE fiscal invoice/receipt/debit-note per paid order.
CREATE UNIQUE INDEX IF NOT EXISTS uq_efris_invoice_per_order
  ON efris_transactions (organization_id, order_id)
  WHERE transaction_type IN ('invoice','receipt','debit_note');

CREATE INDEX IF NOT EXISTS idx_efris_tx_org_status ON efris_transactions (organization_id, fiscal_status);
CREATE INDEX IF NOT EXISTS idx_efris_tx_org_created ON efris_transactions (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_efris_tx_order ON efris_transactions (organization_id, order_id);

-- ---------------------------------------------------------------------------
-- 4. efris_transaction_items — fiscal line items.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS efris_transaction_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL,
  transaction_id      uuid NOT NULL REFERENCES efris_transactions(id) ON DELETE CASCADE,
  product_id          uuid,
  item_name           text NOT NULL,
  item_code           text,
  quantity            numeric(12,4) NOT NULL DEFAULT 1,
  unit_price          numeric(20,4) NOT NULL DEFAULT 0,
  total               numeric(20,4) NOT NULL DEFAULT 0,
  tax_rate            numeric(6,4)  NOT NULL DEFAULT 0,
  tax_amount          numeric(20,4) NOT NULL DEFAULT 0,
  tax_category        text NOT NULL DEFAULT 'A',
  discount_flag       text NOT NULL DEFAULT '2',
  deemed_flag         text NOT NULL DEFAULT '2',
  excise_flag         text NOT NULL DEFAULT '2',
  category_id         text,
  category_name       text,
  commodity_goods_id  text,
  goods_code          text,
  unit_of_measure     text NOT NULL DEFAULT '101',
  created_at          timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_efris_tx_items_tx ON efris_transaction_items (transaction_id);
CREATE INDEX IF NOT EXISTS idx_efris_tx_items_org ON efris_transaction_items (organization_id);

-- ---------------------------------------------------------------------------
-- 5. efris_submissions — one row per submission attempt (redacted payloads).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS efris_submissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL,
  transaction_id    uuid NOT NULL REFERENCES efris_transactions(id) ON DELETE CASCADE,
  attempt_number    int  NOT NULL,
  interface_code    text NOT NULL,
  data_exchange_id  text,
  status            text NOT NULL
                    CHECK (status IN ('submitted','succeeded','rejected','timeout','unknown','error')),
  failure_category  text
                    CHECK (failure_category IN ('VALIDATION','AUTHENTICATION','SECURITY','NETWORK','TIMEOUT','EFRIS_REJECTION','CONFIGURATION','UNKNOWN')),
  return_code       text,
  return_message    text,
  redacted_request  jsonb,
  redacted_response jsonb,
  duration_ms       int,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_efris_submissions_tx ON efris_submissions (transaction_id);
CREATE INDEX IF NOT EXISTS idx_efris_submissions_org ON efris_submissions (organization_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. efris_queue — durable queue with exponential backoff.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS efris_queue (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL,
  transaction_id    uuid REFERENCES efris_transactions(id) ON DELETE CASCADE,
  operation         text NOT NULL
                    CHECK (operation IN ('submit','reconcile','credit_note','debit_note','dictionary_sync','z_report')),
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','retrying','completed','failed','dead')),
  attempt_count     int  NOT NULL DEFAULT 0,
  last_attempt_at   timestamptz,
  next_attempt_at   timestamptz,
  last_error        text,
  failure_category  text
                    CHECK (failure_category IN ('VALIDATION','AUTHENTICATION','SECURITY','NETWORK','TIMEOUT','EFRIS_REJECTION','CONFIGURATION','UNKNOWN')),
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_efris_queue_due ON efris_queue (status, next_attempt_at)
  WHERE status IN ('pending','retrying');
CREATE INDEX IF NOT EXISTS idx_efris_queue_org ON efris_queue (organization_id);

-- ---------------------------------------------------------------------------
-- 7. efris_dictionary_versions — dictionary version tracking from T103.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS efris_dictionary_versions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid NOT NULL,
  dictionary_version          text,
  commodity_category_version  text,
  excise_duty_version         text,
  taxpayer_branch_version     text,
  created_at                  timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id)
);

-- ---------------------------------------------------------------------------
-- 8. efris_events — immutable event timeline per transaction.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS efris_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  transaction_id  uuid REFERENCES efris_transactions(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  fiscal_status   text,
  actor_id        text,
  actor_role      text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_efris_events_tx ON efris_events (transaction_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_efris_events_org ON efris_events (organization_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 9. efris_time_sync — T101 clock synchronization health.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS efris_time_sync (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  server_time     timestamptz NOT NULL,
  local_time      timestamptz NOT NULL,
  offset_ms       bigint NOT NULL,
  status          text NOT NULL DEFAULT 'ok'
                  CHECK (status IN ('ok','warning','error')),
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_efris_time_sync_org ON efris_time_sync (organization_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 10. efris_products — menu product fiscal mapping.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS efris_products (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL,
  product_id           uuid NOT NULL REFERENCES products(id),
  mapping_status       text NOT NULL DEFAULT 'needs_mapping'
                       CHECK (mapping_status IN ('mapped','needs_mapping','invalid','ready','syncing','error')),
  tax_category         text CHECK (tax_category IN ('A','B','C','D','E')),
  commodity_category_id text,
  commodity_goods_id   text,
  goods_code           text,
  category_name        text,
  unit_of_measure      text,
  last_sync_at         timestamptz,
  last_error           text,
  created_at           timestamptz NOT NULL DEFAULT NOW(),
  updated_at           timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_efris_products_org ON efris_products (organization_id, mapping_status);

-- ---------------------------------------------------------------------------
-- Feature flag: EFRIS is OFF globally until explicitly enabled.
-- ---------------------------------------------------------------------------
INSERT INTO feature_flags (id, key, name, description, scope, enabled, allowed_plans, allowed_orgs, created_at, updated_at)
SELECT gen_random_uuid(), 'efris', 'EFRIS Fiscalization',
       'Uganda Revenue Authority e-invoicing/e-receipting (System-to-System).',
       'global', false, NULL, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE key = 'efris');

COMMIT;
