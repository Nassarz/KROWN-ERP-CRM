/**
 * KROWN ERP-CRM - Distribution Data Store & In-Memory Cache
 * Handles master data for Commodities, Customers, Suppliers, Warehouses, Vehicles, Agents, Routes, Devices
 */

import {
  Commodity, CommodityUnit, Customer, CustomerLocation, Supplier,
  Warehouse, StockLocation, Vehicle, SalesAgent, Territory, Route, RouteStop, Device
} from './distribution-types';

type Listener = () => void;

// Seed Data for Wave 1 Demonstration & Production Bootstrapping
const INITIAL_COMMODITIES: Commodity[] = [
  {
    id: 'cmd-001',
    code: 'CMD-COKE-500',
    sku: 'SKU-COKE-500ML',
    barcode: '5449000000996',
    name: 'Coca-Cola 500ml PET',
    description: 'Refreshing carbonated soft drink 500ml',
    categoryName: 'Beverages',
    brand: 'Coca-Cola',
    variant: 'Original',
    baseUnit: 'Bottle',
    sellingUnit: 'Carton',
    purchaseUnit: 'Pallet',
    packSize: 24,
    cartonSize: 24,
    weightKg: 13.2,
    volumeCbm: 0.025,
    costPriceUGX: 1800,
    sellingPriceUGX: 2500,
    wholesalePriceUGX: 2200,
    distributorPriceUGX: 2000,
    taxCategory: 'standard',
    supplierName: 'Century Bottling Company',
    minStock: 500,
    maxStock: 10000,
    reorderLevel: 1000,
    hasBatchTracking: true,
    hasExpiryTracking: true,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cmd-002',
    code: 'CMD-WATER-500',
    sku: 'SKU-RWEN-500ML',
    barcode: '6001000111222',
    name: 'Rwenzori Mineral Water 500ml',
    description: 'Pure natural mineral water 500ml',
    categoryName: 'Beverages',
    brand: 'Rwenzori',
    variant: 'Natural',
    baseUnit: 'Bottle',
    sellingUnit: 'Carton',
    purchaseUnit: 'Pallet',
    packSize: 24,
    cartonSize: 24,
    weightKg: 12.5,
    volumeCbm: 0.022,
    costPriceUGX: 700,
    sellingPriceUGX: 1200,
    wholesalePriceUGX: 1000,
    distributorPriceUGX: 850,
    taxCategory: 'standard',
    supplierName: 'Rwenzori Bottling Ltd',
    minStock: 1000,
    maxStock: 20000,
    reorderLevel: 2000,
    hasBatchTracking: true,
    hasExpiryTracking: true,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cmd-003',
    code: 'CMD-JUICE-1L',
    sku: 'SKU-MINUTE-1L',
    barcode: '5449000123456',
    name: 'Minute Maid Pulpy Orange 1L',
    description: 'Real fruit juice drink with orange pulp 1L',
    categoryName: 'Beverages',
    brand: 'Minute Maid',
    variant: 'Pulpy Orange',
    baseUnit: 'Bottle',
    sellingUnit: 'Carton',
    purchaseUnit: 'Pallet',
    packSize: 12,
    cartonSize: 12,
    weightKg: 12.8,
    volumeCbm: 0.028,
    costPriceUGX: 3500,
    sellingPriceUGX: 5000,
    wholesalePriceUGX: 4500,
    distributorPriceUGX: 4000,
    taxCategory: 'standard',
    supplierName: 'Century Bottling Company',
    minStock: 300,
    maxStock: 5000,
    reorderLevel: 500,
    hasBatchTracking: true,
    hasExpiryTracking: true,
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    code: 'CUST-ABC-NTINDA',
    name: 'ABC Supermarket (Ntinda Branch)',
    customerType: 'retailer',
    customerGroup: 'Key Accounts',
    taxId: '1000293841',
    contactPerson: 'John Mukasa',
    phone: '+256 772 100 200',
    email: 'ntinda@abcsupermarket.ug',
    address: 'Plot 45 Ntinda Shopping Centre, Kampala',
    creditLimitUGX: 10000000,
    creditDays: 30,
    outstandingBalanceUGX: 4200000,
    availableCreditUGX: 5800000,
    assignedAgentId: 'agent-001',
    defaultRouteId: 'route-001',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-002',
    code: 'CUST-QUAL-KAMP',
    name: 'Quality Wholesalers East',
    customerType: 'wholesaler',
    customerGroup: 'Tier 1 Wholesale',
    taxId: '1001849204',
    contactPerson: 'Sarah Namubiru',
    phone: '+256 752 300 400',
    email: 'sales@qualitywholesalers.co.ug',
    address: 'Kisenyi Bus Terminal Rd, Kampala',
    creditLimitUGX: 30000000,
    creditDays: 45,
    outstandingBalanceUGX: 12500000,
    availableCreditUGX: 17500000,
    assignedAgentId: 'agent-001',
    defaultRouteId: 'route-001',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-003',
    code: 'CUST-NAND-ENT',
    name: 'Nalubega Mini Mart Entebbe',
    customerType: 'retailer',
    customerGroup: 'Standard Retail',
    contactPerson: 'Grace Nalubega',
    phone: '+256 701 555 888',
    address: 'Airport Road, Entebbe Town',
    creditLimitUGX: 3000000,
    creditDays: 14,
    outstandingBalanceUGX: 850000,
    availableCreditUGX: 2150000,
    assignedAgentId: 'agent-002',
    defaultRouteId: 'route-002',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-001',
    code: 'SUP-CENTURY',
    name: 'Century Bottling Company Ltd',
    category: 'Beverages & Soft Drinks',
    taxId: '1000012345',
    contactPerson: 'David Ochieng',
    phone: '+256 414 330 000',
    email: 'orders@centurybottling.com',
    address: 'Namanve Industrial Park, Jinja Road, Kampala',
    paymentTermsDays: 30,
    creditLimitUGX: 150000000,
    currentPayableUGX: 42500000,
    performanceRating: 4.8,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sup-002',
    code: 'SUP-RWENZORI',
    name: 'Rwenzori Beverages Ltd',
    category: 'Water & Hydration',
    taxId: '1000098765',
    contactPerson: 'Florence Akello',
    phone: '+256 312 260 100',
    email: 'sales@rwenzoribeverages.ug',
    address: 'Plot 12 Namanve Industrial Area',
    paymentTermsDays: 30,
    creditLimitUGX: 80000000,
    currentPayableUGX: 18200000,
    performanceRating: 4.6,
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-001',
    code: 'WH-MAIN-KLA',
    name: 'Central Distribution Warehouse Namanve',
    type: 'main',
    address: 'Plot 88 Industrial Logistics Hub, Namanve',
    managerName: 'Robert Kiggundu',
    capacitySqm: 2500,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'wh-002',
    code: 'WH-REG-ENT',
    name: 'Entebbe Regional Depot',
    type: 'regional',
    address: 'Kitooro Rd, Entebbe',
    managerName: 'Patrick Musoke',
    capacitySqm: 800,
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh-001',
    registrationNumber: 'UGX 123A',
    make: 'Isuzu',
    model: 'NPR 75 4-Tonne Box Body',
    vehicleType: 'truck',
    volumeCapacityCbm: 18.5,
    weightCapacityKg: 4500,
    assignedDriverName: 'Francis Kato',
    assignedAgentName: 'Sarah Namatovu',
    assignedAgentId: 'agent-001',
    currentMileage: 48200,
    fuelLevel: 'full',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'veh-002',
    registrationNumber: 'UAX 302K',
    make: 'Mitsubishi',
    model: 'Canter 3-Tonne Van',
    vehicleType: 'van',
    volumeCapacityCbm: 12.0,
    weightCapacityKg: 3000,
    assignedDriverName: 'James Ssebugwawo',
    assignedAgentName: 'Peter Wasswa',
    assignedAgentId: 'agent-002',
    currentMileage: 62400,
    fuelLevel: 'three_quarter',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_AGENTS: SalesAgent[] = [
  {
    id: 'agent-001',
    staffId: 'staff-001',
    agentCode: 'AGT-SARAH-01',
    name: 'Sarah Namatovu',
    email: 'sarah.n@krown.ug',
    phone: '+256 772 444 555',
    territoryName: 'Kampala East & North',
    assignedVehicleReg: 'UGX 123A',
    assignedVehicleId: 'veh-001',
    assignedDeviceId: 'dev-001',
    supervisorName: 'Distribution Director',
    cashLimitUGX: 10000000,
    canGiveCredit: true,
    maxDiscountPct: 7.5,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'agent-002',
    staffId: 'staff-002',
    agentCode: 'AGT-PETER-02',
    name: 'Peter Wasswa',
    email: 'peter.w@krown.ug',
    phone: '+256 752 999 111',
    territoryName: 'Greater Entebbe Corridor',
    assignedVehicleReg: 'UAX 302K',
    assignedVehicleId: 'veh-002',
    assignedDeviceId: 'dev-002',
    supervisorName: 'Distribution Director',
    cashLimitUGX: 5000000,
    canGiveCredit: false,
    maxDiscountPct: 5.0,
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_TERRITORIES: Territory[] = [
  { id: 'ter-001', code: 'TER-KLA-EAST', name: 'Kampala East & North', region: 'Central Uganda', country: 'Uganda' },
  { id: 'ter-002', code: 'TER-ENT-CORR', name: 'Greater Entebbe Corridor', region: 'Wakiso District', country: 'Uganda' },
  { id: 'ter-003', code: 'TER-MUK-JIN', name: 'Mukono - Jinja Highway', region: 'Eastern Corridor', country: 'Uganda' }
];

const INITIAL_ROUTES: Route[] = [
  {
    id: 'route-001',
    code: 'RT-KAMP-NORTH',
    name: 'Kampala North Route (Ntinda - Kisaasi - Ntinda)',
    territoryName: 'Kampala East & North',
    assignedAgentName: 'Sarah Namatovu',
    assignedAgentId: 'agent-001',
    assignedVehicleReg: 'UGX 123A',
    assignedVehicleId: 'veh-001',
    operatingDays: ['Monday', 'Wednesday', 'Friday'],
    status: 'active'
  },
  {
    id: 'route-002',
    code: 'RT-ENT-COAST',
    name: 'Entebbe Coastal Route (Airport Rd - Kitooro)',
    territoryName: 'Greater Entebbe Corridor',
    assignedAgentName: 'Peter Wasswa',
    assignedAgentId: 'agent-002',
    assignedVehicleReg: 'UAX 302K',
    assignedVehicleId: 'veh-002',
    operatingDays: ['Tuesday', 'Thursday', 'Saturday'],
    status: 'active'
  }
];

const INITIAL_DEVICES: Device[] = [
  {
    id: 'dev-001',
    deviceName: 'Rugged Handheld POS 01',
    deviceType: 'Android POS Terminal (NFC + Thermal Printer)',
    serialNumber: 'POS-UG-2026-9081',
    imei: '864920194820194',
    osVersion: 'Android 13 Enterprise',
    appVersion: 'v2.4.0',
    assignedAgentName: 'Sarah Namatovu',
    assignedAgentId: 'agent-001',
    assignedVehicleId: 'veh-001',
    status: 'trusted',
    lastSyncAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'dev-002',
    deviceName: 'Rugged Handheld POS 02',
    deviceType: 'Android POS Terminal',
    serialNumber: 'POS-UG-2026-9082',
    imei: '864920194820195',
    osVersion: 'Android 13 Enterprise',
    appVersion: 'v2.4.0',
    assignedAgentName: 'Peter Wasswa',
    assignedAgentId: 'agent-002',
    assignedVehicleId: 'veh-002',
    status: 'trusted',
    lastSyncAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

class DistributionStore {
  private commodities: Commodity[] = INITIAL_COMMODITIES;
  private customers: Customer[] = INITIAL_CUSTOMERS;
  private suppliers: Supplier[] = INITIAL_SUPPLIERS;
  private warehouses: Warehouse[] = INITIAL_WAREHOUSES;
  private vehicles: Vehicle[] = INITIAL_VEHICLES;
  private agents: SalesAgent[] = INITIAL_AGENTS;
  private territories: Territory[] = INITIAL_TERRITORIES;
  private routes: Route[] = INITIAL_ROUTES;
  private devices: Device[] = INITIAL_DEVICES;

  private listeners: Listener[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const savedCmd = localStorage.getItem('krown_commodities');
      if (savedCmd) this.commodities = JSON.parse(savedCmd);

      const savedCust = localStorage.getItem('krown_customers');
      if (savedCust) this.customers = JSON.parse(savedCust);

      const savedSup = localStorage.getItem('krown_suppliers');
      if (savedSup) this.suppliers = JSON.parse(savedSup);

      const savedWh = localStorage.getItem('krown_warehouses');
      if (savedWh) this.warehouses = JSON.parse(savedWh);

      const savedVeh = localStorage.getItem('krown_vehicles');
      if (savedVeh) this.vehicles = JSON.parse(savedVeh);

      const savedAgt = localStorage.getItem('krown_agents');
      if (savedAgt) this.agents = JSON.parse(savedAgt);

      const savedRts = localStorage.getItem('krown_routes');
      if (savedRts) this.routes = JSON.parse(savedRts);

      const savedDev = localStorage.getItem('krown_devices');
      if (savedDev) this.devices = JSON.parse(savedDev);
    } catch (err) {
      console.warn('[DistributionStore] Failed to load local storage state:', err);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('krown_commodities', JSON.stringify(this.commodities));
      localStorage.setItem('krown_customers', JSON.stringify(this.customers));
      localStorage.setItem('krown_suppliers', JSON.stringify(this.suppliers));
      localStorage.setItem('krown_warehouses', JSON.stringify(this.warehouses));
      localStorage.setItem('krown_vehicles', JSON.stringify(this.vehicles));
      localStorage.setItem('krown_agents', JSON.stringify(this.agents));
      localStorage.setItem('krown_routes', JSON.stringify(this.routes));
      localStorage.setItem('krown_devices', JSON.stringify(this.devices));
    } catch (err) {
      console.warn('[DistributionStore] Failed to save local storage state:', err);
    }
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // Getters
  public getCommodities(): Commodity[] { return [...this.commodities]; }
  public getCustomers(): Customer[] { return [...this.customers]; }
  public getSuppliers(): Supplier[] { return [...this.suppliers]; }
  public getWarehouses(): Warehouse[] { return [...this.warehouses]; }
  public getVehicles(): Vehicle[] { return [...this.vehicles]; }
  public getAgents(): SalesAgent[] { return [...this.agents]; }
  public getTerritories(): Territory[] { return [...this.territories]; }
  public getRoutes(): Route[] { return [...this.routes]; }
  public getDevices(): Device[] { return [...this.devices]; }

  // Add / Edit Operations
  public saveCommodity(item: Commodity) {
    const idx = this.commodities.findIndex(c => c.id === item.id);
    if (idx >= 0) this.commodities[idx] = item;
    else this.commodities.unshift(item);
    this.saveToStorage();
  }

  public saveCustomer(item: Customer) {
    const idx = this.customers.findIndex(c => c.id === item.id);
    if (idx >= 0) this.customers[idx] = item;
    else this.customers.unshift(item);
    this.saveToStorage();
  }

  public saveSupplier(item: Supplier) {
    const idx = this.suppliers.findIndex(s => s.id === item.id);
    if (idx >= 0) this.suppliers[idx] = item;
    else this.suppliers.unshift(item);
    this.saveToStorage();
  }

  public saveWarehouse(item: Warehouse) {
    const idx = this.warehouses.findIndex(w => w.id === item.id);
    if (idx >= 0) this.warehouses[idx] = item;
    else this.warehouses.unshift(item);
    this.saveToStorage();
  }

  public saveVehicle(item: Vehicle) {
    const idx = this.vehicles.findIndex(v => v.id === item.id);
    if (idx >= 0) this.vehicles[idx] = item;
    else this.vehicles.unshift(item);
    this.saveToStorage();
  }

  public saveAgent(item: SalesAgent) {
    const idx = this.agents.findIndex(a => a.id === item.id);
    if (idx >= 0) this.agents[idx] = item;
    else this.agents.unshift(item);
    this.saveToStorage();
  }

  public saveRoute(item: Route) {
    const idx = this.routes.findIndex(r => r.id === item.id);
    if (idx >= 0) this.routes[idx] = item;
    else this.routes.unshift(item);
    this.saveToStorage();
  }

  public saveDevice(item: Device) {
    const idx = this.devices.findIndex(d => d.id === item.id);
    if (idx >= 0) this.devices[idx] = item;
    else this.devices.unshift(item);
    this.saveToStorage();
  }
}

export const distributionStore = new DistributionStore();
