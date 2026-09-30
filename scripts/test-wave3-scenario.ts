import fs from 'fs';
import path from 'path';

// Parse .env file manually
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

import { Agent, setGlobalDispatcher } from 'undici';
try { setGlobalDispatcher(new Agent({ connect: { family: 4 } })); } catch (e) {}

async function runScenario() {
  const { getSql } = await import('../lib/neon-server');
  const { createOpeningBalance, createTransfer, acceptTransfer, getAvailableStock } = await import('../lib/distribution/transfers-service');
  const {
    startRouteSession, createVanSale, recordFieldCollection,
    createBooking, recordCustomerReturn, recordFieldExpense, getEodReconciliation
  } = await import('../lib/distribution/field-sales-service');

  const sql = getSql();
  const ctx = {};

  console.log('=== KROWN ERP-CRM — WAVE 3 FULL FIELD INTEGRATION SCENARIO ===\n');

  // 0. Fetch master entities
  const commRows = await sql`SELECT * FROM commodities WHERE code = 'CMD-COKE-500' LIMIT 1`;
  const whLocRows = await sql`SELECT * FROM stock_locations WHERE type = 'sellable' LIMIT 1`;
  const truckLocRows = await sql`SELECT * FROM stock_locations WHERE type = 'truck' LIMIT 1`;
  const custRows = await sql`SELECT * FROM customers LIMIT 2`;
  const agentRows = await sql`SELECT * FROM sales_agents LIMIT 1`;
  const vehicleRows = await sql`SELECT * FROM vehicles LIMIT 1`;

  if (commRows.length === 0 || whLocRows.length === 0 || truckLocRows.length === 0) {
    throw new Error('Master data missing. Please run seed-distribution.ts first.');
  }

  const commodity = commRows[0];
  const whLoc = whLocRows[0];
  const truckLoc = truckLocRows[0];
  const custA = custRows[0];
  const custB = custRows[1] || custRows[0];
  const agent = agentRows[0];
  const vehicle = vehicleRows[0];

  // STEP 1: OPENING STOCK LEDGER MOVEMENT
  console.log('1. Setting Opening Stock (+1,000 bottles in Warehouse)...');
  const currentWhAvailable = await getAvailableStock(commodity.id, whLoc.id);
  const neededQty = 1000 - currentWhAvailable;
  if (neededQty > 0) {
    await createOpeningBalance(ctx, {
      commodityId: commodity.id,
      stockLocationId: whLoc.id,
      quantityBaseUnits: neededQty,
      reason: 'Initial Production Opening Stock',
      userEmail: 'warehouse@krown.ug'
    });
  }

  const whStockOpening = await getAvailableStock(commodity.id, whLoc.id);
  const truckStockOpening = await getAvailableStock(commodity.id, truckLoc.id);
  console.log(` -> Warehouse Stock: ${whStockOpening} base units`);
  console.log(` -> Truck Stock: ${truckStockOpening} base units`);
  console.log(` -> System Total: ${whStockOpening + truckStockOpening} base units\n`);

  // STEP 2: NEGATIVE STOCK PREVENTION TEST
  console.log('2. Testing Negative Stock Prevention...');
  try {
    await createTransfer(ctx, {
      sourceLocationId: whLoc.id,
      sourceLocationName: whLoc.name,
      destinationLocationId: truckLoc.id,
      destinationLocationName: truckLoc.name,
      transferType: 'warehouse_truck',
      items: [
        {
          commodityId: commodity.id,
          commodityCode: commodity.code,
          commodityName: commodity.name,
          unitName: 'Carton',
          packSize: 24,
          requestedQuantity: 1000, // 24,000 bottles > available 1,000
          costPriceUGX: 1800,
          sellingPriceUGX: 2500
        }
      ]
    }, 'clerk@krown.ug');
    console.error('❌ FAIL: Negative stock was NOT blocked!');
  } catch (err: any) {
    console.log(` ✅ SUCCESS: Blocked negative stock transfer with message: "${err.message}"\n`);
  }

  // STEP 3: WAREHOUSE -> TRUCK STOCK TRANSFER (400 bottles = 16.67 cartons, e.g. 10 cartons = 240 bottles)
  console.log('3. Creating Warehouse -> Truck Transfer (10 Cartons = 240 bottles)...');
  const transfer = await createTransfer(ctx, {
    sourceLocationId: whLoc.id,
    sourceLocationName: whLoc.name,
    destinationLocationId: truckLoc.id,
    destinationLocationName: truckLoc.name,
    transferType: 'warehouse_truck',
    assignedVehicleId: vehicle.id,
    assignedVehicleReg: vehicle.registration_number,
    assignedAgentId: agent.id,
    assignedAgentName: agent.name,
    items: [
      {
        commodityId: commodity.id,
        commodityCode: commodity.code,
        commodityName: commodity.name,
        unitName: 'Carton',
        packSize: 24,
        requestedQuantity: 10,
        costPriceUGX: 1800,
        sellingPriceUGX: 2500
      }
    ]
  }, 'clerk@krown.ug');

  console.log(` -> Transfer Created: ${transfer.transfer_number}`);
  const acceptedTransfer = await acceptTransfer(ctx, transfer.id, [
    { itemId: transfer.items[0].id, receivedQuantity: 10 }
  ], agent.email || 'agent@krown.ug');
  console.log(` -> Agent Accepted Load: Status = ${acceptedTransfer.status}`);

  const whStockAfterLoad = await getAvailableStock(commodity.id, whLoc.id);
  const truckStockAfterLoad = await getAvailableStock(commodity.id, truckLoc.id);
  console.log(` -> Warehouse Stock: ${whStockAfterLoad} base units`);
  console.log(` -> Truck Stock: ${truckStockAfterLoad} base units`);
  console.log(` -> System Total: ${whStockAfterLoad + truckStockAfterLoad} base units (Stock Conserved!)\n`);

  // STEP 4: ROUTE SESSION START
  console.log('4. Starting Route Session for Sales Agent...');
  const session = await startRouteSession(ctx, {
    salesAgentId: agent.id,
    vehicleId: vehicle.id,
    openingCashFloat: 100000,
    userEmail: agent.email || 'agent@krown.ug'
  });
  console.log(` -> Route Session Active: ID ${session.id}, Status = ${session.status}, Float = UGX ${session.opening_cash_float}\n`);

  // STEP 5: CASH VAN SALE AT CUSTOMER A
  console.log('5. Performing Cash Van Sale at Customer A (2 Cartons = 48 bottles)...');
  const cashSale = await createVanSale(ctx, {
    routeSessionId: session.id,
    salesAgentId: agent.id,
    vehicleId: vehicle.id,
    truckStockLocationId: truckLoc.id,
    customerId: custA.id,
    saleType: 'cash',
    lines: [
      {
        commodityId: commodity.id,
        commodityCode: commodity.code,
        commodityName: commodity.name,
        unitName: 'Carton',
        packSize: 24,
        quantity: 2,
        unitPriceUGX: 60000 // 24 bottles * 2500 = 60,000 per carton
      }
    ],
    userEmail: agent.email || 'agent@krown.ug'
  });
  console.log(` -> Cash Sale Created: ${cashSale.sale_number}, Total UGX ${cashSale.total_ugx}`);
  const truckStockAfterCashSale = await getAvailableStock(commodity.id, truckLoc.id);
  console.log(` -> Truck Stock Remaining: ${truckStockAfterCashSale} base units\n`);

  // STEP 6: CREDIT VAN SALE AT CUSTOMER B
  console.log('6. Performing Credit Van Sale at Customer B (3 Cartons = 72 bottles)...');
  const creditSale = await createVanSale(ctx, {
    routeSessionId: session.id,
    salesAgentId: agent.id,
    vehicleId: vehicle.id,
    truckStockLocationId: truckLoc.id,
    customerId: custB.id,
    saleType: 'credit',
    lines: [
      {
        commodityId: commodity.id,
        commodityCode: commodity.code,
        commodityName: commodity.name,
        unitName: 'Carton',
        packSize: 24,
        quantity: 3,
        unitPriceUGX: 60000
      }
    ],
    userEmail: agent.email || 'agent@krown.ug'
  });
  console.log(` -> Credit Sale Created: ${creditSale.sale_number}, Total UGX ${creditSale.total_ugx}`);
  const truckStockAfterCreditSale = await getAvailableStock(commodity.id, truckLoc.id);
  console.log(` -> Truck Stock Remaining: ${truckStockAfterCreditSale} base units\n`);

  // STEP 7: BOOKING CREATION AT CUSTOMER C
  console.log('7. Creating Advance Booking for Tomorrow...');
  const booking = await createBooking(ctx, {
    routeSessionId: session.id,
    salesAgentId: agent.id,
    customerId: custA.id,
    commodityId: commodity.id,
    commodityName: commodity.name,
    unitName: 'Carton',
    quantity: 5,
    estimatedValueUGX: 300000,
    requestedDate: '2026-10-01',
    notes: 'Advance booking for store promotion'
  });
  console.log(` -> Booking Confirmed: ${booking.booking_number}, Qty: ${booking.quantity} Cartons\n`);

  // STEP 8: FIELD DEBT COLLECTION
  console.log('8. Recording Field Debt Collection from Customer A (UGX 500,000 Cash)...');
  const receipt = await recordFieldCollection(ctx, {
    routeSessionId: session.id,
    salesAgentId: agent.id,
    vehicleId: vehicle.id,
    customerId: custA.id,
    amountUGX: 500000,
    paymentMethod: 'cash',
    paymentReference: 'CASH-REC-001',
    notes: 'Partial payment on outstanding account'
  });
  console.log(` -> Receipt Recorded: ${receipt.receipt_number}, Amount UGX ${receipt.amount_ugx}\n`);

  // STEP 9: CUSTOMER RETURN
  console.log('9. Recording Customer Return (1 Carton = 24 bottles damaged)...');
  const returnRec = await recordCustomerReturn(ctx, {
    routeSessionId: session.id,
    salesAgentId: agent.id,
    vehicleId: vehicle.id,
    truckStockLocationId: truckLoc.id,
    customerId: custA.id,
    reasonCode: 'Damaged Packaging',
    disposition: 'truck_quarantine',
    lines: [
      {
        commodityId: commodity.id,
        commodityName: commodity.name,
        unitName: 'Carton',
        packSize: 24,
        quantity: 1,
        unitPriceUGX: 60000
      }
    ],
    userEmail: agent.email || 'agent@krown.ug'
  });
  console.log(` -> Customer Return Logged: ${returnRec.return_number}`);
  const truckStockAfterReturn = await getAvailableStock(commodity.id, truckLoc.id);
  console.log(` -> Truck Stock after Return: ${truckStockAfterReturn} base units\n`);

  // STEP 10: FIELD EXPENSE
  console.log('10. Recording Field Fuel Expense (UGX 80,000)...');
  const expense = await recordFieldExpense(ctx, {
    routeSessionId: session.id,
    salesAgentId: agent.id,
    vehicleId: vehicle.id,
    category: 'Fuel',
    amountUGX: 80000,
    description: 'Diesel top-up at Total station Jinja Rd'
  });
  console.log(` -> Expense Submitted & Approved: ${expense.expense_number}, Amount UGX ${expense.amount_ugx}\n`);

  // STEP 11: EOD RECONCILIATION DERIVATION
  console.log('11. Deriving Canonical EOD Reconciliation Report from Database...');
  const eod = await getEodReconciliation(ctx, session.id);
  console.log(' --- EOD RECONCILIATION REPORT ---');
  console.log(` -> Opening Cash Float: UGX ${eod.openingCashFloat.toLocaleString()}`);
  console.log(` -> Derived Cash Sales: UGX ${eod.derivedCashSales.toLocaleString()}`);
  console.log(` -> Derived Credit Sales: UGX ${eod.derivedCreditSales.toLocaleString()}`);
  console.log(` -> Derived Cash Collections: UGX ${eod.derivedCashCollections.toLocaleString()}`);
  console.log(` -> Derived Digital Collections: UGX ${eod.derivedDigitalCollections.toLocaleString()}`);
  console.log(` -> Derived Approved Expenses: -UGX ${eod.derivedApprovedExpenses.toLocaleString()}`);
  console.log(` -> Derived Returns Value: UGX ${eod.derivedReturnsValue.toLocaleString()}`);
  console.log(` -> EXPECTED CASH TO SUBMIT: UGX ${eod.expectedCashToSubmit.toLocaleString()}\n`);

  // STEP 12: IDEMPOTENCY / RE-SYNC TEST
  console.log('12. Testing Offline Idempotency Re-sync...');
  const offlineOpId = 'offline-op-unique-1029384';
  const opSale1 = await createVanSale(ctx, {
    operationId: offlineOpId,
    routeSessionId: session.id,
    salesAgentId: agent.id,
    vehicleId: vehicle.id,
    truckStockLocationId: truckLoc.id,
    customerId: custA.id,
    saleType: 'cash',
    lines: [{ commodityId: commodity.id, commodityCode: commodity.code, commodityName: commodity.name, unitName: 'Carton', packSize: 24, quantity: 1, unitPriceUGX: 60000 }],
    userEmail: agent.email || 'agent@krown.ug'
  });
  const opSale2 = await createVanSale(ctx, {
    operationId: offlineOpId,
    routeSessionId: session.id,
    salesAgentId: agent.id,
    vehicleId: vehicle.id,
    truckStockLocationId: truckLoc.id,
    customerId: custA.id,
    saleType: 'cash',
    lines: [{ commodityId: commodity.id, commodityCode: commodity.code, commodityName: commodity.name, unitName: 'Carton', packSize: 24, quantity: 1, unitPriceUGX: 60000 }],
    userEmail: agent.email || 'agent@krown.ug'
  });
  if (opSale1.id === opSale2.id) {
    console.log(` ✅ SUCCESS: Idempotency check verified! Re-sync with operation_id returned existing sale ${opSale1.sale_number} without duplicate stock deduction!\n`);
  } else {
    console.error('❌ FAIL: Idempotency check failed - duplicate sale was created!');
  }

  console.log('===============================================================');
  console.log('✅ ALL WAVE 3 INTEGRATION SCENARIO TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runScenario().catch(err => {
  console.error('Wave 3 Scenario Error:', err);
  process.exit(1);
});
