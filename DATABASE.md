# KROWN ERP-CRM — DATABASE ARCHITECTURE & SCHEMA SPECIFICATION
## Phase 1 Base Schema + Phase 2 Distribution Extension Schema

### Overview
This document specifies the complete Neon PostgreSQL relational database schema for **KROWN ERP-CRM**, incorporating:
1. Core Multi-Tenant & RBAC Foundations
2. Universal Financial Subledger & Chart of Accounts (Single Source of Financial Truth)
3. Distribution, Field Sales & Van Sales Extensions (Commodities, Warehouses, Vehicles, Agents, Routes, Devices, Stock Transfers, Settlements)

---

### Canonical Financial Architecture (Single Source of Truth)
To prevent duplicate financial data, all financial operations post to canonical tables:
- `chart_of_accounts`: Master list of GL accounts.
- `general_ledger_journals` & `journal_items`: Single double-entry accounting ledger.
- `customer_receivables`: Universal subledger for customer debts.
- `supplier_payables`: Universal subledger for supplier liabilities.
- `financial_receipts`: Single source of truth for monies received.
- `financial_payouts`: Single source of truth for monies disbursed.
- `financial_deposits`: Cash collection & bank deposit movements.

---

### Entity-Relationship Architecture Overview

```
+-------------------+       +-------------------+       +--------------------+
|    warehouses     | ----> |  stock_locations  | ----> | stock_movements /  |
| (Main, Regional)  |       | (Sellable, Truck) |       |    stock_ledger    |
+-------------------+       +-------------------+       +--------------------+
         |                            ^                               ^
         v                            |                               |
+-------------------+                 |                               |
|     vehicles      | ---------------+                               |
| (Truck UG-001)    |                                                 |
+-------------------+                                                 |
         |                                                            |
         v                                                            |
+-------------------+       +-------------------+                     |
|   sales_agents    | ----> |   route_trips /   | --------------------+
|  (Linked to HR)   |       |   van_load_sheets |
+-------------------+       +-------------------+
         |                            |
         v                            v
+-------------------+       +-------------------+       +--------------------+
|     customers     | ----> |      orders /     | ----> |customer_receivables|
| (Multi-Locations) |       |    van_sales      |       | (Canonical Ledger) |
+-------------------+       +-------------------+       +--------------------+
                                                              |
                                                              v
                                                        +--------------------+
                                                        | financial_receipts |
                                                        +--------------------+
```

---

### Table Specifications (Phase 2 Additions)

#### 1. Commodities (`commodities`)
- `id` (UUID, PK)
- `code` (VARCHAR)
- `sku` (VARCHAR, UNIQUE)
- `barcode` (VARCHAR)
- `name` (VARCHAR)
- `description` (TEXT)
- `category_id` (UUID, FK)
- `brand` (VARCHAR)
- `variant` (VARCHAR)
- `base_unit` (VARCHAR) -- e.g. "Bottle", "Piece", "Kg"
- `selling_unit` (VARCHAR) -- e.g. "Carton"
- `purchase_unit` (VARCHAR) -- e.g. "Pallet"
- `pack_size` (NUMERIC) -- e.g. 24
- `cost_price_ugx` (NUMERIC(15,2))
- `selling_price_ugx` (NUMERIC(15,2))
- `wholesale_price_ugx` (NUMERIC(15,2))
- `distributor_price_ugx` (NUMERIC(15,2))
- `tax_category` (VARCHAR)
- `supplier_id` (UUID, FK)
- `min_stock` (NUMERIC)
- `max_stock` (NUMERIC)
- `reorder_level` (NUMERIC)
- `has_batch_tracking` (BOOLEAN)
- `has_expiry_tracking` (BOOLEAN)
- `status` (VARCHAR)
- `branch_id` (UUID, FK)
- `created_at` (TIMESTAMPTZ)

#### 2. Packaging & Units (`commodity_units`)
- `id` (UUID, PK)
- `commodity_id` (UUID, FK)
- `unit_name` (VARCHAR) -- "Carton", "Crate", "Pack", "Unit"
- `base_quantity` (NUMERIC) -- Multiplier to base unit
- `barcode` (VARCHAR)
- `selling_price_ugx` (NUMERIC(15,2))

#### 3. Customers (`customers`)
- `id` (UUID, PK)
- `code` (VARCHAR)
- `name` (VARCHAR)
- `customer_type` (VARCHAR) -- "retailer", "wholesaler", "distributor", "key_account"
- `customer_group` (VARCHAR)
- `tax_id` (VARCHAR)
- `contact_person` (VARCHAR)
- `phone` (VARCHAR)
- `email` (VARCHAR)
- `address` (TEXT)
- `credit_limit_ugx` (NUMERIC(15,2))
- `credit_days` (INTEGER)
- `outstanding_balance_ugx` (NUMERIC(15,2))
- `available_credit_ugx` (NUMERIC(15,2))
- `assigned_agent_id` (UUID, FK)
- `default_route_id` (UUID, FK)
- `price_list_id` (UUID, FK)
- `branch_id` (UUID, FK)
- `status` (VARCHAR)

#### 4. Customer Locations (`customer_locations`)
- `id` (UUID, PK)
- `customer_id` (UUID, FK)
- `location_name` (VARCHAR)
- `address` (TEXT)
- `contact_person` (VARCHAR)
- `phone` (VARCHAR)
- `latitude` (NUMERIC(10,8))
- `longitude` (NUMERIC(11,8))
- `route_id` (UUID, FK)

#### 5. Suppliers (`suppliers`)
- `id` (UUID, PK)
- `code` (VARCHAR)
- `name` (VARCHAR)
- `category` (VARCHAR)
- `tax_id` (VARCHAR)
- `contact_person` (VARCHAR)
- `phone` (VARCHAR)
- `email` (VARCHAR)
- `address` (TEXT)
- `payment_terms_days` (INTEGER)
- `credit_limit_ugx` (NUMERIC(15,2))
- `current_payable_ugx` (NUMERIC(15,2))
- `performance_rating` (NUMERIC(3,2))
- `status` (VARCHAR)

#### 6. Warehouses & Locations (`warehouses`, `stock_locations`)
- `warehouses`: `id`, `code`, `name`, `type` ("main", "regional", "branch"), `branch_id`, `address`, `manager_name`, `capacity_sqm`, `status`.
- `stock_locations`: `id`, `warehouse_id`, `vehicle_id`, `name`, `type` ("sellable", "quarantine", "damaged", "truck"), `code`.

#### 7. Vehicles / Fleet (`vehicles`)
- `id` (UUID, PK)
- `registration_number` (VARCHAR, UNIQUE)
- `make` (VARCHAR)
- `model` (VARCHAR)
- `vehicle_type` (VARCHAR) -- "truck", "van", "pickup"
- `volume_capacity_cbm` (NUMERIC)
- `weight_capacity_kg` (NUMERIC)
- `assigned_driver_id` (UUID, FK)
- `assigned_agent_id` (UUID, FK)
- `branch_id` (UUID, FK)
- `current_mileage` (INTEGER)
- `fuel_level` (VARCHAR)
- `status` (VARCHAR)

#### 8. Sales Agents (`sales_agents`)
- `id` (UUID, PK)
- `staff_id` (UUID, FK) -- Link to base staff table
- `agent_code` (VARCHAR)
- `territory_id` (UUID, FK)
- `assigned_vehicle_id` (UUID, FK)
- `assigned_device_id` (UUID, FK)
- `supervisor_id` (UUID, FK)
- `cash_limit_ugx` (NUMERIC(15,2))
- `can_give_credit` (BOOLEAN)
- `max_discount_pct` (NUMERIC(5,2))
- `commission_plan_id` (UUID, FK)
- `status` (VARCHAR)

#### 9. Territories & Routes (`territories`, `routes`, `route_stops`)
- `territories`: `id`, `code`, `name`, `region`, `country`.
- `routes`: `id`, `code`, `name`, `territory_id`, `branch_id`, `assigned_agent_id`, `assigned_vehicle_id`, `operating_days` (JSONB), `status`.
- `route_stops`: `id`, `route_id`, `sequence`, `customer_id`, `customer_location_id`, `estimated_minutes`.

#### 10. Devices (`devices`)
- `id` (UUID, PK)
- `device_name` (VARCHAR)
- `device_type` (VARCHAR)
- `serial_number` (VARCHAR)
- `imei` (VARCHAR)
- `os_version` (VARCHAR)
- `app_version` (VARCHAR)
- `assigned_staff_id` (UUID, FK)
- `assigned_agent_id` (UUID, FK)
- `assigned_vehicle_id` (UUID, FK)
- `branch_id` (UUID, FK)
- `status` (VARCHAR) -- "trusted", "untrusted", "lost", "disabled"
- `last_sync_at` (TIMESTAMPTZ)
- `last_login_at` (TIMESTAMPTZ)
