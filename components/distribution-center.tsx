'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, Users, Building, Warehouse, Truck, UserCheck, Compass, Smartphone, LayoutDashboard,
  ArrowRight, ShieldCheck, CheckCircle2, TrendingUp, AlertTriangle, Sparkles, DollarSign, Box,
  ArrowLeftRight, ClipboardCheck, ShoppingCart, Wallet, Landmark, Receipt
} from 'lucide-react';
import DistributionCommodities from './distribution-commodities';
import DistributionCustomers from './distribution-customers';
import DistributionSuppliers from './distribution-suppliers';
import DistributionWarehouses from './distribution-warehouses';
import DistributionVehicles from './distribution-vehicles';
import DistributionAgents from './distribution-agents';
import DistributionRoutes from './distribution-routes';
import DistributionDevices from './distribution-devices';
import DistributionTransfers from './distribution-transfers';
import DistributionEOD from './distribution-eod';
import DistributionFieldSales from './distribution-field-sales';
import DistributionFinance from './distribution-finance';
import DistributionBudgets from './distribution-budgets';
import { formatUGX } from '@/lib/mockData';

type Tab = 'overview' | 'field-sales' | 'transfers' | 'eod' | 'finance' | 'budgets' | 'commodities' | 'customers' | 'suppliers' | 'warehouses' | 'vehicles' | 'agents' | 'routes' | 'devices';

export default function DistributionCenter({ user, setView }: { user: any; setView?: (v: any) => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20">
            K
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              KROWN DISTRIBUTION & FIELD SALES
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Full-Stack Distribution: Field Sales • Van Sales • Finance • Budgets • Tax • EOD Reconciliation
            </p>
          </div>
        </div>

        {/* Submodule Tabs — Two-row layout for the full enterprise tab set */}
        <div className="flex flex-col gap-1">
          {/* Row 1: Operations */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-zinc-100 dark:bg-[#18181b] rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('field-sales')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'field-sales' ? 'bg-emerald-500 text-white shadow' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Field Sales
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'transfers' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Load Sheets
            </button>
            <button
              onClick={() => setActiveTab('eod')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'eod' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              EOD
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'finance' ? 'bg-blue-500 text-white shadow' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Landmark className="w-3.5 h-3.5" />
              Finance
            </button>
            <button
              onClick={() => setActiveTab('budgets')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'budgets' ? 'bg-violet-500 text-white shadow' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Wallet className="w-3.5 h-3.5" />
              Budgets & Tax
            </button>
          </div>
          {/* Row 2: Master Data */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-zinc-100 dark:bg-[#18181b] rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab('commodities')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'commodities' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Package className="w-3 h-3" />
              Commodities
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'customers' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Users className="w-3 h-3" />
              Customers
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'suppliers' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Building className="w-3 h-3" />
              Suppliers
            </button>
            <button
              onClick={() => setActiveTab('warehouses')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'warehouses' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Warehouse className="w-3 h-3" />
              Warehouses
            </button>
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'vehicles' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Truck className="w-3 h-3" />
              Vehicles
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'agents' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <UserCheck className="w-3 h-3" />
              Agents
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'routes' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Compass className="w-3 h-3" />
              Routes
            </button>
            <button
              onClick={() => setActiveTab('devices')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'devices' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Smartphone className="w-3 h-3" />
              Devices
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <span>Commodities Catalog</span>
                  <Package className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">3 Master SKUs</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Multi-tier pricing configured
                </div>
              </div>

              <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <span>Active Customers</span>
                  <Users className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">3 Key Accounts</div>
                <div className="text-xs text-amber-600 dark:text-amber-400 font-mono">
                  Receivables: {formatUGX(17550000)}
                </div>
              </div>

              <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <span>Active Fleet & Routes</span>
                  <Truck className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">2 Trucks Out</div>
                <div className="text-xs text-zinc-500 font-semibold">
                  2 Assigned Sales Agents
                </div>
              </div>

              <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <span>Trusted POS Devices</span>
                  <Smartphone className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">2 Handhelds</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Remote session control ready
                </div>
              </div>
            </div>

            {/* Quick Navigation Cards — Expanded for enterprise features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('field-sales')}
                className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 dark:from-emerald-500/5 dark:to-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/50 cursor-pointer transition-all space-y-3 group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  Field Sales POS
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Start route sessions, make van sales, collect debts, create bookings, handle returns & log expenses.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('finance')}
                className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 dark:from-blue-500/5 dark:to-blue-500/10 p-6 rounded-2xl border border-blue-500/20 hover:border-blue-500/50 cursor-pointer transition-all space-y-3 group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  Finance Hub
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Supplier payables, payouts, bank deposit batches, undeposited funds & cash reconciliation.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('budgets')}
                className="bg-gradient-to-br from-violet-500/5 to-violet-500/10 dark:from-violet-500/5 dark:to-violet-500/10 p-6 rounded-2xl border border-violet-500/20 hover:border-violet-500/50 cursor-pointer transition-all space-y-3 group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  Budgets & Tax
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Quarterly budgets, requisitions, withdrawals, tax obligations (VAT, PAYE, WHT).
                </p>
              </div>

              <div
                onClick={() => setActiveTab('commodities')}
                className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 cursor-pointer transition-all space-y-3 group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  Commodities & Packaging
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Configure items, cartons, crates, barcodes, tax categories, supplier links & tier pricing.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('customers')}
                className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 cursor-pointer transition-all space-y-3 group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  Customer Directory & Credit
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Manage Retailers, Wholesalers, Key Accounts, Credit Limits, balances & multi-location stops.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('transfers')}
                className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 cursor-pointer transition-all space-y-3 group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  Stock Transfers & Load Sheets
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Warehouse-to-truck transfers, load verification, opening balances & stock ledger history.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'field-sales' && <DistributionFieldSales key="field-sales" />}
        {activeTab === 'transfers' && <DistributionTransfers key="transfers" />}
        {activeTab === 'eod' && <DistributionEOD key="eod" />}
        {activeTab === 'finance' && <DistributionFinance key="finance" />}
        {activeTab === 'budgets' && <DistributionBudgets key="budgets" />}
        {activeTab === 'commodities' && <DistributionCommodities key="commodities" />}
        {activeTab === 'customers' && <DistributionCustomers key="customers" />}
        {activeTab === 'suppliers' && <DistributionSuppliers key="suppliers" />}
        {activeTab === 'warehouses' && <DistributionWarehouses key="warehouses" />}
        {activeTab === 'vehicles' && <DistributionVehicles key="vehicles" />}
        {activeTab === 'agents' && <DistributionAgents key="agents" />}
        {activeTab === 'routes' && <DistributionRoutes key="routes" />}
        {activeTab === 'devices' && <DistributionDevices key="devices" />}
      </AnimatePresence>
    </div>
  );
}
