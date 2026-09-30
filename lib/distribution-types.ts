/**
 * KROWN ERP-CRM - Phase 2 Distribution, Field Sales & Van Sales Domain Models
 */

export interface Commodity {
  id: string;
  code: string;
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  brand?: string;
  variant?: string;
  baseUnit: string;        // e.g. "Bottle", "Piece", "Kg"
  sellingUnit: string;     // e.g. "Carton"
  purchaseUnit: string;    // e.g. "Pallet"
  packSize: number;        // e.g. 24 base units per carton
  cartonSize?: number;
  weightKg?: number;
  volumeCbm?: number;
  costPriceUGX: number;
  sellingPriceUGX: number;
  wholesalePriceUGX: number;
  distributorPriceUGX: number;
  taxCategory: 'standard' | 'zero_rated' | 'exempt';
  supplierId?: string;
  supplierName?: string;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  hasBatchTracking: boolean;
  hasExpiryTracking: boolean;
  status: 'active' | 'inactive' | 'discontinued';
  branchId?: string;
  createdAt?: string;
}

export interface CommodityUnit {
  id: string;
  commodityId: string;
  unitName: string;         // e.g. "Carton", "Crate", "Pack", "Unit"
  multiplierToBase: number; // e.g. 24
  barcode?: string;
  sellingPriceUGX: number;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  customerType: 'retailer' | 'wholesaler' | 'distributor' | 'key_account';
  customerGroup: string;
  taxId?: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address: string;
  creditLimitUGX: number;
  creditDays: number;
  outstandingBalanceUGX: number;
  availableCreditUGX: number;
  assignedAgentId?: string;
  defaultRouteId?: string;
  priceListId?: string;
  branchId?: string;
  status: 'active' | 'on_hold' | 'blocked';
  createdAt?: string;
}

export interface CustomerLocation {
  id: string;
  customerId: string;
  locationName: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  routeId?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  category: string;
  taxId?: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address: string;
  paymentTermsDays: number;
  creditLimitUGX: number;
  currentPayableUGX: number;
  performanceRating: number;
  status: 'active' | 'inactive' | 'blacklisted';
  createdAt?: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: 'main' | 'regional' | 'branch';
  branchId?: string;
  address: string;
  managerName?: string;
  capacitySqm: number;
  status: 'active' | 'maintenance' | 'closed';
  createdAt?: string;
}

export interface StockLocation {
  id: string;
  warehouseId?: string;
  vehicleId?: string;
  name: string;
  code: string;
  type: 'sellable' | 'quarantine' | 'damaged' | 'truck';
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  vehicleType: 'truck' | 'van' | 'pickup';
  volumeCapacityCbm: number;
  weightCapacityKg: number;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  branchId?: string;
  currentMileage: number;
  fuelLevel: 'empty' | 'quarter' | 'half' | 'three_quarter' | 'full';
  status: 'active' | 'maintenance' | 'off_duty';
  createdAt?: string;
}

export interface SalesAgent {
  id: string;
  staffId: string;           // Link to core staff table
  agentCode: string;
  name?: string;
  email?: string;
  phone?: string;
  territoryId?: string;
  territoryName?: string;
  assignedVehicleId?: string;
  assignedVehicleReg?: string;
  assignedDeviceId?: string;
  supervisorId?: string;
  supervisorName?: string;
  cashLimitUGX: number;
  canGiveCredit: boolean;
  maxDiscountPct: number;
  commissionPlanId?: string;
  status: 'active' | 'field' | 'offline' | 'suspended';
  createdAt?: string;
}

export interface Territory {
  id: string;
  code: string;
  name: string;
  region: string;
  country: string;
}

export interface Route {
  id: string;
  code: string;
  name: string;
  territoryId?: string;
  territoryName?: string;
  branchId?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedVehicleId?: string;
  assignedVehicleReg?: string;
  operatingDays: string[];   // e.g. ["Monday", "Wednesday", "Friday"]
  status: 'active' | 'inactive';
}

export interface RouteStop {
  id: string;
  routeId: string;
  sequence: number;
  customerId: string;
  customerName?: string;
  customerLocationId?: string;
  estimatedMinutes: number;
}

export interface Device {
  id: string;
  deviceName: string;
  deviceType: string;        // e.g. "Handheld Android POS"
  serialNumber: string;
  imei?: string;
  osVersion?: string;
  appVersion: string;
  assignedStaffId?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedVehicleId?: string;
  branchId?: string;
  status: 'trusted' | 'untrusted' | 'lost' | 'disabled';
  lastSyncAt?: string;
  lastLoginAt?: string;
  createdAt?: string;
}
