-- 20260927: push notifications, super-admin notifications, support chat upgrades,
-- annual billing, in-system calling, performance indexes.
-- All statements are additive / non-destructive.

-- ── 1. Web push subscriptions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id uuid NOT NULL,
  recipient_kind varchar(16) NOT NULL DEFAULT 'staff',
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent varchar(255),
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_push_sub_recipient ON push_subscriptions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_kind ON push_subscriptions(recipient_kind);

-- ── 2. Notifications: super admins are not staff rows ──────────────────────
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS emailed boolean DEFAULT false;

-- ── 3. Support messages: service writes organization/branch already ────────
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS branch_id uuid;
CREATE INDEX IF NOT EXISTS idx_support_messages_org ON support_messages(organization_id);

-- ── 4. Support conversations: bot state, human join, review, end-chat ──────
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS rating int;
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS review text;
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS human_joined boolean DEFAULT false;
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS bot_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS ended_by varchar(16);
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS ended_at timestamptz;
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS hidden_for_customer boolean DEFAULT false;
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS escalated_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_support_conv_escalated ON support_conversations(escalated_at) WHERE escalated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_conv_rating ON support_conversations(rating) WHERE rating IS NOT NULL;

-- ── 5. Annual billing ──────────────────────────────────────────────────────
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_price_ugx numeric(12,2) DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS billing_cycle varchar(16) DEFAULT 'annual';
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle varchar(16) DEFAULT 'annual';
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS renewal_notified_at timestamptz;
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS expired_notified_at timestamptz;
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS plan_name varchar(100);

-- ── 6. In-system calling (WebRTC signaling) ────────────────────────────────
CREATE TABLE IF NOT EXISTS call_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  caller_id uuid NOT NULL,
  caller_kind varchar(16) NOT NULL DEFAULT 'super_admin',
  callee_id uuid NOT NULL,
  callee_kind varchar(16) NOT NULL DEFAULT 'staff',
  organization_id uuid,
  status varchar(16) NOT NULL DEFAULT 'ringing',
  offer jsonb,
  answer jsonb,
  candidates jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_call_callee ON call_sessions(callee_id, status);
CREATE INDEX IF NOT EXISTS idx_call_caller ON call_sessions(caller_id, status);
CREATE INDEX IF NOT EXISTS idx_call_started ON call_sessions(started_at DESC);

-- ── 7. Performance indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_staff_org_created ON staff(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_org_created ON orders(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at DESC);
