'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, Plus, Search, Loader2,
  CheckCircle2, X, Edit3, Eye, Box, RefreshCw
} from 'lucide-react';
import { Commodity } from '@/lib/distribution-types';
import { formatUGX } from '@/lib/mockData';

export default function DistributionCommodities() {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCommodity, setSelectedCommodity] = useState<Commodity | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Commodity>>({
    code: '',
    name: '',
    brand: '',
    variant: '',
    baseUnit: 'Bottle',
    sellingUnit: 'Carton',
    purchaseUnit: 'Pallet',
    packSize: 24,
    costPriceUGX: 0,
    sellingPriceUGX: 0,
    wholesalePriceUGX: 0,
    distributorPriceUGX: 0,
    minStock: 100,
    maxStock: 5000,
    reorderLevel: 250,
    taxCategory: 'standard',
    status: 'active'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCommodities = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/distribution/commodities');
      if (!res.ok) throw new Error(await res.text());
      setCommodities(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCommodities(); }, [loadCommodities]);

  const filtered = commodities.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                          c.code.toLowerCase().includes(search.toLowerCase()) ||
                          (c.brand && c.brand.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || c.categoryName === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = Array.from(new Set(commodities.map(c => c.categoryName || 'General')));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;
    setSaving(true);
    try {
      const res = await fetch('/api/distribution/commodities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCommodities();
      setShowModal(false);
      setFormData({
        code: '', name: '', brand: '', variant: '',
        baseUnit: 'Bottle', sellingUnit: 'Carton', purchaseUnit: 'Pallet',
        packSize: 24, costPriceUGX: 0, sellingPriceUGX: 0,
        wholesalePriceUGX: 0, distributorPriceUGX: 0,
        minStock: 100, maxStock: 5000, reorderLevel: 250,
        taxCategory: 'standard', status: 'active'
      });
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            Commodities Registry
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {loading ? 'Loading from Neon PostgreSQL...' : `${commodities.length} commodities • Manage distribution items, multi-tier pricing & packaging hierarchy`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadCommodities} disabled={loading}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-amber-500 hover:border-amber-500 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setFormData({
                code: `CMD-${Math.floor(100 + Math.random() * 900)}`,
                name: '', brand: '', variant: '',
                baseUnit: 'Bottle', sellingUnit: 'Carton', purchaseUnit: 'Pallet',
                packSize: 24, costPriceUGX: 2000, sellingPriceUGX: 3000,
                wholesalePriceUGX: 2600, distributorPriceUGX: 2400,
                minStock: 200, maxStock: 10000, reorderLevel: 500,
                taxCategory: 'standard', status: 'active'
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Commodity
          </button>
        </div>
      </div>
      {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 rounded-xl">{error}</div>}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-zinc-50 dark:bg-[#18181b] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Search commodities by code, name, brand..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-amber-500 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCategory === 'all' ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-white dark:bg-[#121214] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'}`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCategory === cat ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-white dark:bg-[#121214] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Commodities Table */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4">Commodity</th>
                <th className="p-4">Packaging & Units</th>
                <th className="p-4">Cost Price</th>
                <th className="p-4">Retail Price</th>
                <th className="p-4">Wholesale / Dist.</th>
                <th className="p-4">Margin %</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
              {filtered.map(item => {
                const marginPct = item.sellingPriceUGX > 0
                  ? (((item.sellingPriceUGX - item.costPriceUGX) / item.sellingPriceUGX) * 100).toFixed(1)
                  : '0.0';
                return (
                  <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                          <Box className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{item.code}</span>
                            <span>• {item.brand}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-300 text-xs">
                      <div><strong className="text-zinc-900 dark:text-zinc-100">Base:</strong> {item.baseUnit}</div>
                      <div><strong className="text-zinc-900 dark:text-zinc-100">Pack:</strong> 1 {item.sellingUnit} = {item.packSize} {item.baseUnit}s</div>
                    </td>
                    <td className="p-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {formatUGX(item.costPriceUGX)}
                    </td>
                    <td className="p-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {formatUGX(item.sellingPriceUGX)}
                    </td>
                    <td className="p-4 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      <div>W: {formatUGX(item.wholesalePriceUGX)}</div>
                      <div>D: {formatUGX(item.distributorPriceUGX)}</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        +{marginPct}%
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedCommodity(item)}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setFormData(item);
                          setShowModal(true);
                        }}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-amber-600 dark:text-amber-400 transition-colors"
                        title="Edit Commodity"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  {formData.id ? 'Edit Commodity' : 'Create New Commodity'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Commodity Code</label>
                    <input
                      type="text"
                      required
                      value={formData.code || ''}
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Commodity Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Coca-Cola 500ml PET"
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Brand</label>
                    <input
                      type="text"
                      placeholder="e.g. Coca-Cola"
                      value={formData.brand || ''}
                      onChange={e => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Base Unit</label>
                    <input
                      type="text"
                      placeholder="e.g. Bottle"
                      value={formData.baseUnit || ''}
                      onChange={e => setFormData({ ...formData, baseUnit: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Pack Size (Units/Carton)</label>
                    <input
                      type="number"
                      value={formData.packSize || 24}
                      onChange={e => setFormData({ ...formData, packSize: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Cost Price (UGX)</label>
                    <input
                      type="number"
                      value={formData.costPriceUGX || 0}
                      onChange={e => setFormData({ ...formData, costPriceUGX: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Retail Price (UGX)</label>
                    <input
                      type="number"
                      value={formData.sellingPriceUGX || 0}
                      onChange={e => setFormData({ ...formData, sellingPriceUGX: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-amber-600 dark:text-amber-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Wholesale (UGX)</label>
                    <input
                      type="number"
                      value={formData.wholesalePriceUGX || 0}
                      onChange={e => setFormData({ ...formData, wholesalePriceUGX: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Distributor (UGX)</label>
                    <input
                      type="number"
                      value={formData.distributorPriceUGX || 0}
                      onChange={e => setFormData({ ...formData, distributorPriceUGX: Number(e.target.value) })}
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
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-zinc-950 shadow-md shadow-amber-500/20 disabled:opacity-60 flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Commodity
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
