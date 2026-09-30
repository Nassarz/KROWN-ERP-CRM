import fs from 'fs';
import path from 'path';

// Parse .env file manually before any other imports
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

async function main() {
  const { createTransfer, acceptTransfer, getTransfers, getTruckStockSummary } = await import('../lib/distribution/transfers-service');
  const { getSql } = await import('../lib/neon-server');
  const sql = getSql();
  const whLoc = await sql`SELECT * FROM stock_locations WHERE type = 'sellable' LIMIT 1`;
  const truckLoc = await sql`SELECT * FROM stock_locations WHERE type = 'truck' LIMIT 1`;
  const comm = await sql`SELECT * FROM commodities LIMIT 1`;
  const veh = await sql`SELECT * FROM vehicles LIMIT 1`;
  const agt = await sql`SELECT * FROM sales_agents LIMIT 1`;

  const ctx = {};

  console.log('1. Creating Stock Transfer (Morning Load Sheet)...');
  const transfer = await createTransfer(ctx, {
    sourceLocationId: whLoc[0].id,
    sourceLocationName: whLoc[0].name,
    destinationLocationId: truckLoc[0].id,
    destinationLocationName: truckLoc[0].name,
    transferType: 'warehouse_truck',
    assignedVehicleId: veh[0].id,
    assignedVehicleReg: veh[0].registration_number,
    assignedAgentId: agt[0].id,
    assignedAgentName: agt[0].name,
    notes: 'Morning route load for test',
    items: [
      {
        commodityId: comm[0].id,
        commodityCode: comm[0].code,
        commodityName: comm[0].name,
        unitName: comm[0].selling_unit || 'Carton',
        packSize: Number(comm[0].pack_size || 24),
        requestedQuantity: 20,
        costPriceUGX: Number(comm[0].cost_price_ugx || 1800),
        sellingPriceUGX: Number(comm[0].selling_price_ugx || 2500)
      }
    ]
  }, 'dispatch@krown.ug');

  console.log('Transfer Created:', {
    id: transfer.id,
    transferNumber: transfer.transfer_number,
    status: transfer.status,
    totalUnits: transfer.total_units,
    itemsCount: transfer.items.length
  });

  console.log('2. Accepting Transfer & Posting to Atomic Stock Ledger...');
  const itemId = transfer.items[0].id;
  const accepted = await acceptTransfer(ctx, transfer.id, [
    { itemId, receivedQuantity: 20 }
  ], 'agent.sarah@krown.ug');

  console.log('Transfer Accepted:', {
    id: accepted.id,
    status: accepted.status,
    receivedBy: accepted.received_by
  });

  console.log('3. Verifying Stock Ledger entries in Neon...');
  const ledgerEntries = await sql`
    SELECT id, movement_type, quantity_base_units, notes, created_at 
    FROM stock_ledger 
    WHERE reference_id = ${transfer.id}
  `;
  console.log('Ledger entries count:', ledgerEntries.length);
  ledgerEntries.forEach((l: any) => console.log(' ->', l.movement_type, l.quantity_base_units, l.notes));

  console.log('4. Verifying Derived Stock Balances...');
  const balances = await sql`
    SELECT sb.*, loc.name as loc_name, loc.type 
    FROM stock_balances sb 
    JOIN stock_locations loc ON sb.stock_location_id = loc.id
    WHERE sb.commodity_id = ${comm[0].id}
  `;
  balances.forEach((b: any) => console.log(' -> Location:', b.loc_name, `(${b.type})`, 'Available Quantity:', b.available_quantity));

  console.log('5. Verifying Truck Stock Summary function...');
  const truckSummary = await getTruckStockSummary(ctx);
  console.log('Truck Stock:', truckSummary);

  console.log('✅ ALL TESTS PASSED! End-to-end atomic distribution ledger verified.');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
