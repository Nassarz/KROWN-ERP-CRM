'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck, Plus, Search, ShieldCheck, DollarSign, Smartphone, Truck, CheckCircle2, Edit3, X, Lock, CreditCard, Loader2, RefreshCw
} from 'lucide-react';
import { SalesAgent } from '@/lib/distribution-types';
import { formatUGX } from '@/lib/mockData';

export default function DistributionAgents() {
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState<Partial<SalesAgent>>({
    agentCode: '',
    name: '',
    email: '',
    phone: '',
    territoryName: 'Kampala East',
    assignedVehicleReg: 'UGX 123A',
    cashLimitUGX: 10000000,
    canGiveCredit: true,
    maxDiscountPct: 5,
    status: 'active'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/distribution/agents');
      if (!res.ok) throw new Error(await res.text());
      setAgents(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const filtered = agents.filter(a =>
    (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
    a.agentCode.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSaving(true);
    try {
      const res = await fetch('/api/distribution/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error(await res.text());
      await loadAgents();
      setShowModal(false);
      setFormData({ agentCode: '', name: '', email: '', phone: '',
        territoryName: 'Kampala East', assignedVehicleReg: 'UGX 123A',
        cashLimitUGX: 10000000, canGiveCredit: true, maxDiscountPct: 5, status: 'active' });
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-amber-500" />
            Sales Agents & Employee Profiles
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Linked HR profiles, assigned trucks, territories, cash limits & commercial credit permissions
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              agentCode: `AGT-${Math.floor(100 + Math.random() * 900)}`,
              name: '',
              email: '',
              phone: '',
              territoryName: 'Kampala East',
              assignedVehicleReg: 'UGX 123A',
              cashLimitUGX: 10000000,
              canGiveCredit: true,
              maxDiscountPct: 5,
              status: 'active'
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Sales Agent
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(agent => (
          <div key={agent.id} className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm hover:border-amber-500/50 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                  {agent.name ? agent.name.charAt(0) : 'A'}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{agent.name}</h3>
                  <div className="text-xs text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                    <span>{agent.agentCode}</span>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-sans font-medium">{agent.territoryName}</span>
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl text-xs">
              <div>
                <span className="text-zinc-500 block">Assigned Truck</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1 mt-0.5 font-mono">
                  <Truck className="w-3.5 h-3.5 text-zinc-400" />
                  {agent.assignedVehicleReg || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Daily Cash Limit</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5 font-mono">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  {formatUGX(agent.cashLimitUGX)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Credit Approval: <strong>{agent.canGiveCredit ? 'Allowed' : 'Restricted'}</strong></span>
              </div>
              <div>
                Max Discount: <strong>{agent.maxDiscountPct}%</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-500" />
                  Add Sales Agent
                </h3>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Agent Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Namatovu"
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Agent Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AGT-001"
                      value={formData.agentCode || ''}
                      onChange={e => setFormData({ ...formData, agentCode: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+256 700 000 000"
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Cash Limit (UGX)</label>
                    <input
                      type="number"
                      value={formData.cashLimitUGX || 5000000}
                      onChange={e => setFormData({ ...formData, cashLimitUGX: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-zinc-950 shadow-md shadow-amber-500/20"
                  >
                    Save Sales Agent
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
