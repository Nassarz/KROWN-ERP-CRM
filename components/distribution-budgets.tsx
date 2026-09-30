'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet, BarChart3, Target, Award, TrendingUp, TrendingDown,
  Plus, Loader2, RefreshCw, CheckCircle2, AlertTriangle, X,
  FileText, Send, PieChart, Banknote, DollarSign, Receipt,
  Search, Download, Calendar, Percent
} from 'lucide-react';
import { formatUGX } from '@/lib/mockData';

type BudgetView = 'budgets' | 'requisitions' | 'tax' | 'targets' | 'commissions';

export default function DistributionBudgets() {
  const [view, setView] = useState<BudgetView>('budgets');
  const [budgets, setBudgets] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Budget form
  const [budgetForm, setBudgetForm] = useState({
    budgetName: '', periodYear: new Date().getFullYear(), periodQuarter: Math.ceil((new Date().getMonth() + 1) / 3),
    totalAllocatedUGX: 0,
    lines: [
      { categoryName: 'Fuel & Logistics', allocatedUGX: 0 },
      { categoryName: 'Marketing & Promotions', allocatedUGX: 0 },
      { categoryName: 'Vehicle Repairs', allocatedUGX: 0 },
      { categoryName: 'Staff Allowances', allocatedUGX: 0 },
    ]
  });

  // Requisition form
  const [reqForm, setReqForm] = useState({
    budgetLineId: '', requestedBy: '', purpose: '', amountUGX: 0
  });

  // Tax form
  const [taxForm, setTaxForm] = useState({
    taxName: 'VAT', periodName: '', calculatedLiabilityUGX: 0, dueDate: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bRes, rRes, tRes] = await Promise.all([
        fetch('/api/distribution/budgets'),
        fetch('/api/distribution/requisitions'),
        fetch('/api/distribution/tax')
      ]);
      if (bRes.ok) setBudgets(await bRes.json());
      if (rRes.ok) setRequisitions(await rRes.json());
      if (tRes.ok) setTaxes(await tRes.json());
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const submitBudget = async () => {
    if (!budgetForm.budgetName || budgetForm.totalAllocatedUGX <= 0) {
      setError('Budget name and allocation are required'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/distribution/budgets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetForm)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess('Budget created');
      setShowForm(false);
      loadData();
    } catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  };

  const submitRequisition = async () => {
    if (!reqForm.budgetLineId || !reqForm.requestedBy || !reqForm.purpose || reqForm.amountUGX <= 0) {
      setError('Please fill all required fields'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/distribution/requisitions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqForm)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess('Requisition created');
      setShowForm(false);
      setReqForm({ budgetLineId: '', requestedBy: '', purpose: '', amountUGX: 0 });
      loadData();
    } catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  };

  const submitTax = async () => {
    if (!taxForm.taxName || !taxForm.periodName || taxForm.calculatedLiabilityUGX <= 0 || !taxForm.dueDate) {
      setError('Please fill all required fields'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/distribution/tax', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taxForm)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess('Tax obligation recorded');
      setShowForm(false);
      setTaxForm({ taxName: 'VAT', periodName: '', calculatedLiabilityUGX: 0, dueDate: '' });
      loadData();
    } catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  };

  const allBudgetLines = budgets.flatMap((b: any) => (b.lines || []).map((l: any) => ({ ...l, budgetName: b.budget_name })));
  const totalAllocated = budgets.reduce((s, b) => s + Number(b.total_allocated_ugx || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.total_spent_ugx || 0), 0);
  const totalTaxDue = taxes.filter(t => t.status !== 'paid').reduce((s, t) => s + Number(t.outstanding_ugx || 0), 0);

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Total Budget Allocated</span>
            <Wallet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">{formatUGX(totalAllocated)}</div>
          <div className="text-xs text-zinc-500">{budgets.length} active budgets</div>
        </div>
        <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Total Budget Spent</span>
            <BarChart3 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">{formatUGX(totalSpent)}</div>
          <div className="text-xs text-zinc-500">{requisitions.length} requisitions</div>
        </div>
        <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Outstanding Tax</span>
            <Receipt className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">{formatUGX(totalTaxDue)}</div>
          <div className="text-xs text-zinc-500">{taxes.filter(t => t.status !== 'paid').length} obligations</div>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['budgets', 'requisitions', 'tax'] as BudgetView[]).map(v => (
          <button
            key={v}
            onClick={() => { setView(v); setShowForm(false); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === v ? 'bg-amber-500 text-zinc-950 shadow' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
          >
            {v === 'budgets' ? '📊 Budgets' : v === 'requisitions' ? '📝 Requisitions' : '🏛️ Tax Register'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={loadData} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700">
            <RefreshCw className={`w-4 h-4 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 transition-colors">
            <Plus className="w-3.5 h-3.5" /> New {view === 'budgets' ? 'Budget' : view === 'requisitions' ? 'Requisition' : 'Tax Obligation'}
          </button>
        </div>
      </div>

      {/* Forms */}
      <AnimatePresence>
        {showForm && view === 'budgets' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-amber-500/30 shadow-sm space-y-4"
          >
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-500" /> Create Quarterly Budget
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Budget Name *</label>
                <input type="text" value={budgetForm.budgetName} onChange={e => setBudgetForm(p => ({ ...p, budgetName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="Q4 Distribution Operations"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Year</label>
                <input type="number" value={budgetForm.periodYear} onChange={e => setBudgetForm(p => ({ ...p, periodYear: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Quarter</label>
                <select value={budgetForm.periodQuarter} onChange={e => setBudgetForm(p => ({ ...p, periodQuarter: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Total Allocation UGX *</label>
                <input type="number" value={budgetForm.totalAllocatedUGX || ''} onChange={e => setBudgetForm(p => ({ ...p, totalAllocatedUGX: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. 20000000"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-2 block">Budget Lines</label>
              <div className="space-y-2">
                {budgetForm.lines.map((line, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input type="text" value={line.categoryName}
                      onChange={e => setBudgetForm(p => ({ ...p, lines: p.lines.map((l, j) => j === i ? { ...l, categoryName: e.target.value } : l) }))}
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                    <input type="number" value={line.allocatedUGX || ''} placeholder="Amount UGX"
                      onChange={e => setBudgetForm(p => ({ ...p, lines: p.lines.map((l, j) => j === i ? { ...l, allocatedUGX: Number(e.target.value) } : l) }))}
                      className="w-40 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                    <button onClick={() => setBudgetForm(p => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))} className="text-red-500 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setBudgetForm(p => ({ ...p, lines: [...p.lines, { categoryName: '', allocatedUGX: 0 }] }))}
                  className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Line
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={submitBudget} disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Create Budget
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold">Cancel</button>
            </div>
          </motion.div>
        )}

        {showForm && view === 'requisitions' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-amber-500/30 shadow-sm space-y-4"
          >
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> Submit Budget Requisition
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Budget Line *</label>
                <select value={reqForm.budgetLineId} onChange={e => setReqForm(p => ({ ...p, budgetLineId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Select line...</option>
                  {allBudgetLines.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.budgetName} / {l.category_name} — Avail: {formatUGX(Number(l.available_ugx))}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Requested By *</label>
                <input type="text" value={reqForm.requestedBy} onChange={e => setReqForm(p => ({ ...p, requestedBy: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="John Mukasa"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Amount UGX *</label>
                <input type="number" value={reqForm.amountUGX || ''} onChange={e => setReqForm(p => ({ ...p, amountUGX: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. 500000"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Purpose *</label>
                <input type="text" value={reqForm.purpose} onChange={e => setReqForm(p => ({ ...p, purpose: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="Fuel for trucks"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={submitRequisition} disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Submit Requisition
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold">Cancel</button>
            </div>
          </motion.div>
        )}

        {showForm && view === 'tax' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-amber-500/30 shadow-sm space-y-4"
          >
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" /> Record Tax Obligation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Tax Type *</label>
                <select value={taxForm.taxName} onChange={e => setTaxForm(p => ({ ...p, taxName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="VAT">VAT (Value Added Tax)</option>
                  <option value="PAYE">PAYE (Pay As You Earn)</option>
                  <option value="WHT">WHT (Withholding Tax)</option>
                  <option value="Local Service Tax">Local Service Tax</option>
                  <option value="Corporate Income Tax">Corporate Income Tax</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Period *</label>
                <input type="text" value={taxForm.periodName} onChange={e => setTaxForm(p => ({ ...p, periodName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="Sep 2026"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Liability UGX *</label>
                <input type="number" value={taxForm.calculatedLiabilityUGX || ''} onChange={e => setTaxForm(p => ({ ...p, calculatedLiabilityUGX: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. 2500000"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Due Date *</label>
                <input type="date" value={taxForm.dueDate} onChange={e => setTaxForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={submitTax} disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Record Tax
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Tables */}
      {view === 'budgets' && (
        <div className="space-y-4">
          {budgets.length === 0 ? (
            <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400 text-sm">
              No budgets created yet. Create your first quarterly budget above.
            </div>
          ) : budgets.map((b: any) => (
            <div key={b.id} className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{b.budget_name}</h4>
                  <p className="text-xs text-zinc-500">{b.period_year} Q{b.period_quarter} — Total: {formatUGX(Number(b.total_allocated_ugx))}</p>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  b.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                  'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                }`}>{b.status}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
                      <th className="px-4 py-2 text-left font-bold text-zinc-500">Category</th>
                      <th className="px-4 py-2 text-right font-bold text-zinc-500">Allocated</th>
                      <th className="px-4 py-2 text-right font-bold text-zinc-500">Committed</th>
                      <th className="px-4 py-2 text-right font-bold text-zinc-500">Spent</th>
                      <th className="px-4 py-2 text-right font-bold text-zinc-500">Available</th>
                      <th className="px-4 py-2 text-right font-bold text-zinc-500">Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(b.lines || []).map((l: any) => {
                      const util = Number(l.allocated_ugx) > 0 ? (Number(l.spent_ugx || 0) / Number(l.allocated_ugx) * 100) : 0;
                      return (
                        <tr key={l.id} className="border-b border-zinc-50 dark:border-zinc-800/30">
                          <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">{l.category_name}</td>
                          <td className="px-4 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">{formatUGX(Number(l.allocated_ugx))}</td>
                          <td className="px-4 py-2 text-right font-mono text-amber-600">{formatUGX(Number(l.committed_ugx || 0))}</td>
                          <td className="px-4 py-2 text-right font-mono text-red-600">{formatUGX(Number(l.spent_ugx || 0))}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600">{formatUGX(Number(l.available_ugx))}</td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${util > 80 ? 'bg-red-500' : util > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(util, 100)}%` }} />
                              </div>
                              <span className="text-zinc-500 font-mono">{util.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'requisitions' && (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Req #</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Requested By</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Purpose</th>
                  <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-center font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">No requisitions yet</td></tr>
                ) : requisitions.map((r: any) => (
                  <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                    <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{r.requisition_number}</td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{r.category_name}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{r.requested_by}</td>
                    <td className="px-4 py-3 text-zinc-500 max-w-[200px] truncate">{r.purpose}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatUGX(Number(r.amount_ugx))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        r.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'tax' && (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Tax Type</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Period</th>
                  <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase tracking-wider">Liability</th>
                  <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase tracking-wider">Paid</th>
                  <th className="px-4 py-3 text-right font-bold text-zinc-500 uppercase tracking-wider">Outstanding</th>
                  <th className="px-4 py-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-4 py-3 text-center font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {taxes.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400">No tax obligations recorded</td></tr>
                ) : taxes.map((t: any) => (
                  <tr key={t.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                    <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">{t.tax_name}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{t.period_name}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">{formatUGX(Number(t.calculated_liability_ugx))}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">{formatUGX(Number(t.paid_amount_ugx || 0))}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatUGX(Number(t.outstanding_ugx))}</td>
                    <td className="px-4 py-3 text-zinc-500">{new Date(t.due_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        t.status === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}>{t.status}</span>
                    </td>
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
