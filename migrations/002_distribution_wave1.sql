-- KROWN ERP-CRM - Phase 2 Wave 1 SQL Migration
-- Distribution Master Data, Commodities, Customers, Suppliers, Warehouses, Vehicles, Agents, Routes, Devices

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMMODITIES
CREATE TABLE IF NOT EXISTS commodities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) NOT NULL UNIQUE,
  sku VARCHAR(100) UNIQUE,
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
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COMMODITY PACKAGING & UNITS
CREATE TABLE IF NOT EXISTS commodity_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  unit_name VARCHAR(50) NOT NULL,
  multiplier_to_base NUMERIC(10,2) NOT NULL DEFAULT 1,
  barcode VARCHAR(100),
  selling_price_ugx NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  customer_type VARCHAR(50) DEFAULT 'retailer', -- retailer, wholesaler, distributor, key_account
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
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CUSTOMER LOCATIONS
CREATE TABLE IF NOT EXISTS customer_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 5. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE,
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

-- 6. WAREHOUSES & LOCATIONS
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'main', -- main, regional, branch
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  address TEXT,
  manager_name VARCHAR(255),
  capacity_sqm NUMERIC(10,2) DEFAULT 500,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  vehicle_id UUID,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  type VARCHAR(50) DEFAULT 'sellable', -- sellable, quarantine, damaged, truck
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. VEHICLES / FLEET
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_number VARCHAR(100) NOT NULL UNIQUE,
  make VARCHAR(100),
  model VARCHAR(100),
  vehicle_type VARCHAR(50) DEFAULT 'truck', -- truck, van, pickup
  volume_capacity_cbm NUMERIC(10,2) DEFAULT 10,
  weight_capacity_kg NUMERIC(10,2) DEFAULT 3000,
  assigned_driver_id UUID,
  assigned_agent_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  current_mileage INTEGER DEFAULT 0,
  fuel_level VARCHAR(20) DEFAULT 'full',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SALES AGENTS
CREATE TABLE IF NOT EXISTS sales_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  agent_code VARCHAR(100) UNIQUE,
  territory_id UUID,
  assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  assigned_device_id UUID,
  supervisor_id UUID,
  cash_limit_ugx NUMERIC(15,2) DEFAULT 5000000,
  can_give_credit BOOLEAN DEFAULT false,
  max_discount_pct NUMERIC(5,2) DEFAULT 5,
  commission_plan_id UUID,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TERRITORIES & ROUTES
CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Uganda',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  territory_id UUID REFERENCES territories(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  operating_days JSONB DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL DEFAULT 1,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_location_id UUID REFERENCES customer_locations(id) ON DELETE SET NULL,
  estimated_minutes INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. DEVICES
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(100) DEFAULT 'Handheld Android POS',
  serial_number VARCHAR(100) UNIQUE,
  imei VARCHAR(100),
  os_version VARCHAR(100),
  app_version VARCHAR(50) DEFAULT '2.4.0',
  assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL,
  assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'trusted', -- trusted, untrusted, lost, disabled
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_commodities_code ON commodities(code);
CREATE INDEX IF NOT EXISTS idx_commodities_category ON commodities(category_id);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_sales_agents_staff ON sales_agents(staff_id);
CREATE INDEX IF NOT EXISTS idx_routes_territory ON routes(territory_id);
CREATE INDEX IF NOT EXISTS idx_devices_serial ON devices(serial_number);
