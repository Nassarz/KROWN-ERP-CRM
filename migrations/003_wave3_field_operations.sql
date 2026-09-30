-- KROWN ERP-CRM - Phase 2 Wave 3 Migration
-- Field Sales, Van Sales, Orders, Bookings, Collections, Returns, Field Expenses & Route Sessions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROUTE SESSIONS
CREATE TABLE IF NOT EXISTS route_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  sales_agent_id UUID NOT NULL REFERENCES sales_agents(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  business_date DATE DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  opening_cash_float NUMERIC(15,2) DEFAULT 0,
  closing_cash_submitted NUMERIC(15,2) DEFAULT 0,
  closing_stock_variance_ugx NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'started', -- scheduled, ready, started, paused, returned, reconciling, closed
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CUSTOMER VISITS
CREATE TABLE IF NOT EXISTS customer_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  route_session_id UUID NOT NULL REFERENCES route_sessions(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_location_id UUID REFERENCES customer_locations(id) ON DELETE SET NULL,
  agent_id UUID NOT NULL REFERENCES sales_agents(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  visit_outcome VARCHAR(50) DEFAULT 'sale', -- sale, order, booking, collection, return, no_sale, skipped
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VAN SALES & LINES
CREATE TABLE IF NOT EXISTS van_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  sale_number VARCHAR(100) NOT NULL UNIQUE,
  operation_id VARCHAR(100) UNIQUE,
  route_session_id UUID REFERENCES route_sessions(id) ON DELETE SET NULL,
  sales_agent_id UUID NOT NULL REFERENCES sales_agents(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_location_id UUID REFERENCES customer_locations(id) ON DELETE SET NULL,
  sale_type VARCHAR(20) DEFAULT 'cash', -- cash, credit, mixed
  subtotal_ugx NUMERIC(15,2) DEFAULT 0,
  discount_ugx NUMERIC(15,2) DEFAULT 0,
  tax_ugx NUMERIC(15,2) DEFAULT 0,
  total_ugx NUMERIC(15,2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'paid', -- paid, partial, pending_credit, overdue
  approval_status VARCHAR(20) DEFAULT 'approved', -- approved, pending_approval, rejected
  status VARCHAR(20) DEFAULT 'completed', -- completed, voided, cancelled
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS van_sale_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  sale_id UUID NOT NULL REFERENCES van_sales(id) ON DELETE CASCADE,
  commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  commodity_code VARCHAR(100),
  commodity_name VARCHAR(255),
  unit_name VARCHAR(50) DEFAULT 'Carton',
  pack_size NUMERIC(10,2) DEFAULT 1,
  quantity NUMERIC(15,2) NOT NULL,
  base_quantity NUMERIC(15,4) NOT NULL,
  unit_price_ugx NUMERIC(15,2) NOT NULL,
  discount_ugx NUMERIC(15,2) DEFAULT 0,
  tax_ugx NUMERIC(15,2) DEFAULT 0,
  line_total_ugx NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FINANCIAL RECEIVABLES & RECEIPTS
CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  receivable_number VARCHAR(100) NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  origin_type VARCHAR(50) DEFAULT 'van_sale', -- van_sale, sales_order, invoice
  origin_id UUID,
  origin_number VARCHAR(100),
  sales_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  route_session_id UUID REFERENCES route_sessions(id) ON DELETE SET NULL,
  original_amount_ugx NUMERIC(15,2) NOT NULL,
  paid_amount_ugx NUMERIC(15,2) DEFAULT 0,
  balance_ugx NUMERIC(15,2) NOT NULL,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'open', -- open, partial, paid, written_off
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  receipt_number VARCHAR(100) NOT NULL UNIQUE,
  operation_id VARCHAR(100) UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sales_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  route_session_id UUID REFERENCES route_sessions(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  amount_ugx NUMERIC(15,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'cash', -- cash, mobile_money, bank_transfer, cheque
  payment_reference VARCHAR(100),
  verification_status VARCHAR(30) DEFAULT 'verified', -- verified, pending, unverified
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipt_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  receipt_id UUID NOT NULL REFERENCES financial_receipts(id) ON DELETE CASCADE,
  receivable_id UUID REFERENCES receivables(id) ON DELETE SET NULL,
  allocated_amount_ugx NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BOOKINGS & ORDERS
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  booking_number VARCHAR(100) NOT NULL UNIQUE,
  operation_id VARCHAR(100) UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_location_id UUID REFERENCES customer_locations(id) ON DELETE SET NULL,
  sales_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  route_session_id UUID REFERENCES route_sessions(id) ON DELETE SET NULL,
  commodity_id UUID REFERENCES commodities(id) ON DELETE SET NULL,
  commodity_name VARCHAR(255),
  unit_name VARCHAR(50) DEFAULT 'Carton',
  quantity NUMERIC(15,2) NOT NULL,
  estimated_value_ugx NUMERIC(15,2) DEFAULT 0,
  requested_date DATE,
  expected_delivery_date DATE,
  priority VARCHAR(20) DEFAULT 'normal',
  notes TEXT,
  status VARCHAR(20) DEFAULT 'confirmed', -- draft, confirmed, converted, fulfilled, cancelled
  converted_order_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  order_number VARCHAR(100) NOT NULL UNIQUE,
  operation_id VARCHAR(100) UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sales_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  route_session_id UUID REFERENCES route_sessions(id) ON DELETE SET NULL,
  total_ugx NUMERIC(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, delivered, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  commodity_name VARCHAR(255),
  unit_name VARCHAR(50) DEFAULT 'Carton',
  quantity NUMERIC(15,2) NOT NULL,
  unit_price_ugx NUMERIC(15,2) NOT NULL,
  line_total_ugx NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CUSTOMER RETURNS
CREATE TABLE IF NOT EXISTS customer_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  return_number VARCHAR(100) NOT NULL UNIQUE,
  operation_id VARCHAR(100) UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sales_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  route_session_id UUID REFERENCES route_sessions(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  original_sale_number VARCHAR(100),
  reason_code VARCHAR(100) DEFAULT 'Damaged', -- Damaged, Expired, Customer Rejection, Quality, Wrong Product
  disposition VARCHAR(50) DEFAULT 'truck_quarantine', -- truck_sellable, truck_quarantine, warehouse_return, damaged
  total_value_ugx NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_return_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  return_id UUID NOT NULL REFERENCES customer_returns(id) ON DELETE CASCADE,
  commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  commodity_name VARCHAR(255),
  unit_name VARCHAR(50) DEFAULT 'Carton',
  pack_size NUMERIC(10,2) DEFAULT 1,
  quantity NUMERIC(15,2) NOT NULL,
  base_quantity NUMERIC(15,4) NOT NULL,
  unit_price_ugx NUMERIC(15,2) NOT NULL,
  line_total_ugx NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. FIELD EXPENSES
CREATE TABLE IF NOT EXISTS field_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  expense_number VARCHAR(100) NOT NULL UNIQUE,
  operation_id VARCHAR(100) UNIQUE,
  route_session_id UUID REFERENCES route_sessions(id) ON DELETE SET NULL,
  sales_agent_id UUID NOT NULL REFERENCES sales_agents(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  category VARCHAR(50) DEFAULT 'Fuel', -- Fuel, Parking, Toll, Meals, Vehicle Repair, Loading, Communication
  amount_ugx NUMERIC(15,2) NOT NULL,
  description TEXT,
  receipt_image_url TEXT,
  approval_status VARCHAR(20) DEFAULT 'approved', -- draft, submitted, approved, rejected
  reduces_cash_expectation BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SEQUENCES FOR FIELD TRANSACTIONS
CREATE TABLE IF NOT EXISTS van_sale_sequences (tenant_id UUID PRIMARY KEY, last_value BIGINT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS receipt_sequences (tenant_id UUID PRIMARY KEY, last_value BIGINT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS booking_sequences (tenant_id UUID PRIMARY KEY, last_value BIGINT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS return_sequences (tenant_id UUID PRIMARY KEY, last_value BIGINT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS expense_sequences (tenant_id UUID PRIMARY KEY, last_value BIGINT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_route_sessions_agent ON route_sessions(sales_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_van_sales_session ON van_sales(route_session_id);
CREATE INDEX IF NOT EXISTS idx_van_sales_customer ON van_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_receivables_customer ON receivables(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_financial_receipts_agent ON financial_receipts(sales_agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_field_expenses_session ON field_expenses(route_session_id);
