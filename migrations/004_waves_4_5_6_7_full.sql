-- KROWN ERP-CRM - Phase 2 Waves 4, 5, 6 & 7 Master Migration
-- Evening Reconciliation, Finance Settlement, Budgets, Requisitions, Tax, Performance & Vouchers

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. WAVE 4: EVENING AGENT RECONCILIATION & SETTLEMENTS ─────────────────────
CREATE TABLE IF NOT EXISTS agent_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  settlement_number VARCHAR(100) NOT NULL UNIQUE,
  route_session_id UUID NOT NULL REFERENCES route_sessions(id) ON DELETE CASCADE,
  sales_agent_id UUID NOT NULL REFERENCES sales_agents(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  business_date DATE DEFAULT CURRENT_DATE,
  
  -- Derived Financial Expectations
  opening_cash_float NUMERIC(15,2) DEFAULT 0,
  derived_cash_sales NUMERIC(15,2) DEFAULT 0,
  derived_credit_sales NUMERIC(15,2) DEFAULT 0,
  derived_cash_collections NUMERIC(15,2) DEFAULT 0,
  derived_digital_collections NUMERIC(15,2) DEFAULT 0,
  derived_approved_expenses NUMERIC(15,2) DEFAULT 0,
  derived_returns_value NUMERIC(15,2) DEFAULT 0,
  expected_cash_submit NUMERIC(15,2) DEFAULT 0,
  
  -- Actual Physical Counts & Variances
  actual_cash_submitted NUMERIC(15,2) DEFAULT 0,
  cash_variance_ugx NUMERIC(15,2) DEFAULT 0,
  cash_denomination_json JSONB,
  
  -- Derived & Physical Stock Counts
  derived_stock_expected_units NUMERIC(15,4) DEFAULT 0,
  actual_stock_counted_units NUMERIC(15,4) DEFAULT 0,
  stock_variance_units NUMERIC(15,4) DEFAULT 0,
  stock_variance_value_ugx NUMERIC(15,2) DEFAULT 0,
  variance_reason_code VARCHAR(100),
  variance_notes TEXT,
  
  -- Approvals & Sign-off
  status VARCHAR(30) DEFAULT 'reconciling', -- reconciling, pending_approval, approved, closed, rejected
  agent_signed_at TIMESTAMPTZ,
  supervisor_signed_at TIMESTAMPTZ,
  approved_by VARCHAR(255),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. WAVE 5: CANONICAL SUPPLIER PAYABLES & PAYOUTS ─────────────────────────
CREATE TABLE IF NOT EXISTS supplier_payables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  payable_number VARCHAR(100) NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  purchase_order_id UUID,
  origin_number VARCHAR(100),
  bill_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  original_amount_ugx NUMERIC(15,2) NOT NULL,
  paid_amount_ugx NUMERIC(15,2) DEFAULT 0,
  balance_ugx NUMERIC(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'open', -- open, partial, paid, overdue
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  payout_number VARCHAR(100) NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  payable_id UUID REFERENCES supplier_payables(id) ON DELETE SET NULL,
  amount_ugx NUMERIC(15,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'bank_transfer', -- cash, bank_transfer, mobile_money, cheque
  payment_reference VARCHAR(100),
  bank_account_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'approved', -- draft, pending_approval, approved, paid, cancelled
  approved_by VARCHAR(255),
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. WAVE 5: UNDEPOSITED FUNDS & DEPOSIT BATCHES ────────────────────────────
CREATE TABLE IF NOT EXISTS deposit_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  batch_number VARCHAR(100) NOT NULL UNIQUE,
  deposit_date DATE DEFAULT CURRENT_DATE,
  target_bank_account VARCHAR(255) NOT NULL,
  total_cash_ugx NUMERIC(15,2) DEFAULT 0,
  total_digital_ugx NUMERIC(15,2) DEFAULT 0,
  grand_total_ugx NUMERIC(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'deposited', -- pending, deposited, reconciled
  deposited_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deposit_batch_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  deposit_batch_id UUID NOT NULL REFERENCES deposit_batches(id) ON DELETE CASCADE,
  agent_settlement_id UUID REFERENCES agent_settlements(id) ON DELETE SET NULL,
  financial_receipt_id UUID REFERENCES financial_receipts(id) ON DELETE SET NULL,
  amount_ugx NUMERIC(15,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'cash',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. WAVE 5: BANK RECONCILIATION ENGINE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  bank_account_name VARCHAR(255) NOT NULL,
  statement_date DATE DEFAULT CURRENT_DATE,
  opening_balance_ugx NUMERIC(15,2) DEFAULT 0,
  closing_balance_ugx NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'reconciled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference VARCHAR(100),
  amount_ugx NUMERIC(15,2) NOT NULL, -- positive for credit/deposit, negative for debit/payout
  is_reconciled BOOLEAN DEFAULT false,
  matched_type VARCHAR(50), -- deposit_batch, supplier_payout, field_expense
  matched_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. WAVE 6: BUDGETS, REQUISITIONS & WITHDRAWALS ────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  budget_name VARCHAR(255) NOT NULL,
  period_year INTEGER NOT NULL,
  period_quarter INTEGER DEFAULT 1,
  total_allocated_ugx NUMERIC(15,2) NOT NULL,
  total_spent_ugx NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category_name VARCHAR(255) NOT NULL, -- Fuel, Logistics, Marketing, Repairs, Staff
  allocated_ugx NUMERIC(15,2) NOT NULL,
  committed_ugx NUMERIC(15,2) DEFAULT 0,
  spent_ugx NUMERIC(15,2) DEFAULT 0,
  available_ugx NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  requisition_number VARCHAR(100) NOT NULL UNIQUE,
  budget_line_id UUID NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE,
  requested_by VARCHAR(255) NOT NULL,
  purpose TEXT NOT NULL,
  amount_ugx NUMERIC(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'approved', -- draft, submitted, approved, disbursed, rejected
  approved_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  withdrawal_number VARCHAR(100) NOT NULL UNIQUE,
  requisition_id UUID REFERENCES budget_requisitions(id) ON DELETE SET NULL,
  account_name VARCHAR(255) NOT NULL,
  beneficiary VARCHAR(255) NOT NULL,
  amount_ugx NUMERIC(15,2) NOT NULL,
  purpose TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_obligations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  tax_name VARCHAR(100) NOT NULL, -- VAT, PAYE, WHT, Local Service Tax
  period_name VARCHAR(50) NOT NULL, -- e.g. Sep 2026
  calculated_liability_ugx NUMERIC(15,2) NOT NULL,
  paid_amount_ugx NUMERIC(15,2) DEFAULT 0,
  outstanding_ugx NUMERIC(15,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'due', -- due, paid, overdue
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. WAVE 7: SALES TARGETS & COMMISSIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  sales_agent_id UUID NOT NULL REFERENCES sales_agents(id) ON DELETE CASCADE,
  period_month VARCHAR(20) NOT NULL, -- e.g. 2026-09
  target_revenue_ugx NUMERIC(15,2) NOT NULL,
  achieved_revenue_ugx NUMERIC(15,2) DEFAULT 0,
  target_collections_ugx NUMERIC(15,2) DEFAULT 0,
  achieved_collections_ugx NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  sales_agent_id UUID NOT NULL REFERENCES sales_agents(id) ON DELETE CASCADE,
  route_session_id UUID REFERENCES route_sessions(id) ON DELETE SET NULL,
  van_sale_id UUID REFERENCES van_sales(id) ON DELETE SET NULL,
  commission_rate_pct NUMERIC(5,2) NOT NULL,
  sale_amount_ugx NUMERIC(15,2) NOT NULL,
  commission_earned_ugx NUMERIC(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'earned', -- projected, earned, approved, paid
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. WAVE 7: PACKAGES & SALES VOUCHERS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  package_code VARCHAR(100) NOT NULL UNIQUE,
  package_name VARCHAR(255) NOT NULL,
  description TEXT,
  package_price_ugx NUMERIC(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  quantity_in_pack NUMERIC(10,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  voucher_code VARCHAR(100) NOT NULL UNIQUE,
  voucher_type VARCHAR(50) DEFAULT 'fixed_discount', -- fixed_discount, pct_discount, credit
  amount_or_pct NUMERIC(15,2) NOT NULL,
  max_discount_ugx NUMERIC(15,2),
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  usage_limit INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  voucher_id UUID NOT NULL REFERENCES sales_vouchers(id) ON DELETE CASCADE,
  van_sale_id UUID REFERENCES van_sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  discount_applied_ugx NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. SEQUENCES FOR MASTER DOCUMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlement_sequences (tenant_id UUID PRIMARY KEY, last_value BIGINT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS payable_sequences (tenant_id UUID PRIMARY KEY, last_value BIGINT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS payout_sequences (tenant_id UUID PRIMARY KEY, last_value BIGINT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS deposit_sequences (tenant_id UUID PRIMARY KEY, last_value BIGINT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS requisition_sequences (tenant_id UUID PRIMARY KEY, last_value BIGINT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS withdrawal_sequences (tenant_id UUID PRIMARY KEY, last_value BIGINT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_settlements_session ON agent_settlements(route_session_id);
CREATE INDEX IF NOT EXISTS idx_payables_supplier ON supplier_payables(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_deposit_items ON deposit_batch_items(deposit_batch_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions ON agent_commissions(sales_agent_id);
