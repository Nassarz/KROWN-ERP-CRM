'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone, Plus, Search, ShieldCheck, ShieldAlert, User, CheckCircle2, Edit3, X, Lock, RefreshCw, Loader2
} from 'lucide-react';
import { Device } from '@/lib/distribution-types';

export default function DistributionDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState<Partial<Device>>({
    deviceName: '',
    deviceType: 'Android POS Terminal (Handheld)',
    serialNumber: '',
    imei: '',
    appVersion: 'v2.4.0',
    assignedAgentName: 'Sarah Namatovu',
    status: 'trusted'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/distribution/devices');
      if (!res.ok) throw new Error(await res.text());
      setDevices(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  const filtered = devices.filter(d =>
    d.deviceName.toLowerCase().includes(search.toLowerCase()) ||
    d.serialNumber.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = async (device: Device) => {
    const nextStatus = device.status === 'trusted' ? 'disabled' : 'trusted';
    await fetch('/api/distribution/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...device, status: nextStatus })
    });
    await loadDevices();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deviceName || !formData.serialNumber) return;
    setSaving(true);
    try {
      const res = await fetch('/api/distribution/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error(await res.text());
      await loadDevices();
      setShowModal(false);
      setFormData({ deviceName: '', deviceType: 'Android POS Terminal (Handheld)',
        serialNumber: '', imei: '', appVersion: 'v2.4.0',
        assignedAgentName: '', status: 'trusted' });
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-amber-500" />
            Device Registry & Remote Management
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Registered field devices, assigned agents, IMEI, sessions & remote session revocation
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              deviceName: 'Rugged Handheld POS 03',
              deviceType: 'Android POS Terminal (Handheld)',
              serialNumber: `POS-UG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
              imei: '864920194820999',
              appVersion: 'v2.4.0',
              assignedAgentName: 'Sarah Namatovu',
              status: 'trusted'
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Register Device
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(dev => (
          <div key={dev.id} className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm hover:border-amber-500/50 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{dev.deviceName}</h3>
                  <div className="text-xs text-zinc-500 font-mono mt-0.5">{dev.serialNumber} • {dev.appVersion}</div>
                </div>
              </div>
              <button
                onClick={() => toggleStatus(dev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  dev.status === 'trusted'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-red-500/10 hover:text-red-600'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-emerald-500/10 hover:text-emerald-600'
                }`}
              >
                {dev.status === 'trusted' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Trusted (Active)
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Revoked / Disabled
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl text-xs">
              <div>
                <span className="text-zinc-500 block">Assigned Agent</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1 mt-0.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  {dev.assignedAgentName || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">IMEI / Hardware ID</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 block mt-0.5">
                  {dev.imei || 'N/A'}
                </span>
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
                  <Smartphone className="w-5 h-5 text-amber-500" />
                  Register New Device
                </h3>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Device Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rugged Handheld POS 03"
                    value={formData.deviceName || ''}
                    onChange={e => setFormData({ ...formData, deviceName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Serial Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. POS-UG-2026-9083"
                      value={formData.serialNumber || ''}
                      onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">IMEI</label>
                    <input
                      type="text"
                      placeholder="15-digit IMEI"
                      value={formData.imei || ''}
                      onChange={e => setFormData({ ...formData, imei: e.target.value })}
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
                    Save Device
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
