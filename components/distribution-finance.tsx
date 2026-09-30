'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign, CreditCard, Building, ArrowDownRight, ArrowUpRight,
  Plus, Loader2, RefreshCw, CheckCircle2, AlertTriangle, X,
  Landmark, Receipt, FileText, Send, Calendar, Banknote, Search
} from 'lucide-react';
import { formatUGX } from '@/lib/mockData';

type FinanceView = 'payables' | 'payouts' | 'deposits';

export default function DistributionFinance() {
  const [view, setView] = useState<FinanceView>('payables');
  const [payables, setPayables] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Payable form
  const [payForm, setPayForm] = useState({
    supplierId: '', dueDate: '', amountUGX: 0, originNumber: '', notes: ''
  });

  // Payout form
  const [poutForm, setPoutForm] = useState({
    supplierId: '', payableId: '', amountUGX: 0,
    paymentMethod: 'bank_transfer' as 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque',
    paymentReference: '', bankAccountName: 'Stanbic Main Operating Account'
  });

  // Deposit form
  const [depForm, setDepForm] = useState({
    targetBankAccount: 'Stanbic Main Operating Account',
    agentSettlementIds: [] as string[]
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, poRes, dRes, sRes, stRes] = await Promise.all([
        fetch('/api/distribution/payables'),
        fetch('/api/distribution/payouts'),
        fetch('/api/distribution/deposits'),
        fetch('/api/distribution/suppliers'),
        fetch('/api/distribution/reconciliation')
      ]);

      if (pRes.ok) setPayables(await pRes.json());
      if (poRes.ok) setPayouts(await poRes.json());
      if (dRes.ok) setDeposits(await dRes.json());
      if (sRes.ok) setSuppliers(await sRes.json());
      if (stRes.ok) setSettlements(await stRes.json());
    } catch (e: any) {
      setError(e?.message || 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const submitPayable = async () => {
    if (!payForm.supplierId || !payForm.dueDate || payForm.amountUGX <= 0) {
      setError('Please fill all required fields'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/distribution/payables', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payForm)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess('Supplier payable created');
      setShowForm(false);
      setPayForm({ supplierId: '', dueDate: '', amountUGX: 0, originNumber: '', notes: '' });
      loadData();
    } catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  };

  const submitPayout = async () => {
    if (!poutForm.supplierId || poutForm.amountUGX <= 0) {
      setError('Please fill all required fields'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/distribution/payouts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poutForm)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess('Supplier payout processed');
      setShowForm(false);
      setPoutForm({ supplierId: '', payableId: '', amountUGX: 0, paymentMethod: 'bank_transfer', paymentReference: '', bankAccountName: 'Stanbic Main Operating Account' });
      loadData();
    } catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  };

  const submitDeposit = async () => {
    if (!depForm.targetBankAccount) {
      setError('Please specify a bank account'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/distribution/deposits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depForm)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess('Deposit batch created');
      setShowForm(false);
      setDepForm({ targetBankAccount: 'Stanbic Main Operating Account', agentSettlementIds: [] });
      loadData();
    } catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  };

  const totalPayablesOpen = payables.filter(p => p.status === 'open' || p.status === 'partial').reduce((s, p) => s + Number(p.balance_ugx || 0), 0);
  const totalPayoutsPaid = payouts.reduce((s, p) => s + Number(p.amount_ugx || 0), 0);
  const totalDeposited = deposits.reduce((s, d) => s + Number(d.grand_total_ugx || 0), 0);

  const filteredPayables = payables.filter(p =>
    !searchTerm || p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.payable_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredPayouts = payouts.filter(p =>
    !searchTerm || p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.payout_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {/* Alerts */}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Open Payables</span>
            <ArrowUpRight className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">{formatUGX(totalPayablesOpen)}</div>
          <div className="text-xs text-zinc-500">{payables.filter(p => p.status === 'open' || p.status === 'partial').length} open bills</div>
        </div>
        <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Total Paid Out</span>
            <ArrowDownRight className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">{formatUGX(totalPayoutsPaid)}</div>
          <div className="text-xs text-zinc-500">{payouts.length} payouts</div>
        </div>
        <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Bank Deposits</span>
            <Landmark className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">{formatUGX(totalDeposited)}</div>
          <div className="text-xs text-zinc-500">{deposits.length} deposit batches</div>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['payables', 'payouts', 'deposits'] as FinanceView[]).map(v => (
          <button
            key={v}
            onClick={() => { setView(v); setShowForm(false); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === v ? 'bg-amber-500 text-zinc-950 shadow' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
          >
            {v === 'payables' ? '📋 Payables' : v === 'payouts' ? '💸 Payouts' : '🏦 Deposits'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search..." className="pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 w-48"
            />
          </div>
          <button onClick={loadData} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700">
            <RefreshCw className={`w-4 h-4 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 transition-colors">
            <Plus className="w-3.5 h-3.5" /> New {view === 'payables' ? 'Payable' : view === 'payouts' ? 'Payout' : 'Deposit'}
          </button>
        </div>
      </div>

      {/* Forms */}
      <AnimatePresence>
        {showForm && view === 'payables' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-amber-500/30 shadow-sm space-y-4"
          >
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> Record Supplier Payable
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Supplier *</label>
                <select value={payForm.supplierId} onChange={e => setPayForm(p => ({ ...p, supplierId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Amount UGX *</label>
                <input type="number" value={payForm.amountUGX || ''} onChange={e => setPayForm(p => ({ ...p, amountUGX: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. 5000000"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Due Date *</label>
                <input type="date" value={payForm.dueDate} onChange={e => setPayForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Origin Ref</label>
                <input type="text" value={payForm.originNumber} onChange={e => setPayForm(p => ({ ...p, originNumber: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="PO-2026-001"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={submitPayable} disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Create Payable
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold">Cancel</button>
            </div>
          </motion.div>
        )}

        {showForm && view === 'payouts' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-amber-500/30 shadow-sm space-y-4"
          >
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-500" /> Process Supplier Payout
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Supplier *</label>
                <select value={poutForm.supplierId} onChange={e => setPoutForm(p => ({ ...p, supplierId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Amount UGX *</label>
                <input type="number" value={poutForm.amountUGX || ''} onChange={e => setPoutForm(p => ({ ...p, amountUGX: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. 3000000"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Method</label>
                <select value={poutForm.paymentMethod} onChange={e => setPoutForm(p => ({ ...p, paymentMethod: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Against Payable</label>
                <select value={poutForm.payableId} onChange={e => setPoutForm(p => ({ ...p, payableId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Unallocated / General</option>
                  {payables.filter(p => p.status !== 'paid' && p.supplier_id === poutForm.supplierId).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.payable_number} — Bal: {formatUGX(Number(p.balance_ugx))}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={submitPayout} disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Process Payout
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold">Cancel</button>
            </div>
          </motion.div>
        )}

        {showForm && view === 'deposits' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-amber-500/30 shadow-sm space-y-4"
          >
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-amber-500" /> Create Deposit Batch
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Target Bank Account *</label>
                <input type="text" value={depForm.targetBankAccount} onChange={e => setDepForm(p => ({ ...p, targetBankAccount: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Include Agent Settlements</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {settlements.filter(s => s.status === 'closed').map((s: any) => (
                    <label key={s.id} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={depForm.agentSettlementIds.includes(s.id)}
                        onChange={e => {
                          setDepForm(p => ({
                            ...p,
                            agentSettlementIds: e.target.checked
                              ? [...p.agentSettlementIds, s.id]
                              : p.agentSettlementIds.filter(id => id !== s.id)
                          }));
                        }}
                        className="rounded border-zinc-300"
                      />
                      {s.settlement_number} — {s.agent_name || 'Agent'} — {formatUGX(Number(s.actual_cash_submitted || 0))}
                    </label>
                  ))}
                  {settlements.filter(s => s.status === 'closed').length === 0 && (
                    <span className="text-xs text-zinc-400">No closed settlements to include</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={submitDeposit} disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Landmark className="w-3.5 h-3.5" />} Create Deposit
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Tables */}
      {view === 'payables' && (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Payable #</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase tracking-wider">Original</th>
                  <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase tracking-wider">Paid</th>
                  <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-4 py-3 text-center font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayables.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400">No payables recorded yet</td></tr>
                ) : filteredPayables.map((p: any) => (
                  <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{p.payable_number}</td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">{p.supplier_name}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">{formatUGX(Number(p.original_amount_ugx))}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">{formatUGX(Number(p.paid_amount_ugx))}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatUGX(Number(p.balance_ugx))}</td>
                    <td className="px-4 py-3 text-zinc-500">{new Date(p.due_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        p.status === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'payouts' && (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Payout #</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Method</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-3 text-center font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400">No payouts processed yet</td></tr>
                ) : filteredPayouts.map((p: any) => (
                  <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{p.payout_number}</td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">{p.supplier_name}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatUGX(Number(p.amount_ugx))}</td>
                    <td className="px-4 py-3 text-zinc-500 capitalize">{(p.payment_method || '').replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-zinc-500 font-mono">{p.payment_reference || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{new Date(p.paid_at || p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'deposits' && (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Batch #</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Bank Account</th>
                  <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase tracking-wider">Cash</th>
                  <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase tracking-wider">Digital</th>
                  <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase tracking-wider">Grand Total</th>
                  <th className="px-4 py-3 text-center font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {deposits.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400">No deposit batches yet</td></tr>
                ) : deposits.map((d: any) => (
                  <tr key={d.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{d.batch_number}</td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">{d.target_bank_account}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">{formatUGX(Number(d.total_cash_ugx))}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">{formatUGX(Number(d.total_digital_ugx))}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatUGX(Number(d.grand_total_ugx))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        d.status === 'reconciled' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                      }`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{new Date(d.deposit_date || d.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
