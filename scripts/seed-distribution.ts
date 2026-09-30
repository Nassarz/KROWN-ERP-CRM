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

async function seed() {
  const {
    saveCommodity, saveCustomer, saveSupplier, saveWarehouse,
    saveVehicle, saveAgent, saveRoute, saveDevice
  } = await import('../lib/distribution/service');
  const { getSql } = await import('../lib/neon-server');

  console.log('--- Seeding KROWN Distribution Master Data into Neon ---');
  const ctx = {};

  // Check if commodities exist
  const sql = getSql();
  const existing = await sql`SELECT count(*) FROM commodities`;
  if (Number(existing[0]?.count || 0) > 0) {
    console.log('Database already has distribution commodities. Skipping seed.');
    return;
  }

  // 1. Commodities
  console.log('1. Seeding Commodities...');
  const c1 = await saveCommodity(ctx, {
    code: 'CMD-COKE-500', sku: 'SKU-COKE-500ML', barcode: '5449000000996',
    name: 'Coca-Cola 500ml PET', description: 'Refreshing carbonated soft drink 500ml',
    categoryName: 'Beverages', brand: 'Coca-Cola', variant: 'Original',
    baseUnit: 'Bottle', sellingUnit: 'Carton', purchaseUnit: 'Pallet',
    packSize: 24, cartonSize: 24, weightKg: 13.2, volumeCbm: 0.025,
    costPriceUGX: 1800, sellingPriceUGX: 2500, wholesalePriceUGX: 2200, distributorPriceUGX: 2000,
    supplierName: 'Century Bottling Company', minStock: 500, maxStock: 10000, reorderLevel: 1000, status: 'active'
  });

  const c2 = await saveCommodity(ctx, {
    code: 'CMD-WATER-500', sku: 'SKU-RWEN-500ML', barcode: '6001000111222',
    name: 'Rwenzori Mineral Water 500ml', description: 'Pure natural mineral water 500ml',
    categoryName: 'Beverages', brand: 'Rwenzori', variant: 'Natural',
    baseUnit: 'Bottle', sellingUnit: 'Carton', purchaseUnit: 'Pallet',
    packSize: 24, cartonSize: 24, weightKg: 12.5, volumeCbm: 0.022,
    costPriceUGX: 700, sellingPriceUGX: 1200, wholesalePriceUGX: 1000, distributorPriceUGX: 850,
    supplierName: 'Rwenzori Bottling Ltd', minStock: 1000, maxStock: 20000, reorderLevel: 2000, status: 'active'
  });

  const c3 = await saveCommodity(ctx, {
    code: 'CMD-JUICE-1L', sku: 'SKU-MINUTE-1L', barcode: '5449000123456',
    name: 'Minute Maid Pulpy Orange 1L', description: 'Real fruit juice drink with orange pulp 1L',
    categoryName: 'Beverages', brand: 'Minute Maid', variant: 'Pulpy Orange',
    baseUnit: 'Bottle', sellingUnit: 'Carton', purchaseUnit: 'Pallet',
    packSize: 12, cartonSize: 12, weightKg: 12.8, volumeCbm: 0.028,
    costPriceUGX: 3500, sellingPriceUGX: 5000, wholesalePriceUGX: 4500, distributorPriceUGX: 4000,
    supplierName: 'Century Bottling Company', minStock: 300, maxStock: 5000, reorderLevel: 500, status: 'active'
  });

  // 2. Customers
  console.log('2. Seeding Customers...');
  await saveCustomer(ctx, {
    code: 'CUST-ABC-NTINDA', name: 'ABC Supermarket (Ntinda Branch)', customerType: 'retailer',
    customerGroup: 'Key Accounts', taxId: '1000293841', contactPerson: 'John Mukasa',
    phone: '+256 772 100 200', email: 'ntinda@abcsupermarket.ug', address: 'Plot 45 Ntinda Shopping Centre, Kampala',
    creditLimitUGX: 10000000, creditDays: 30, outstandingBalanceUGX: 4200000, availableCreditUGX: 5800000, status: 'active'
  });
  await saveCustomer(ctx, {
    code: 'CUST-QUAL-KAMP', name: 'Quality Wholesalers East', customerType: 'wholesaler',
    customerGroup: 'Tier 1 Wholesale', taxId: '1001849204', contactPerson: 'Sarah Namubiru',
    phone: '+256 752 300 400', email: 'sales@qualitywholesalers.co.ug', address: 'Kisenyi Bus Terminal Rd, Kampala',
    creditLimitUGX: 30000000, creditDays: 45, outstandingBalanceUGX: 12500000, availableCreditUGX: 17500000, status: 'active'
  });
  await saveCustomer(ctx, {
    code: 'CUST-NAND-ENT', name: 'Nalubega Mini Mart Entebbe', customerType: 'retailer',
    customerGroup: 'Standard Retail', contactPerson: 'Grace Nalubega',
    phone: '+256 701 555 888', address: 'Airport Road, Entebbe Town',
    creditLimitUGX: 3000000, creditDays: 14, outstandingBalanceUGX: 850000, availableCreditUGX: 2150000, status: 'active'
  });

  // 3. Suppliers
  console.log('3. Seeding Suppliers...');
  await saveSupplier(ctx, {
    code: 'SUP-CENTURY', name: 'Century Bottling Company Ltd', category: 'Beverages & Soft Drinks',
    taxId: '1000012345', contactPerson: 'David Ochieng', phone: '+256 414 330 000',
    email: 'orders@centurybottling.com', address: 'Namanve Industrial Park, Jinja Road, Kampala',
    paymentTermsDays: 30, creditLimitUGX: 150000000, currentPayableUGX: 42500000, performanceRating: 4.8, status: 'active'
  });
  await saveSupplier(ctx, {
    code: 'SUP-RWENZORI', name: 'Rwenzori Beverages Ltd', category: 'Water & Hydration',
    taxId: '1000098765', contactPerson: 'Florence Akello', phone: '+256 312 260 100',
    email: 'sales@rwenzoribeverages.ug', address: 'Plot 12 Namanve Industrial Area',
    paymentTermsDays: 30, creditLimitUGX: 80000000, currentPayableUGX: 18200000, performanceRating: 4.6, status: 'active'
  });

  // 4. Warehouses (auto creates stock locations)
  console.log('4. Seeding Warehouses & Stock Locations...');
  const wh1 = await saveWarehouse(ctx, {
    code: 'WH-MAIN-KLA', name: 'Central Distribution Warehouse Namanve', type: 'main',
    address: 'Plot 88 Industrial Logistics Hub, Namanve', managerName: 'Robert Kiggundu', capacitySqm: 2500, status: 'active'
  });
  const wh2 = await saveWarehouse(ctx, {
    code: 'WH-REG-ENT', name: 'Entebbe Regional Depot', type: 'regional',
    address: 'Kitooro Rd, Entebbe', managerName: 'Patrick Musoke', capacitySqm: 800, status: 'active'
  });

  // 5. Vehicles (auto creates truck stock locations)
  console.log('5. Seeding Fleet & Truck Stock Locations...');
  const v1 = await saveVehicle(ctx, {
    registrationNumber: 'UGX 123A', make: 'Isuzu', model: 'NPR 75 4-Tonne Box Body',
    vehicleType: 'truck', volumeCapacityCbm: 18.5, weightCapacityKg: 4500,
    assignedDriverName: 'Francis Kato', assignedAgentName: 'Sarah Namatovu',
    currentMileage: 48200, fuelLevel: 'full', status: 'active'
  });
  const v2 = await saveVehicle(ctx, {
    registrationNumber: 'UAX 302K', make: 'Mitsubishi', model: 'Canter 3-Tonne Van',
    vehicleType: 'van', volumeCapacityCbm: 12.0, weightCapacityKg: 3000,
    assignedDriverName: 'James Ssebugwawo', assignedAgentName: 'Peter Wasswa',
    currentMileage: 62400, fuelLevel: 'three_quarter', status: 'active'
  });

  // 6. Sales Agents
  console.log('6. Seeding Sales Agents...');
  await saveAgent(ctx, {
    agentCode: 'AGT-SARAH-01', name: 'Sarah Namatovu', email: 'sarah.n@krown.ug', phone: '+256 772 444 555',
    territoryName: 'Kampala East & North', assignedVehicleReg: 'UGX 123A',
    cashLimitUGX: 10000000, canGiveCredit: true, maxDiscountPct: 7.5, status: 'active'
  });
  await saveAgent(ctx, {
    agentCode: 'AGT-PETER-02', name: 'Peter Wasswa', email: 'peter.w@krown.ug', phone: '+256 752 999 111',
    territoryName: 'Greater Entebbe Corridor', assignedVehicleReg: 'UAX 302K',
    cashLimitUGX: 5000000, canGiveCredit: false, maxDiscountPct: 5.0, status: 'active'
  });

  // 7. Routes
  console.log('7. Seeding Routes...');
  await saveRoute(ctx, {
    code: 'RT-KAMP-NORTH', name: 'Kampala North Route (Ntinda - Kisaasi - Ntinda)',
    territoryName: 'Kampala East & North', assignedAgentName: 'Sarah Namatovu',
    assignedVehicleReg: 'UGX 123A', operatingDays: ['Monday', 'Wednesday', 'Friday'], status: 'active'
  });
  await saveRoute(ctx, {
    code: 'RT-ENT-COAST', name: 'Entebbe Coastal Route (Airport Rd - Kitooro)',
    territoryName: 'Greater Entebbe Corridor', assignedAgentName: 'Peter Wasswa',
    assignedVehicleReg: 'UAX 302K', operatingDays: ['Tuesday', 'Thursday', 'Saturday'], status: 'active'
  });

  // 8. Devices
  console.log('8. Seeding Mobile Devices...');
  await saveDevice(ctx, {
    deviceName: 'Rugged Handheld POS 01', deviceType: 'Android POS Terminal (NFC + Thermal Printer)',
    serialNumber: 'POS-UG-2026-9081', imei: '864920194820194', appVersion: 'v2.4.0',
    assignedAgentName: 'Sarah Namatovu', status: 'trusted'
  });
  await saveDevice(ctx, {
    deviceName: 'Smart Van POS 02', deviceType: 'Android Mobile Terminal (Bluetooth Barcode)',
    serialNumber: 'POS-UG-2026-4412', imei: '864920194899123', appVersion: 'v2.4.0',
    assignedAgentName: 'Peter Wasswa', status: 'trusted'
  });

  console.log('✅ Seeding completed successfully!');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
