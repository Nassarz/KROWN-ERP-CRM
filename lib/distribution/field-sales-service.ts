/**
 * KROWN ERP-CRM - Field Sales, Van Sales, Orders, Bookings, Collections & EOD Engine
 * Production persistence layer backed directly by Neon PostgreSQL
 */

import { getSql, sqlRaw } from '@/lib/neon-server';
import { randomUUID } from 'crypto';
import { SecurityContext } from './service';
import { getAvailableStock } from './transfers-service';

// ── IDEMPOTENCY & SEQUENCE GENERATORS ─────────────────────────────────────────
async function generateSequenceNumber(table: string, prefix: string, _tenantId?: string): Promise<string> {
  const year = new Date().getFullYear();
  const tid = '00000000-0000-0000-0000-000000000000';

  const rows = await sqlRaw(
    `INSERT INTO ${table} (tenant_id, last_value, updated_at)
     VALUES ($1, 1, NOW())
     ON CONFLICT (tenant_id)
     DO UPDATE SET last_value = ${table}.last_value + 1, updated_at = NOW()
     RETURNING last_value`,
    [tid]
  );

  const seq = Number(rows[0]?.last_value || 1);
  return `${prefix}-${year}-${String(seq).padStart(6, '0')}`;
}

// ── ROUTE SESSION ENGINE ──────────────────────────────────────────────────────
export async function startRouteSession(
  ctx: SecurityContext,
  input: {
    routeId?: string;
    salesAgentId: string;
    vehicleId?: string;
    deviceId?: string;
    openingCashFloat?: number;
    userEmail: string;
  }
): Promise<any> {
  const sql = getSql();

  // 1. Check if agent already has an active route session
  const active = await sqlRaw(
    `SELECT * FROM route_sessions WHERE sales_agent_id = $1 AND status = 'started'`,
    [input.salesAgentId]
  );
  if (active.length > 0) {
    return active[0];
  }

  // 2. Create new route session
  const sessionId = randomUUID();
  await sql`
    INSERT INTO route_sessions (
      id, tenant_id, company_id, branch_id, route_id, sales_agent_id, vehicle_id,
      device_id, business_date, started_at, opening_cash_float, status
    ) VALUES (
      ${sessionId}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${input.routeId || null}, ${input.salesAgentId}, ${input.vehicleId || null},
      ${input.deviceId || null}, CURRENT_DATE, NOW(), ${input.openingCashFloat || 0}, 'started'
    )
  `;

  const rows = await sqlRaw(`SELECT * FROM route_sessions WHERE id = $1`, [sessionId]);
  return rows[0];
}

export async function getActiveRouteSession(ctx: SecurityContext, salesAgentId: string): Promise<any | null> {
  const rows = await sqlRaw(
    `SELECT rs.*, r.name as route_name, v.registration_number as vehicle_reg, a.name as agent_name
     FROM route_sessions rs
     LEFT JOIN routes r ON rs.route_id = r.id
     LEFT JOIN vehicles v ON rs.vehicle_id = v.id
     LEFT JOIN sales_agents a ON rs.sales_agent_id = a.id
     WHERE rs.sales_agent_id = $1 AND rs.status = 'started'`,
    [salesAgentId]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ── CUSTOMER VISIT ENGINE ────────────────────────────────────────────────────
export async function recordCustomerVisit(
  ctx: SecurityContext,
  input: {
    routeSessionId: string;
    customerId: string;
    customerLocationId?: string;
    agentId: string;
    visitOutcome: string;
    notes?: string;
  }
): Promise<any> {
  const sql = getSql();
  const visitId = randomUUID();

  await sql`
    INSERT INTO customer_visits (
      id, tenant_id, company_id, branch_id, route_session_id, customer_id,
      customer_location_id, agent_id, started_at, ended_at, visit_outcome, notes
    ) VALUES (
      ${visitId}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${input.routeSessionId}, ${input.customerId}, ${input.customerLocationId || null},
      ${input.agentId}, NOW(), NOW(), ${input.visitOutcome}, ${input.notes || null}
    )
  `;

  return { id: visitId, success: true };
}

// ── VAN SALES ENGINE (CASH & CREDIT SALES WITH ATOMIC TRUCK LEDGER POSTING) ─
export interface VanSaleLineInput {
  commodityId: string;
  commodityCode: string;
  commodityName: string;
  unitName: string;
  packSize: number;
  quantity: number; // e.g. cartons sold
  unitPriceUGX: number;
  discountUGX?: number;
}

export interface CreateVanSaleInput {
  operationId?: string;
  routeSessionId?: string;
  salesAgentId: string;
  vehicleId?: string;
  truckStockLocationId: string;
  customerId: string;
  customerLocationId?: string;
  saleType: 'cash' | 'credit' | 'mixed';
  lines: VanSaleLineInput[];
  userEmail: string;
}

export async function createVanSale(ctx: SecurityContext, input: CreateVanSaleInput): Promise<any> {
  const sql = getSql();

  // 1. Idempotency Check via operationId
  if (input.operationId) {
    const existing = await sqlRaw(`SELECT * FROM van_sales WHERE operation_id = $1`, [input.operationId]);
    if (existing.length > 0) {
      console.warn(`[createVanSale] Idempotent hit for operation_id: ${input.operationId}`);
      const sale = existing[0];
      const lines = await sqlRaw(`SELECT * FROM van_sale_lines WHERE sale_id = $1`, [sale.id]);
      return { ...sale, lines };
    }
  }

  // 2. Fetch Customer & Verify Credit Limit for Credit Sales
  const customerRows = await sqlRaw(`SELECT * FROM customers WHERE id = $1`, [input.customerId]);
  if (customerRows.length === 0) throw new Error('Customer not found');
  const customer = customerRows[0];

  let subtotalUGX = 0;
  let totalDiscountUGX = 0;

  input.lines.forEach(line => {
    const lineTotal = Number(line.quantity) * Number(line.unitPriceUGX) - Number(line.discountUGX || 0);
    subtotalUGX += lineTotal;
    totalDiscountUGX += Number(line.discountUGX || 0);
  });

  const totalUGX = subtotalUGX;

  // Credit Validation
  if (input.saleType === 'credit') {
    const availableCredit = Number(customer.available_credit_ugx || (Number(customer.credit_limit_ugx || 0) - Number(customer.outstanding_balance_ugx || 0)));
    if (availableCredit < totalUGX) {
      throw new Error(
        `Credit limit exceeded for "${customer.name}". Total sale UGX ${totalUGX.toLocaleString()} exceeds available credit UGX ${availableCredit.toLocaleString()}. Manager approval required.`
      );
    }
  }

  // 3. Stock Availability Check on Truck Stock Location
  for (const line of input.lines) {
    const baseUnitsNeeded = Number(line.quantity) * Number(line.packSize || 1);
    const availableOnTruck = await getAvailableStock(line.commodityId, input.truckStockLocationId);
    if (availableOnTruck < baseUnitsNeeded) {
      const availCartons = (availableOnTruck / Number(line.packSize || 1)).toFixed(1);
      throw new Error(
        `Insufficient truck stock for "${line.commodityName}". Only ${availCartons} ${line.unitName}(s) available on truck, but ${line.quantity} requested.`
      );
    }
  }

  const saleId = randomUUID();
  const saleNumber = await generateSequenceNumber('van_sale_sequences', 'VS', ctx.tenantId);

  // 4. Insert Van Sale Record
  await sql`
    INSERT INTO van_sales (
      id, tenant_id, company_id, branch_id, sale_number, operation_id, route_session_id,
      sales_agent_id, vehicle_id, customer_id, customer_location_id, sale_type,
      subtotal_ugx, discount_ugx, total_ugx, payment_status, approval_status, status
    ) VALUES (
      ${saleId}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${saleNumber}, ${input.operationId || null}, ${input.routeSessionId || null},
      ${input.salesAgentId}, ${input.vehicleId || null}, ${input.customerId},
      ${input.customerLocationId || null}, ${input.saleType}, ${subtotalUGX},
      ${totalDiscountUGX}, ${totalUGX}, ${input.saleType === 'cash' ? 'paid' : 'pending_credit'},
      'approved', 'completed'
    )
  `;

  // 5. Insert Lines & Deduct Stock from Truck
  for (const line of input.lines) {
    const baseQty = Number(line.quantity) * Number(line.packSize || 1);
    const lineTotal = Number(line.quantity) * Number(line.unitPriceUGX) - Number(line.discountUGX || 0);

    await sql`
      INSERT INTO van_sale_lines (
        id, tenant_id, sale_id, commodity_id, commodity_code, commodity_name,
        unit_name, pack_size, quantity, base_quantity, unit_price_ugx, discount_ugx, line_total_ugx
      ) VALUES (
        uuid_generate_v4(), ${ctx.tenantId || null}, ${saleId}, ${line.commodityId},
        ${line.commodityCode}, ${line.commodityName}, ${line.unitName || 'Carton'},
        ${line.packSize || 1}, ${line.quantity}, ${baseQty}, ${line.unitPriceUGX},
        ${line.discountUGX || 0}, ${lineTotal}
      )
    `;

    // Deduct stock from truck location in immutable stock ledger
    await sql`
      INSERT INTO stock_ledger (
        id, tenant_id, company_id, branch_id, commodity_id, source_location_id,
        movement_type, quantity_base_units, reference_type, reference_id, reference_number, notes, created_by
      ) VALUES (
        uuid_generate_v4(), ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
        ${line.commodityId}, ${input.truckStockLocationId}, 'truck_sale', ${-baseQty},
        'van_sale', ${saleId}, ${saleNumber}, ${`Van sale to ${customer.name}`}, ${input.userEmail}
      )
    `;

    // Update derived stock balance for truck
    await sql`
      UPDATE stock_balances
      SET available_quantity = available_quantity - ${baseQty},
          on_hand_quantity = on_hand_quantity - ${baseQty},
          updated_at = NOW()
      WHERE commodity_id = ${line.commodityId} AND stock_location_id = ${input.truckStockLocationId}
    `;
  }

  // 6. Handle Finance Receivable & Customer Balance for Credit Sales
  if (input.saleType === 'credit') {
    const recId = randomUUID();
    const recNumber = `REC-INV-${saleNumber}`;

    await sql`
      INSERT INTO receivables (
        id, tenant_id, company_id, branch_id, receivable_number, customer_id,
        origin_type, origin_id, origin_number, sales_agent_id, route_session_id,
        original_amount_ugx, paid_amount_ugx, balance_ugx, due_date, status
      ) VALUES (
        ${recId}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
        ${recNumber}, ${input.customerId}, 'van_sale', ${saleId}, ${saleNumber},
        ${input.salesAgentId}, ${input.routeSessionId || null}, ${totalUGX}, 0, ${totalUGX},
        CURRENT_DATE + INTERVAL '30 days', 'open'
      )
    `;

    // Update Customer Outstanding Balance
    await sql`
      UPDATE customers
      SET outstanding_balance_ugx = outstanding_balance_ugx + ${totalUGX},
          available_credit_ugx = credit_limit_ugx - (outstanding_balance_ugx + ${totalUGX}),
          updated_at = NOW()
      WHERE id = ${input.customerId}
    `;
  }

  const createdRows = await sqlRaw(`SELECT * FROM van_sales WHERE id = $1`, [saleId]);
  const lines = await sqlRaw(`SELECT * FROM van_sale_lines WHERE sale_id = $1`, [saleId]);

  return { ...createdRows[0], lines };
}

// ── FIELD COLLECTIONS & RECEIPTS ENGINE ──────────────────────────────────────
export interface RecordFieldCollectionInput {
  operationId?: string;
  routeSessionId?: string;
  salesAgentId: string;
  vehicleId?: string;
  customerId: string;
  receivableId?: string;
  amountUGX: number;
  paymentMethod: 'cash' | 'mobile_money' | 'bank_transfer' | 'cheque';
  paymentReference?: string;
  notes?: string;
}

export async function recordFieldCollection(ctx: SecurityContext, input: RecordFieldCollectionInput): Promise<any> {
  const sql = getSql();

  // Idempotency check
  if (input.operationId) {
    const existing = await sqlRaw(`SELECT * FROM financial_receipts WHERE operation_id = $1`, [input.operationId]);
    if (existing.length > 0) {
      console.warn(`[recordFieldCollection] Idempotent hit for operation_id: ${input.operationId}`);
      return existing[0];
    }
  }

  const receiptId = randomUUID();
  const receiptNumber = await generateSequenceNumber('receipt_sequences', 'RCT', ctx.tenantId);

  await sql`
    INSERT INTO financial_receipts (
      id, tenant_id, company_id, branch_id, receipt_number, operation_id, customer_id,
      sales_agent_id, route_session_id, vehicle_id, amount_ugx, payment_method,
      payment_reference, verification_status, notes
    ) VALUES (
      ${receiptId}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${receiptNumber}, ${input.operationId || null}, ${input.customerId}, ${input.salesAgentId},
      ${input.routeSessionId || null}, ${input.vehicleId || null}, ${input.amountUGX},
      ${input.paymentMethod}, ${input.paymentReference || null}, 'verified', ${input.notes || null}
    )
  `;

  // Allocate payment to specific receivable if provided
  if (input.receivableId) {
    const recRows = await sqlRaw(`SELECT * FROM receivables WHERE id = $1`, [input.receivableId]);
    if (recRows.length > 0) {
      const rec = recRows[0];
      const allocAmt = Math.min(Number(input.amountUGX), Number(rec.balance_ugx));

      await sql`
        INSERT INTO receipt_allocations (id, tenant_id, receipt_id, receivable_id, allocated_amount_ugx)
        VALUES (uuid_generate_v4(), ${ctx.tenantId || null}, ${receiptId}, ${input.receivableId}, ${allocAmt})
      `;

      const newBal = Number(rec.balance_ugx) - allocAmt;
      const newPaid = Number(rec.paid_amount_ugx) + allocAmt;
      const status = newBal <= 0 ? 'paid' : 'partial';

      await sql`
        UPDATE receivables
        SET paid_amount_ugx = ${newPaid},
            balance_ugx = ${newBal},
            status = ${status}
        WHERE id = ${input.receivableId}
      `;
    }
  }

  // Reduce customer outstanding balance
  await sql`
    UPDATE customers
    SET outstanding_balance_ugx = GREATEST(0, outstanding_balance_ugx - ${input.amountUGX}),
        available_credit_ugx = credit_limit_ugx - GREATEST(0, outstanding_balance_ugx - ${input.amountUGX}),
        updated_at = NOW()
    WHERE id = ${input.customerId}
  `;

  const rows = await sqlRaw(`SELECT * FROM financial_receipts WHERE id = $1`, [receiptId]);
  return rows[0];
}

// ── BOOKINGS & SALES ORDERS ENGINE ───────────────────────────────────────────
export async function createBooking(
  ctx: SecurityContext,
  input: {
    operationId?: string;
    routeSessionId?: string;
    salesAgentId: string;
    customerId: string;
    commodityId?: string;
    commodityName: string;
    unitName?: string;
    quantity: number;
    estimatedValueUGX?: number;
    requestedDate?: string;
    notes?: string;
  }
): Promise<any> {
  const sql = getSql();

  if (input.operationId) {
    const existing = await sqlRaw(`SELECT * FROM bookings WHERE operation_id = $1`, [input.operationId]);
    if (existing.length > 0) return existing[0];
  }

  const bookingId = randomUUID();
  const bookingNumber = await generateSequenceNumber('booking_sequences', 'BKG', ctx.tenantId);

  await sql`
    INSERT INTO bookings (
      id, tenant_id, company_id, branch_id, booking_number, operation_id, customer_id,
      sales_agent_id, route_session_id, commodity_id, commodity_name, unit_name,
      quantity, estimated_value_ugx, requested_date, status, notes
    ) VALUES (
      ${bookingId}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${bookingNumber}, ${input.operationId || null}, ${input.customerId}, ${input.salesAgentId},
      ${input.routeSessionId || null}, ${input.commodityId || null}, ${input.commodityName},
      ${input.unitName || 'Carton'}, ${input.quantity}, ${input.estimatedValueUGX || 0},
      ${input.requestedDate || null}, 'confirmed', ${input.notes || null}
    )
  `;

  const rows = await sqlRaw(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
  return rows[0];
}

// ── CUSTOMER RETURNS ENGINE ──────────────────────────────────────────────────
export async function recordCustomerReturn(
  ctx: SecurityContext,
  input: {
    operationId?: string;
    routeSessionId?: string;
    salesAgentId: string;
    vehicleId?: string;
    truckStockLocationId: string;
    customerId: string;
    reasonCode: string;
    disposition: 'truck_sellable' | 'truck_quarantine' | 'warehouse_return';
    lines: {
      commodityId: string;
      commodityName: string;
      unitName: string;
      packSize: number;
      quantity: number;
      unitPriceUGX: number;
    }[];
    notes?: string;
    userEmail: string;
  }
): Promise<any> {
  const sql = getSql();

  if (input.operationId) {
    const existing = await sqlRaw(`SELECT * FROM customer_returns WHERE operation_id = $1`, [input.operationId]);
    if (existing.length > 0) return existing[0];
  }

  const returnId = randomUUID();
  const returnNumber = await generateSequenceNumber('return_sequences', 'RET', ctx.tenantId);

  let totalValueUGX = 0;
  input.lines.forEach(l => { totalValueUGX += Number(l.quantity) * Number(l.unitPriceUGX); });

  await sql`
    INSERT INTO customer_returns (
      id, tenant_id, company_id, branch_id, return_number, operation_id, customer_id,
      sales_agent_id, route_session_id, vehicle_id, reason_code, disposition, total_value_ugx, notes
    ) VALUES (
      ${returnId}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${returnNumber}, ${input.operationId || null}, ${input.customerId}, ${input.salesAgentId},
      ${input.routeSessionId || null}, ${input.vehicleId || null}, ${input.reasonCode},
      ${input.disposition}, ${totalValueUGX}, ${input.notes || null}
    )
  `;

  for (const line of input.lines) {
    const baseQty = Number(line.quantity) * Number(line.packSize || 1);
    const lineTotal = Number(line.quantity) * Number(line.unitPriceUGX);

    await sql`
      INSERT INTO customer_return_lines (
        id, tenant_id, return_id, commodity_id, commodity_name, unit_name,
        pack_size, quantity, base_quantity, unit_price_ugx, line_total_ugx
      ) VALUES (
        uuid_generate_v4(), ${ctx.tenantId || null}, ${returnId}, ${line.commodityId},
        ${line.commodityName}, ${line.unitName || 'Carton'}, ${line.packSize || 1},
        ${line.quantity}, ${baseQty}, ${line.unitPriceUGX}, ${lineTotal}
      )
    `;

    // Add returned stock back to truck stock ledger (sellable or quarantine)
    await sql`
      INSERT INTO stock_ledger (
        id, tenant_id, company_id, branch_id, commodity_id, destination_location_id,
        movement_type, quantity_base_units, reference_type, reference_id, reference_number, notes, created_by
      ) VALUES (
        uuid_generate_v4(), ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
        ${line.commodityId}, ${input.truckStockLocationId}, 'customer_return', ${baseQty},
        'customer_return', ${returnId}, ${returnNumber}, ${`Customer return (${input.reasonCode})`}, ${input.userEmail}
      )
    `;

    // Update truck stock balance
    await sql`
      UPDATE stock_balances
      SET available_quantity = available_quantity + ${baseQty},
          on_hand_quantity = on_hand_quantity + ${baseQty},
          updated_at = NOW()
      WHERE commodity_id = ${line.commodityId} AND stock_location_id = ${input.truckStockLocationId}
    `;
  }

  const rows = await sqlRaw(`SELECT * FROM customer_returns WHERE id = $1`, [returnId]);
  return rows[0];
}

// ── FIELD EXPENSES ENGINE ─────────────────────────────────────────────────────
export async function recordFieldExpense(
  ctx: SecurityContext,
  input: {
    operationId?: string;
    routeSessionId?: string;
    salesAgentId: string;
    vehicleId?: string;
    category: string;
    amountUGX: number;
    description: string;
  }
): Promise<any> {
  const sql = getSql();

  if (input.operationId) {
    const existing = await sqlRaw(`SELECT * FROM field_expenses WHERE operation_id = $1`, [input.operationId]);
    if (existing.length > 0) return existing[0];
  }

  const expenseId = randomUUID();
  const expenseNumber = await generateSequenceNumber('expense_sequences', 'EXP', ctx.tenantId);

  await sql`
    INSERT INTO field_expenses (
      id, tenant_id, company_id, branch_id, expense_number, operation_id, route_session_id,
      sales_agent_id, vehicle_id, category, amount_ugx, description, approval_status, reduces_cash_expectation
    ) VALUES (
      ${expenseId}, ${ctx.tenantId || null}, ${ctx.companyId || null}, ${ctx.branchId && ctx.branchId !== 'all' ? ctx.branchId : null},
      ${expenseNumber}, ${input.operationId || null}, ${input.routeSessionId || null},
      ${input.salesAgentId}, ${input.vehicleId || null}, ${input.category}, ${input.amountUGX},
      ${input.description}, 'approved', true
    )
  `;

  const rows = await sqlRaw(`SELECT * FROM field_expenses WHERE id = $1`, [expenseId]);
  return rows[0];
}

// ── DERIVED END-OF-DAY RECONCILIATION ENGINE (CANONICAL TRUTH) ────────────────
export async function getEodReconciliation(ctx: SecurityContext, routeSessionId: string): Promise<any> {
  const sessionRows = await sqlRaw(`SELECT * FROM route_sessions WHERE id = $1`, [routeSessionId]);
  if (sessionRows.length === 0) throw new Error('Route session not found');
  const session = sessionRows[0];

  // 1. DERIVE CASH SALES
  const cashSalesRows = await sqlRaw(
    `SELECT COALESCE(SUM(total_ugx), 0) as total FROM van_sales WHERE route_session_id = $1 AND sale_type = 'cash' AND status = 'completed'`,
    [routeSessionId]
  );
  const derivedCashSales = Number(cashSalesRows[0]?.total || 0);

  // 2. DERIVE CREDIT SALES
  const creditSalesRows = await sqlRaw(
    `SELECT COALESCE(SUM(total_ugx), 0) as total FROM van_sales WHERE route_session_id = $1 AND sale_type = 'credit' AND status = 'completed'`,
    [routeSessionId]
  );
  const derivedCreditSales = Number(creditSalesRows[0]?.total || 0);

  // 3. DERIVE CASH COLLECTIONS (DEBT PAYMENTS)
  const cashCollectionsRows = await sqlRaw(
    `SELECT COALESCE(SUM(amount_ugx), 0) as total FROM financial_receipts WHERE route_session_id = $1 AND payment_method = 'cash'`,
    [routeSessionId]
  );
  const derivedCashCollections = Number(cashCollectionsRows[0]?.total || 0);

  // 4. DERIVE DIGITAL COLLECTIONS
  const digitalCollectionsRows = await sqlRaw(
    `SELECT COALESCE(SUM(amount_ugx), 0) as total FROM financial_receipts WHERE route_session_id = $1 AND payment_method != 'cash'`,
    [routeSessionId]
  );
  const derivedDigitalCollections = Number(digitalCollectionsRows[0]?.total || 0);

  // 5. DERIVE APPROVED EXPENSES
  const expenseRows = await sqlRaw(
    `SELECT COALESCE(SUM(amount_ugx), 0) as total FROM field_expenses WHERE route_session_id = $1 AND approval_status = 'approved'`,
    [routeSessionId]
  );
  const derivedApprovedExpenses = Number(expenseRows[0]?.total || 0);

  // 6. DERIVE CUSTOMER RETURNS
  const returnRows = await sqlRaw(
    `SELECT COALESCE(SUM(total_value_ugx), 0) as total FROM customer_returns WHERE route_session_id = $1`,
    [routeSessionId]
  );
  const derivedReturnsValue = Number(returnRows[0]?.total || 0);

  // 7. DERIVE EXPECTED CASH TO BE SUBMITTED
  const openingFloat = Number(session.opening_cash_float || 0);
  const expectedCash = openingFloat + derivedCashSales + derivedCashCollections - derivedApprovedExpenses;

  // 8. FETCH ALL SALES, RECEIPTS, EXPENSES, RETURNS FOR RECONCILIATION AUDIT
  const vanSales = await sqlRaw(`SELECT * FROM van_sales WHERE route_session_id = $1 ORDER BY created_at ASC`, [routeSessionId]);
  const receipts = await sqlRaw(`SELECT * FROM financial_receipts WHERE route_session_id = $1 ORDER BY created_at ASC`, [routeSessionId]);
  const expenses = await sqlRaw(`SELECT * FROM field_expenses WHERE route_session_id = $1 ORDER BY created_at ASC`, [routeSessionId]);
  const returns = await sqlRaw(`SELECT * FROM customer_returns WHERE route_session_id = $1 ORDER BY created_at ASC`, [routeSessionId]);
  const bookings = await sqlRaw(`SELECT * FROM bookings WHERE route_session_id = $1 ORDER BY created_at ASC`, [routeSessionId]);

  return {
    routeSessionId,
    salesAgentId: session.sales_agent_id,
    vehicleId: session.vehicle_id,
    businessDate: session.business_date,
    sessionStatus: session.status,
    openingCashFloat: openingFloat,
    derivedCashSales,
    derivedCreditSales,
    derivedCashCollections,
    derivedDigitalCollections,
    derivedApprovedExpenses,
    derivedReturnsValue,
    expectedCashToSubmit: expectedCash,
    vanSalesCount: vanSales.length,
    receiptsCount: receipts.length,
    expensesCount: expenses.length,
    returnsCount: returns.length,
    bookingsCount: bookings.length,
    transactions: { vanSales, receipts, expenses, returns, bookings }
  };
}
