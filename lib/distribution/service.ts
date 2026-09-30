/**
 * KROWN ERP-CRM - Distribution Server Services
 * Production persistence layer backed directly by Neon PostgreSQL
 */

import { getSql, sqlRaw } from '@/lib/neon-server';
import { randomUUID } from 'crypto';
import {
  Commodity, Customer, Supplier, Warehouse, Vehicle, SalesAgent, Route, Device
} from '@/lib/distribution-types';

export function ensureUuid(id?: string): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return randomUUID();
}

// Tenant Helper - extracts or defaults tenant/branch context
export interface SecurityContext {
  tenantId?: string;
  companyId?: string;
  branchId?: string;
}

// ── COMMODITIES SERVICE ──────────────────────────────────────────────────────
export async function getCommodities(ctx: SecurityContext, search?: string): Promise<Commodity[]> {
  const sql = getSql();
  let queryStr = `SELECT * FROM commodities WHERE 1=1`;
  const params: any[] = [];

  if (ctx.branchId && ctx.branchId !== 'all') {
    params.push(ctx.branchId);
    queryStr += ` AND (branch_id = $${params.length} OR branch_id IS NULL)`;
  }
  if (search) {
    params.push(`%${search}%`);
    queryStr += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length} OR brand ILIKE $${params.length})`;
  }
  queryStr += ` ORDER BY created_at DESC`;

  const rows = await sqlRaw(queryStr, params);
  return rows.map(r => ({
    id: r.id,
    code: r.code,
    sku: r.sku || undefined,
    barcode: r.barcode || undefined,
    name: r.name,
    description: r.description || undefined,
    categoryId: r.category_id || undefined,
    categoryName: r.category_name || undefined,
    brand: r.brand || undefined,
    variant: r.variant || undefined,
    baseUnit: r.base_unit || 'Unit',
    sellingUnit: r.selling_unit || 'Carton',
    purchaseUnit: r.purchase_unit || 'Pallet',
    packSize: Number(r.pack_size || 1),
    cartonSize: Number(r.carton_size || 24),
    weightKg: Number(r.weight_kg || 0),
    volumeCbm: Number(r.volume_cbm || 0),
    costPriceUGX: Number(r.cost_price_ugx || 0),
    sellingPriceUGX: Number(r.selling_price_ugx || 0),
    wholesalePriceUGX: Number(r.wholesale_price_ugx || 0),
    distributorPriceUGX: Number(r.distributor_price_ugx || 0),
    taxCategory: r.tax_category || 'standard',
    supplierId: r.supplier_id || undefined,
    supplierName: r.supplier_name || undefined,
    minStock: Number(r.min_stock || 0),
    maxStock: Number(r.max_stock || 1000),
    reorderLevel: Number(r.reorder_level || 100),
    hasBatchTracking: Boolean(r.has_batch_tracking),
    hasExpiryTracking: Boolean(r.has_expiry_tracking),
    status: r.status || 'active',
    branchId: r.branch_id || undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined
  }));
}

export async function saveCommodity(ctx: SecurityContext, data: Partial<Commodity>): Promise<Commodity> {
  const sql = getSql();
  const id = ensureUuid(data.id);
  const code = data.code || `CMD-${Math.floor(100 + Math.random() * 900)}`;

  await sql`
    INSERT INTO commodities (
      id, tenant_id, company_id, branch_id, code, sku, barcode, name, description,
      category_name, brand, variant, base_unit, selling_unit, purchase_unit, pack_size,
      cost_price_ugx, selling_price_ugx, wholesale_price_ugx, distributor_price_ugx,
      tax_category, min_stock, max_stock, reorder_level, has_batch_tracking, has_expiry_tracking, status
    ) VALUES (
      ${id}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${code}, ${data.sku || `SKU-${code}`}, ${data.barcode || null}, ${data.name}, ${data.description || null},
      ${data.categoryName || 'General'}, ${data.brand || 'KROWN'}, ${data.variant || 'Standard'}, ${data.baseUnit || 'Unit'},
      ${data.sellingUnit || 'Carton'}, ${data.purchaseUnit || 'Pallet'}, ${data.packSize || 24},
      ${data.costPriceUGX || 0}, ${data.sellingPriceUGX || 0}, ${data.wholesalePriceUGX || 0}, ${data.distributorPriceUGX || 0},
      ${data.taxCategory || 'standard'}, ${data.minStock || 0}, ${data.maxStock || 1000}, ${data.reorderLevel || 100},
      ${data.hasBatchTracking ?? true}, ${data.hasExpiryTracking ?? true}, ${data.status || 'active'}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      code = EXCLUDED.code,
      brand = EXCLUDED.brand,
      cost_price_ugx = EXCLUDED.cost_price_ugx,
      selling_price_ugx = EXCLUDED.selling_price_ugx,
      wholesale_price_ugx = EXCLUDED.wholesale_price_ugx,
      distributor_price_ugx = EXCLUDED.distributor_price_ugx,
      pack_size = EXCLUDED.pack_size,
      updated_at = NOW()
  `;

  const updated = await getCommodities(ctx);
  return updated.find(c => c.id === id) || (data as Commodity);
}

// ── CUSTOMERS SERVICE ────────────────────────────────────────────────────────
export async function getCustomers(ctx: SecurityContext, search?: string): Promise<Customer[]> {
  let queryStr = `SELECT * FROM customers WHERE 1=1`;
  const params: any[] = [];

  if (ctx.branchId && ctx.branchId !== 'all') {
    params.push(ctx.branchId);
    queryStr += ` AND (branch_id = $${params.length} OR branch_id IS NULL)`;
  }
  if (search) {
    params.push(`%${search}%`);
    queryStr += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length} OR phone ILIKE $${params.length})`;
  }
  queryStr += ` ORDER BY created_at DESC`;

  const rows = await sqlRaw(queryStr, params);
  return rows.map(r => ({
    id: r.id,
    code: r.code,
    name: r.name,
    customerType: r.customer_type || 'retailer',
    customerGroup: r.customer_group || 'Standard',
    taxId: r.tax_id || undefined,
    contactPerson: r.contact_person || undefined,
    phone: r.phone || '',
    email: r.email || undefined,
    address: r.address || '',
    creditLimitUGX: Number(r.credit_limit_ugx || 0),
    creditDays: Number(r.credit_days || 30),
    outstandingBalanceUGX: Number(r.outstanding_balance_ugx || 0),
    availableCreditUGX: Number(r.available_credit_ugx || 0),
    assignedAgentId: r.assigned_agent_id || undefined,
    defaultRouteId: r.default_route_id || undefined,
    priceListId: r.price_list_id || undefined,
    branchId: r.branch_id || undefined,
    status: r.status || 'active',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined
  }));
}

export async function saveCustomer(ctx: SecurityContext, data: Partial<Customer>): Promise<Customer> {
  const sql = getSql();
  const id = ensureUuid(data.id);
  const code = data.code || `CUST-${Math.floor(1000 + Math.random() * 9000)}`;

  await sql`
    INSERT INTO customers (
      id, tenant_id, company_id, branch_id, code, name, customer_type, customer_group,
      tax_id, contact_person, phone, email, address, credit_limit_ugx, credit_days,
      outstanding_balance_ugx, available_credit_ugx, status
    ) VALUES (
      ${id}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${code}, ${data.name}, ${data.customerType || 'retailer'}, ${data.customerGroup || 'Standard'},
      ${data.taxId || null}, ${data.contactPerson || null}, ${data.phone || ''}, ${data.email || null},
      ${data.address || ''}, ${data.creditLimitUGX || 0}, ${data.creditDays || 30},
      ${data.outstandingBalanceUGX || 0}, ${data.availableCreditUGX || (data.creditLimitUGX || 0)},
      ${data.status || 'active'}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address,
      credit_limit_ugx = EXCLUDED.credit_limit_ugx,
      customer_type = EXCLUDED.customer_type,
      updated_at = NOW()
  `;

  const updated = await getCustomers(ctx);
  return updated.find(c => c.id === id) || (data as Customer);
}

// ── SUPPLIERS SERVICE ────────────────────────────────────────────────────────
export async function getSuppliers(ctx: SecurityContext): Promise<Supplier[]> {
  const rows = await sqlRaw(`SELECT * FROM suppliers ORDER BY created_at DESC`);
  return rows.map(r => ({
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category || 'General',
    taxId: r.tax_id || undefined,
    contactPerson: r.contact_person || undefined,
    phone: r.phone || '',
    email: r.email || undefined,
    address: r.address || '',
    paymentTermsDays: Number(r.payment_terms_days || 30),
    creditLimitUGX: Number(r.credit_limit_ugx || 0),
    currentPayableUGX: Number(r.current_payable_ugx || 0),
    performanceRating: Number(r.performance_rating || 4.5),
    status: r.status || 'active',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined
  }));
}

export async function saveSupplier(ctx: SecurityContext, data: Partial<Supplier>): Promise<Supplier> {
  const sql = getSql();
  const id = ensureUuid(data.id);
  const code = data.code || `SUP-${Math.floor(100 + Math.random() * 900)}`;

  await sql`
    INSERT INTO suppliers (
      id, tenant_id, company_id, code, name, category, tax_id, contact_person,
      phone, email, address, payment_terms_days, credit_limit_ugx, current_payable_ugx,
      performance_rating, status
    ) VALUES (
      ${id}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${code}, ${data.name},
      ${data.category || 'General'}, ${data.taxId || null}, ${data.contactPerson || null},
      ${data.phone || ''}, ${data.email || null}, ${data.address || ''},
      ${data.paymentTermsDays || 30}, ${data.creditLimitUGX || 0}, ${data.currentPayableUGX || 0},
      ${data.performanceRating || 4.5}, ${data.status || 'active'}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      contact_person = EXCLUDED.contact_person,
      phone = EXCLUDED.phone,
      payment_terms_days = EXCLUDED.payment_terms_days,
      updated_at = NOW()
  `;

  const updated = await getSuppliers(ctx);
  return updated.find(s => s.id === id) || (data as Supplier);
}

// ── WAREHOUSES & LOCATIONS SERVICE ───────────────────────────────────────────
export async function getWarehouses(ctx: SecurityContext): Promise<Warehouse[]> {
  const rows = await sqlRaw(`SELECT * FROM warehouses ORDER BY created_at DESC`);
  return rows.map(r => ({
    id: r.id,
    code: r.code,
    name: r.name,
    type: r.type || 'main',
    branchId: r.branch_id || undefined,
    address: r.address || '',
    managerName: r.manager_name || undefined,
    capacitySqm: Number(r.capacity_sqm || 500),
    status: r.status || 'active',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined
  }));
}

export async function saveWarehouse(ctx: SecurityContext, data: Partial<Warehouse>): Promise<Warehouse> {
  const sql = getSql();
  const id = ensureUuid(data.id);
  const code = data.code || `WH-${Math.floor(100 + Math.random() * 900)}`;

  await sql`
    INSERT INTO warehouses (
      id, tenant_id, company_id, branch_id, code, name, type, address, manager_name, capacity_sqm, status
    ) VALUES (
      ${id}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${code}, ${data.name}, ${data.type || 'main'}, ${data.address || ''}, ${data.managerName || null}, ${data.capacitySqm || 500}, ${data.status || 'active'}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      manager_name = EXCLUDED.manager_name,
      capacity_sqm = EXCLUDED.capacity_sqm
  `;

  // Ensure default stock location exists for this warehouse
  const locId = randomUUID();
  await sql`
    INSERT INTO stock_locations (id, warehouse_id, code, name, type)
    VALUES (${locId}, ${id}, ${`LOC-${code}`}, ${`${data.name} Sellable`}, 'sellable')
    ON CONFLICT DO NOTHING
  `;

  const updated = await getWarehouses(ctx);
  return updated.find(w => w.id === id) || (data as Warehouse);
}

// ── VEHICLES / FLEET SERVICE ─────────────────────────────────────────────────
export async function getVehicles(ctx: SecurityContext): Promise<Vehicle[]> {
  const rows = await sqlRaw(`SELECT * FROM vehicles ORDER BY created_at DESC`);
  return rows.map(r => ({
    id: r.id,
    registrationNumber: r.registration_number,
    make: r.make || '',
    model: r.model || '',
    vehicleType: r.vehicle_type || 'truck',
    volumeCapacityCbm: Number(r.volume_capacity_cbm || 10),
    weightCapacityKg: Number(r.weight_capacity_kg || 3000),
    assignedDriverId: r.assigned_driver_id || undefined,
    assignedDriverName: r.assigned_driver_name || undefined,
    assignedAgentId: r.assigned_agent_id || undefined,
    assignedAgentName: r.assigned_agent_name || undefined,
    branchId: r.branch_id || undefined,
    currentMileage: Number(r.current_mileage || 0),
    fuelLevel: r.fuel_level || 'full',
    status: r.status || 'active',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined
  }));
}

export async function saveVehicle(ctx: SecurityContext, data: Partial<Vehicle>): Promise<Vehicle> {
  const sql = getSql();
  const id = ensureUuid(data.id);

  // Automatically create truck stock location
  const locId = randomUUID();
  await sql`
    INSERT INTO stock_locations (id, vehicle_id, code, name, type)
    VALUES (${locId}, ${id}, ${`TRK-${data.registrationNumber}`}, ${`Truck Stock (${data.registrationNumber})`}, 'truck')
    ON CONFLICT DO NOTHING
  `;

  await sql`
    INSERT INTO vehicles (
      id, tenant_id, company_id, branch_id, registration_number, make, model, vehicle_type,
      volume_capacity_cbm, weight_capacity_kg, assigned_driver_name, assigned_agent_name,
      assigned_agent_id, current_mileage, fuel_level, stock_location_id, status
    ) VALUES (
      ${id}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${data.registrationNumber}, ${data.make || 'Isuzu'}, ${data.model || 'Box Body'}, ${data.vehicleType || 'truck'},
      ${data.volumeCapacityCbm || 15}, ${data.weightCapacityKg || 4000}, ${data.assignedDriverName || null},
      ${data.assignedAgentName || null}, ${data.assignedAgentId || null}, ${data.currentMileage || 0},
      ${data.fuelLevel || 'full'}, ${locId}, ${data.status || 'active'}
    )
    ON CONFLICT (id) DO UPDATE SET
      registration_number = EXCLUDED.registration_number,
      make = EXCLUDED.make,
      model = EXCLUDED.model,
      volume_capacity_cbm = EXCLUDED.volume_capacity_cbm,
      weight_capacity_kg = EXCLUDED.weight_capacity_kg,
      assigned_agent_name = EXCLUDED.assigned_agent_name
  `;

  const updated = await getVehicles(ctx);
  return updated.find(v => v.id === id) || (data as Vehicle);
}

// ── SALES AGENTS SERVICE ─────────────────────────────────────────────────────
export async function getAgents(ctx: SecurityContext): Promise<SalesAgent[]> {
  const rows = await sqlRaw(`SELECT * FROM sales_agents ORDER BY created_at DESC`);
  return rows.map(r => ({
    id: r.id,
    staffId: r.staff_id || '',
    agentCode: r.agent_code,
    name: r.name || undefined,
    email: r.email || undefined,
    phone: r.phone || undefined,
    territoryId: r.territory_id || undefined,
    territoryName: r.territory_name || undefined,
    assignedVehicleId: r.assigned_vehicle_id || undefined,
    assignedVehicleReg: r.assigned_vehicle_reg || undefined,
    assignedDeviceId: r.assigned_device_id || undefined,
    supervisorId: r.supervisor_id || undefined,
    supervisorName: r.supervisor_name || undefined,
    cashLimitUGX: Number(r.cash_limit_ugx || 5000000),
    canGiveCredit: Boolean(r.can_give_credit),
    maxDiscountPct: Number(r.max_discount_pct || 5),
    commissionPlanId: r.commission_plan_id || undefined,
    status: r.status || 'active',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined
  }));
}

export async function saveAgent(ctx: SecurityContext, data: Partial<SalesAgent>): Promise<SalesAgent> {
  const sql = getSql();
  const id = ensureUuid(data.id);
  const code = data.agentCode || `AGT-${Math.floor(100 + Math.random() * 900)}`;

  await sql`
    INSERT INTO sales_agents (
      id, tenant_id, company_id, agent_code, name, email, phone, territory_name,
      assigned_vehicle_reg, cash_limit_ugx, can_give_credit, max_discount_pct, status
    ) VALUES (
      ${id}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${code}, ${data.name}, ${data.email || null},
      ${data.phone || null}, ${data.territoryName || 'Central'}, ${data.assignedVehicleReg || null},
      ${data.cashLimitUGX || 5000000}, ${data.canGiveCredit ?? true}, ${data.maxDiscountPct || 5}, ${data.status || 'active'}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      cash_limit_ugx = EXCLUDED.cash_limit_ugx,
      territory_name = EXCLUDED.territory_name,
      assigned_vehicle_reg = EXCLUDED.assigned_vehicle_reg
  `;

  const updated = await getAgents(ctx);
  return updated.find(a => a.id === id) || (data as SalesAgent);
}

// ── ROUTES SERVICE ───────────────────────────────────────────────────────────
export async function getRoutes(ctx: SecurityContext): Promise<Route[]> {
  const rows = await sqlRaw(`SELECT * FROM routes ORDER BY created_at DESC`);
  return rows.map(r => ({
    id: r.id,
    code: r.code,
    name: r.name,
    territoryId: r.territory_id || undefined,
    territoryName: r.territory_name || undefined,
    branchId: r.branch_id || undefined,
    assignedAgentId: r.assigned_agent_id || undefined,
    assignedAgentName: r.assigned_agent_name || undefined,
    assignedVehicleId: r.assigned_vehicle_id || undefined,
    assignedVehicleReg: r.assigned_vehicle_reg || undefined,
    operatingDays: r.operating_days || ['Monday', 'Wednesday', 'Friday'],
    status: r.status || 'active'
  }));
}

export async function saveRoute(ctx: SecurityContext, data: Partial<Route>): Promise<Route> {
  const sql = getSql();
  const id = ensureUuid(data.id);
  const code = data.code || `RT-${Math.floor(100 + Math.random() * 900)}`;

  await sql`
    INSERT INTO routes (
      id, tenant_id, company_id, branch_id, code, name, territory_name,
      assigned_agent_name, assigned_vehicle_reg, operating_days, status
    ) VALUES (
      ${id}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${code}, ${data.name}, ${data.territoryName || 'Central'}, ${data.assignedAgentName || null},
      ${data.assignedVehicleReg || null}, ${JSON.stringify(data.operatingDays || ['Monday', 'Wednesday'])}, ${data.status || 'active'}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      territory_name = EXCLUDED.territory_name,
      assigned_agent_name = EXCLUDED.assigned_agent_name
  `;

  const updated = await getRoutes(ctx);
  return updated.find(r => r.id === id) || (data as Route);
}

// ── DEVICES SERVICE ──────────────────────────────────────────────────────────
export async function getDevices(ctx: SecurityContext): Promise<Device[]> {
  const rows = await sqlRaw(`SELECT * FROM devices ORDER BY created_at DESC`);
  return rows.map(r => ({
    id: r.id,
    deviceName: r.device_name,
    deviceType: r.device_type || 'Handheld Android POS',
    serialNumber: r.serial_number,
    imei: r.imei || undefined,
    osVersion: r.os_version || undefined,
    appVersion: r.app_version || 'v2.4.0',
    assignedStaffId: r.assigned_staff_id || undefined,
    assignedAgentId: r.assigned_agent_id || undefined,
    assignedAgentName: r.assigned_agent_name || undefined,
    assignedVehicleId: r.assigned_vehicle_id || undefined,
    branchId: r.branch_id || undefined,
    status: r.status || 'trusted',
    lastSyncAt: r.last_sync_at ? new Date(r.last_sync_at).toISOString() : undefined,
    lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined
  }));
}

export async function saveDevice(ctx: SecurityContext, data: Partial<Device>): Promise<Device> {
  const sql = getSql();
  const id = ensureUuid(data.id);

  await sql`
    INSERT INTO devices (
      id, tenant_id, device_name, device_type, serial_number, imei, app_version,
      assigned_agent_name, status
    ) VALUES (
      ${id}, ${ctx.tenantId || null}, ${data.deviceName}, ${data.deviceType || 'Handheld Android POS'},
      ${data.serialNumber}, ${data.imei || null}, ${data.appVersion || 'v2.4.0'},
      ${data.assignedAgentName || null}, ${data.status || 'trusted'}
    )
    ON CONFLICT (id) DO UPDATE SET
      device_name = EXCLUDED.device_name,
      assigned_agent_name = EXCLUDED.assigned_agent_name,
      status = EXCLUDED.status
  `;

  const updated = await getDevices(ctx);
  return updated.find(d => d.id === id) || (data as Device);
}
