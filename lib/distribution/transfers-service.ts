/**
 * KROWN ERP-CRM - Stock Transfer, Opening Stock & Stock Ledger Engine
 * Production-hardened Stock Movement Ledger, Stock Locations, Transfers & Concurrency-Safe Operations
 */

import { getSql, sqlRaw } from '@/lib/neon-server';
import { randomUUID } from 'crypto';
import { SecurityContext } from './service';

export interface StockTransferItemInput {
  commodityId: string;
  commodityCode: string;
  commodityName: string;
  unitName: string;
  packSize: number;
  requestedQuantity: number;
  approvedQuantity?: number;
  loadedQuantity?: number;
  receivedQuantity?: number;
  costPriceUGX: number;
  sellingPriceUGX: number;
}

export interface CreateTransferInput {
  sourceLocationId: string;
  sourceLocationName: string;
  destinationLocationId: string;
  destinationLocationName: string;
  transferType: 'warehouse_warehouse' | 'warehouse_truck' | 'truck_warehouse' | 'truck_truck' | 'branch_branch';
  assignedVehicleId?: string;
  assignedVehicleReg?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  routeId?: string;
  notes?: string;
  allowNegativeStock?: boolean;
  items: StockTransferItemInput[];
}

// Generate Concurrency-Safe Transfer Number (ST-2026-XXXXXX)
async function generateTransferNumber(tenantId?: string): Promise<string> {
  const sql = getSql();
  const year = new Date().getFullYear();
  const tid = tenantId || '00000000-0000-0000-0000-000000000000';

  const result = await sql`
    INSERT INTO transfer_sequences (tenant_id, last_value, updated_at)
    VALUES (${tid}, 1, NOW())
    ON CONFLICT (tenant_id)
    DO UPDATE SET last_value = transfer_sequences.last_value + 1, updated_at = NOW()
    RETURNING last_value
  `;

  const seq = Number(result[0]?.last_value || 1);
  return `ST-${year}-${String(seq).padStart(6, '0')}`;
}

// ── OPENING STOCK LEDGER ENTRY ────────────────────────────────────────────────
export async function createOpeningBalance(
  ctx: SecurityContext,
  input: {
    commodityId: string;
    stockLocationId: string;
    quantityBaseUnits: number;
    reason?: string;
    userEmail: string;
  }
): Promise<any> {
  const sql = getSql();
  const ledgerId = randomUUID();

  // Post opening balance ledger movement
  await sql`
    INSERT INTO stock_ledger (
      id, tenant_id, company_id, branch_id, commodity_id, destination_location_id,
      movement_type, quantity_base_units, reference_type, notes, created_by
    ) VALUES (
      ${ledgerId}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${input.commodityId}, ${input.stockLocationId}, 'opening_balance', ${input.quantityBaseUnits},
      'inventory_adjustment', ${input.reason || 'Initial Opening Stock Entry'}, ${input.userEmail}
    )
  `;

  // Update derived stock balance
  await sql`
    INSERT INTO stock_balances (id, tenant_id, commodity_id, stock_location_id, available_quantity, on_hand_quantity)
    VALUES (uuid_generate_v4(), ${ctx.tenantId || null}, ${input.commodityId}, ${input.stockLocationId}, ${input.quantityBaseUnits}, ${input.quantityBaseUnits})
    ON CONFLICT (commodity_id, stock_location_id)
    DO UPDATE SET
      available_quantity = stock_balances.available_quantity + ${input.quantityBaseUnits},
      on_hand_quantity = stock_balances.on_hand_quantity + ${input.quantityBaseUnits},
      updated_at = NOW()
  `;

  return { success: true, ledgerId, commodityId: input.commodityId, quantity: input.quantityBaseUnits };
}

// ── GET AVAILABLE STOCK FOR LOCATION ──────────────────────────────────────────
export async function getAvailableStock(commodityId: string, stockLocationId: string): Promise<number> {
  const rows = await sqlRaw(
    `SELECT available_quantity FROM stock_balances WHERE commodity_id = $1 AND stock_location_id = $2`,
    [commodityId, stockLocationId]
  );
  return rows.length > 0 ? Number(rows[0].available_quantity || 0) : 0;
}

export async function getTransfers(ctx: SecurityContext, statusFilter?: string): Promise<any[]> {
  let queryStr = `SELECT * FROM stock_transfers WHERE 1=1`;
  const params: any[] = [];

  if (ctx.branchId && ctx.branchId !== 'all') {
    params.push(ctx.branchId);
    queryStr += ` AND (branch_id = $${params.length} OR branch_id IS NULL)`;
  }
  if (statusFilter && statusFilter !== 'all') {
    params.push(statusFilter);
    queryStr += ` AND status = $${params.length}`;
  }
  queryStr += ` ORDER BY created_at DESC`;

  const transfers = await sqlRaw(queryStr, params);

  for (const t of transfers) {
    const items = await sqlRaw(`SELECT * FROM stock_transfer_items WHERE transfer_id = $1`, [t.id]);
    t.items = items;
  }

  return transfers;
}

// ── CREATE STOCK TRANSFER (WITH STOCK AVAILABILITY CHECK) ────────────────────
export async function createTransfer(ctx: SecurityContext, input: CreateTransferInput, userEmail: string): Promise<any> {
  const sql = getSql();
  const transferId = randomUUID();
  const transferNumber = await generateTransferNumber(ctx.tenantId);

  // 1. Check Stock Availability for Source Location (Prevent Silent Negative Stock)
  if (!input.allowNegativeStock) {
    for (const item of input.items) {
      const baseUnitsReq = Number(item.requestedQuantity) * Number(item.packSize || 1);
      const availableBase = await getAvailableStock(item.commodityId, input.sourceLocationId);

      if (availableBase < baseUnitsReq) {
        const availableCartons = (availableBase / Number(item.packSize || 1)).toFixed(1);
        throw new Error(
          `Insufficient stock for "${item.commodityName}". Only ${availableCartons} ${item.unitName || 'Carton'}(s) [${availableBase} units] available in ${input.sourceLocationName}, but ${item.requestedQuantity} was requested.`
        );
      }
    }
  }

  let totalUnits = 0;
  let totalCost = 0;
  let totalSelling = 0;

  input.items.forEach(item => {
    totalUnits += Number(item.requestedQuantity);
    totalCost += Number(item.requestedQuantity) * Number(item.costPriceUGX);
    totalSelling += Number(item.requestedQuantity) * Number(item.sellingPriceUGX);
  });

  await sql`
    INSERT INTO stock_transfers (
      id, tenant_id, company_id, branch_id, transfer_number, source_location_id,
      source_location_name, destination_location_id, destination_location_name,
      transfer_type, requested_by, assigned_vehicle_id, assigned_vehicle_reg,
      assigned_agent_id, assigned_agent_name, route_id, status, total_lines,
      total_units, total_cost_ugx, total_selling_ugx, requested_at, notes
    ) VALUES (
      ${transferId}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${transferNumber}, ${input.sourceLocationId}, ${input.sourceLocationName},
      ${input.destinationLocationId}, ${input.destinationLocationName},
      ${input.transferType}, ${userEmail}, ${input.assignedVehicleId || null},
      ${input.assignedVehicleReg || null}, ${input.assignedAgentId || null},
      ${input.assignedAgentName || null}, ${input.routeId || null}, 'draft',
      ${input.items.length}, ${totalUnits}, ${totalCost}, ${totalSelling}, NOW(), ${input.notes || null}
    )
  `;

  for (const item of input.items) {
    await sql`
      INSERT INTO stock_transfer_items (
        id, tenant_id, transfer_id, commodity_id, commodity_code, commodity_name,
        unit_name, pack_size, requested_quantity, approved_quantity, loaded_quantity,
        received_quantity, cost_price_ugx, selling_price_ugx
      ) VALUES (
        uuid_generate_v4(), ${ctx.tenantId || null}, ${transferId}, ${item.commodityId},
        ${item.commodityCode}, ${item.commodityName}, ${item.unitName || 'Carton'},
        ${item.packSize || 1}, ${item.requestedQuantity}, ${item.requestedQuantity},
        ${item.requestedQuantity}, ${item.requestedQuantity}, ${item.costPriceUGX}, ${item.sellingPriceUGX}
      )
    `;
  }

  const result = await getTransfers(ctx);
  return result.find(t => t.id === transferId);
}

// ── AGENT ACCEPTANCE & ATOMIC STOCK LEDGER POSTING (IDEMPOTENT) ─────────────
export async function acceptTransfer(
  ctx: SecurityContext,
  transferId: string,
  acceptedItems: { itemId: string; receivedQuantity: number; varianceReason?: string }[],
  userEmail: string
): Promise<any> {
  const sql = getSql();

  const transfers = await sqlRaw(`SELECT * FROM stock_transfers WHERE id = $1`, [transferId]);
  if (!transfers || transfers.length === 0) throw new Error('Stock transfer not found');
  const transfer = transfers[0];

  // IDEMPOTENCY CHECK: If transfer is already completed, return directly to prevent duplicate stock ledger entries
  if (transfer.status === 'completed') {
    console.warn(`[acceptTransfer] Transfer ${transfer.transfer_number} is already completed. Returning idempotent response.`);
    const existing = await getTransfers(ctx);
    return existing.find(t => t.id === transferId);
  }

  const items = await sqlRaw(`SELECT * FROM stock_transfer_items WHERE transfer_id = $1`, [transferId]);

  let hasVariance = false;
  let varianceReasonStr = '';

  for (const item of items) {
    const accepted = acceptedItems.find(a => a.itemId === item.id);
    const recQty = accepted ? Number(accepted.receivedQuantity) : Number(item.loaded_quantity);
    const varQty = Number(item.loaded_quantity) - recQty;

    if (varQty !== 0) {
      hasVariance = true;
      varianceReasonStr += `${item.commodity_name}: Expected ${item.loaded_quantity}, Received ${recQty} (${accepted?.varianceReason || 'Discrepancy'}). `;
    }

    // Update transfer item record
    await sql`
      UPDATE stock_transfer_items
      SET received_quantity = ${recQty},
          variance_quantity = ${varQty},
          variance_reason = ${accepted?.varianceReason || null}
      WHERE id = ${item.id}
    `;

    // ── ATOMIC STOCK LEDGER POSTING (CONSERVATION OF STOCK) ───
    const baseUnitsQty = recQty * Number(item.pack_size || 1);

    // 1. Deduct from Source Location
    await sql`
      INSERT INTO stock_ledger (
        id, tenant_id, company_id, branch_id, commodity_id, source_location_id,
        destination_location_id, movement_type, quantity_base_units, reference_type,
        reference_id, reference_number, notes, created_by
      ) VALUES (
        uuid_generate_v4(), ${ctx.tenantId || null}, ${ctx.companyId || null}, ${transfer.branch_id || null},
        ${item.commodity_id}, ${transfer.source_location_id}, ${transfer.destination_location_id},
        'warehouse_transfer', ${-baseUnitsQty}, 'stock_transfer', ${transferId}, ${transfer.transfer_number},
        ${`Dispatch transfer to ${transfer.destination_location_name}`}, ${userEmail}
      )
    `;

    // 2. Add to Destination Location (Truck or Warehouse)
    await sql`
      INSERT INTO stock_ledger (
        id, tenant_id, company_id, branch_id, commodity_id, source_location_id,
        destination_location_id, movement_type, quantity_base_units, reference_type,
        reference_id, reference_number, notes, created_by
      ) VALUES (
        uuid_generate_v4(), ${ctx.tenantId || null}, ${ctx.companyId || null}, ${transfer.branch_id || null},
        ${item.commodity_id}, ${transfer.source_location_id}, ${transfer.destination_location_id},
        'truck_load', ${baseUnitsQty}, 'stock_transfer', ${transferId}, ${transfer.transfer_number},
        ${`Received load on ${transfer.destination_location_name}`}, ${userEmail}
      )
    `;

    // 3. Update Derived Stock Balances
    if (transfer.source_location_id) {
      await sql`
        INSERT INTO stock_balances (id, tenant_id, commodity_id, stock_location_id, available_quantity, on_hand_quantity)
        VALUES (uuid_generate_v4(), ${ctx.tenantId || null}, ${item.commodity_id}, ${transfer.source_location_id}, ${-baseUnitsQty}, ${-baseUnitsQty})
        ON CONFLICT (commodity_id, stock_location_id)
        DO UPDATE SET
          available_quantity = stock_balances.available_quantity - ${baseUnitsQty},
          on_hand_quantity = stock_balances.on_hand_quantity - ${baseUnitsQty},
          updated_at = NOW()
      `;
    }
    if (transfer.destination_location_id) {
      await sql`
        INSERT INTO stock_balances (id, tenant_id, commodity_id, stock_location_id, available_quantity, on_hand_quantity)
        VALUES (uuid_generate_v4(), ${ctx.tenantId || null}, ${item.commodity_id}, ${transfer.destination_location_id}, ${baseUnitsQty}, ${baseUnitsQty})
        ON CONFLICT (commodity_id, stock_location_id)
        DO UPDATE SET
          available_quantity = stock_balances.available_quantity + ${baseUnitsQty},
          on_hand_quantity = stock_balances.on_hand_quantity + ${baseUnitsQty},
          updated_at = NOW()
      `;
    }
  }

  // Update Stock Transfer Header
  await sql`
    UPDATE stock_transfers
    SET status = 'completed',
        received_by = ${userEmail},
        has_variance = ${hasVariance},
        variance_reason = ${hasVariance ? varianceReasonStr : null},
        received_at = NOW(),
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = ${transferId}
  `;

  const updated = await getTransfers(ctx);
  return updated.find(t => t.id === transferId);
}

// ── GET TRUCK STOCK SUMMARY ──────────────────────────────────────────────────
export async function getTruckStockSummary(ctx: SecurityContext, vehicleId?: string): Promise<any[]> {
  const rows = await sqlRaw(`
    SELECT
      sb.commodity_id,
      c.name as commodity_name,
      c.code as commodity_code,
      c.base_unit,
      c.selling_unit,
      c.pack_size,
      c.cost_price_ugx,
      c.selling_price_ugx,
      loc.name as location_name,
      loc.id as stock_location_id,
      loc.vehicle_id,
      v.registration_number,
      v.assigned_agent_name,
      sb.available_quantity as total_base_units
    FROM stock_balances sb
    JOIN commodities c ON sb.commodity_id = c.id
    JOIN stock_locations loc ON sb.stock_location_id = loc.id
    LEFT JOIN vehicles v ON loc.vehicle_id = v.id
    WHERE loc.type = 'truck' AND sb.available_quantity > 0
    ${vehicleId ? `AND loc.vehicle_id = '${vehicleId}'` : ''}
    ORDER BY v.registration_number, c.name
  `);

  return rows.map(r => ({
    commodityId: r.commodity_id,
    commodityName: r.commodity_name,
    commodityCode: r.commodity_code,
    baseUnit: r.base_unit,
    sellingUnit: r.selling_unit,
    packSize: Number(r.pack_size || 1),
    vehicleId: r.vehicle_id,
    stockLocationId: r.stock_location_id,
    locationName: r.location_name,
    registrationNumber: r.registration_number || 'Unassigned Vehicle',
    assignedAgentName: r.assigned_agent_name || 'Unassigned Agent',
    totalBaseUnits: Number(r.total_base_units || 0),
    totalCartons: (Number(r.total_base_units || 0) / Number(r.pack_size || 1)).toFixed(1),
    costValueUGX: Number(r.total_base_units || 0) * Number(r.cost_price_ugx || 0),
    sellingValueUGX: Number(r.total_base_units || 0) * Number(r.selling_price_ugx || 0)
  }));
}

// ── GET ALL STOCK LOCATIONS ──────────────────────────────────────────────────
export async function getStockLocations(ctx: SecurityContext): Promise<any[]> {
  const rows = await sqlRaw(`
    SELECT sl.*,
           w.name as warehouse_name,
           w.code as warehouse_code,
           v.registration_number,
           v.assigned_agent_name,
           v.assigned_agent_id
    FROM stock_locations sl
    LEFT JOIN warehouses w ON sl.warehouse_id = w.id
    LEFT JOIN vehicles v ON sl.vehicle_id = v.id
    ORDER BY sl.type, sl.name
  `);
  return rows;
}
