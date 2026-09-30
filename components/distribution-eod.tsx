'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ClipboardCheck, Truck, User, ArrowDownRight,
  DollarSign, AlertCircle, CheckCircle2,
  Calendar, RotateCcw, Send, Loader2, RefreshCw, X
} from 'lucide-react';
import { formatUGX } from '@/lib/mockData';

interface TruckStockItem {
  commodityId: string;
  commodityName: string;
  commodityCode: string;
  baseUnit: string;
  sellingUnit: string;
  packSize: number;
  vehicleId?: string;
  stockLocationId?: string;
  registrationNumber: string;
  assignedAgentName: string;
  totalBaseUnits: number;
  totalCartons: string;
  costValueUGX: number;
  sellingValueUGX: number;
}

export default function DistributionEOD() {
  const [agents, setAgents] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [truckStock, setTruckStock] = useState<TruckStockItem[]>([]);

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  // Financial Reconciliation Inputs
  const [cashCollected, setCashCollected] = useState<number>(0);
  const [mobileMoneyCollected, setMobileMoneyCollected] = useState<number>(0);
  const [creditExtended, setCreditExtended] = useState<number>(0);
  const [fieldExpenses, setFieldExpenses] = useState<number>(0);
  const [expenseReason, setExpenseReason] = useState<string>('Fuel & Parking');
  const [actualCashHandedIn, setActualCashHandedIn] = useState<number>(0);

  // Return transfer state
  const [returnQtys, setReturnQtys] = useState<{ [commodityId: string]: number }>({});
  const [creatingReturn, setCreatingReturn] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedOff, setSignedOff] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, vRes, wRes, lRes, tsRes] = await Promise.all([
        fetch('/api/distribution/agents'),
        fetch('/api/distribution/vehicles'),
        fetch('/api/distribution/warehouses'),
        fetch('/api/distribution/locations'),
        fetch('/api/distribution/truck-stock')
      ]);

      if (aRes.ok) {
        const agts = await aRes.json();
        setAgents(agts);
        if (agts.length > 0 && !selectedAgentId) {
          setSelectedAgentId(agts[0].id);
        }
      }
      if (vRes.ok) setVehicles(await vRes.json());
      if (wRes.ok) {
        const whs = await wRes.json();
        setWarehouses(whs);
        if (whs.length > 0 && !selectedWarehouseId) {
          setSelectedWarehouseId(whs[0].id);
        }
      }
      if (lRes.ok) setLocations(await lRes.json());
      if (tsRes.ok) setTruckStock(await tsRes.json());
    } catch (e: any) {
      setError(e.message || 'Failed to load EOD data');
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId, selectedWarehouseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const agentVehicle = vehicles.find(v => v.assignedAgentId === selectedAgentId || v.registrationNumber === selectedAgent?.assignedVehicleReg);

  // Filter truck stock for this agent's vehicle
  const agentTruckStock = truckStock.filter(ts => {
    if (!agentVehicle) return false;
    return ts.registrationNumber === agentVehicle.registrationNumber || ts.vehicleId === agentVehicle.id;
  });

  // Calculate unsold inventory value
  const totalUnsoldSellingValue = agentTruckStock.reduce((acc, it) => acc + it.sellingValueUGX, 0);
  const totalUnsoldCartons = agentTruckStock.reduce((acc, it) => acc + parseFloat(it.totalCartons || '0'), 0);

  // Financial Calculations
  const totalCollections = Number(cashCollected || 0) + Number(mobileMoneyCollected || 0) + Number(creditExtended || 0);
  const netCashExpected = Math.max(0, Number(cashCollected || 0) - Number(fieldExpenses || 0));
  const cashDiscrepancy = Number(actualCashHandedIn || 0) - netCashExpected;

  // Initialize return quantities with current on-truck counts
  useEffect(() => {
    const initial: { [commodityId: string]: number } = {};
    agentTruckStock.forEach(it => {
      initial[it.commodityId] = Math.floor(parseFloat(it.totalCartons || '0'));
    });
    setReturnQtys(initial);
  }, [agentTruckStock.length, selectedAgentId]);

  // Handle Create Return Transfer to Warehouse
  const handleCreateReturnTransfer = async () => {
    if (!agentVehicle) {
      setError('No vehicle associated with this sales agent.');
      return;
    }

    const truckLoc = locations.find(l => l.vehicle_id === agentVehicle.id || (l.type === 'truck' && l.name.includes(agentVehicle.registrationNumber)));
    const targetWhLoc = locations.find(l => l.warehouse_id === selectedWarehouseId && l.type === 'sellable');

    if (!truckLoc || !targetWhLoc) {
      setError('Source truck location or target warehouse location not found.');
      return;
    }

    const itemsToReturn = agentTruckStock
      .filter(it => (returnQtys[it.commodityId] || 0) > 0)
      .map(it => ({
        commodityId: it.commodityId,
        commodityCode: it.commodityCode,
        commodityName: it.commodityName,
        unitName: it.sellingUnit || 'Carton',
        packSize: it.packSize || 1,
        requestedQuantity: returnQtys[it.commodityId] || 0,
        costPriceUGX: it.costValueUGX / (it.totalBaseUnits || 1) * (it.packSize || 1),
        sellingPriceUGX: it.sellingValueUGX / (it.totalBaseUnits || 1) * (it.packSize || 1)
      }));

    if (itemsToReturn.length === 0) {
      setError('Please specify at least one carton to return to warehouse.');
      return;
    }

    setCreatingReturn(true);
    setError(null);
    setReturnSuccess(null);

    try {
      const payload = {
        sourceLocationId: truckLoc.id,
        sourceLocationName: truckLoc.name,
        destinationLocationId: targetWhLoc.id,
        destinationLocationName: targetWhLoc.name,
        transferType: 'truck_warehouse',
        assignedVehicleId: agentVehicle.id,
        assignedVehicleReg: agentVehicle.registrationNumber,
        assignedAgentId: selectedAgent?.id,
        assignedAgentName: selectedAgent?.name,
        notes: `End-of-Day return transfer for ${selectedAgent?.name} (${agentVehicle.registrationNumber})`,
        items: itemsToReturn
      };

      const res = await fetch('/api/distribution/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();

      setReturnSuccess(`Return transfer ${saved.transfer_number} created successfully! Authorized for warehouse receiving.`);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to create return transfer');
    } finally {
      setCreatingReturn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-amber-500" />
            End-of-Day (EOD) Reconciliation & Vehicle Return
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Reconcile agent sales collections, field expenses, and return unsold truck inventory to the central warehouse.
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
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Alert */}
      {returnSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{returnSuccess}</span>
          </div>
          <button onClick={() => setReturnSuccess(null)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Agent & Shift Context Bar */}
      <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Select Sales Agent
          </label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select
              value={selectedAgentId}
              onChange={e => {
                setSelectedAgentId(e.target.value);
                setSignedOff(false);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20"
            >
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.agentCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Assigned Vehicle
          </label>
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium">
            <Truck className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-zinc-900 dark:text-zinc-100">
              {agentVehicle ? `${agentVehicle.registrationNumber} (${agentVehicle.make})` : selectedAgent?.assignedVehicleReg || 'No Vehicle'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Receiving Warehouse Depot
          </label>
          <select
            value={selectedWarehouseId}
            onChange={e => setSelectedWarehouseId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium"
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Reconciliation Grid: Cash & Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: CASH & FINANCIAL RECONCILIATION */}
        <div className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Collections & Cash Reconcile
            </h3>
            <span className="text-xs px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 font-mono">
              UGX Currency
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                Cash Sales Collected (UGX)
              </label>
              <input
                type="number"
                min={0}
                value={cashCollected}
                onChange={e => setCashCollected(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold"
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                  Mobile Money / Airtel (UGX)
                </label>
                <input
                  type="number"
                  min={0}
                  value={mobileMoneyCollected}
                  onChange={e => setMobileMoneyCollected(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                  Credit Given (UGX)
                </label>
                <input
                  type="number"
                  min={0}
                  value={creditExtended}
                  onChange={e => setCreditExtended(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                  Field Expenses Incurred (UGX)
                </label>
                <input
                  type="number"
                  min={0}
                  value={fieldExpenses}
                  onChange={e => setFieldExpenses(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-red-600"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                  Expense Description
                </label>
                <input
                  type="text"
                  value={expenseReason}
                  onChange={e => setExpenseReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                  placeholder="Fuel, Tolls, Lunch"
                />
              </div>
            </div>

            {/* Cash Handed-in to Cashier */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Expected Physical Cash Deposit:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatUGX(netCashExpected)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-200 mb-1">
                  Actual Physical Cash Handed in to Cashier *
                </label>
                <input
                  type="number"
                  min={0}
                  value={actualCashHandedIn}
                  onChange={e => setActualCashHandedIn(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#121214] border border-amber-300 dark:border-amber-700/60 rounded-xl text-base font-bold text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter cash count"
                />
              </div>

              {/* Discrepancy Status */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Variance:</span>
                {cashDiscrepancy === 0 ? (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Balanced (0 UGX)
                  </span>
                ) : cashDiscrepancy < 0 ? (
                  <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Shortage of {formatUGX(Math.abs(cashDiscrepancy))}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-blue-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Excess of {formatUGX(cashDiscrepancy)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2: UNSOLD INVENTORY & RETURN TO WAREHOUSE */}
        <div className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-500" />
                Unsold Truck Inventory Return
              </h3>
              <p className="text-xs text-zinc-500">Current stock remaining on {agentVehicle?.registrationNumber || 'vehicle'}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                {totalUnsoldCartons} Cartons
              </span>
              <span className="text-[11px] text-zinc-500">{formatUGX(totalUnsoldSellingValue)}</span>
            </div>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-500">
                <tr>
                  <th className="py-2.5 px-3">Commodity</th>
                  <th className="py-2.5 px-3 text-right">On Truck</th>
                  <th className="py-2.5 px-3 text-right">Return Cartons</th>
                  <th className="py-2.5 px-3 text-right">Return Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {agentTruckStock.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-zinc-500">
                      No stock currently on this truck.
                    </td>
                  </tr>
                ) : (
                  agentTruckStock.map((it, idx) => {
                    const retQty = returnQtys[it.commodityId] || 0;
                    const unitSellingPrice = it.totalBaseUnits > 0 ? (it.sellingValueUGX / it.totalBaseUnits) * it.packSize : 0;
                    return (
                      <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 text-xs">
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">{it.commodityName}</div>
                          <div className="text-[11px] text-zinc-400">{it.commodityCode}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {it.totalCartons}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={parseFloat(it.totalCartons || '0')}
                            value={retQty}
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setReturnQtys(prev => ({ ...prev, [it.commodityId]: val }));
                            }}
                            className="w-16 text-right py-1 px-2 bg-transparent border border-zinc-200 dark:border-zinc-700 rounded text-xs font-bold"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatUGX(retQty * unitSellingPrice)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-2">
            <button
              onClick={handleCreateReturnTransfer}
              disabled={creatingReturn || agentTruckStock.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {creatingReturn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              Create Return Transfer (Truck → Depot)
            </button>
            <p className="text-[11px] text-zinc-500 text-center mt-2">
              Generates an authorized Truck → Warehouse return transfer to restore sellable inventory via the Neon ledger.
            </p>
          </div>
        </div>
      </div>

      {/* SIGN-OFF & COMPLETE EOD */}
      <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Supervisor Sign-off & Shift Close
          </h4>
          <p className="text-xs text-zinc-500 mt-0.5">
            Lock daily figures, finalize cashier handover, and close route reconciliation for {selectedAgent?.name}.
          </p>
        </div>

        <button
          onClick={() => setSignedOff(true)}
          disabled={signedOff}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            signedOff
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300'
              : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900'
          }`}
        >
          {signedOff ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Shift Closed & Reconciled
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Approve EOD & Sign-off
            </>
          )}
        </button>
      </div>
    </div>
  );
}
