'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Plus, Search, ShieldCheck, DollarSign, MapPin, Phone, Mail,
  CreditCard, CheckCircle2, AlertCircle, X, Edit3, Eye, Building, Loader2, RefreshCw
} from 'lucide-react';
import { Customer } from '@/lib/distribution-types';
import { formatUGX } from '@/lib/mockData';

export default function DistributionCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState<Partial<Customer>>({
    code: '',
    name: '',
    customerType: 'retailer',
    customerGroup: 'Standard',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    creditLimitUGX: 5000000,
    creditDays: 30,
    status: 'active'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/distribution/customers');
      if (!res.ok) throw new Error(await res.text());
      setCustomers(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const filtered = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                          c.code.toLowerCase().includes(search.toLowerCase()) ||
                          c.phone.includes(search);
    const matchesType = typeFilter === 'all' || c.customerType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSaving(true);
    try {
      const res = await fetch('/api/distribution/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCustomers();
      setShowModal(false);
      setFormData({ code: '', name: '', customerType: 'retailer', customerGroup: 'Standard',
        contactPerson: '', phone: '', email: '', address: '',
        creditLimitUGX: 5000000, creditDays: 30, status: 'active' });
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            Customer Directory & Credit Profiles
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Retailers, Wholesalers, Key Accounts, Credit Limits, Balances & Locations
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
              name: '',
              customerType: 'retailer',
              customerGroup: 'Standard Retail',
              contactPerson: '',
              phone: '',
              email: '',
              address: '',
              creditLimitUGX: 5000000,
              creditDays: 30,
              status: 'active'
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-zinc-50 dark:bg-[#18181b] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Search customers by name, code, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-amber-500 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {['all', 'retailer', 'wholesaler', 'distributor', 'key_account'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${typeFilter === t ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-white dark:bg-[#121214] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'}`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4">Customer</th>
                <th className="p-4">Contact & Location</th>
                <th className="p-4">Type & Group</th>
                <th className="p-4">Credit Limit</th>
                <th className="p-4">Outstanding (Receivable)</th>
                <th className="p-4">Available Credit</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
              {filtered.map(cust => (
                <tr key={cust.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{cust.name}</div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5">{cust.code}</div>
                  </td>
                  <td className="p-4 text-xs text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-200">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      {cust.phone}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-zinc-500">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {cust.address}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                      {cust.customerType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                    {formatUGX(cust.creditLimitUGX)}
                  </td>
                  <td className="p-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {formatUGX(cust.outstandingBalanceUGX)}
                  </td>
                  <td className="p-4 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatUGX(cust.availableCreditUGX)}
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
                        setFormData(cust);
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
                  <Users className="w-5 h-5 text-amber-500" />
                  {formData.id ? 'Edit Customer' : 'Add New Customer'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Customer Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ABC Supermarket"
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      placeholder="+256 700 000 000"
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Customer Type</label>
                    <select
                      value={formData.customerType || 'retailer'}
                      onChange={e => setFormData({ ...formData, customerType: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="retailer">Retailer</option>
                      <option value="wholesaler">Wholesaler</option>
                      <option value="distributor">Distributor</option>
                      <option value="key_account">Key Account</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Credit Limit (UGX)</label>
                    <input
                      type="number"
                      value={formData.creditLimitUGX || 0}
                      onChange={e => setFormData({ ...formData, creditLimitUGX: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Physical Address</label>
                  <input
                    type="text"
                    placeholder="Plot & Street Address"
                    value={formData.address || ''}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  />
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
                    Save Customer
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
