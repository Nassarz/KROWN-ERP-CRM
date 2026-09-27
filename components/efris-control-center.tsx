'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, Receipt, Package, ListChecks, Settings, Stethoscope, ScrollText,
  Loader2, RefreshCw, Search, CheckCircle2, AlertTriangle, XCircle, X,
  ChevronLeft, ChevronRight, PlayCircle, RotateCcw, HelpCircle, MinusCircle,
  Wifi, Clock, ShieldCheck, Smartphone, FileCheck2, Zap, ExternalLink,
} from 'lucide-react';
import { formatUGX } from '@/lib/mockData';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('krown_session_token') : null;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

type Section = 'overview' | 'transactions' | 'products' | 'queue' | 'configuration' | 'diagnostics' | 'audit';

const SECTIONS: Array<{ id: Section; icon: typeof Activity; label: string }> = [
  { id: 'overview', icon: Activity, label: 'Overview' },
  { id: 'transactions', icon: Receipt, label: 'Transactions' },
  { id: 'products', icon: Package, label: 'Products' },
  { id: 'queue', icon: ListChecks, label: 'Queue' },
  { id: 'configuration', icon: Settings, label: 'Configuration' },
  { id: 'diagnostics', icon: Stethoscope, label: 'Diagnostics' },
  { id: 'audit', icon: ScrollText, label: 'Audit' },
];

const TX_PAGE_SIZE = 20;

const TAX_CATEGORIES = [
  { value: 'A', label: 'A — Standard VAT 18%' },
  { value: 'B', label: 'B — Zero-rated' },
  { value: 'C', label: 'C — Exempt' },
  { value: 'D', label: 'D — Deemed 18%' },
  { value: 'E', label: 'E — Excise duty' },
];

function fiscalStatusColor(s: string) {
  switch (s) {
    case 'fiscalized': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'submitted':
    case 'submitting': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'pending':
    case 'queued':
    case 'preparing': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'rejected': return 'bg-red-500/10 text-red-600 dark:text-red-400';
    case 'unknown': return 'bg-orange-500/15 text-orange-600 dark:text-orange-400';
    case 'retrying':
    case 'manual_review': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    case 'credit_pending':
    case 'credited': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
    case 'debit_pending':
    case 'debited': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400';
    default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
  }
}

function mappingStatusColor(s: string) {
  switch (s) {
    case 'mapped':
    case 'ready': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'needs_mapping': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'invalid':
    case 'error': return 'bg-red-500/10 text-red-600 dark:text-red-400';
    default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
  }
}

function healthColor(h: string) {
  switch (h) {
    case 'healthy': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'warning': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'error': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
  }
}

function queueStatusColor(s: string) {
  switch (s) {
    case 'completed': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'pending':
    case 'in_progress':
    case 'retrying': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'dead':
    case 'failed': return 'bg-red-500/10 text-red-600 dark:text-red-400';
    default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
  }
}

const cardCls = 'bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] p-5 ring-1 ring-black/5 dark:ring-white/10';
const btnPrimary = 'bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95 text-xs shrink-0 disabled:opacity-50 disabled:pointer-events-none';
const btnSecondary = 'bg-slate-100 dark:bg-black/40 border border-black/10 dark:border-white/10 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-all disabled:opacity-50 disabled:pointer-events-none';
const inputCls = 'w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40';
const labelCls = 'block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1';
const thCls = 'border-b border-black/5 dark:border-white/5 text-slate-400 text-xs font-bold uppercase tracking-wider px-3 py-2.5 text-left';

function fmtDateTime(v: unknown): string {
  if (!v) return '—';
  try {
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return String(v); }
}

export default function EfrisControlCenter({ branchId }: { branchId?: string }) {
  const [section, setSection] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const aliveRef = useRef(true);

  const [status, setStatus] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Transactions
  const [txList, setTxList] = useState<any[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txStatus, setTxStatus] = useState('all');
  const [txSearch, setTxSearch] = useState('');
  const [txLoading, setTxLoading] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [creditModal, setCreditModal] = useState<{ id: string } | null>(null);
  const [creditReason, setCreditReason] = useState('');

  // Products
  const [mappings, setMappings] = useState<any[]>([]);
  const [mappingTotal, setMappingTotal] = useState(0);
  const [prodSearch, setProdSearch] = useState('');
  const [prodStatus, setProdStatus] = useState('all');
  const [prodLoading, setProdLoading] = useState(false);
  const [mapSaving, setMapSaving] = useState<string | null>(null);

  // Queue
  const [queue, setQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

  // Diagnostics
  const [diag, setDiag] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Audit
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Config form
  const [form, setForm] = useState({
    enabled: false,
    environment: 'sandbox',
    integrationMode: 'online',
    taxpayerTin: '',
    taxpayerName: '',
    businessRegistrationNumber: '',
    deviceNumber: '',
    deviceSerialNumber: '',
    offlineEnablerHost: '127.0.0.1',
    offlineEnablerPort: 9880,
    offlineUpdaterPort: 9980,
    clientPrivateKeyPem: '',
    serverPublicKeyPem: '',
    keyTable: '',
    status: 'configured',
  });
  const [saving, setSaving] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => { if (aliveRef.current) setToast(null); }, 4000);
  };

  const fetchJson = useCallback(async (url: string, init?: RequestInit) => {
    const res = await fetch(url, { headers: authHeaders(), ...init });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
    return json;
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const q = branchId ? `?branchId=${branchId}` : '';
      const json = await fetchJson(`/api/efris/status${q}`);
      if (aliveRef.current) { setStatus(json.data); setError(null); }
    } catch (e: any) {
      if (aliveRef.current) setError(e.message);
    }
  }, [branchId, fetchJson]);

  const loadConfig = useCallback(async () => {
    try {
      const json = await fetchJson('/api/efris/config');
      if (!aliveRef.current) return;
      const c = json.data;
      setConfig(c);
      if (c) {
        setForm({
          enabled: !!c.enabled,
          environment: c.environment || 'sandbox',
          integrationMode: c.integrationMode || 'online',
          taxpayerTin: c.taxpayerTin || '',
          taxpayerName: c.taxpayerName || '',
          businessRegistrationNumber: c.businessRegistrationNumber || '',
          deviceNumber: c.deviceNumber || '',
          deviceSerialNumber: c.deviceSerialNumber || '',
          offlineEnablerHost: c.offlineEnablerHost || '127.0.0.1',
          offlineEnablerPort: c.offlineEnablerPort ?? 9880,
          offlineUpdaterPort: c.offlineUpdaterPort ?? 9980,
          clientPrivateKeyPem: '',
          serverPublicKeyPem: '',
          keyTable: '',
          status: c.status || 'configured',
        });
      }
      setConfigLoaded(true);
    } catch (e: any) {
      if (aliveRef.current) { setConfigLoaded(true); setError(e.message); }
    }
  }, [fetchJson]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(TX_PAGE_SIZE),
        offset: String((txPage - 1) * TX_PAGE_SIZE),
      });
      if (txStatus !== 'all') params.set('status', txStatus);
      if (txSearch.trim()) params.set('search', txSearch.trim());
      if (branchId) params.set('branchId', branchId);
      const json = await fetchJson(`/api/efris/transactions?${params}`);
      if (aliveRef.current) {
        setTxList(json.data?.transactions ?? []);
        setTxTotal(Number(json.data?.total ?? 0));
      }
    } catch (e: any) {
      if (aliveRef.current) showToast('error', e.message);
    } finally {
      if (aliveRef.current) setTxLoading(false);
    }
  }, [txPage, txStatus, txSearch, branchId, fetchJson]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const json = await fetchJson(`/api/efris/transactions/${id}`);
      if (aliveRef.current) setDetail(json.data);
    } catch (e: any) {
      if (aliveRef.current) showToast('error', e.message);
    } finally {
      if (aliveRef.current) setDetailLoading(false);
    }
  }, [fetchJson]);

  const loadProducts = useCallback(async () => {
    setProdLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (prodSearch.trim()) params.set('search', prodSearch.trim());
      if (prodStatus !== 'all') params.set('status', prodStatus);
      const json = await fetchJson(`/api/efris/products?${params}`);
      if (aliveRef.current) {
        setMappings(json.data?.mappings ?? []);
        setMappingTotal(Number(json.data?.total ?? 0));
      }
    } catch (e: any) {
      if (aliveRef.current) showToast('error', e.message);
    } finally {
      if (aliveRef.current) setProdLoading(false);
    }
  }, [prodSearch, prodStatus, fetchJson]);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const json = await fetchJson('/api/efris/queue?limit=50');
      if (aliveRef.current) setQueue(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      if (aliveRef.current) showToast('error', e.message);
    } finally {
      if (aliveRef.current) setQueueLoading(false);
    }
  }, [fetchJson]);

  const loadDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    try {
      const json = await fetchJson('/api/efris/diagnostics');
      if (aliveRef.current) setDiag(json.data);
    } catch (e: any) {
      if (aliveRef.current) showToast('error', e.message);
    } finally {
      if (aliveRef.current) setDiagLoading(false);
    }
  }, [fetchJson]);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const json = await fetchJson('/api/audit?search=EFRIS&limit=100');
      if (aliveRef.current) setAuditRows(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      if (aliveRef.current) showToast('error', e.message);
    } finally {
      if (aliveRef.current) setAuditLoading(false);
    }
  }, [fetchJson]);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadStatus(), loadConfig()]);
      if (aliveRef.current) setLoading(false);
    })();
  }, [loadStatus, loadConfig]);

  // Section-scoped load
  useEffect(() => {
    if (loading) return;
    if (section === 'transactions') loadTransactions();
    else if (section === 'products') loadProducts();
    else if (section === 'queue') loadQueue();
    else if (section === 'diagnostics') loadDiagnostics();
    else if (section === 'audit') loadAudit();
    else if (section === 'overview') loadStatus();
  }, [section, loading, loadTransactions, loadProducts, loadQueue, loadDiagnostics, loadAudit, loadStatus]);

  // Reload transactions when filters change (debounced for search)
  useEffect(() => {
    if (section !== 'transactions' || loading) return;
    const t = setTimeout(loadTransactions, txSearch ? 400 : 0);
    return () => clearTimeout(t);
  }, [txStatus, txSearch, txPage, section, loading, loadTransactions]);

  useEffect(() => {
    if (section !== 'products' || loading) return;
    const t = setTimeout(loadProducts, prodSearch ? 400 : 0);
    return () => clearTimeout(t);
  }, [prodStatus, prodSearch, section, loading, loadProducts]);

  useEffect(() => { if (detailId) loadDetail(detailId); }, [detailId, loadDetail]);

  const refreshAll = async () => {
    await Promise.all([loadStatus(), loadConfig()]);
    if (section === 'transactions') await loadTransactions();
  };

  const runTest = async () => {
    setTesting(true);
    setTestResults(null);
    try {
      const json = await fetchJson('/api/efris/test', { method: 'POST', body: '{}' });
      setTestResults(json.data);
      showToast(json.data?.passed ? 'success' : 'error', json.data?.passed ? 'All connection tests passed' : 'Some connection tests failed');
      loadStatus();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      if (aliveRef.current) setTesting(false);
    }
  };

  const saveConfig = async (opts?: { activate?: boolean }) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        enabled: opts?.activate ? true : form.enabled,
        environment: form.environment,
        integrationMode: form.integrationMode,
        taxpayerTin: form.taxpayerTin.trim(),
        taxpayerName: form.taxpayerName.trim(),
        businessRegistrationNumber: form.businessRegistrationNumber.trim(),
        deviceNumber: form.deviceNumber.trim(),
        deviceSerialNumber: form.deviceSerialNumber.trim(),
        offlineEnablerHost: form.offlineEnablerHost,
        offlineEnablerPort: Number(form.offlineEnablerPort),
        offlineUpdaterPort: Number(form.offlineUpdaterPort),
        status: opts?.activate ? 'active' : form.status,
      };
      if (form.clientPrivateKeyPem.trim()) body.clientPrivateKeyPem = form.clientPrivateKeyPem.trim();
      if (form.serverPublicKeyPem.trim()) body.serverPublicKeyPem = form.serverPublicKeyPem.trim();
      if (form.keyTable.trim()) body.keyTable = form.keyTable.trim();
      await fetchJson('/api/efris/config', { method: 'PUT', body: JSON.stringify(body) });
      await refreshAll();
      showToast('success', opts?.activate ? 'EFRIS activated' : 'Configuration saved');
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      if (aliveRef.current) setSaving(false);
    }
  };

  const runTxAction = async (id: string, action: 'retry' | 'reconcile') => {
    setActionId(id);
    try {
      const json = await fetchJson(`/api/efris/transactions/${id}/${action}`, { method: 'POST', body: '{}' });
      const d = json.data;
      if (action === 'reconcile') {
        showToast(d?.outcome === 'fiscalized' ? 'success' : d?.outcome === 'confirmed_failed' ? 'error' : 'success',
          d?.outcome === 'fiscalized' ? 'Transaction reconciled — fiscalized'
          : d?.outcome === 'confirmed_failed' ? 'Reconciled: confirmed not fiscalized'
          : 'Reconciliation completed (still unknown)');
      } else {
        showToast(d?.fiscalized ? 'success' : d?.needsReconciliation ? 'error' : 'success',
          d?.fiscalized ? 'Retry fiscalized successfully'
          : d?.needsReconciliation ? 'Retry outcome unknown — reconcile required'
          : 'Retry submitted');
      }
      await Promise.all([loadStatus(), loadTransactions()]);
      if (detailId === id) await loadDetail(id);
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      if (aliveRef.current) setActionId(null);
    }
  };

  const issueCreditNote = async () => {
    if (!creditModal) return;
    const id = creditModal.id;
    setActionId(id);
    try {
      const json = await fetchJson(`/api/efris/transactions/${id}/credit-note`, {
        method: 'POST',
        body: JSON.stringify({ reason: creditReason.trim() }),
      });
      showToast(json.data?.fiscalized ? 'success' : 'success', 'Credit note issued');
      setCreditModal(null);
      setCreditReason('');
      await Promise.all([loadStatus(), loadTransactions()]);
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      if (aliveRef.current) setActionId(null);
    }
  };

  const mapProduct = async (productId: string, taxCategory: string) => {
    setMapSaving(productId);
    try {
      await fetchJson('/api/efris/products', { method: 'PUT', body: JSON.stringify({ productId, taxCategory }) });
      showToast('success', 'Product mapping saved');
      await Promise.all([loadProducts(), loadStatus()]);
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      if (aliveRef.current) setMapSaving(null);
    }
  };

  const unmapProduct = async (productId: string) => {
    setMapSaving(productId);
    try {
      await fetchJson('/api/efris/products', { method: 'PUT', body: JSON.stringify({ productId, unmap: true }) });
      showToast('success', 'Product unmapped');
      await Promise.all([loadProducts(), loadStatus()]);
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      if (aliveRef.current) setMapSaving(null);
    }
  };

  const needsWizard = configLoaded && (!config || config.status === 'not_configured' || config.status === 'awaiting_setup');
  const sandbox = status?.environment === 'sandbox';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className={`fixed top-6 right-6 z-[60] px-4 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-orange-500" />
            EFRIS Fiscalization
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Uganda Revenue Authority e-invoicing — system-to-system integration
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sandbox && (
            <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold">
              SANDBOX SIMULATION — not real URA documents
            </span>
          )}
          {status?.enabled && status?.configStatus === 'active' ? (
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
            </span>
          ) : (
            <span className="bg-slate-500/10 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-xl text-xs font-bold">
              {status?.configured ? `Configured (${status.configStatus})` : 'Not configured'}
            </span>
          )}
          <button onClick={refreshAll} className={btnSecondary} title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Sub navigation */}
      <nav className="flex flex-wrap gap-1.5">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => { setSection(s.id); setError(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl font-medium transition-all text-xs ${
              section === s.id
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 dark:hover:text-white dark:hover:bg-white/5'
            }`}
          >
            <s.icon className="w-3.5 h-3.5" />
            <span>{s.label}</span>
            {s.id === 'transactions' && status?.needsAttention > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">{status.needsAttention}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ================= OVERVIEW ================= */}
      {section === 'overview' && status && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-[2rem] p-5 text-white shadow-xl">
              <div className="text-xs font-bold opacity-80 uppercase tracking-wider">Fiscalized today</div>
              <div className="text-3xl font-bold mt-1">{status.fiscalizedToday}</div>
              <div className="text-xs opacity-80 mt-1">{formatUGX(status.fiscalizedAmountToday)}</div>
            </div>
            <div className={cardCls}>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transactions today</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{status.transactionsToday}</div>
            </div>
            <div className={cardCls}>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Needs attention</div>
              <div className={`text-3xl font-bold mt-1 ${status.needsAttention > 0 ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>
                {status.needsAttention}
              </div>
              <div className="text-xs text-slate-400 mt-1">unknown / rejected / manual review</div>
            </div>
            <div className={cardCls}>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product readiness</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {status.productReadiness?.mapped ?? 0}<span className="text-base text-slate-400">/{status.productReadiness?.total ?? 0}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">{status.productReadiness?.needsMapping ?? 0} need mapping</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className={`${cardCls} lg:col-span-2`}>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" /> Fiscal status breakdown
              </h3>
              {Object.keys(status.byStatus || {}).length === 0 ? (
                <p className="text-xs text-slate-400">No fiscal transactions yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(status.byStatus as Record<string, number>).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
                    const total = Object.values(status.byStatus as Record<string, number>).reduce((a, b) => a + b, 0) || 1;
                    return (
                      <div key={k} className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-lg text-[11px] font-bold w-32 text-center capitalize ${fiscalStatusColor(k)}`}>{k}</span>
                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${Math.max(4, (v / total) * 100)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-8 text-right">{v}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className={cardCls}>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-orange-500" /> Connection
                </h3>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2"><dt className="text-slate-400 font-bold">Mode</dt><dd className="text-slate-700 dark:text-slate-200 font-bold capitalize">{status.mode || '—'}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-slate-400 font-bold">Environment</dt><dd className="text-slate-700 dark:text-slate-200 font-bold capitalize">{status.environment || '—'}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-slate-400 font-bold">TIN</dt><dd className="text-slate-700 dark:text-slate-200 font-bold font-mono">{status.taxpayerTin || '—'}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-slate-400 font-bold">Device</dt><dd className="text-slate-700 dark:text-slate-200 font-bold font-mono truncate">{status.deviceNumber || '—'}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-slate-400 font-bold">Last URA contact</dt><dd className="text-slate-700 dark:text-slate-200 font-bold text-right">{fmtDateTime(status.lastSuccessfulCommunication)}</dd></div>
                </dl>
              </div>
              <div className={cardCls}>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" /> Clock sync
                </h3>
                {status.timeSync ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Offset <span className="font-bold text-slate-700 dark:text-slate-200">{Math.round((status.timeSync.offsetMs ?? 0) / 1000)}s</span>
                    {' · '}{fmtDateTime(status.timeSync.createdAt)}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">Never synchronized — run Diagnostics test.</p>
                )}
              </div>
            </div>
          </div>

          {status.needsAttention > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-[2rem] p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {status.needsAttention} transaction(s) need reconciliation or review.
              </p>
              <button onClick={() => setSection('transactions')} className={btnPrimary}>
                Open Transactions <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ================= TRANSACTIONS ================= */}
      {section === 'transactions' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={txSearch} onChange={e => { setTxSearch(e.target.value); setTxPage(1); }}
                placeholder="Search reference, invoice no, FDN…"
                className={`${inputCls} pl-9`}
              />
            </div>
            <select value={txStatus} onChange={e => { setTxStatus(e.target.value); setTxPage(1); }} className={`${inputCls} w-auto`}>
              <option value="all">All statuses</option>
              {['fiscalized', 'pending', 'queued', 'submitting', 'submitted', 'rejected', 'unknown', 'retrying', 'manual_review', 'credit_pending', 'credited', 'cancelled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button onClick={loadTransactions} className={btnSecondary}><RefreshCw className="w-3.5 h-3.5" /> Reload</button>
          </div>

          <div className={cardCls}>
            {txLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
            ) : txList.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">No fiscal transactions found</p>
                <p className="text-xs text-slate-400 mt-1">Transactions appear here automatically when orders are paid.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className={thCls}>Reference</th>
                        <th className={thCls}>Type</th>
                        <th className={thCls}>Status</th>
                        <th className={thCls}>Amount</th>
                        <th className={thCls}>Invoice / FDN</th>
                        <th className={thCls}>Created</th>
                        <th className={thCls}></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                      {txList.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setDetailId(t.id)}>
                          <td className="px-3 py-2.5 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{t.krownReference}</td>
                          <td className="px-3 py-2.5 text-xs capitalize text-slate-500">{String(t.transactionType || '').replace('_', ' ')}</td>
                          <td className="px-3 py-2.5"><span className={`px-2 py-1 rounded-lg text-[11px] font-bold capitalize ${fiscalStatusColor(t.fiscalStatus)}`}>{t.fiscalStatus}</span></td>
                          <td className="px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200">{formatUGX(t.grossAmount)}</td>
                          <td className="px-3 py-2.5 text-xs font-mono text-slate-500">{t.invoiceNo || t.fiscalDocumentNumber || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{fmtDateTime(t.createdAt)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                              {(t.fiscalStatus === 'unknown' || t.fiscalStatus === 'retrying' || t.fiscalStatus === 'manual_review') && (
                                <button disabled={actionId === t.id} onClick={() => runTxAction(t.id, 'reconcile')} className={btnSecondary} title="Reconcile (never blind resubmit)">
                                  {actionId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <HelpCircle className="w-3 h-3" />} Reconcile
                                </button>
                              )}
                              {(t.fiscalStatus === 'rejected' || t.fiscalStatus === 'retrying' || t.fiscalStatus === 'pending' || t.fiscalStatus === 'manual_review') && (
                                <button disabled={actionId === t.id} onClick={() => runTxAction(t.id, 'retry')} className={btnSecondary} title="Retry submission">
                                  <RotateCcw className="w-3 h-3" /> Retry
                                </button>
                              )}
                              {t.fiscalStatus === 'fiscalized' && t.transactionType !== 'credit_note' && (
                                <button disabled={actionId === t.id} onClick={() => setCreditModal({ id: t.id })} className={btnSecondary} title="Issue credit note">
                                  <MinusCircle className="w-3 h-3" /> Credit
                                </button>
                              )}
                              <button onClick={() => setDetailId(t.id)} className={btnSecondary}>Open</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                  <span className="text-xs text-slate-400 font-bold">{txTotal} total</span>
                  <div className="flex items-center gap-2">
                    <button disabled={txPage <= 1} onClick={() => setTxPage(p => p - 1)} className={btnSecondary}><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Page {txPage}</span>
                    <button disabled={txPage * TX_PAGE_SIZE >= txTotal} onClick={() => setTxPage(p => p + 1)} className={btnSecondary}><ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* ================= PRODUCTS ================= */}
      {section === 'products' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={prodSearch} onChange={e => setProdSearch(e.target.value)} placeholder="Search products…" className={`${inputCls} pl-9`} />
            </div>
            <select value={prodStatus} onChange={e => setProdStatus(e.target.value)} className={`${inputCls} w-auto`}>
              <option value="all">All mapping states</option>
              <option value="needs_mapping">Needs mapping</option>
              <option value="mapped">Mapped</option>
              <option value="invalid">Invalid</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div className={cardCls}>
            {prodLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
            ) : mappings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">No products found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className={thCls}>Product</th>
                      <th className={thCls}>Price</th>
                      <th className={thCls}>Mapping</th>
                      <th className={thCls}>Tax category</th>
                      <th className={thCls}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                    {mappings.map(m => (
                      <tr key={m.productId} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-800 dark:text-white text-xs">{m.productName}</div>
                          <div className="text-[11px] text-slate-400">{m.categoryName || '—'}</div>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200">{formatUGX(m.price)}</td>
                        <td className="px-3 py-2.5"><span className={`px-2 py-1 rounded-lg text-[11px] font-bold capitalize ${mappingStatusColor(m.mappingStatus)}`}>{String(m.mappingStatus).replace('_', ' ')}</span></td>
                        <td className="px-3 py-2.5">
                          <select
                            value={m.taxCategory || 'A'}
                            disabled={mapSaving === m.productId}
                            onChange={e => mapProduct(m.productId, e.target.value)}
                            className="bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white"
                          >
                            {TAX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            {mapSaving === m.productId ? (
                              <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                            ) : m.mappingStatus === 'mapped' || m.taxCategory ? (
                              <>
                                <button onClick={() => mapProduct(m.productId, m.taxCategory || 'A')} className={btnSecondary} title="Save mapping">
                                  <CheckCircle2 className="w-3 h-3" /> Save
                                </button>
                                <button onClick={() => unmapProduct(m.productId)} className={btnSecondary} title="Unmap">
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => mapProduct(m.productId, 'A')} className={btnPrimary}>
                                Map as A (18%)
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[11px] text-slate-400 mt-3">
                  {mappingTotal} product(s). KROWN selling prices are never modified — tax category only tells URA how to tax the line.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ================= QUEUE ================= */}
      {section === 'queue' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">Durable submission queue — retries and reconciliation jobs.</p>
            <button onClick={loadQueue} className={btnSecondary}><RefreshCw className="w-3.5 h-3.5" /> Reload</button>
          </div>
          <div className={cardCls}>
            {queueLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
            ) : queue.length === 0 ? (
              <div className="text-center py-12">
                <ListChecks className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">Queue is empty</p>
                <p className="text-xs text-slate-400 mt-1">Nothing waiting to be submitted or reconciled.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className={thCls}>Reference</th>
                      <th className={thCls}>Operation</th>
                      <th className={thCls}>Status</th>
                      <th className={thCls}>Attempts</th>
                      <th className={thCls}>Next attempt</th>
                      <th className={thCls}>Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                    {queue.map((q: any) => (
                      <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{q.krown_reference || q.transaction_id}</td>
                        <td className="px-3 py-2.5 text-xs capitalize text-slate-500">{q.operation}</td>
                        <td className="px-3 py-2.5"><span className={`px-2 py-1 rounded-lg text-[11px] font-bold capitalize ${queueStatusColor(q.status)}`}>{q.status}</span></td>
                        <td className="px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">{q.attempt_count ?? 0}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">{fmtDateTime(q.next_attempt_at)}</td>
                        <td className="px-3 py-2.5 text-[11px] text-red-500/80 max-w-[240px] truncate">{q.last_error || q.error_message || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ================= CONFIGURATION ================= */}
      {section === 'configuration' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {needsWizard && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-[2rem] p-4">
              <p className="text-sm font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Guided setup — complete the steps below, then run the connection test and activate.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['Taxpayer', 'Device & mode', 'Keys', 'Test & activate'].map((label, i) => (
                  <button
                    key={label}
                    onClick={() => setWizardStep(i)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      wizardStep === i ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white/70 dark:bg-black/40 text-slate-600 dark:text-slate-300 border border-black/10 dark:border-white/10'
                    }`}
                  >
                    {i + 1}. {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`${cardCls} space-y-4`}>
            {/* Step 1: Taxpayer */}
            {(!needsWizard || wizardStep === 0) && (
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><FileCheck2 className="w-4 h-4 text-orange-500" /> Taxpayer details</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>TIN (Taxpayer Identification Number) *</label>
                    <input value={form.taxpayerTin} onChange={e => setForm(f => ({ ...f, taxpayerTin: e.target.value }))} className={inputCls} placeholder="e.g. 1000029771" />
                  </div>
                  <div>
                    <label className={labelCls}>Taxpayer / business name</label>
                    <input value={form.taxpayerName} onChange={e => setForm(f => ({ ...f, taxpayerName: e.target.value }))} className={inputCls} placeholder="Registered name" />
                  </div>
                  <div>
                    <label className={labelCls}>Business registration number (BRN / NIN)</label>
                    <input value={form.businessRegistrationNumber} onChange={e => setForm(f => ({ ...f, businessRegistrationNumber: e.target.value }))} className={inputCls} placeholder="Optional" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Device & mode */}
            {(!needsWizard || wizardStep === 1) && (
              <div className={needsWizard ? 'border-t border-black/5 dark:border-white/5 pt-4' : 'border-t border-black/5 dark:border-white/5 pt-4'}>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><Smartphone className="w-4 h-4 text-orange-500" /> Device & integration mode</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>EFRIS device number *</label>
                    <input value={form.deviceNumber} onChange={e => setForm(f => ({ ...f, deviceNumber: e.target.value }))} className={inputCls} placeholder="e.g. TCS9e0df01728335239" />
                  </div>
                  <div>
                    <label className={labelCls}>Device serial number</label>
                    <input value={form.deviceSerialNumber} onChange={e => setForm(f => ({ ...f, deviceSerialNumber: e.target.value }))} className={inputCls} placeholder="Optional" />
                  </div>
                  <div>
                    <label className={labelCls}>Integration mode</label>
                    <select value={form.integrationMode} onChange={e => setForm(f => ({ ...f, integrationMode: e.target.value }))} className={inputCls}>
                      <option value="online">Online — System-to-System (API)</option>
                      <option value="offline">Offline — local enabler (127.0.0.1:9880)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Environment</label>
                    <select value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))} className={inputCls}>
                      <option value="sandbox">Sandbox — simulated (development)</option>
                      <option value="uat">UAT — URA test environment</option>
                      <option value="production">Production — live URA</option>
                    </select>
                  </div>
                  {form.integrationMode === 'offline' && (
                    <>
                      <div>
                        <label className={labelCls}>Offline enabler host</label>
                        <input value={form.offlineEnablerHost} onChange={e => setForm(f => ({ ...f, offlineEnablerHost: e.target.value }))} className={inputCls} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Enabler port</label>
                          <input type="number" value={form.offlineEnablerPort} onChange={e => setForm(f => ({ ...f, offlineEnablerPort: Number(e.target.value) }))} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Updater port</label>
                          <input type="number" value={form.offlineUpdaterPort} onChange={e => setForm(f => ({ ...f, offlineUpdaterPort: Number(e.target.value) }))} className={inputCls} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {form.environment === 'production' && (
                  <p className="text-[11px] text-red-500 font-bold mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Production submits REAL invoices to URA. Confirm credentials are correct.
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Keys */}
            {(!needsWizard || wizardStep === 2) && (
              <div className="border-t border-black/5 dark:border-white/5 pt-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-orange-500" /> Cryptographic keys</h3>
                <p className="text-[11px] text-slate-400 mb-3">Stored encrypted at rest. Values are write-only — never displayed after saving. Leave blank to keep existing keys.</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Client private key (PEM)</label>
                    <textarea value={form.clientPrivateKeyPem} onChange={e => setForm(f => ({ ...f, clientPrivateKeyPem: e.target.value }))} rows={3} className={`${inputCls} font-mono text-[11px]`} placeholder="-----BEGIN … PRIVATE KEY-----" />
                  </div>
                  <div>
                    <label className={labelCls}>Server public key (PEM)</label>
                    <textarea value={form.serverPublicKeyPem} onChange={e => setForm(f => ({ ...f, serverPublicKeyPem: e.target.value }))} rows={3} className={`${inputCls} font-mono text-[11px]`} placeholder="-----BEGIN PUBLIC KEY-----" />
                  </div>
                  <div>
                    <label className={labelCls}>White-box key table</label>
                    <input value={form.keyTable} onChange={e => setForm(f => ({ ...f, keyTable: e.target.value }))} className={`${inputCls} font-mono text-[11px]`} placeholder="From T102 initialisation" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Test & activate */}
            {(!needsWizard || wizardStep === 3) && (
              <div className="border-t border-black/5 dark:border-white/5 pt-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><PlayCircle className="w-4 h-4 text-orange-500" /> Test & activate</h3>

                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                      className="w-4 h-4 accent-orange-500"
                    />
                    Enable fiscalization for paid orders
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => saveConfig()} disabled={saving} className={btnSecondary}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />} Save configuration
                  </button>
                  <button onClick={runTest} disabled={testing || !form.taxpayerTin || !form.deviceNumber} className={btnSecondary} title="Requires saved TIN + device">
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />} Run connection test (T101–T103)
                  </button>
                  <button onClick={() => saveConfig({ activate: true })} disabled={saving || !form.taxpayerTin || !form.deviceNumber} className={btnPrimary}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Save & activate
                  </button>
                </div>

                {testResults && (
                  <div className="rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                    <div className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 ${testResults.passed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                      {testResults.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {testResults.passed ? 'All tests passed' : 'Some tests failed'}
                      {testResults.sandbox && <span className="ml-auto bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md">SANDBOX</span>}
                    </div>
                    <ul className="divide-y divide-black/5 dark:divide-white/5">
                      {testResults.tests?.map((t: any) => (
                        <li key={t.name} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                          {t.status === 'passed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            : t.status === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                          <span className="font-bold text-slate-700 dark:text-slate-200 w-44 shrink-0">{t.name}</span>
                          <span className="text-slate-500 dark:text-slate-400">{t.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {needsWizard && (
              <div className="flex justify-between border-t border-black/5 dark:border-white/5 pt-4">
                <button disabled={wizardStep === 0} onClick={() => setWizardStep(s => Math.max(0, s - 1))} className={btnSecondary}>
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button disabled={wizardStep >= 3} onClick={() => setWizardStep(s => Math.min(3, s + 1))} className={btnSecondary}>
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ================= DIAGNOSTICS ================= */}
      {section === 'diagnostics' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">Health checks for the EFRIS integration (no secrets shown).</p>
            <div className="flex gap-2">
              <button onClick={loadDiagnostics} className={btnSecondary}><RefreshCw className="w-3.5 h-3.5" /> Reload</button>
              <button onClick={runTest} disabled={testing} className={btnPrimary}>
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />} Run live test
              </button>
            </div>
          </div>

          {diagLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(diag?.cards ?? []).map((c: any) => (
                <div key={c.id} className={`${cardCls} border ${healthColor(c.health)}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {c.health === 'healthy' ? <CheckCircle2 className="w-4 h-4" />
                      : c.health === 'warning' ? <AlertTriangle className="w-4 h-4" />
                      : c.health === 'error' ? <XCircle className="w-4 h-4" />
                      : <MinusCircle className="w-4 h-4" />}
                    <span className="text-xs font-bold uppercase tracking-wider">{c.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{c.detail}</p>
                </div>
              ))}
              {(!diag?.cards || diag.cards.length === 0) && (
                <div className="sm:col-span-2 lg:col-span-3 text-center py-12">
                  <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-500">No diagnostics available</p>
                </div>
              )}
            </div>
          )}

          {testResults && (
            <div className={cardCls}>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Last test run</h3>
              <ul className="space-y-2">
                {testResults.tests?.map((t: any) => (
                  <li key={t.name} className="flex items-center gap-3 text-xs">
                    {t.status === 'passed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : t.status === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                      : <XCircle className="w-4 h-4 text-red-500" />}
                    <span className="font-bold text-slate-700 dark:text-slate-200 w-44">{t.name}</span>
                    <span className="text-slate-500 dark:text-slate-400">{t.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* ================= AUDIT ================= */}
      {section === 'audit' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">EFRIS-related audit events (configuration, submissions, retries, reconciliations).</p>
            <button onClick={loadAudit} className={btnSecondary}><RefreshCw className="w-3.5 h-3.5" /> Reload</button>
          </div>
          <div className={cardCls}>
            {auditLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
            ) : auditRows.length === 0 ? (
              <div className="text-center py-12">
                <ScrollText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">No EFRIS audit events yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className={thCls}>When</th>
                      <th className={thCls}>Action</th>
                      <th className={thCls}>Actor</th>
                      <th className={thCls}>Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                    {auditRows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmtDateTime(r.created_at ?? r.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-lg text-[11px] font-bold">{r.action}</span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300">{r.user_email || r.userEmail || r.actor_role || r.actorRole || '—'}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500 max-w-[360px] truncate">
                          {typeof (r.details ?? r.metadata) === 'object' ? JSON.stringify(r.details ?? r.metadata) : String(r.details ?? r.metadata ?? '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ============ TRANSACTION DETAIL DRAWER ============ */}
      <AnimatePresence>
        {detailId && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="bg-white dark:bg-[#121214] w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-black/10 dark:border-white/10 shadow-2xl"
            >
              <div className="sticky top-0 bg-white/90 dark:bg-[#121214]/90 backdrop-blur-xl z-10 flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transaction detail</h3>
                <button onClick={() => { setDetailId(null); setDetail(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {detailLoading || !detail ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${fiscalStatusColor(detail.transaction?.fiscalStatus)}`}>
                        {detail.transaction?.fiscalStatus}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 capitalize">
                        {String(detail.transaction?.transactionType || '').replace('_', ' ')}
                      </span>
                      <span className="font-mono text-xs text-slate-500">{detail.transaction?.krownReference}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 dark:bg-black/30 rounded-2xl p-3">
                        <div className="text-slate-400 font-bold mb-0.5">Gross amount</div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{formatUGX(detail.transaction?.grossAmount)}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-black/30 rounded-2xl p-3">
                        <div className="text-slate-400 font-bold mb-0.5">Tax</div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{formatUGX(detail.transaction?.taxAmount)}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-black/30 rounded-2xl p-3">
                        <div className="text-slate-400 font-bold mb-0.5">Invoice no</div>
                        <div className="font-bold font-mono text-slate-900 dark:text-white text-sm">{detail.transaction?.invoiceNo || '—'}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-black/30 rounded-2xl p-3">
                        <div className="text-slate-400 font-bold mb-0.5">Fiscal document no</div>
                        <div className="font-bold font-mono text-slate-900 dark:text-white text-sm">{detail.transaction?.fiscalDocumentNumber || '—'}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-black/30 rounded-2xl p-3">
                        <div className="text-slate-400 font-bold mb-0.5">Antifake code</div>
                        <div className="font-bold font-mono text-slate-900 dark:text-white text-sm">{detail.transaction?.antifakeCode || '—'}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-black/30 rounded-2xl p-3">
                        <div className="text-slate-400 font-bold mb-0.5">Attempts</div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{detail.transaction?.attemptCount ?? 0}</div>
                      </div>
                    </div>

                    {detail.transaction?.errorMessage && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-xs text-red-600 dark:text-red-400 font-bold">
                        {detail.transaction.errorCode ? `[${detail.transaction.errorCode}] ` : ''}{detail.transaction.errorMessage}
                      </div>
                    )}

                    {detail.order && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Order</h4>
                        <div className="bg-slate-50 dark:bg-black/30 rounded-2xl p-3 text-xs space-y-1">
                          <div className="flex justify-between"><span className="text-slate-400">Table</span><span className="font-bold text-slate-700 dark:text-slate-200">{detail.order.table_number || '—'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Branch</span><span className="font-bold text-slate-700 dark:text-slate-200">{detail.order.branch_name || '—'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Total</span><span className="font-bold text-slate-700 dark:text-slate-200">{formatUGX(detail.order.total)}</span></div>
                        </div>
                      </div>
                    )}

                    {detail.items?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Line items ({detail.items.length})</h4>
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr>
                              <th className={thCls}>Item</th>
                              <th className={thCls}>Qty</th>
                              <th className={thCls}>Price</th>
                              <th className={thCls}>Total</th>
                              <th className={thCls}>Tax</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {detail.items.map((it: any) => (
                              <tr key={it.id}>
                                <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{it.item_name || it.itemName || it.item}</td>
                                <td className="px-3 py-2 text-slate-500">{it.qty ?? it.quantity}</td>
                                <td className="px-3 py-2 text-slate-500">{formatUGX(it.unit_price ?? it.unitPrice)}</td>
                                <td className="px-3 py-2 text-slate-500">{formatUGX(it.total)}</td>
                                <td className="px-3 py-2 text-slate-500">{formatUGX(it.tax)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {detail.submissions?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Submission attempts</h4>
                        <ul className="space-y-2">
                          {detail.submissions.map((s: any) => (
                            <li key={s.id} className="bg-slate-50 dark:bg-black/30 rounded-2xl p-3 text-xs flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">#{s.attempt_number}</span>
                              <span className="font-bold text-slate-500">{s.interface_code}</span>
                              <span className={`px-2 py-0.5 rounded-md font-bold ${s.status === 'succeeded' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>{s.status}</span>
                              {s.return_code && <span className="font-mono text-slate-400">code {s.return_code}</span>}
                              <span className="text-slate-400 ml-auto">{s.duration_ms}ms</span>
                              {s.return_message && <span className="w-full text-slate-500 truncate">{s.return_message}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {detail.events?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Event history</h4>
                        <ul className="space-y-1.5">
                          {detail.events.map((ev: any) => (
                            <li key={ev.id} className="flex items-center gap-2 text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                              <span className="text-slate-500">{fmtDateTime(ev.created_at)}</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{ev.event_type}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${fiscalStatusColor(ev.fiscal_status)}`}>{ev.fiscal_status}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-black/5 dark:border-white/10">
                      {(detail.transaction?.fiscalStatus === 'unknown' || detail.transaction?.fiscalStatus === 'retrying' || detail.transaction?.fiscalStatus === 'manual_review') && (
                        <button disabled={actionId === detail.transaction.id} onClick={() => runTxAction(detail.transaction.id, 'reconcile')} className={btnSecondary}>
                          {actionId === detail.transaction.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HelpCircle className="w-3.5 h-3.5" />} Reconcile (T107)
                        </button>
                      )}
                      {(detail.transaction?.fiscalStatus === 'rejected' || detail.transaction?.fiscalStatus === 'retrying' || detail.transaction?.fiscalStatus === 'manual_review' || detail.transaction?.fiscalStatus === 'pending') && (
                        <button disabled={actionId === detail.transaction.id} onClick={() => runTxAction(detail.transaction.id, 'retry')} className={btnSecondary}>
                          <RotateCcw className="w-3.5 h-3.5" /> Retry submission
                        </button>
                      )}
                      {detail.transaction?.fiscalStatus === 'fiscalized' && detail.transaction?.transactionType !== 'credit_note' && (
                        <button disabled={actionId === detail.transaction.id} onClick={() => setCreditModal({ id: detail.transaction.id })} className={btnSecondary}>
                          <MinusCircle className="w-3.5 h-3.5" /> Issue credit note
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============ CREDIT NOTE MODAL ============ */}
      <AnimatePresence>
        {creditModal && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-6 max-w-md w-full border border-black/10 dark:border-white/10 shadow-2xl space-y-4"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Issue credit note</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A credit note reverses a fiscalized invoice at URA (T110). The reason is mandatory.
              </p>
              <div>
                <label className={labelCls}>Reason *</label>
                <textarea
                  value={creditReason}
                  onChange={e => setCreditReason(e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="e.g. Customer returned the meal"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setCreditModal(null); setCreditReason(''); }} className={btnSecondary}>Cancel</button>
                <button
                  onClick={issueCreditNote}
                  disabled={!creditReason.trim() || actionId === creditModal.id}
                  className={btnPrimary}
                >
                  {actionId === creditModal.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MinusCircle className="w-3.5 h-3.5" />}
                  Issue credit note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
