-- KROWN ERP-CRM - Phase 2 Wave 1 & Wave 2 Full Production Migration
-- Commodities, Customers, Suppliers, Warehouses, Vehicles, Agents, Routes, Devices, Stock Locations, Stock Ledger, Stock Transfers

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMMODITIES
CREATE TABLE IF NOT EXISTS commodities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  code VARCHAR(100) NOT NULL,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name VARCHAR(255),
  brand VARCHAR(255),
  variant VARCHAR(255),
  base_unit VARCHAR(50) DEFAULT 'Unit',
  selling_unit VARCHAR(50) DEFAULT 'Carton',
  purchase_unit VARCHAR(50) DEFAULT 'Pallet',
  pack_size NUMERIC(10,2) DEFAULT 1,
  carton_size NUMERIC(10,2) DEFAULT 24,
  weight_kg NUMERIC(10,3) DEFAULT 0,
  volume_cbm NUMERIC(10,4) DEFAULT 0,
  cost_price_ugx NUMERIC(15,2) DEFAULT 0,
  selling_price_ugx NUMERIC(15,2) DEFAULT 0,
  wholesale_price_ugx NUMERIC(15,2) DEFAULT 0,
  distributor_price_ugx NUMERIC(15,2) DEFAULT 0,
  tax_category VARCHAR(50) DEFAULT 'standard',
  supplier_id UUID,
  supplier_name VARCHAR(255),
  min_stock NUMERIC(12,2) DEFAULT 0,
  max_stock NUMERIC(12,2) DEFAULT 1000,
  reorder_level NUMERIC(12,2) DEFAULT 100,
  has_batch_tracking BOOLEAN DEFAULT false,
  has_expiry_tracking BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE commodities ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE commodities ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE commodities ADD COLUMN IF NOT EXISTS branch_id UUID;

-- 2. COMMODITY UNITS
CREATE TABLE IF NOT EXISTS commodity_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  unit_name VARCHAR(50) NOT NULL,
  multiplier_to_base NUMERIC(10,2) NOT NULL DEFAULT 1,
  barcode VARCHAR(100),
  selling_price_ugx NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE commodity_units ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 3. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  code VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  customer_type VARCHAR(50) DEFAULT 'retailer',
  customer_group VARCHAR(100) DEFAULT 'Standard',
  tax_id VARCHAR(100),
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  credit_limit_ugx NUMERIC(15,2) DEFAULT 0,
  credit_days INTEGER DEFAULT 30,
  outstanding_balance_ugx NUMERIC(15,2) DEFAULT 0,
  available_credit_ugx NUMERIC(15,2) DEFAULT 0,
  assigned_agent_id UUID,
  default_route_id UUID,
  price_list_id UUID,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch_id UUID;

-- 4. CUSTOMER LOCATIONS
CREATE TABLE IF NOT EXISTS customer_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_name VARCHAR(255) NOT NULL,
  address TEXT,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  route_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customer_locations ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 5. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  code VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  tax_id VARCHAR(100),
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  payment_terms_days INTEGER DEFAULT 30,
  credit_limit_ugx NUMERIC(15,2) DEFAULT 0,
  current_payable_ugx NUMERIC(15,2) DEFAULT 0,
  performance_rating NUMERIC(3,2) DEFAULT 4.5,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_id UUID;

-- 6. WAREHOUSES & STOCK LOCATIONS
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  code VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'main',
  address TEXT,
  manager_name VARCHAR(255),
  capacity_sqm NUMERIC(10,2) DEFAULT 500,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS company_id UUID;

CREATE TABLE IF NOT EXISTS stock_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  vehicle_id UUID,
  code VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'sellable',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS company_id UUID;

-- 7. VEHICLES / FLEET
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  registration_number VARCHAR(100) NOT NULL,
  make VARCHAR(100),
  model VARCHAR(100),
  vehicle_type VARCHAR(50) DEFAULT 'truck',
  volume_capacity_cbm NUMERIC(10,2) DEFAULT 10,
  weight_capacity_kg NUMERIC(10,2) DEFAULT 3000,
  assigned_driver_id UUID,
  assigned_driver_name VARCHAR(255),
  assigned_agent_id UUID,
  assigned_agent_name VARCHAR(255),
  current_mileage INTEGER DEFAULT 0,
  fuel_level VARCHAR(20) DEFAULT 'full',
  stock_location_id UUID REFERENCES stock_locations(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS company_id UUID;

-- 8. SALES AGENTS
CREATE TABLE IF NOT EXISTS sales_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  agent_code VARCHAR(100),
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  territory_id UUID,
  territory_name VARCHAR(255),
  assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  assigned_vehicle_reg VARCHAR(100),
  assigned_device_id UUID,
  supervisor_id UUID,
  supervisor_name VARCHAR(255),
  cash_limit_ugx NUMERIC(15,2) DEFAULT 5000000,
  can_give_credit BOOLEAN DEFAULT false,
  max_discount_pct NUMERIC(5,2) DEFAULT 5,
  commission_plan_id UUID,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sales_agents ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE sales_agents ADD COLUMN IF NOT EXISTS company_id UUID;

-- 9. TERRITORIES & ROUTES
CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  code VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  region VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Uganda',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE territories ADD COLUMN IF NOT EXISTS tenant_id UUID;

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  code VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  territory_id UUID REFERENCES territories(id) ON DELETE SET NULL,
  territory_name VARCHAR(255),
  assigned_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  assigned_agent_name VARCHAR(255),
  assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  assigned_vehicle_reg VARCHAR(100),
  operating_days JSONB DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS company_id UUID;

CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL DEFAULT 1,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_location_id UUID REFERENCES customer_locations(id) ON DELETE SET NULL,
  estimated_minutes INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 10. DEVICES
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(100) DEFAULT 'Handheld Android POS',
  serial_number VARCHAR(100) NOT NULL,
  imei VARCHAR(100),
  os_version VARCHAR(100),
  app_version VARCHAR(50) DEFAULT '2.4.0',
  assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  assigned_agent_name VARCHAR(255),
  assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'trusted',
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 11. STOCK LEDGER / INVENTORY MOVEMENTS (WAVE 2 CORE)
CREATE TABLE IF NOT EXISTS stock_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  commodity_unit_id UUID,
  batch_id UUID,
  source_location_id UUID REFERENCES stock_locations(id) ON DELETE SET NULL,
  destination_location_id UUID REFERENCES stock_locations(id) ON DELETE SET NULL,
  movement_type VARCHAR(50) NOT NULL,
  quantity_base_units NUMERIC(15,4) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  reference_number VARCHAR(100),
  reason_code VARCHAR(100),
  notes TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. DERIVED STOCK BALANCES
CREATE TABLE IF NOT EXISTS stock_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  stock_location_id UUID NOT NULL REFERENCES stock_locations(id) ON DELETE CASCADE,
  on_hand_quantity NUMERIC(15,4) DEFAULT 0,
  reserved_quantity NUMERIC(15,4) DEFAULT 0,
  available_quantity NUMERIC(15,4) DEFAULT 0,
  in_transit_quantity NUMERIC(15,4) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(commodity_id, stock_location_id)
);

-- 13. STOCK TRANSFERS & ITEMS (WAVE 2 ENGINE)
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  company_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  transfer_number VARCHAR(100) NOT NULL,
  source_location_id UUID REFERENCES stock_locations(id) ON DELETE SET NULL,
  source_location_name VARCHAR(255),
  destination_location_id UUID REFERENCES stock_locations(id) ON DELETE SET NULL,
  destination_location_name VARCHAR(255),
  transfer_type VARCHAR(50) DEFAULT 'warehouse_truck',
  requested_by VARCHAR(255),
  approved_by VARCHAR(255),
  loaded_by VARCHAR(255),
  received_by VARCHAR(255),
  assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  assigned_vehicle_reg VARCHAR(100),
  assigned_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  assigned_agent_name VARCHAR(255),
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'draft',
  total_lines INTEGER DEFAULT 0,
  total_units NUMERIC(15,2) DEFAULT 0,
  total_cost_ugx NUMERIC(15,2) DEFAULT 0,
  total_selling_ugx NUMERIC(15,2) DEFAULT 0,
  has_variance BOOLEAN DEFAULT false,
  variance_reason TEXT,
  requested_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  loaded_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  commodity_code VARCHAR(100),
  commodity_name VARCHAR(255),
  unit_name VARCHAR(50) DEFAULT 'Carton',
  pack_size NUMERIC(10,2) DEFAULT 1,
  requested_quantity NUMERIC(15,2) DEFAULT 0,
  approved_quantity NUMERIC(15,2) DEFAULT 0,
  loaded_quantity NUMERIC(15,2) DEFAULT 0,
  received_quantity NUMERIC(15,2) DEFAULT 0,
  variance_quantity NUMERIC(15,2) DEFAULT 0,
  variance_reason VARCHAR(255),
  cost_price_ugx NUMERIC(15,2) DEFAULT 0,
  selling_price_ugx NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TRANSFER SEQUENCE NUMBERS
CREATE TABLE IF NOT EXISTS transfer_sequences (
  tenant_id UUID PRIMARY KEY,
  last_value BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_commodities_tenant ON commodities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_agents_tenant ON sales_agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_routes_tenant ON routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_commodity ON stock_ledger(commodity_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_source ON stock_ledger(source_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_dest ON stock_ledger(destination_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_number ON stock_transfers(transfer_number);
