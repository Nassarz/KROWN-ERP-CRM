'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Plus, Search, Navigation, Calendar, User, Truck, CheckCircle2, Edit3, X, Compass, Loader2, RefreshCw
} from 'lucide-react';
import { Route } from '@/lib/distribution-types';

export default function DistributionRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState<Partial<Route>>({
    code: '',
    name: '',
    territoryName: 'Kampala Central',
    assignedAgentName: 'Sarah Namatovu',
    assignedVehicleReg: 'UGX 123A',
    operatingDays: ['Monday', 'Wednesday', 'Friday'],
    status: 'active'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoutes = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/distribution/routes');
      if (!res.ok) throw new Error(await res.text());
      setRoutes(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  const filtered = routes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSaving(true);
    try {
      const res = await fetch('/api/distribution/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error(await res.text());
      await loadRoutes();
      setShowModal(false);
      setFormData({ code: '', name: '', territoryName: 'Kampala Central',
        assignedAgentName: '', assignedVehicleReg: '',
        operatingDays: ['Monday', 'Wednesday', 'Friday'], status: 'active' });
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-500" />
            Route Planning & Territory Management
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Country → Region → Territory → Route stop sequence and scheduled visit days
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              code: `RT-${Math.floor(100 + Math.random() * 900)}`,
              name: '',
              territoryName: 'Kampala East',
              assignedAgentName: 'Sarah Namatovu',
              assignedVehicleReg: 'UGX 123A',
              operatingDays: ['Monday', 'Wednesday', 'Friday'],
              status: 'active'
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Route
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(rt => (
          <div key={rt.id} className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm hover:border-amber-500/50 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Navigation className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{rt.name}</h3>
                  <div className="text-xs text-zinc-500 font-mono mt-0.5">{rt.code} • {rt.territoryName}</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl text-xs">
              <div>
                <span className="text-zinc-500 block">Assigned Agent</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1 mt-0.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  {rt.assignedAgentName || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Assigned Truck</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5 font-mono">
                  <Truck className="w-3.5 h-3.5 text-amber-500" />
                  {rt.assignedVehicleReg || 'Unassigned'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <div className="flex items-center gap-1 flex-wrap">
                {rt.operatingDays.map(day => (
                  <span key={day} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    {day}
                  </span>
                ))}
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
                  <Compass className="w-5 h-5 text-amber-500" />
                  Add Route
                </h3>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Route Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kampala North Route"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Route Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RT-NORTH"
                      value={formData.code || ''}
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Territory</label>
                    <input
                      type="text"
                      placeholder="Territory Name"
                      value={formData.territoryName || ''}
                      onChange={e => setFormData({ ...formData, territoryName: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
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
                    Save Route
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
