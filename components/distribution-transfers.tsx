'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeftRight, Plus, Search, Loader2,
  CheckCircle2, X, Eye, Truck, Package,
  AlertTriangle, RefreshCw, Layers, ShieldCheck,
  ChevronRight, Calendar, User, Check, Send
} from 'lucide-react';
import { formatUGX } from '@/lib/mockData';

interface TransferItem {
  id?: string;
  commodity_id: string;
  commodity_code: string;
  commodity_name: string;
  unit_name: string;
  pack_size: number;
  requested_quantity: number;
  approved_quantity?: number;
  loaded_quantity?: number;
  received_quantity?: number;
  variance_quantity?: number;
  variance_reason?: string;
  cost_price_ugx: number;
  selling_price_ugx: number;
}

interface StockTransfer {
  id: string;
  transfer_number: string;
  source_location_id: string;
  source_location_name: string;
  destination_location_id: string;
  destination_location_name: string;
  transfer_type: string;
  status: 'draft' | 'approved' | 'dispatched' | 'completed' | 'cancelled';
  assigned_vehicle_reg?: string;
  assigned_agent_name?: string;
  total_lines: number;
  total_units: number;
  total_cost_ugx: number;
  total_selling_ugx: number;
  has_variance?: boolean;
  variance_reason?: string;
  requested_at?: string;
  dispatched_at?: string;
  received_at?: string;
  notes?: string;
  items?: TransferItem[];
}

interface StockLocation {
  id: string;
  name: string;
  code: string;
  type: 'sellable' | 'truck' | 'quarantine' | 'damaged';
  warehouse_name?: string;
  registration_number?: string;
  assigned_agent_name?: string;
}

interface TruckStockItem {
  commodityId: string;
  commodityName: string;
  commodityCode: string;
  baseUnit: string;
  sellingUnit: string;
  packSize: number;
  vehicleId?: string;
  registrationNumber: string;
  assignedAgentName: string;
  totalBaseUnits: number;
  totalCartons: string;
  costValueUGX: number;
  sellingValueUGX: number;
}

export default function DistributionTransfers() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [truckStock, setTruckStock] = useState<TruckStockItem[]>([]);

  const [activeTab, setActiveTab] = useState<'transfers' | 'truck_stock'>('transfers');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

  // Accept Form State
  const [acceptedItems, setAcceptedItems] = useState<{ [itemId: string]: { receivedQuantity: number; varianceReason: string } }>({});

  // Create Transfer Form State
  const [transferType, setTransferType] = useState<'warehouse_truck' | 'truck_warehouse' | 'warehouse_warehouse'>('warehouse_truck');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [lineItems, setLineItems] = useState<Array<{
    commodityId: string;
    commodityCode: string;
    commodityName: string;
    unitName: string;
    packSize: number;
    requestedQuantity: number;
    costPriceUGX: number;
    sellingPriceUGX: number;
  }>>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, lRes, cRes, vRes, aRes, tsRes] = await Promise.all([
        fetch('/api/distribution/transfers'),
        fetch('/api/distribution/locations'),
        fetch('/api/distribution/commodities'),
        fetch('/api/distribution/vehicles'),
        fetch('/api/distribution/agents'),
        fetch('/api/distribution/truck-stock')
      ]);

      if (tRes.ok) setTransfers(await tRes.json());
      if (lRes.ok) setLocations(await lRes.json());
      if (cRes.ok) setCommodities(await cRes.json());
      if (vRes.ok) setVehicles(await vRes.json());
      if (aRes.ok) setAgents(await aRes.json());
      if (tsRes.ok) setTruckStock(await tsRes.json());
    } catch (e: any) {
      setError(e.message || 'Failed to load transfer data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Add Item to New Transfer
  const handleAddLineItem = () => {
    if (commodities.length === 0) return;
    const first = commodities[0];
    setLineItems(prev => [
      ...prev,
      {
        commodityId: first.id,
        commodityCode: first.code,
        commodityName: first.name,
        unitName: first.sellingUnit || 'Carton',
        packSize: Number(first.packSize || 1),
        requestedQuantity: 10,
        costPriceUGX: Number(first.costPriceUGX || 0),
        sellingPriceUGX: Number(first.sellingPriceUGX || 0)
      }
    ]);
  };

  const handleCommodityChange = (index: number, commodityId: string) => {
    const item = commodities.find(c => c.id === commodityId);
    if (!item) return;
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        commodityId: item.id,
        commodityCode: item.code,
        commodityName: item.name,
        unitName: item.sellingUnit || 'Carton',
        packSize: Number(item.packSize || 1),
        costPriceUGX: Number(item.costPriceUGX || 0),
        sellingPriceUGX: Number(item.sellingPriceUGX || 0)
      };
      return updated;
    });
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index].requestedQuantity = Math.max(1, quantity);
      return updated;
    });
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  // Submit New Transfer
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceLocationId || !destinationLocationId) {
      setError('Please select both source and destination locations.');
      return;
    }
    if (sourceLocationId === destinationLocationId) {
      setError('Source and destination locations must be different.');
      return;
    }
    if (lineItems.length === 0) {
      setError('Please add at least one commodity line item.');
      return;
    }

    setSaving(true);
    setError(null);

    const srcLoc = locations.find(l => l.id === sourceLocationId);
    const destLoc = locations.find(l => l.id === destinationLocationId);
    const selectedVeh = vehicles.find(v => v.id === assignedVehicleId);
    const selectedAgt = agents.find(a => a.id === assignedAgentId);

    try {
      const payload = {
        sourceLocationId,
        sourceLocationName: srcLoc?.name || 'Warehouse',
        destinationLocationId,
        destinationLocationName: destLoc?.name || 'Truck',
        transferType,
        assignedVehicleId: selectedVeh?.id,
        assignedVehicleReg: selectedVeh?.registrationNumber,
        assignedAgentId: selectedAgt?.id,
        assignedAgentName: selectedAgt?.name,
        notes: transferNotes,
        items: lineItems
      };

      const res = await fetch('/api/distribution/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());

      await loadData();
      setShowCreateModal(false);
      setLineItems([]);
      setTransferNotes('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Open Accept Modal
  const openAcceptModal = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    const initial: { [itemId: string]: { receivedQuantity: number; varianceReason: string } } = {};
    (transfer.items || []).forEach(it => {
      const defaultQty = it.loaded_quantity !== undefined ? it.loaded_quantity : it.requested_quantity;
      initial[it.id || ''] = {
        receivedQuantity: Number(defaultQty),
        varianceReason: ''
      };
    });
    setAcceptedItems(initial);
    setShowAcceptModal(true);
  };

  // Submit Accept & Receive
  const handleAcceptTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;

    setSaving(true);
    setError(null);

    try {
      const itemsPayload = Object.entries(acceptedItems).map(([itemId, val]) => ({
        itemId,
        receivedQuantity: Number(val.receivedQuantity),
        varianceReason: val.varianceReason || undefined
      }));

      const res = await fetch(`/api/distribution/transfers/${selectedTransfer.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptedItems: itemsPayload,
          userEmail: 'dispatch@krown.ug'
        })
      });

      if (!res.ok) throw new Error(await res.text());

      await loadData();
      setShowAcceptModal(false);
      setSelectedTransfer(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Filtering
  const filteredTransfers = transfers.filter(t => {
    const matchesSearch =
      t.transfer_number.toLowerCase().includes(search.toLowerCase()) ||
      (t.source_location_name && t.source_location_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.destination_location_name && t.destination_location_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.assigned_agent_name && t.assigned_agent_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.assigned_vehicle_reg && t.assigned_vehicle_reg.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Summary KPI Stats
  const totalTransfersCount = transfers.length;
  const completedCount = transfers.filter(t => t.status === 'completed').length;
  const pendingCount = transfers.filter(t => t.status === 'draft' || t.status === 'approved' || t.status === 'dispatched').length;
  const totalUnitsMoved = transfers.reduce((acc, t) => acc + Number(t.total_units || 0), 0);
  const totalValueMoved = transfers.reduce((acc, t) => acc + Number(t.total_selling_ugx || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-amber-500" />
            Stock Transfers & Truck Load Sheets
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Dispatch truck inventory, track field load sheets, and reconcile vehicle stock via immutable Neon ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              if (lineItems.length === 0) handleAddLineItem();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Load Sheet / Transfer
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121214] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Transfers</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{totalTransfersCount}</p>
          <span className="text-xs text-zinc-500">{completedCount} Completed</span>
        </div>

        <div className="bg-white dark:bg-[#121214] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Active Loads</span>
            <Truck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{pendingCount}</p>
          <span className="text-xs text-amber-600/80">Pending Agent Acceptance</span>
        </div>

        <div className="bg-white dark:bg-[#121214] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Units Dispatched</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{totalUnitsMoved.toLocaleString()}</p>
          <span className="text-xs text-zinc-500">Cartons / Cases</span>
        </div>

        <div className="bg-white dark:bg-[#121214] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Stock Value Moved</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{formatUGX(totalValueMoved)}</p>
          <span className="text-xs text-emerald-600">Authorized Movement</span>
        </div>
      </div>

      {/* Main Tabs: Transfers vs Truck Stock */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'transfers'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Transfers & Load Sheets ({transfers.length})
        </button>
        <button
          onClick={() => setActiveTab('truck_stock')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'truck_stock'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          Live Truck Stock ({truckStock.length})
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: TRANSFERS & LOAD SHEETS */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search transfer number, location, vehicle, agent..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['all', 'draft', 'dispatched', 'completed'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Transfers Table */}
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-4">Transfer #</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Movement (From → To)</th>
                    <th className="py-3.5 px-4">Vehicle / Agent</th>
                    <th className="py-3.5 px-4 text-right">Cartons</th>
                    <th className="py-3.5 px-4 text-right">Value (UGX)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {loading && transfers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                        Loading stock transfers from Neon...
                      </td>
                    </tr>
                  ) : filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500">
                        <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-zinc-400 opacity-60" />
                        No stock transfers found. Create a load sheet to dispatch inventory.
                      </td>
                    </tr>
                  ) : (
                    filteredTransfers.map(t => (
                      <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                          {t.transfer_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 capitalize">
                            {t.transfer_type.replace('_', ' → ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">{t.source_location_name}</div>
                          <div className="text-xs text-zinc-500 flex items-center gap-1">
                            <ChevronRight className="w-3 h-3" /> {t.destination_location_name}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                            <Truck className="w-3.5 h-3.5 text-amber-500" />
                            {t.assigned_vehicle_reg || 'No vehicle'}
                          </div>
                          <div className="text-xs text-zinc-500">{t.assigned_agent_name || 'Unassigned'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium">
                          {Number(t.total_units || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatUGX(Number(t.total_selling_ugx || 0))}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                              t.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : t.status === 'dispatched'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                            }`}
                          >
                            {t.status}
                          </span>
                          {t.has_variance && (
                            <span className="block text-[10px] text-red-500 font-semibold mt-0.5">Variance</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedTransfer(t);
                                setShowDetailModal(true);
                              }}
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"
                              title="View Items"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {t.status !== 'completed' && (
                              <button
                                onClick={() => openAcceptModal(t)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Receive Load
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE TRUCK STOCK */}
      {activeTab === 'truck_stock' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-500" />
                  Vehicle Inventory Positions (On-Road Fleet)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Calculated from atomic Neon stock ledger transactions upon driver/agent receipt.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4">Agent in Field</th>
                    <th className="py-3.5 px-4">Commodity</th>
                    <th className="py-3.5 px-4">SKU / Code</th>
                    <th className="py-3.5 px-4 text-right">Available Cartons</th>
                    <th className="py-3.5 px-4 text-right">Base Units</th>
                    <th className="py-3.5 px-4 text-right">Cost Value</th>
                    <th className="py-3.5 px-4 text-right">Selling Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {truckStock.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500">
                        <Truck className="w-8 h-8 mx-auto mb-2 text-zinc-400 opacity-60" />
                        No active inventory currently on trucks. Complete a stock transfer to load trucks.
                      </td>
                    </tr>
                  ) : (
                    truckStock.map((ts, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                        <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-amber-500 shrink-0" />
                          {ts.registrationNumber}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">
                          {ts.assignedAgentName}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                          {ts.commodityName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-zinc-500">
                          {ts.commodityCode}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-amber-600 dark:text-amber-400">
                          {ts.totalCartons} {ts.sellingUnit}
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-zinc-500">
                          {ts.totalBaseUnits} {ts.baseUnit}s
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-zinc-600 dark:text-zinc-400">
                          {formatUGX(ts.costValueUGX)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {formatUGX(ts.sellingValueUGX)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TRANSFER / LOAD SHEET MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8"
            >
              <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-amber-500" />
                  Dispatch Load Sheet (Stock Transfer)
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTransfer} className="p-6 space-y-5">
                {/* Transfer Type */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'warehouse_truck', label: 'Warehouse → Truck', desc: 'Morning Stock Load' },
                    { id: 'truck_warehouse', label: 'Truck → Warehouse', desc: 'Evening Return / Unsold' },
                    { id: 'warehouse_warehouse', label: 'Warehouse → Warehouse', desc: 'Inter-depot transfer' }
                  ].map(tp => (
                    <button
                      type="button"
                      key={tp.id}
                      onClick={() => setTransferType(tp.id as any)}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        transferType === tp.id
                          ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      <div className="text-sm">{tp.label}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">{tp.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Location Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                      Source Location (From) *
                    </label>
                    <select
                      value={sourceLocationId}
                      onChange={e => setSourceLocationId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                    >
                      <option value="">Select Source Location</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                      Destination Location (To) *
                    </label>
                    <select
                      value={destinationLocationId}
                      onChange={e => setDestinationLocationId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                    >
                      <option value="">Select Destination Location</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Vehicle & Agent Assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                      Assigned Vehicle
                    </label>
                    <select
                      value={assignedVehicleId}
                      onChange={e => setAssignedVehicleId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                    >
                      <option value="">Select Vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.registrationNumber} ({v.make} {v.model})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                      Assigned Sales Agent / Driver
                    </label>
                    <select
                      value={assignedAgentId}
                      onChange={e => setAssignedAgentId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                    >
                      <option value="">Select Agent</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.agentCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-amber-500" />
                      Transfer Items
                    </label>
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Commodity
                    </button>
                  </div>

                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-500">
                        <tr>
                          <th className="py-2.5 px-3">Commodity</th>
                          <th className="py-2.5 px-3">Unit</th>
                          <th className="py-2.5 px-3 text-right">Quantity</th>
                          <th className="py-2.5 px-3 text-right">Selling Price</th>
                          <th className="py-2.5 px-3 text-right">Subtotal</th>
                          <th className="py-2.5 px-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {lineItems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-xs text-zinc-400">
                              Click &quot;Add Commodity&quot; to add items to load sheet
                            </td>
                          </tr>
                        ) : (
                          lineItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                              <td className="py-2.5 px-3">
                                <select
                                  value={item.commodityId}
                                  onChange={e => handleCommodityChange(idx, e.target.value)}
                                  className="w-full py-1 px-2 bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                                >
                                  {commodities.map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.name} ({c.code})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2.5 px-3 text-xs text-zinc-500">
                                {item.unitName} ({item.packSize} pcs)
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  min={1}
                                  value={item.requestedQuantity}
                                  onChange={e => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                                  className="w-20 text-right py-1 px-2 bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right text-xs text-zinc-500">
                                {formatUGX(item.sellingPriceUGX)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                {formatUGX(item.requestedQuantity * item.sellingPriceUGX)}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLineItem(idx)}
                                  className="p-1 hover:text-red-500 rounded text-zinc-400"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                    Notes / Dispatch Memo
                  </label>
                  <input
                    type="text"
                    value={transferNotes}
                    onChange={e => setTransferNotes(e.target.value)}
                    placeholder="e.g. Morning van load for Ntinda Route stops"
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Create & Authorize Transfer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACCEPT & RECEIVE LOAD MODAL */}
      <AnimatePresence>
        {showAcceptModal && selectedTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8"
            >
              <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Confirm & Receive Truck Load
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Transfer #{selectedTransfer.transfer_number} • {selectedTransfer.source_location_name} → {selectedTransfer.destination_location_name}
                  </p>
                </div>
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAcceptTransfer} className="p-6 space-y-5">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  <strong>Atomic Ledger Invariant:</strong> Confirming this transfer will post double-entry movement lines to the Neon stock ledger, debiting warehouse sellable stock and crediting truck inventory balances in real-time.
                </div>

                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-500">
                      <tr>
                        <th className="py-2.5 px-3">Commodity</th>
                        <th className="py-2.5 px-3 text-right">Loaded</th>
                        <th className="py-2.5 px-3 text-right">Received Count</th>
                        <th className="py-2.5 px-3 text-left">Variance / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {(selectedTransfer.items || []).map((it, idx) => {
                        const recQty = acceptedItems[it.id || '']?.receivedQuantity ?? it.loaded_quantity;
                        const variance = (it.loaded_quantity || it.requested_quantity) - recQty;
                        return (
                          <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-zinc-900 dark:text-zinc-100">{it.commodity_name}</div>
                              <div className="text-xs text-zinc-500">{it.commodity_code} ({it.unit_name})</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium">
                              {it.loaded_quantity || it.requested_quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                value={recQty}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 0;
                                  setAcceptedItems(prev => ({
                                    ...prev,
                                    [it.id || '']: {
                                      ...prev[it.id || ''],
                                      receivedQuantity: val
                                    }
                                  }));
                                }}
                                className="w-20 text-right py-1 px-2 bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              {variance !== 0 && (
                                <input
                                  type="text"
                                  placeholder="Reason (e.g. Damaged in transit)"
                                  value={acceptedItems[it.id || '']?.varianceReason || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setAcceptedItems(prev => ({
                                      ...prev,
                                      [it.id || '']: {
                                        ...prev[it.id || ''],
                                        varianceReason: val
                                      }
                                    }));
                                  }}
                                  className="w-full py-1 px-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded text-xs text-red-600 dark:text-red-400 placeholder:text-red-300"
                                />
                              )}
                              {variance === 0 && (
                                <span className="text-xs text-emerald-600 font-medium">Full Match</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAcceptModal(false)}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Confirm Receipt & Post to Ledger
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {showDetailModal && selectedTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8"
            >
              <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-amber-500" />
                    Load Sheet #{selectedTransfer.transfer_number}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {selectedTransfer.source_location_name} → {selectedTransfer.destination_location_name}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl text-xs">
                  <div>
                    <span className="text-zinc-400 block">Status:</span>
                    <span className="font-semibold capitalize text-zinc-900 dark:text-zinc-100">{selectedTransfer.status}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Vehicle:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedTransfer.assigned_vehicle_reg || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Agent:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedTransfer.assigned_agent_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Total Value:</span>
                    <span className="font-semibold text-emerald-600">{formatUGX(selectedTransfer.total_selling_ugx)}</span>
                  </div>
                </div>

                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-500">
                      <tr>
                        <th className="py-2 px-3">Commodity</th>
                        <th className="py-2 px-3 text-right">Requested</th>
                        <th className="py-2 px-3 text-right">Loaded</th>
                        <th className="py-2 px-3 text-right">Received</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                      {(selectedTransfer.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{it.commodity_name}</span>
                            <span className="text-zinc-400 block">{it.commodity_code}</span>
                          </td>
                          <td className="py-2 px-3 text-right">{it.requested_quantity}</td>
                          <td className="py-2 px-3 text-right">{it.loaded_quantity || it.requested_quantity}</td>
                          <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                            {it.received_quantity ?? '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {formatUGX((it.received_quantity || it.requested_quantity) * it.selling_price_ugx)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedTransfer.variance_reason && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600">
                    <strong>Variance Log:</strong> {selectedTransfer.variance_reason}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
