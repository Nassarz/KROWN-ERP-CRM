'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingCart, CreditCard, ReceiptText, BookOpen, RotateCcw, Fuel,
  Plus, Loader2, RefreshCw, CheckCircle2, AlertTriangle, X,
  Send, User, MapPin, Truck, DollarSign, Package, ArrowRight,
  Play, Square, Clock, Smartphone, Banknote, Sparkles, Search
} from 'lucide-react';
import { formatUGX } from '@/lib/mockData';

type FieldView = 'sales' | 'collections' | 'bookings' | 'returns' | 'expenses';

export default function DistributionFieldSales() {
  const [view, setView] = useState<FieldView>('sales');
  const [agents, setAgents] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);

  // Session
  const [activeSession, setActiveSession] = useState<any>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Sales
  const [vanSales, setVanSales] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Van Sale Form
  const [saleForm, setSaleForm] = useState({
    customerId: '', saleType: 'cash' as 'cash' | 'credit',
    lines: [{ commodityId: '', quantity: 1 }] as { commodityId: string; quantity: number }[]
  });

  // Collection Form
  const [collForm, setCollForm] = useState({
    customerId: '', amountUGX: 0, paymentMethod: 'cash' as 'cash' | 'mobile_money' | 'bank_transfer',
    paymentReference: '', notes: ''
  });

  // Booking Form
  const [bookForm, setBookForm] = useState({
    customerId: '', commodityName: '', quantity: 1, estimatedValueUGX: 0, notes: ''
  });

  // Return Form
  const [retForm, setRetForm] = useState({
    customerId: '', reasonCode: 'damaged', disposition: 'truck_sellable' as 'truck_sellable' | 'truck_quarantine' | 'warehouse_return',
    lines: [{ commodityId: '', quantity: 1 }] as { commodityId: string; quantity: number }[],
    notes: ''
  });

  // Expense Form
  const [expForm, setExpForm] = useState({
    category: 'Fuel', amountUGX: 0, description: ''
  });

  // Start Session Form
  const [sessionForm, setSessionForm] = useState({
    routeId: '', vehicleId: '', openingCashFloat: 0
  });
  const [showSessionForm, setShowSessionForm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, vRes, cRes, comRes, lRes, rRes] = await Promise.all([
        fetch('/api/distribution/agents'),
        fetch('/api/distribution/vehicles'),
        fetch('/api/distribution/customers'),
        fetch('/api/distribution/commodities'),
        fetch('/api/distribution/locations'),
        fetch('/api/distribution/routes')
      ]);

      if (aRes.ok) { const a = await aRes.json(); setAgents(a); if (a.length > 0 && !selectedAgentId) setSelectedAgentId(a[0].id); }
      if (vRes.ok) setVehicles(await vRes.json());
      if (cRes.ok) setCustomers(await cRes.json());
      if (comRes.ok) setCommodities(await comRes.json());
      if (lRes.ok) setLocations(await lRes.json());
      if (rRes.ok) setRoutes(await rRes.json());
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  const loadSessionData = useCallback(async () => {
    if (!selectedAgentId) return;
    try {
      const sRes = await fetch(`/api/distribution/route-session?agentId=${selectedAgentId}`);
      if (sRes.ok) {
        const s = await sRes.json();
        if (s.id) {
          setActiveSession(s);
          // Load session transactions
          const [vsRes, rcRes, bkRes, rtRes] = await Promise.all([
            fetch(`/api/distribution/van-sales?sessionId=${s.id}`),
            fetch(`/api/distribution/collections?sessionId=${s.id}`),
            fetch(`/api/distribution/bookings?sessionId=${s.id}`),
            fetch(`/api/distribution/returns?sessionId=${s.id}`)
          ]);
          if (vsRes.ok) setVanSales(await vsRes.json());
          if (rcRes.ok) setCollections(await rcRes.json());
          if (bkRes.ok) setBookings(await bkRes.json());
          if (rtRes.ok) setReturns(await rtRes.json());
        } else {
          setActiveSession(null);
        }
      }
    } catch (e: any) {
      console.warn('Failed to load session', e);
    }
  }, [selectedAgentId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadSessionData(); }, [loadSessionData]);

  const startSession = async () => {
    if (!selectedAgentId) { setError('Select an agent first'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/distribution/route-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesAgentId: selectedAgentId,
          routeId: sessionForm.routeId || undefined,
          vehicleId: sessionForm.vehicleId || undefined,
          openingCashFloat: sessionForm.openingCashFloat
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const sess = await res.json();
      setActiveSession(sess);
      setSuccess('Route session started');
      setShowSessionForm(false);
    } catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  };

  const submitVanSale = async () => {
    if (!activeSession?.id || !saleForm.customerId || saleForm.lines.length === 0) {
      setError('Please select customer and add sale lines'); return;
    }
    setLoading(true);
    try {
      const truckLoc = locations.find((l: any) => l.vehicle_id === activeSession.vehicle_id && l.type === 'truck');
      const saleLines = saleForm.lines.filter(l => l.commodityId).map(l => {
        const com = commodities.find((c: any) => c.id === l.commodityId);
        return {
          commodityId: l.commodityId,
          commodityCode: com?.code || '',
          commodityName: com?.name || '',
          unitName: com?.selling_unit || 'Carton',
          packSize: Number(com?.pack_size || 1),
          quantity: l.quantity,
          unitPriceUGX: Number(com?.selling_price_ugx || 0),
          discountUGX: 0
        };
      });

      const res = await fetch('/api/distribution/van-sales', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: `VS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          routeSessionId: activeSession.id,
          salesAgentId: selectedAgentId,
          vehicleId: activeSession.vehicle_id,
          truckStockLocationId: truckLoc?.id || '',
          customerId: saleForm.customerId,
          saleType: saleForm.saleType,
          lines: saleLines
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess(`${saleForm.saleType.toUpperCase()} sale recorded`);
      setShowForm(false);
      setSaleForm({ customerId: '', saleType: 'cash', lines: [{ commodityId: '', quantity: 1 }] });
      loadSessionData();
    } catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  };

  const submitCollection = async () => {
    if (!activeSession?.id || !collForm.customerId || collForm.amountUGX <= 0) {
      setError('Customer and amount required'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/distribution/collections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: `COL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          routeSessionId: activeSession.id,
          salesAgentId: selectedAgentId,
          vehicleId: activeSession.vehicle_id,
          customerId: collForm.customerId,
          amountUGX: collForm.amountUGX,
          paymentMethod: collForm.paymentMethod,
          paymentReference: collForm.paymentReference,
          notes: collForm.notes
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess('Collection recorded');
      setShowForm(false);
      setCollForm({ customerId: '', amountUGX: 0, paymentMethod: 'cash', paymentReference: '', notes: '' });
      loadSessionData();
    } catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  };

  const submitBooking = async () => {
    if (!activeSession?.id || !bookForm.customerId || !bookForm.commodityName) {
      setError('Customer and commodity required'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/distribution/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: `BKG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          routeSessionId: activeSession.id,
          salesAgentId: selectedAgentId,
          customerId: bookForm.customerId,
          commodityName: bookForm.commodityName,
          quantity: bookForm.quantity,
          estimatedValueUGX: bookForm.estimatedValueUGX,
          notes: bookForm.notes
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess('Booking confirmed');
      setShowForm(false);
      setBookForm({ customerId: '', commodityName: '', quantity: 1, estimatedValueUGX: 0, notes: '' });
      loadSessionData();
    } catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  };

  const submitReturn = async () => {
    if (!activeSession?.id || !retForm.customerId || retForm.lines.length === 0) {
      setError('Customer and return lines required'); return;
    }
    setLoading(true);
    try {
      const truckLoc = locations.find((l: any) => l.vehicle_id === activeSession.vehicle_id && l.type === 'truck');
      const retLines = retForm.lines.filter(l => l.commodityId).map(l => {
        const com = commodities.find((c: any) => c.id === l.commodityId);
        return {
          commodityId: l.commodityId,
          commodityName: com?.name || '',
          unitName: com?.selling_unit || 'Carton',
          packSize: Number(com?.pack_size || 1),
          quantity: l.quantity,
          unitPriceUGX: Number(com?.selling_price_ugx || 0)
        };
      });

      const res = await fetch('/api/distribution/returns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: `RET-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          routeSessionId: activeSession.id,
          salesAgentId: selectedAgentId,
          vehicleId: activeSession.vehicle_id,
          truckStockLocationId: truckLoc?.id || '',
          customerId: retForm.customerId,
          reasonCode: retForm.reasonCode,
          disposition: retForm.disposition,
          lines: retLines,
          notes: retForm.notes
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess('Customer return recorded');
      setShowForm(false);
      setRetForm({ customerId: '', reasonCode: 'damaged', disposition: 'truck_sellable', lines: [{ commodityId: '', quantity: 1 }], notes: '' });
      loadSessionData();
    } catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  };

  const submitExpense = async () => {
    if (!activeSession?.id || !expForm.category || expForm.amountUGX <= 0) {
      setError('Category and amount required'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/distribution/field-expenses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          routeSessionId: activeSession.id,
          salesAgentId: selectedAgentId,
          vehicleId: activeSession.vehicle_id,
          category: expForm.category,
          amountUGX: expForm.amountUGX,
          description: expForm.description
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess('Field expense recorded');
      setShowForm(false);
      setExpForm({ category: 'Fuel', amountUGX: 0, description: '' });
      loadSessionData();
    } catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  };

  const totalCashSales = vanSales.filter(s => s.sale_type === 'cash').reduce((s, v) => s + Number(v.total_ugx || 0), 0);
  const totalCreditSales = vanSales.filter(s => s.sale_type === 'credit').reduce((s, v) => s + Number(v.total_ugx || 0), 0);
  const totalCollected = collections.reduce((s, c) => s + Number(c.amount_ugx || 0), 0);
  const totalReturns = returns.reduce((s, r) => s + Number(r.total_value_ugx || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 p-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
          <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Agent Selector + Session Status */}
      <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-zinc-500 mb-1 block">Active Sales Agent</label>
              <select value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)}
                className="w-full max-w-sm px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-bold text-zinc-900 dark:text-zinc-100"
              >
                <option value="">Select agent...</option>
                {agents.map((a: any) => <option key={a.id} value={a.id}>{a.name} — {a.phone || a.email}</option>)}
              </select>
            </div>
          </div>
          {activeSession ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">SESSION ACTIVE</div>
                <div className="text-[10px] text-zinc-500">
                  Route: {activeSession.route_name || 'Unassigned'} • Vehicle: {activeSession.vehicle_reg || 'N/A'} • Since: {new Date(activeSession.started_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowSessionForm(!showSessionForm)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Play className="w-4 h-4" /> Start Route Session
            </button>
          )}
        </div>

        {/* Start Session Form */}
        <AnimatePresence>
          {showSessionForm && !activeSession && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Route (optional)</label>
                  <select value={sessionForm.routeId} onChange={e => setSessionForm(p => ({ ...p, routeId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">No route assignment</option>
                    {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Vehicle</label>
                  <select value={sessionForm.vehicleId} onChange={e => setSessionForm(p => ({ ...p, vehicleId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">Select vehicle...</option>
                    {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Opening Cash Float UGX</label>
                  <input type="number" value={sessionForm.openingCashFloat || ''} onChange={e => setSessionForm(p => ({ ...p, openingCashFloat: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    placeholder="e.g. 50000"
                  />
                </div>
              </div>
              <button onClick={startSession} disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Launch Route Session
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Session Metrics */}
      {activeSession && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="text-xs text-zinc-500 mb-1">Cash Sales</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">{formatUGX(totalCashSales)}</div>
            <div className="text-[10px] text-zinc-400">{vanSales.filter(s => s.sale_type === 'cash').length} transactions</div>
          </div>
          <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="text-xs text-zinc-500 mb-1">Credit Sales</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">{formatUGX(totalCreditSales)}</div>
            <div className="text-[10px] text-zinc-400">{vanSales.filter(s => s.sale_type === 'credit').length} transactions</div>
          </div>
          <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="text-xs text-zinc-500 mb-1">Collections</div>
            <div className="text-lg font-bold text-emerald-600 font-mono">{formatUGX(totalCollected)}</div>
            <div className="text-[10px] text-zinc-400">{collections.length} receipts</div>
          </div>
          <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="text-xs text-zinc-500 mb-1">Returns</div>
            <div className="text-lg font-bold text-red-600 font-mono">{formatUGX(totalReturns)}</div>
            <div className="text-[10px] text-zinc-400">{returns.length} returns</div>
          </div>
        </div>
      )}

      {/* Action Tabs */}
      {activeSession && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { key: 'sales', icon: '🛒', label: 'Van Sales' },
              { key: 'collections', icon: '💰', label: 'Collections' },
              { key: 'bookings', icon: '📖', label: 'Bookings' },
              { key: 'returns', icon: '🔄', label: 'Returns' },
              { key: 'expenses', icon: '⛽', label: 'Expenses' },
            ] as { key: FieldView; icon: string; label: string }[]).map(t => (
              <button
                key={t.key}
                onClick={() => { setView(t.key); setShowForm(false); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === t.key ? 'bg-amber-500 text-zinc-950 shadow' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={loadSessionData} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                <RefreshCw className={`w-4 h-4 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400">
                <Plus className="w-3.5 h-3.5" /> New {view === 'sales' ? 'Sale' : view === 'collections' ? 'Collection' : view === 'bookings' ? 'Booking' : view === 'returns' ? 'Return' : 'Expense'}
              </button>
            </div>
          </div>

          {/* Van Sale Form */}
          <AnimatePresence>
            {showForm && view === 'sales' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-amber-500/30 shadow-sm space-y-4"
              >
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-500" /> Create Van Sale
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Customer *</label>
                    <select value={saleForm.customerId} onChange={e => setSaleForm(p => ({ ...p, customerId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">Select customer...</option>
                      {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Sale Type *</label>
                    <select value={saleForm.saleType} onChange={e => setSaleForm(p => ({ ...p, saleType: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="cash">💵 Cash Sale</option>
                      <option value="credit">📋 Credit Sale</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-2 block">Sale Lines</label>
                  <div className="space-y-2">
                    {saleForm.lines.map((line, i) => {
                      const com = commodities.find((c: any) => c.id === line.commodityId);
                      const lineTotal = com ? Number(line.quantity) * Number(com.selling_price_ugx || 0) : 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <select value={line.commodityId}
                            onChange={e => setSaleForm(p => ({ ...p, lines: p.lines.map((l, j) => j === i ? { ...l, commodityId: e.target.value } : l) }))}
                            className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                          >
                            <option value="">Select commodity...</option>
                            {commodities.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {formatUGX(Number(c.selling_price_ugx))} / {c.selling_unit || 'Carton'}</option>)}
                          </select>
                          <input type="number" min={1} value={line.quantity} placeholder="Qty"
                            onChange={e => setSaleForm(p => ({ ...p, lines: p.lines.map((l, j) => j === i ? { ...l, quantity: Number(e.target.value) } : l) }))}
                            className="w-20 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 text-center"
                          />
                          <span className="text-xs font-mono text-zinc-500 w-28 text-right">{formatUGX(lineTotal)}</span>
                          <button onClick={() => setSaleForm(p => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))} className="text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                    <button onClick={() => setSaleForm(p => ({ ...p, lines: [...p.lines, { commodityId: '', quantity: 1 }] }))}
                      className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Line
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={submitVanSale} disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Record Sale
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold">Cancel</button>
                </div>
              </motion.div>
            )}

            {showForm && view === 'collections' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-amber-500/30 shadow-sm space-y-4"
              >
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-500" /> Record Debt Collection
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Customer *</label>
                    <select value={collForm.customerId} onChange={e => setCollForm(p => ({ ...p, customerId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">Select customer...</option>
                      {customers.filter((c: any) => Number(c.outstanding_balance_ugx || 0) > 0).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} — Owes: {formatUGX(Number(c.outstanding_balance_ugx))}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Amount UGX *</label>
                    <input type="number" value={collForm.amountUGX || ''} onChange={e => setCollForm(p => ({ ...p, amountUGX: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Payment Method</label>
                    <select value={collForm.paymentMethod} onChange={e => setCollForm(p => ({ ...p, paymentMethod: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Reference</label>
                    <input type="text" value={collForm.paymentReference} onChange={e => setCollForm(p => ({ ...p, paymentReference: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                      placeholder="MTN ref #"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={submitCollection} disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Record Collection
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold">Cancel</button>
                </div>
              </motion.div>
            )}

            {showForm && view === 'bookings' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-amber-500/30 shadow-sm space-y-4"
              >
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500" /> Create Customer Booking
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Customer *</label>
                    <select value={bookForm.customerId} onChange={e => setBookForm(p => ({ ...p, customerId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">Select customer...</option>
                      {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Commodity *</label>
                    <input type="text" value={bookForm.commodityName} onChange={e => setBookForm(p => ({ ...p, commodityName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                      placeholder="Nile Special 500ml"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Quantity</label>
                    <input type="number" min={1} value={bookForm.quantity} onChange={e => setBookForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Est. Value UGX</label>
                    <input type="number" value={bookForm.estimatedValueUGX || ''} onChange={e => setBookForm(p => ({ ...p, estimatedValueUGX: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={submitBooking} disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Confirm Booking
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold">Cancel</button>
                </div>
              </motion.div>
            )}

            {showForm && view === 'returns' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-amber-500/30 shadow-sm space-y-4"
              >
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-500" /> Record Customer Return
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Customer *</label>
                    <select value={retForm.customerId} onChange={e => setRetForm(p => ({ ...p, customerId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">Select customer...</option>
                      {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Reason</label>
                    <select value={retForm.reasonCode} onChange={e => setRetForm(p => ({ ...p, reasonCode: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="damaged">Damaged</option>
                      <option value="expired">Expired</option>
                      <option value="wrong_product">Wrong Product</option>
                      <option value="customer_refused">Customer Refused</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Disposition</label>
                    <select value={retForm.disposition} onChange={e => setRetForm(p => ({ ...p, disposition: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="truck_sellable">Return to Truck (Sellable)</option>
                      <option value="truck_quarantine">Quarantine on Truck</option>
                      <option value="warehouse_return">Return to Warehouse</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-2 block">Return Lines</label>
                  <div className="space-y-2">
                    {retForm.lines.map((line, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <select value={line.commodityId}
                          onChange={e => setRetForm(p => ({ ...p, lines: p.lines.map((l, j) => j === i ? { ...l, commodityId: e.target.value } : l) }))}
                          className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                        >
                          <option value="">Select commodity...</option>
                          {commodities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input type="number" min={1} value={line.quantity}
                          onChange={e => setRetForm(p => ({ ...p, lines: p.lines.map((l, j) => j === i ? { ...l, quantity: Number(e.target.value) } : l) }))}
                          className="w-20 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 text-center"
                        />
                        <button onClick={() => setRetForm(p => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))} className="text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setRetForm(p => ({ ...p, lines: [...p.lines, { commodityId: '', quantity: 1 }] }))}
                      className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Line
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={submitReturn} disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Process Return
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold">Cancel</button>
                </div>
              </motion.div>
            )}

            {showForm && view === 'expenses' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-amber-500/30 shadow-sm space-y-4"
              >
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-500" /> Record Field Expense
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Category</label>
                    <select value={expForm.category} onChange={e => setExpForm(p => ({ ...p, category: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="Fuel">⛽ Fuel</option>
                      <option value="Parking">🅿️ Parking</option>
                      <option value="Meals">🍽️ Meals / Lunch</option>
                      <option value="Vehicle Repair">🔧 Vehicle Repair</option>
                      <option value="Other">📦 Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Amount UGX *</label>
                    <input type="number" value={expForm.amountUGX || ''} onChange={e => setExpForm(p => ({ ...p, amountUGX: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Description</label>
                    <input type="text" value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                      placeholder="Diesel fuel 10L"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={submitExpense} disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Record Expense
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold">Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transaction Lists */}
          {view === 'sales' && (
            <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Sale #</th>
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-center font-bold text-zinc-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-center font-bold text-zinc-500 uppercase">Payment</th>
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vanSales.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">No van sales yet today</td></tr>
                    ) : vanSales.map((s: any) => (
                      <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                        <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{s.sale_number}</td>
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">{s.customer_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.sale_type === 'cash' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                          }`}>{s.sale_type}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatUGX(Number(s.total_ugx))}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                          }`}>{s.payment_status}</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500">{new Date(s.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'collections' && (
            <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Receipt #</th>
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Method</th>
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Reference</th>
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">No collections yet today</td></tr>
                    ) : collections.map((c: any) => (
                      <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                        <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{c.receipt_number}</td>
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">{c.customer_name}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{formatUGX(Number(c.amount_ugx))}</td>
                        <td className="px-4 py-3 text-zinc-500 capitalize">{(c.payment_method || '').replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-zinc-500 font-mono">{c.payment_reference || '—'}</td>
                        <td className="px-4 py-3 text-zinc-500">{new Date(c.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'bookings' && (
            <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Booking #</th>
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Commodity</th>
                      <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase">Est. Value</th>
                      <th className="px-4 py-3 text-center font-bold text-zinc-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">No bookings yet today</td></tr>
                    ) : bookings.map((b: any) => (
                      <tr key={b.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                        <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{b.booking_number}</td>
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">{b.customer_name}</td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{b.commodity_name}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-900 dark:text-zinc-100">{b.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">{formatUGX(Number(b.estimated_value_ugx || 0))}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'returns' && (
            <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Return #</th>
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Reason</th>
                      <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase">Value</th>
                      <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase">Disposition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400">No returns today</td></tr>
                    ) : returns.map((r: any) => (
                      <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                        <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{r.return_number}</td>
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">{r.customer_name}</td>
                        <td className="px-4 py-3 text-zinc-500 capitalize">{(r.reason_code || '').replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-red-600">{formatUGX(Number(r.total_value_ugx))}</td>
                        <td className="px-4 py-3 text-zinc-500 capitalize">{(r.disposition || '').replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'expenses' && (
            <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 text-center text-zinc-400 text-sm">
              Expenses for this session will appear here after recording.
              <br />
              <span className="text-[10px] text-zinc-500 mt-1 block">All approved expenses reduce the expected cash-to-submit at EOD reconciliation.</span>
            </div>
          )}
        </>
      )}

      {!activeSession && !showSessionForm && (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Truck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No Active Route Session</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Select a sales agent above and start a route session to begin recording van sales,
            collections, bookings, returns, and field expenses.
          </p>
        </div>
      )}
    </motion.div>
  );
}
