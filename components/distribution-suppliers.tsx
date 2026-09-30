'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Truck, Plus, Search, Phone, Mail, Building, CreditCard, Star, CheckCircle2, Edit3, X, Loader2, RefreshCw
} from 'lucide-react';
import { Supplier } from '@/lib/distribution-types';
import { formatUGX } from '@/lib/mockData';

export default function DistributionSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    code: '',
    name: '',
    category: 'Beverages',
    taxId: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    paymentTermsDays: 30,
    creditLimitUGX: 50000000,
    status: 'active'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/distribution/suppliers');
      if (!res.ok) throw new Error(await res.text());
      setSuppliers(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSaving(true);
    try {
      const res = await fetch('/api/distribution/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error(await res.text());
      await loadSuppliers();
      setShowModal(false);
      setFormData({ code: '', name: '', category: 'Beverages', taxId: '', contactPerson: '',
        phone: '', email: '', address: '', paymentTermsDays: 30, creditLimitUGX: 50000000, status: 'active' });
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Building className="w-6 h-6 text-amber-500" />
            Supplier Directory & Accounts
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Supplier accounts, payment terms, performance ratings & canonical payables link
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              code: `SUP-${Math.floor(100 + Math.random() * 900)}`,
              name: '',
              category: 'Beverages',
              contactPerson: '',
              phone: '',
              email: '',
              address: '',
              paymentTermsDays: 30,
              creditLimitUGX: 50000000,
              status: 'active'
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4">Supplier</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Category</th>
                <th className="p-4">Payment Terms</th>
                <th className="p-4">Current Payable</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
              {filtered.map(sup => (
                <tr key={sup.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{sup.name}</div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5">{sup.code}</div>
                  </td>
                  <td className="p-4 text-xs text-zinc-600 dark:text-zinc-400">
                    <div className="font-medium text-zinc-900 dark:text-zinc-200">{sup.contactPerson}</div>
                    <div>{sup.phone}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                      {sup.category}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    {sup.paymentTermsDays} Days Net
                  </td>
                  <td className="p-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {formatUGX(sup.currentPayableUGX)}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-500 text-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      {sup.performanceRating}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setFormData(sup);
                        setShowModal(true);
                      }}
                      className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-amber-600 dark:text-amber-400 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Building className="w-5 h-5 text-amber-500" />
                  {formData.id ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Supplier Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Century Bottling Company"
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Contact Person</label>
                    <input
                      type="text"
                      placeholder="Name"
                      value={formData.contactPerson || ''}
                      onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+256 414 000 000"
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Payment Terms (Days)</label>
                    <input
                      type="number"
                      value={formData.paymentTermsDays || 30}
                      onChange={e => setFormData({ ...formData, paymentTermsDays: Number(e.target.value) })}
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
                    Save Supplier
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
