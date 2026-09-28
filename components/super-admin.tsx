'use client';

import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Users, Store, Activity, Settings, TrendingUp, Box, Shield,
  Sun, Moon, Search, Filter, Plus, DollarSign, Smartphone, Bell, LifeBuoy,
  ChevronRight, MoreVertical, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  Clock, Eye, Ban, RotateCcw, Send, MessageSquare, Mail, KeyRound,
  Zap, Server, Database, Wifi, WifiOff, UserX, UserCheck, MailOpen,
  Flag, HeartPulse, BarChart3, CalendarDays, Lock, Unlock, Trash2,
  ExternalLink, Download, Copy, Check, ArrowUpRight, Monitor, Tablet, Phone,
  AlertCircle, Info, X, CheckCheck, CircleDot, Reply, Tag, FolderOpen,
  ShieldCheck, ShieldAlert, Ticket, MessageCircle, Sparkles, Power,
  Loader2, Stethoscope, Gauge, Cpu, HardDrive, Network, LogOut, Pencil,
  MapPin, Building2, Headset, CheckCircle2, Camera,
  LayoutDashboard, CreditCard, Wallet, ShoppingBag, Coffee, Boxes, Crown,
  ChevronDown, Printer, Receipt, PieChart, Building
} from 'lucide-react';
import { vibrate } from '@/lib/utils';
import { enablePush } from '@/lib/push-client';
import SuperAdminCallPanel from '@/components/super-admin-call-panel';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import {
  Skeleton, StatusBadge, SeverityBadge, EmptyState, LoadingSpinner, SaSummaryCard,
  saInputCls, saSelectCls, saCardCls, saTableWrapCls,
} from '@/components/super-admin/shared';
import { SuperAdminSidebar, SuperAdminTopbar } from '@/components/super-admin/shell';

const statusServiceIcons: Record<string, any> = {
  database: Database, api: Server, storage: HardDrive,
  payments: Wallet, printing: Printer, efris: Receipt,
};

interface SuperAdminProps {
  user: any;
  setView: (v: 'pos' | 'admin' | 'manager' | 'kitchen' | 'cashier' | 'super_admin') => void;
  activeStaff: any;
  initialTab?: 'dashboard' | 'organizations' | 'payments' | 'orders' | 'products' | 'inventory' | 'analytics' | 'restaurants' | 'users' | 'devices' | 'security' | 'support' | 'notifications' | 'billing' | 'admins' | 'system-health' | 'platform-settings' | 'settings';
}

function useToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('krown_session_token') || '' : '';
}

function formatTimeAgo(dateStr: string | Date | null, nowMs?: number) {
  if (!dateStr) return 'N/A';
  const now = nowMs || Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  if (diff < 0) return 'Just now';
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string | Date | null) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Wall-clock fallback used by render-time computations. `now` state ticks every
// 60s from an effect; before that first flush we need a sane timestamp. Kept at
// module scope so React's render-purity lint only sees it as an opaque helper.
function wallMs(v: number) {
  return v > 0 ? v : Date.now();
}

function SearchableSelect({ options, value, onChange, placeholder, label, required }: {
  options: { value: string; label: string; sublabel?: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || o.sublabel?.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-xs font-bold text-slate-500 mb-1">{label}{required && ' *'}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-slate-100 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-orange-500/50"
      >
        <span className={selected ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
          {selected ? (selected.sublabel ? `${selected.label} — ${selected.sublabel}` : selected.label) : (placeholder || 'Select...')}
        </span>
        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 bg-white dark:bg-[#121214] p-2 border-b border-black/5 dark:border-white/5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-slate-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                autoFocus
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">No options found</p>
          ) : (
            filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors ${o.value === value ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 font-bold' : 'text-slate-900 dark:text-white'}`}
              >
                {o.label}
                {o.sublabel && <span className="text-[10px] text-slate-400 ml-1">— {o.sublabel}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Shared empty payload for the read-only SA list tabs (stable identity so the
// list fetch callbacks don't churn every render).
const EMPTY_LIST = { rows: [], summary: null, meta: { total: 0, page: 1, limit: 25 } };

export default function SuperAdminPage({ user, setView, activeStaff, initialTab }: SuperAdminProps) {
  const token = useToken();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'organizations' | 'payments' | 'orders' | 'products' | 'inventory' | 'analytics' | 'restaurants' | 'users' | 'devices' | 'security' | 'support' | 'notifications' | 'billing' | 'admins' | 'system-health' | 'platform-settings' | 'settings'>(initialTab || 'dashboard');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('krown_theme');
    if (saved) {
      const dark = saved === 'dark';
      setIsDark(dark);
      if (dark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } else {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(dark);
      if (dark) document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    vibrate(20);
    const next = !isDark;
    setIsDark(next);
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('krown_theme', next ? 'dark' : 'light');
  };

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  // Global search shortcut: ⌘K (macOS) / Ctrl+K focuses the header search box.
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ===================== DASHBOARD STATE =====================
  const [now, setNow] = useState(0);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);

  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // ===================== RESTAURANT STATE =====================
  const [orgSearch, setOrgSearch] = useState('');
  const [orgStatusFilter, setOrgStatusFilter] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showEditOrg, setShowEditOrg] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [orgActionLoading, setOrgActionLoading] = useState<string | null>(null);
  const [createOrgForm, setCreateOrgForm] = useState({
    name: '', contactEmail: '', contactPhone: '', taxId: '', address: '',
    branchName: '', branchLocation: '', managerName: '', managerEmail: '', managerPhone: '',
    adminName: '', adminEmail: '', planName: 'growth',
  });
  const [editOrgForm, setEditOrgForm] = useState({ name: '', contactEmail: '', contactPhone: '', taxId: '', address: '' });
  const [orgDetail, setOrgDetail] = useState<any>(null);
  const [orgDetailLoading, setOrgDetailLoading] = useState(false);
  const [orgDetailDate, setOrgDetailDate] = useState('');
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [createBranchForm, setCreateBranchForm] = useState({ name: '', location: '', city: '' });
  const [createBranchLoading, setCreateBranchLoading] = useState(false);

  // ===================== USERS STATE =====================
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('all');
  const [staffStatusFilter, setStaffStatusFilter] = useState('all');
  const [staffOrgFilter, setStaffOrgFilter] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffDetail, setStaffDetail] = useState<any>(null);
  const [staffDetailLoading, setStaffDetailLoading] = useState(false);
  const [staffActionLoading, setStaffActionLoading] = useState<string | null>(null);
  const [showResetPin, setShowResetPin] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null);
  const [showSetStaffPassword, setShowSetStaffPassword] = useState<string | null>(null);
  const [staffPasswordValue, setStaffPasswordValue] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ name: '', email: '', pin: '', role: 'cashier', organizationId: '', branchId: '' });
  const [addUserBranches, setAddUserBranches] = useState<any[]>([]);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [showDeleteUser, setShowDeleteUser] = useState<any>(null);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);
  const [showEditEmail, setShowEditEmail] = useState<any>(null);
  const [editEmailForm, setEditEmailForm] = useState({ email: '' });
  const [editEmailLoading, setEditEmailLoading] = useState(false);

  // ===================== DEVICES STATE =====================
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('all');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('all');
  const [deviceActionLoading, setDeviceActionLoading] = useState<string | null>(null);

  // ===================== SECURITY STATE =====================
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('all');
  const [alertStatusFilter, setAlertStatusFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [alertActionLoading, setAlertActionLoading] = useState<string | null>(null);

  // ===================== SUPPORT STATE =====================
  const [convSearch, setConvSearch] = useState('');
  const [convStatusFilter, setConvStatusFilter] = useState('all');
  const [convPriorityFilter, setConvPriorityFilter] = useState('all');
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [convMessages, setConvMessages] = useState<any[]>([]);
  const [convMessageInput, setConvMessageInput] = useState('');
  const [convActionLoading, setConvActionLoading] = useState<string | null>(null);
  const [supportRatings, setSupportRatings] = useState<any>(null);
  const [convDetails, setConvDetails] = useState<any>(null);
  const [convDetailsLoading, setConvDetailsLoading] = useState(false);
  const [showConvDetails, setShowConvDetails] = useState(false);
  const [endingConversation, setEndingConversation] = useState<string | null>(null);
  const [callTarget, setCallTarget] = useState<{ id: string; name: string } | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);

  // ===================== NOTIFICATIONS STATE =====================
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [sendingTestNotif, setSendingTestNotif] = useState(false);
  const [pushStatus, setPushStatus] = useState<'unknown' | 'on' | 'off' | 'denied' | 'unsupported' | 'unconfigured' | 'error'>('unknown');
  const [showComposer, setShowComposer] = useState(false);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerMessage, setComposerMessage] = useState('');
  const [composerRoles, setComposerRoles] = useState<string[]>([]);
  const [composerPriority, setComposerPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [composerEmail, setComposerEmail] = useState(true);
  const [composerToAdmins, setComposerToAdmins] = useState(false);
  const [showEfrisForm, setShowEfrisForm] = useState(false);
  const [efrisLoading, setEfrisLoading] = useState(false);
  const [efrisSaving, setEfrisSaving] = useState(false);
  const [efrisTesting, setEfrisTesting] = useState(false);
  const [efrisTestResult, setEfrisTestResult] = useState<any>(null);
  const [efrisForm, setEfrisForm] = useState({
    environment: 'sandbox',
    integrationMode: 'online',
    taxpayerTin: '',
    taxpayerName: '',
    businessRegistrationNumber: '',
    deviceNumber: '',
    deviceSerialNumber: '',
    clientPrivateKeyPem: '',
    serverPublicKeyPem: '',
    keyTable: '',
    enabled: true,
  });

  // ===================== DEFAULT FALLBACKS =====================
  const DEFAULT_ANALYTICS = {
    totalRevenue: 0, totalOrders: 0, activeRestaurants: 0, totalRestaurants: 0,
    activeStaff: 0, totalStaff: 0, paidOrders: 0, pendingOrders: 0,
    revenueByDay: [], ordersByDay: [], topRestaurants: [], staffByRole: [],
  };

  const DEFAULT_BILLING = {
    summary: { arr: 0, mrr: 0, activeCount: 0, pastDueCount: 0, expiredCount: 0 },
    plans: [], subscriptions: [],
  };

  const DEFAULT_SYSTEM_HEALTH = {
    database: { status: 'ok', latencyMs: 0, sizeFormatted: 'N/A', activeConnections: 0 },
    server: { nodeVersion: 'v20', uptime: 0, memory: { rss: 0 } },
    tables: [], recentErrors: [],
  };

  // ===================== TOAST & EXPORT STATE =====================
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const exportToCsv = (filename: string, rows: any[]) => {
    if (!rows || !rows.length) {
      showToast('No data available to export', 'error');
      return;
    }
    try {
      const separator = ',';
      const keys = Object.keys(rows[0]);
      const csvContent =
        keys.join(separator) +
        '\n' +
        rows
          .map(row => {
            return keys
              .map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                cell = typeof cell === 'object' ? JSON.stringify(cell) : cell.toString();
                cell = cell.replace(/"/g, '""');
                if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
                return cell;
              })
              .join(separator);
          })
          .join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Exported ${filename} successfully!`);
    } catch (e: any) {
      showToast('Failed to export CSV: ' + e.message, 'error');
    }
  };

  // ===================== GLOBAL SEARCH STATE =====================
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleGlobalSearch = async (q: string) => {
    setGlobalSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const res = await fetch(`/api/super-admin/search?q=${encodeURIComponent(q.trim())}`, { headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setSearchResults(d.data || null);
      }
    } catch { /* silent */ } finally {
      setIsSearching(false);
    }
  };

  // ===================== DEVICE SETUP STATE =====================
  const [showSetupDevice, setShowSetupDevice] = useState(false);
  const [setupDeviceForm, setSetupDeviceForm] = useState({
    organizationId: '',
    branchId: '',
    deviceName: '',
    deviceType: 'pos',
    allowedRoles: ['cashier', 'waiter'],
  });
  const [setupDeviceBranches, setSetupDeviceBranches] = useState<any[]>([]);
  const [generatedEnrollmentToken, setGeneratedEnrollmentToken] = useState<string | null>(null);
  const [setupDeviceLoading, setSetupDeviceLoading] = useState(false);

  const handleSetupDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupDeviceForm.organizationId) { showToast('Please select an organization', 'error'); return; }
    if (!setupDeviceForm.branchId) { showToast('Please select a branch', 'error'); return; }
    setSetupDeviceLoading(true);
    try {
      const res = await fetch('/api/devices/enrollment-token', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          organizationId: setupDeviceForm.organizationId,
          branchId: setupDeviceForm.branchId,
          deviceName: setupDeviceForm.deviceName,
          deviceType: setupDeviceForm.deviceType,
          allowedRoles: setupDeviceForm.allowedRoles,
        }),
      });
      const d = await res.json();
      if (res.ok && d.data?.token) {
        setGeneratedEnrollmentToken(d.data.token);
        showToast('Device enrollment token generated successfully!');
        fetchDashboardData();
      } else {
        showToast(d.error || 'Failed to generate enrollment token', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setSetupDeviceLoading(false);
    }
  };

  // ===================== SETTINGS STATE =====================
  const [flagToggling, setFlagToggling] = useState<string | null>(null);

  // ===================== ANALYTICS STATE =====================
  const [analytics, setAnalytics] = useState<any>(DEFAULT_ANALYTICS);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'7' | '30' | '90'>('30');

  // ===================== BILLING STATE =====================
  const [billing, setBilling] = useState<any>(DEFAULT_BILLING);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [billingOrgFilter, setBillingOrgFilter] = useState('all');

  // ===================== ADMINS STATE =====================
  const [admins, setAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [createAdminForm, setCreateAdminForm] = useState({ name: '', email: '' });
  const [createAdminError, setCreateAdminError] = useState<string | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [showSetAdminPassword, setShowSetAdminPassword] = useState<any>(null);
  const [adminPasswordValue, setAdminPasswordValue] = useState('');

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminActionLoading('create');
    setCreateAdminError(null);
    try {
      const res = await fetch('/api/super-admin/admins', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(createAdminForm),
      });
      const d = await res.json();
      if (res.ok && d.data) {
        setAdmins(prev => [d.data, ...prev]);
        setShowCreateAdmin(false);
        setCreateAdminForm({ name: '', email: '' });
        showToast(d.message || 'Super Admin account created successfully!');
      } else {
        setCreateAdminError(d.error || 'Failed to create admin');
      }
    } catch (err: any) {
      setCreateAdminError(err.message || 'Network error');
    } finally {
      setAdminActionLoading(null);
    }
  };

  // ===================== SYSTEM HEALTH STATE =====================
  const [systemHealth, setSystemHealth] = useState<any>(DEFAULT_SYSTEM_HEALTH);
  const [loadingSystemHealth, setLoadingSystemHealth] = useState(true);

  // ===================== SA LIST TABS STATE (Payments/Orders/Products/Inventory) =====================
  const [saOrders, setSaOrders] = useState<any>(EMPTY_LIST);
  const [loadingSaOrders, setLoadingSaOrders] = useState(false);
  const [saPayments, setSaPayments] = useState<any>(EMPTY_LIST);
  const [loadingSaPayments, setLoadingSaPayments] = useState(false);
  const [saProducts, setSaProducts] = useState<any>(EMPTY_LIST);
  const [loadingSaProducts, setLoadingSaProducts] = useState(false);
  const [saInventory, setSaInventory] = useState<any>(EMPTY_LIST);
  const [loadingSaInventory, setLoadingSaInventory] = useState(false);
  const [locations, setLocations] = useState<any>(null);
  const [overviewMetric, setOverviewMetric] = useState<'revenue' | 'orders' | 'users' | 'devices'>('revenue');
  const [showAllActivity, setShowAllActivity] = useState(false);

  const [saOrderSearch, setSaOrderSearch] = useState('');
  const [saOrderStatus, setSaOrderStatus] = useState('all');
  const [saOrderOrg, setSaOrderOrg] = useState('all');
  const [saPaySearch, setSaPaySearch] = useState('');
  const [saPayStatus, setSaPayStatus] = useState('all');
  const [saPayMethod, setSaPayMethod] = useState('all');
  const [saPayOrg, setSaPayOrg] = useState('all');
  const [saProdSearch, setSaProdSearch] = useState('');
  const [saProdAvail, setSaProdAvail] = useState('all');
  const [saProdOrg, setSaProdOrg] = useState('all');
  const [saInvSearch, setSaInvSearch] = useState('');
  const [saInvStock, setSaInvStock] = useState('all');
  const [saInvOrg, setSaInvOrg] = useState('all');

  // ===================== PLATFORM SETTINGS STATE =====================
  const [platformSettings, setPlatformSettings] = useState<any[]>([]);
  const [loadingPlatformSettings, setLoadingPlatformSettings] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ===================== SECURITY AUDIT LOGS STATE =====================
  const [secAuditOrgFilter, setSecAuditOrgFilter] = useState('all');
  const [secAuditBranchFilter, setSecAuditBranchFilter] = useState('all');
  const [secAuditUserFilter, setSecAuditUserFilter] = useState('');
  const [secAuditActionFilter, setSecAuditActionFilter] = useState('all');
  const [secAuditDateFrom, setSecAuditDateFrom] = useState('');
  const [secAuditDateTo, setSecAuditDateTo] = useState('');
  const [secAuditResults, setSecAuditResults] = useState<any[]>([]);
  const [secAuditLoading, setSecAuditLoading] = useState(false);
  const [secAuditBranches, setSecAuditBranches] = useState<any[]>([]);

  const fetchSecurityAuditLogs = async () => {
    setSecAuditLoading(true);
    try {
      const params = new URLSearchParams();
      if (secAuditOrgFilter !== 'all') params.set('organizationId', secAuditOrgFilter);
      if (secAuditBranchFilter !== 'all') params.set('branchId', secAuditBranchFilter);
      if (secAuditUserFilter.trim()) params.set('search', secAuditUserFilter.trim());
      if (secAuditActionFilter !== 'all') params.set('action', secAuditActionFilter);
      if (secAuditDateFrom) params.set('startDate', secAuditDateFrom);
      if (secAuditDateTo) params.set('endDate', secAuditDateTo + 'T23:59:59.999Z');
      params.set('limit', '200');

      const res = await fetch(`/api/audit?${params.toString()}`, { headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setSecAuditResults(d.data || []);
      }
    } catch { /* silent */ } finally {
      setSecAuditLoading(false);
    }
  };

  useEffect(() => {
    if (secAuditOrgFilter !== 'all') {
      const headers = authHeaders();
      fetch(`/api/super-admin/branches?organizationId=${secAuditOrgFilter}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] })
        .then((d: any) => setSecAuditBranches(d?.data || []))
        .catch(() => setSecAuditBranches([]));
    } else {
      setSecAuditBranches([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secAuditOrgFilter]);

  // ===================== MODALS =====================
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; action: () => void; loading?: boolean } | null>(null);

  // ===================== DATA FETCHING =====================
  const fetchDashboardData = useCallback(async () => {
    setLoadingDashboard(true);
    setError(null);
    try {
      // Fast path: one aggregated endpoint (server-side fan-out + 15s cache).
      try {
        const res = await fetch('/api/super-admin/overview', { headers: authHeaders() });
        if (res.ok) {
          const json = await res.json();
          const d = json?.data || {};
          setOrgs(d.orgs || []);
          setAllStaff(d.staff || []);
          setDevices(d.devices || []);
          setAlerts(d.alerts || []);
          if (d.health) setHealth(d.health);
          setFeatureFlags(d.flags || []);
          if (d.analytics) setAnalytics(d.analytics);
          setAuditLogs(d.audit || []);
          setLoadingAudit(false);
          setLoadingDashboard(false);
          setLoadingOrgs(false);
          setLoadingStaff(false);
          setLoadingDevices(false);
          setLoadingAlerts(false);
          setLoadingHealth(false);
          setLoadingFlags(false);
          setLoadingAnalytics(false);
          return;
        }
      } catch {
        /* fall through to legacy fan-out */
      }

      const [orgsRes, staffRes, devicesRes, alertsRes, healthRes, flagsRes, analyticsRes, auditRes] = await Promise.allSettled([
        fetch('/api/super-admin/orgs', { headers: authHeaders() }),
        fetch('/api/staff', { headers: authHeaders() }),
        fetch('/api/devices', { headers: authHeaders() }),
        fetch('/api/security/alerts?limit=50', { headers: authHeaders() }),
        fetch('/api/health', { headers: authHeaders() }),
        fetch('/api/feature-flags', { headers: authHeaders() }),
        fetch('/api/super-admin/analytics', { headers: authHeaders() }),
        fetch('/api/audit?limit=100', { headers: authHeaders() }),
      ]);

      if (orgsRes.status === 'fulfilled' && orgsRes.value.ok) {
        const d = await orgsRes.value.json();
        setOrgs(d.data || []);
      }
      if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
        const d = await staffRes.value.json();
        setAllStaff(d.data || []);
      }
      if (devicesRes.status === 'fulfilled' && devicesRes.value.ok) {
        const d = await devicesRes.value.json();
        setDevices(d.data || []);
      }
      if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
        const d = await alertsRes.value.json();
        setAlerts(d.data || []);
      }
      if (healthRes.status === 'fulfilled') {
        const d = await healthRes.value.json();
        setHealth(d);
      }
      if (flagsRes.status === 'fulfilled' && flagsRes.value.ok) {
        const d = await flagsRes.value.json();
        setFeatureFlags(d.data || []);
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
        const d = await analyticsRes.value.json();
        setAnalytics(d.data);
      }
      // Recent Activity on the dashboard reuses the same audit feed (now batched above).
      if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
        const d = await auditRes.value.json();
        setAuditLogs(d.data || []);
      }
      setLoadingAudit(false);
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard data');
    } finally {
      setLoadingDashboard(false);
      setLoadingOrgs(false);
      setLoadingStaff(false);
      setLoadingDevices(false);
      setLoadingAlerts(false);
      setLoadingHealth(false);
      setLoadingFlags(false);
      setLoadingAnalytics(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/audit?limit=100', { headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setAuditLogs(d.data || []);
      }
    } catch { /* silent */ } finally {
      setLoadingAudit(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch('/api/notifications?limit=100', { headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setNotifications((d.data || []).map((n: any) => ({ ...n, is_read: n.is_read ?? n.read ?? false })));
      }
    } catch { /* silent */ } finally {
      setLoadingNotifications(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch('/api/support/conversations?limit=100', { headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setConversations(d.data || []);
      }
    } catch { /* silent */ } finally {
      setLoadingConversations(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setNow(Date.now());
    setOrgDetailDate(new Date().toISOString().slice(0, 10));
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchDashboardData(), 0);
    return () => clearTimeout(t);
  }, [fetchDashboardData]);

  // Notification center: fetch immediately (sidebar unread badge), then poll
  // every 30s so new alerts appear without a page reload.
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/notifications?limit=100', { headers: authHeaders() })
        .then(r => (r.ok ? r.json() : null))
        .then((d: any) => {
          if (cancelled) return;
          if (d?.data) setNotifications(d.data.map((n: any) => ({ ...n, is_read: n.is_read ?? n.read ?? false })));
          setLoadingNotifications(false);
        })
        .catch(() => { if (!cancelled) setLoadingNotifications(false); });
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the browser already granted notification permission, subscribe to web
  // push silently so alerts arrive even when the app is closed.
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushStatus('unsupported');
      return;
    }
    if (Notification.permission === 'granted') {
      const token = localStorage.getItem('krown_session_token') || '';
      if (token) {
        enablePush(token).then(r => setPushStatus(r === 'enabled' ? 'on' : r === 'denied' ? 'denied' : r === 'unsupported' ? 'unsupported' : r === 'unconfigured' ? 'unconfigured' : 'error'));
      }
    } else if (Notification.permission === 'denied') {
      setPushStatus('denied');
    } else {
      setPushStatus('off');
    }
  }, []);

  useEffect(() => {
    if (setupDeviceForm.organizationId) {
      const headers = authHeaders();
      fetch(`/api/super-admin/branches?organizationId=${setupDeviceForm.organizationId}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] })
        .then((d: any) => { setSetupDeviceBranches(d?.data || []); setSetupDeviceForm(p => ({ ...p, branchId: '' })); })
        .catch(() => {});
    }
  }, [setupDeviceForm.organizationId]);

  // ===================== SA LIST FETCHERS (Payments/Orders/Products/Inventory) =====================
  const fetchSaList = useCallback(async (
    kind: 'orders' | 'payments' | 'products' | 'inventory',
    params: Record<string, string>,
    setRows: (v: any) => void,
    setLoading: (v: boolean) => void,
  ) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== ''),
      ).toString();
      const res = await fetch(`/api/super-admin/${kind}${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
      const d = res.ok ? await res.json().catch(() => null) : null;
      setRows(d?.data || EMPTY_LIST);
    } catch {
      setRows(EMPTY_LIST);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  // Extra dashboard payloads: billing (subscription revenue), locations (map),
  // and system-health (sidebar status card + health tiles).
  const fetchDashboardExtras = useCallback(async () => {
    try {
      const h = authHeaders();
      const [b, l, s] = await Promise.all([
        fetch('/api/super-admin/billing', { headers: h }).then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/super-admin/locations', { headers: h }).then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/super-admin/system-health', { headers: h }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (b?.data) setBilling(b.data);
      if (l?.data) setLocations(l.data);
      if (s?.data) setSystemHealth(s.data);
    } catch { /* silent */ }
  }, [authHeaders, setBilling, setLocations, setSystemHealth]);

  // Debounced fetches for the four read-only list tabs.
  useEffect(() => {
    if (activeTab !== 'orders') return;
    const t = setTimeout(() => fetchSaList('orders', { search: saOrderSearch, status: saOrderStatus, organizationId: saOrderOrg }, setSaOrders, setLoadingSaOrders), 300);
    return () => clearTimeout(t);
  }, [activeTab, saOrderSearch, saOrderStatus, saOrderOrg, fetchSaList]);

  useEffect(() => {
    if (activeTab !== 'payments') return;
    const t = setTimeout(() => fetchSaList('payments', { search: saPaySearch, paymentStatus: saPayStatus, method: saPayMethod, organizationId: saPayOrg }, setSaPayments, setLoadingSaPayments), 300);
    return () => clearTimeout(t);
  }, [activeTab, saPaySearch, saPayStatus, saPayMethod, saPayOrg, fetchSaList]);

  useEffect(() => {
    if (activeTab !== 'products') return;
    const t = setTimeout(() => fetchSaList('products', { search: saProdSearch, available: saProdAvail, organizationId: saProdOrg }, setSaProducts, setLoadingSaProducts), 300);
    return () => clearTimeout(t);
  }, [activeTab, saProdSearch, saProdAvail, saProdOrg, fetchSaList]);

  useEffect(() => {
    if (activeTab !== 'inventory') return;
    const t = setTimeout(() => fetchSaList('inventory', { search: saInvSearch, stock: saInvStock, organizationId: saInvOrg }, setSaInventory, setLoadingSaInventory), 300);
    return () => clearTimeout(t);
  }, [activeTab, saInvSearch, saInvStock, saInvOrg, fetchSaList]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (activeTab === 'dashboard') {
        if (orgs.length === 0) fetchDashboardData();
        fetchDashboardExtras();
      }
      else if (activeTab === 'restaurants' && orgs.length === 0) fetchDashboardData();
      else if (activeTab === 'organizations') {
        if (orgs.length === 0) fetchDashboardData();
        fetchDashboardExtras();
      }
      else if (activeTab === 'users' && allStaff.length === 0) fetchDashboardData();
      else if (activeTab === 'devices' && devices.length === 0) fetchDashboardData();
      else if (activeTab === 'security') {
        if (alerts.length === 0) fetchDashboardData();
        if (auditLogs.length === 0) fetchAuditLogs();
      }
      else if (activeTab === 'support') {
        if (conversations.length === 0) fetchConversations();
        fetch('/api/support/ratings', { headers: authHeaders() })
          .then(r => (r.ok ? r.json() : null))
          .then(d => setSupportRatings(d?.data || null))
          .catch(() => {});
      }
      else if (activeTab === 'notifications' && notifications.length === 0) fetchNotifications();
      else if (activeTab === 'settings') {
        if (featureFlags.length === 0 || !health) fetchDashboardData();
      }
      else if (activeTab === 'analytics') {
        setLoadingAnalytics(true);
        fetch('/api/super-admin/analytics', { headers: authHeaders() })
          .then(r => r.ok ? r.json() : null)
          .then(d => { setAnalytics(d?.data || DEFAULT_ANALYTICS); setLoadingAnalytics(false); })
          .catch(() => { setAnalytics((prev: any) => prev || DEFAULT_ANALYTICS); setLoadingAnalytics(false); });
      }
      else if (activeTab === 'billing') {
        setLoadingBilling(true);
        fetch('/api/super-admin/billing', { headers: authHeaders() })
          .then(r => r.ok ? r.json() : null)
          .then(d => { setBilling(d?.data || DEFAULT_BILLING); setLoadingBilling(false); })
          .catch(() => { setBilling((prev: any) => prev || DEFAULT_BILLING); setLoadingBilling(false); });
      }
      else if (activeTab === 'admins') {
        setLoadingAdmins(true);
        fetch('/api/super-admin/admins', { headers: authHeaders() })
          .then(r => r.ok ? r.json() : null)
          .then(d => { setAdmins(d?.data || []); setLoadingAdmins(false); })
          .catch(() => { setAdmins((prev: any) => prev || []); setLoadingAdmins(false); });
      }
      else if (activeTab === 'system-health') {
        setLoadingSystemHealth(true);
        fetch('/api/super-admin/system-health', { headers: authHeaders() })
          .then(r => r.ok ? r.json() : null)
          .then(d => { setSystemHealth(d?.data || DEFAULT_SYSTEM_HEALTH); setLoadingSystemHealth(false); })
          .catch(() => { setSystemHealth((prev: any) => prev || DEFAULT_SYSTEM_HEALTH); setLoadingSystemHealth(false); });
      }
      else if (activeTab === 'platform-settings') {
        setLoadingPlatformSettings(true);
        fetch('/api/super-admin/platform-settings', { headers: authHeaders() })
          .then(r => r.ok ? r.json() : null)
          .then(d => { setPlatformSettings(d?.data || []); setLoadingPlatformSettings(false); })
          .catch(() => { setPlatformSettings((prev: any) => prev || []); setLoadingPlatformSettings(false); });
      }
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ===================== RESTAURANT ACTIONS =====================
  const handleSuspendOrg = async (orgId: string) => {
    setOrgActionLoading(orgId);
    try {
      const res = await fetch(`/api/super-admin/orgs/${orgId}/suspend`, {
        method: 'POST', headers: authHeaders(),
      });
      if (res.ok) {
        setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, status: 'suspended' } : o));
        showToast('Restaurant suspended successfully');
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to suspend restaurant', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setOrgActionLoading(null);
      setConfirmModal(null);
    }
  };

  const handleReactivateOrg = async (orgId: string) => {
    setOrgActionLoading(orgId);
    try {
      const res = await fetch(`/api/super-admin/orgs/${orgId}/reactivate`, {
        method: 'POST', headers: authHeaders(),
      });
      if (res.ok) {
        setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, status: 'active' } : o));
        showToast('Restaurant reactivated successfully');
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to reactivate restaurant', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setOrgActionLoading(null);
      setConfirmModal(null);
    }
  };

  const openEditOrg = (org: any) => {
    setEditingOrgId(org.id);
    setEditOrgForm({ name: org.name || '', contactEmail: org.contact_email || '', contactPhone: org.contact_phone || '', taxId: org.tax_id || '', address: org.address || '' });
    setShowEditOrg(true);
  };

  const handleEditOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrgId || !editOrgForm.name.trim()) { showToast('Restaurant name is required', 'error'); return; }
    setOrgActionLoading(editingOrgId);
    try {
      const res = await fetch(`/api/super-admin/orgs/${editingOrgId}`, {
        method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(editOrgForm),
      });
      if (res.ok) {
        const d = await res.json();
        setOrgs(prev => prev.map(o => o.id === editingOrgId ? { ...o, ...d.data } : o));
        setShowEditOrg(false);
        setEditingOrgId(null);
        showToast('Restaurant updated successfully');
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to update restaurant', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setOrgActionLoading(null);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createOrgForm.name.trim()) { showToast('Restaurant name is required', 'error'); return; }
    setOrgActionLoading('create');
    try {
      const res = await fetch('/api/super-admin/orgs', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(createOrgForm),
      });
      const d = await res.json();
      if (res.ok) {
        setShowCreateOrg(false);
        setCreateOrgForm({ name: '', contactEmail: '', contactPhone: '', taxId: '', address: '', branchName: '', branchLocation: '', managerName: '', managerEmail: '', managerPhone: '', adminName: '', adminEmail: '', planName: 'growth' });
        showToast(d?.data?.message || 'Restaurant created successfully!');
        fetchDashboardData();
      } else {
        showToast(d.error || 'Failed to create restaurant', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setOrgActionLoading(null);
    }
  };

  // ===================== RESTAURANT DETAIL ACTIONS =====================
  const fetchOrgDetail = useCallback(async (orgId: string, date?: string) => {
    setOrgDetailLoading(true);
    try {
      const dateParam = date || orgDetailDate;
      const from = `${dateParam}T00:00:00.000Z`;
      const to = `${dateParam}T23:59:59.999Z`;
      const res = await fetch(`/api/super-admin/restaurant-detail?organizationId=${orgId}&from=${from}&to=${to}`, { headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setOrgDetail(d.data);
      }
    } catch { /* silent */ } finally {
      setOrgDetailLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgDetailDate]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !createBranchForm.name.trim()) return;
    setCreateBranchLoading(true);
    try {
      const res = await fetch('/api/super-admin/branches', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: selectedOrg.id, ...createBranchForm }),
      });
      if (res.ok) {
        setShowCreateBranch(false);
        setCreateBranchForm({ name: '', location: '', city: '' });
        showToast('Branch created successfully');
        fetchOrgDetail(selectedOrg.id);
        fetchDashboardData();
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to create branch', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Network error', 'error');
    } finally {
      setCreateBranchLoading(false);
    }
  };

  // ===================== STAFF ACTIONS =====================
  const handleStaffStatus = async (staffId: string, status: string) => {
    setStaffActionLoading(staffId);
    try {
      const res = await fetch(`/api/staff/${staffId}/status`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAllStaff(prev => prev.map(s => s.id === staffId ? { ...s, status } : s));
        showToast(`Staff member ${status === 'active' ? 'activated' : 'suspended'} successfully`);
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to update staff status', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setStaffActionLoading(null);
      setConfirmModal(null);
    }
  };

  const handleResetPin = async (staffId: string) => {
    if (!newPin || !/^\d{4,6}$/.test(newPin)) { showToast('PIN must be 4-6 digits', 'error'); return; }
    setStaffActionLoading(staffId);
    try {
      const res = await fetch(`/api/staff/${staffId}/pin`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ pin: newPin }),
      });
      if (res.ok) {
        setShowResetPin(null);
        setNewPin('');
        showToast('PIN reset successfully');
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to reset PIN', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setStaffActionLoading(null);
    }
  };

  const handleResetPassword = async (staffId: string) => {
    setStaffActionLoading(staffId);
    try {
      const res = await fetch(`/api/admin/send-reset-email`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowResetPassword(null);
        showToast(d.message || 'Reset email sent successfully');
      } else {
        showToast(d.error || 'Failed to send reset email', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setStaffActionLoading(null);
    }
  };

  // ===================== ADD USER ACTIONS =====================
  useEffect(() => {
    let cancelled = false;
    if (addUserForm.organizationId) {
      fetch(`/api/super-admin/branches?organizationId=${addUserForm.organizationId}`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : { data: [] })
        .then(d => { if (!cancelled) startTransition(() => { setAddUserBranches(d.data || d || []); }); })
        .catch(() => {});
      startTransition(() => { setAddUserForm(p => ({ ...p, branchId: '' })); });
    } else {
      startTransition(() => { setAddUserBranches([]); });
    }
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addUserForm.organizationId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserForm.name.trim() || !addUserForm.email.trim()) {
      showToast('Name and email are required', 'error'); return;
    }
    if (!addUserForm.organizationId) {
      showToast('Please select a restaurant', 'error'); return;
    }
    if (addUserForm.pin && !/^\d{4,6}$/.test(addUserForm.pin)) {
      showToast('PIN must be 4-6 digits', 'error'); return;
    }
    setAddUserLoading(true);
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: addUserForm.name.trim(),
          email: addUserForm.email.trim(),
          pin: addUserForm.pin || undefined,
          role: addUserForm.role,
          organizationId: addUserForm.organizationId,
          branchId: addUserForm.branchId || undefined,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setShowAddUser(false);
        setAddUserForm({ name: '', email: '', pin: '', role: 'cashier', organizationId: '', branchId: '' });
        showToast(d.message || 'User created successfully!');
        fetchDashboardData();
      } else {
        showToast(d.error || 'Failed to create user', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setAddUserLoading(false);
    }
  };

  // ===================== DELETE USER ACTIONS =====================
  const handleDeleteUser = async () => {
    if (!showDeleteUser) return;
    setDeleteUserLoading(true);
    try {
      const res = await fetch(`/api/super-admin/users/${showDeleteUser.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setAllStaff(prev => prev.filter(s => s.id !== showDeleteUser.id));
        setShowDeleteUser(null);
        showToast(`${showDeleteUser.name} has been permanently deleted`);
        fetchDashboardData();
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to delete user', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Network error', 'error');
    } finally {
      setDeleteUserLoading(false);
    }
  };

  // ===================== EDIT EMAIL ACTIONS =====================
  const handleEditEmail = async () => {
    if (!showEditEmail || !editEmailForm.email.trim()) return;
    const email = editEmailForm.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address', 'error'); return;
    }
    setEditEmailLoading(true);
    try {
      const res = await fetch(`/api/super-admin/users/${showEditEmail.id}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setAllStaff(prev => prev.map(s => s.id === showEditEmail.id ? { ...s, email } : s));
        setShowEditEmail(null);
        setEditEmailForm({ email: '' });
        showToast(`Email updated to ${email}`);
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to update email', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Network error', 'error');
    } finally {
      setEditEmailLoading(false);
    }
  };

  // ===================== DEVICE ACTIONS =====================
  const handleDeviceAction = async (deviceId: string, action: string) => {
    setDeviceActionLoading(deviceId);
    try {
      const res = await fetch(`/api/devices/${deviceId}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const newStatus = action === 'activate' ? 'active' : action === 'suspend' ? 'suspended' : 'revoked';
        setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: newStatus } : d));
        showToast(`Device ${action}d successfully`);
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || `Failed to ${action} device`, 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setDeviceActionLoading(null);
      setConfirmModal(null);
    }
  };

  // ===================== SECURITY ACTIONS =====================
  const handleAlertAction = async (alertId: string, status: string) => {
    setAlertActionLoading(alertId);
    try {
      const res = await fetch(`/api/security/alerts/${alertId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status } : a));
        showToast(`Alert ${status}`);
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to update alert', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setAlertActionLoading(null);
      setConfirmModal(null);
    }
  };

  // ===================== SUPPORT ACTIONS =====================
  const handleConvStatus = async (convId: string, status: string) => {
    setConvActionLoading(convId);
    try {
      const res = await fetch(`/api/support/conversations/${convId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, status } : c));
        showToast(`Conversation ${status}`);
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to update conversation', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setStaffActionLoading(null);
    }
  };

  // Rep ends the chat: history stays with the agent, hidden from the customer.
  const handleEndConversation = async (convId: string) => {
    setEndingConversation(convId);
    try {
      const res = await fetch(`/api/support/conversations/${convId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'closed', ended: true }),
      });
      if (res.ok) {
        const d = await res.json().catch(() => ({ data: null }));
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, status: 'closed', hidden_for_customer: true, ...(d.data || {}) } : c));
        setSelectedConv((prev: any) => prev?.id === convId ? { ...prev, status: 'closed', hidden_for_customer: true } : prev);
        showToast('Chat ended — history is now hidden from the customer');
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to end conversation', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setEndingConversation(null);
    }
  };

  // Rep-facing user details: identity, restaurant/branch/device, login sessions.
  const loadConvDetails = async (convId: string) => {
    if (showConvDetails) { setShowConvDetails(false); setConvDetails(null); return; }
    setShowConvDetails(true);
    setConvDetailsLoading(true);
    setConvDetails(null);
    try {
      const res = await fetch(`/api/support/conversations/${convId}/details`, { headers: authHeaders() });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.data) setConvDetails(d.data);
      else showToast(d.error || 'Failed to load user details', 'error');
    } catch { showToast('Network error', 'error'); } finally {
      setConvDetailsLoading(false);
    }
  };

  // Voice call from a support conversation — rings the customer's staff device.
  const handleStartCall = async () => {
    if (!selectedConv?.customer_staff_id) {
      showToast('No user attached to this conversation', 'error');
      return;
    }
    if (callTarget) return;
    let name = convDetails?.staff?.name as string | undefined;
    if (!name) {
      try {
        const res = await fetch(`/api/support/conversations/${selectedConv.id}/details`, { headers: authHeaders() });
        const d = await res.json().catch(() => ({}));
        name = d?.data?.staff?.name;
      } catch { /* fall back to generic label */ }
    }
    setCallTarget({ id: selectedConv.customer_staff_id, name: name || 'Support user' });
  };
  const handleSetStaffPassword = async (staffId: string) => {
    if (!staffPasswordValue || staffPasswordValue.length < 8) {
      showToast('Password must be at least 8 characters', 'error'); return;
    }
    setStaffActionLoading(staffId);
    try {
      const res = await fetch(`/api/super-admin/users/${staffId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ password: staffPasswordValue }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowSetStaffPassword(null);
        setStaffPasswordValue('');
        showToast('Password reset successfully');
      } else {
        showToast(d.error || 'Failed to reset password', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setStaffActionLoading(null);
    }
  };

  const handleViewStaff = async (s: any) => {
    if (selectedStaff?.id === s.id) {
      setSelectedStaff(null); setStaffDetail(null); return;
    }
    setSelectedStaff(s); setStaffDetail(null); setStaffDetailLoading(true);
    try {
      const res = await fetch(`/api/super-admin/users/${s.id}`, { headers: authHeaders() });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.data?.user) setStaffDetail(d.data.user);
    } catch { /* keep row data as fallback */ } finally {
      setStaffDetailLoading(false);
    }
  };

  const handleSetAdminPassword = async () => {
    if (!showSetAdminPassword) return;
    if (!adminPasswordValue || adminPasswordValue.length < 8) {
      showToast('Password must be at least 8 characters', 'error'); return;
    }
    setAdminActionLoading(showSetAdminPassword.id);
    try {
      const res = await fetch(`/api/super-admin/admins/${showSetAdminPassword.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ password: adminPasswordValue }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowSetAdminPassword(null);
        setAdminPasswordValue('');
        showToast('Admin password set successfully');
      } else {
        showToast(d.error || 'Failed to set password', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setAdminActionLoading(null);
    }
  };


  const loadConvMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/support/conversations/${convId}/messages?limit=100`, { headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setConvMessages(d.data || []);
      }
    } catch { /* silent */ }
  };

  const handleSendConvMessage = async (convId: string) => {
    if (!convMessageInput.trim()) return;
    const msg = convMessageInput.trim();
    setConvMessageInput('');
    try {
      const res = await fetch(`/api/support/conversations/${convId}/messages`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ content: msg, sender_type: 'agent' }),
      });
      const d = await res.json().catch(() => ({} as any));
      if (res.ok && d?.data) {
        setConvMessages(prev => [...prev, d.data]);
      } else if (d?.error) {
        showToast(d.error, 'error');
        setConvMessageInput(msg);
      } else {
        showToast('Failed to send message', 'error');
        setConvMessageInput(msg);
      }
    } catch {
      showToast('Failed to send message', 'error');
      setConvMessageInput(msg);
    }
  };

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await fetch('/api/support/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuery.trim() }),
      });
      const d = await res.json();
      if (d.data?.answer) setAiResponse(d.data.answer);
      else if (d.error) setAiResponse(d.error);
      else setAiResponse('No response');
    } catch { setAiResponse('Failed to get AI response.'); }
    finally { setAiLoading(false); }
  };

  // ===================== NOTIFICATION ACTIONS =====================
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        showToast('All notifications marked as read');
      } else {
        showToast('Failed to mark notifications', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); }
  };

  // Broadcast a message to selected staff roles (in-app + push + email).
  const handleSendBroadcast = async () => {
    if (!composerMessage.trim()) { showToast('Write a message first', 'error'); return; }
    if (!composerRoles.length && !composerToAdmins) { showToast('Select at least one role', 'error'); return; }
    setSendingTestNotif(true);
    try {
      const res = await fetch('/api/super-admin/notifications/broadcast', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: composerTitle.trim() || undefined,
          message: composerMessage.trim(),
          roles: composerRoles,
          includeSuperAdmins: composerToAdmins,
          email: composerEmail,
          priority: composerPriority,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(d.message || 'Broadcast sent');
        setShowComposer(false);
        setComposerTitle('');
        setComposerMessage('');
        fetch('/api/notifications?limit=100', { headers: authHeaders() })
          .then(r => (r.ok ? r.json() : null))
          .then((x: any) => { if (x?.data) setNotifications(x.data.map((n: any) => ({ ...n, is_read: n.is_read ?? n.read ?? false }))); })
          .catch(() => {});
      } else {
        showToast(d.error || 'Broadcast failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setSendingTestNotif(false); }
  };

  const toggleComposerRole = (role: string) => {
    setComposerRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  // ===================== SUPPORT CHAT EXPORTS =====================
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleExportConvCsv = () => {
    if (!selectedConv) return;
    try {
      const header = ['id', 'created_at', 'sender_type', 'sender', 'content'];
      const rows = convMessages.map((m: any) => [
        m.id || '',
        m.created_at || '',
        m.sender_type || '',
        m.sender_name || m.sender_id || '',
        String(m.content || '').replace(/\r?\n/g, ' '),
      ]);
      const csv = [header, ...rows]
        .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      downloadBlob(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), `support-chat-${selectedConv.id}.csv`);
      showToast('Chat exported as CSV');
    } catch { showToast('Could not export CSV', 'error'); }
  };

  const handleExportConvScreenshot = () => {
    if (!selectedConv) return;
    try {
      const width = 900;
      const pad = 28;
      const font = (px: number, weight = 400) => `${weight} ${px}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      const probe = document.createElement('canvas').getContext('2d')!;
      const wrapText = (text: string, maxWidth: number, weight = 400, size = 15): string[] => {
        probe.font = font(size, weight);
        const out: string[] = [];
        for (const rawLine of String(text || '').split('\n')) {
          const words = rawLine.split(/\s+/);
          let line = '';
          for (const word of words) {
            const next = line ? `${line} ${word}` : word;
            if (probe.measureText(next).width > maxWidth && line) { out.push(line); line = word; }
            else line = next;
          }
          out.push(line);
        }
        return out.length ? out : [''];
      };

      const senderLabel = (m: any) =>
        m.sender_type === 'agent' ? 'Human agent'
        : m.sender_type === 'ai' ? 'KROWN Bot'
        : m.sender_type === 'system' ? 'System'
        : (m.sender_name || selectedConv.customer_name || 'Customer');

      const bubbleMax = width - pad * 2 - 80;
      const laidOut = convMessages.map((m: any) => {
        const system = m.sender_type === 'system';
        const lines = wrapText(m.content || '—', system ? width - pad * 2 : bubbleMax, 400, 15);
        const labelLines = system ? 0 : 1;
        const h = 20 + labelLines * 16 + lines.length * 20 + 14;
        return { m, lines, system, h };
      });

      const headerH = 104;
      const footerH = 52;
      const bodyH = laidOut.reduce((a, l) => a + l.h + 12, 0);
      const height = headerH + Math.max(bodyH, 120) + footerH;

      const dpr = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#f4f4f6';
      ctx.fillRect(0, 0, width, height);

      // Header
      const grad = ctx.createLinearGradient(0, 0, width, headerH);
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, headerH);
      ctx.fillStyle = '#ffffff';
      ctx.font = font(22, 800);
      const subject = wrapText(selectedConv.subject || 'Support chat', width - pad * 2, 800, 22)[0];
      ctx.fillText(subject, pad, 44);
      ctx.font = font(13, 600);
      ctx.globalAlpha = 0.9;
      ctx.fillText(`KROWN Support · ${new Date().toLocaleString()} · ${convMessages.length} messages`, pad, 70);
      ctx.globalAlpha = 1;

      // Messages
      let y = headerH + 18;
      for (const item of laidOut) {
        const { m, lines, system, h } = item;
        if (system) {
          ctx.font = font(12, 700);
          ctx.fillStyle = '#94a3b8';
          const tw = ctx.measureText(m.content || '').width;
          ctx.fillText(m.content || '', (width - tw) / 2, y + h / 2 + 4);
        } else {
          const isCustomer = m.sender_type === 'customer';
          const boxW = Math.min(
            bubbleMax,
            Math.max(...lines.map(l => { ctx.font = font(15, 400); return ctx.measureText(l).width; })) + 28,
          );
          const boxH = h;
          const x = isCustomer ? width - pad - boxW : pad;
          ctx.fillStyle = isCustomer ? '#f97316' : m.sender_type === 'agent' ? '#d1fae5' : '#ffffff';
          ctx.strokeStyle = isCustomer ? 'rgba(0,0,0,0.06)' : m.sender_type === 'agent' ? '#a7f3d0' : '#e2e8f0';
          ctx.lineWidth = 1;
          const r = 16;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + boxW, y, x + boxW, y + boxH, r);
          ctx.arcTo(x + boxW, y + boxH, x, y + boxH, r);
          ctx.arcTo(x, y + boxH, x, y, r);
          ctx.arcTo(x, y, x + boxW, y, r);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          let ty = y + 24;
          ctx.font = font(11, 800);
          ctx.fillStyle = isCustomer ? 'rgba(255,255,255,0.85)' : m.sender_type === 'agent' ? '#059669' : '#f97316';
          ctx.fillText(senderLabel(m).toUpperCase(), x + 14, ty);
          ty += 16;
          ctx.font = font(15, 400);
          ctx.fillStyle = isCustomer ? '#ffffff' : '#1f2937';
          for (const line of lines) { ctx.fillText(line, x + 14, ty); ty += 20; }
          ctx.font = font(11, 500);
          ctx.fillStyle = isCustomer ? 'rgba(255,255,255,0.7)' : '#94a3b8';
          const stamp = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const stampW = ctx.measureText(stamp).width;
          ctx.fillText(stamp, x + boxW - stampW - 14, ty + 2);
        }
        y += h + 12;
      }

      // Footer
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, height - footerH, width, footerH);
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath(); ctx.moveTo(0, height - footerH); ctx.lineTo(width, height - footerH); ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = font(12, 600);
      ctx.fillText(`Conversation ${selectedConv.id} · exported from KROWN Super Admin`, pad, height - footerH / 2 + 4);

      canvas.toBlob(blob => {
        if (!blob) { showToast('Could not render screenshot', 'error'); return; }
        downloadBlob(blob, `support-chat-${selectedConv.id}.png`);
        showToast('Screenshot saved');
      }, 'image/png');
    } catch { showToast('Could not render screenshot', 'error'); }
  };

  // ===================== EFRIS SETUP (URA connection) =====================
  const openEfrisForm = async () => {
    if (!selectedOrg) return;
    setShowEfrisForm(true);
    setEfrisTestResult(null);
    setEfrisLoading(true);
    try {
      const res = await fetch(`/api/efris/config?organizationId=${selectedOrg.id}`, { headers: authHeaders() });
      const d = await res.json().catch(() => ({}));
      const c = d?.data;
      if (c) {
        setEfrisForm({
          environment: c.environment || 'sandbox',
          integrationMode: c.integrationMode || 'online',
          taxpayerTin: c.taxpayerTin || '',
          taxpayerName: c.taxpayerName || '',
          businessRegistrationNumber: c.businessRegistrationNumber || '',
          deviceNumber: c.deviceNumber || '',
          deviceSerialNumber: c.deviceSerialNumber || '',
          clientPrivateKeyPem: '',
          serverPublicKeyPem: '',
          keyTable: '',
          enabled: c.enabled ?? true,
        });
      } else {
        setEfrisForm(p => ({ ...p, taxpayerName: selectedOrg.name || '' }));
      }
    } catch { /* keep defaults */ }
    finally { setEfrisLoading(false); }
  };

  const handleSaveEfris = async () => {
    if (!selectedOrg) return;
    if (!efrisForm.taxpayerTin.trim()) { showToast('Taxpayer TIN is required', 'error'); return; }
    setEfrisSaving(true);
    try {
      const res = await fetch('/api/efris/config', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: selectedOrg.id,
          environment: efrisForm.environment,
          integrationMode: efrisForm.integrationMode,
          taxpayerTin: efrisForm.taxpayerTin.trim(),
          taxpayerName: efrisForm.taxpayerName.trim() || null,
          businessRegistrationNumber: efrisForm.businessRegistrationNumber.trim() || null,
          deviceNumber: efrisForm.deviceNumber.trim() || null,
          deviceSerialNumber: efrisForm.deviceSerialNumber.trim() || null,
          clientPrivateKeyPem: efrisForm.clientPrivateKeyPem.trim() || undefined,
          serverPublicKeyPem: efrisForm.serverPublicKeyPem.trim() || undefined,
          keyTable: efrisForm.keyTable.trim() || undefined,
          enabled: efrisForm.enabled,
          status: efrisForm.enabled ? 'active' : 'configured',
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(efrisForm.enabled
          ? 'EFRIS connected — receipts and invoices will be fiscalized automatically'
          : 'EFRIS configuration saved');
        setShowEfrisForm(false);
        setEfrisTestResult(null);
        if (selectedOrg) fetchOrgDetail(selectedOrg.id, orgDetailDate);
      } else {
        showToast(d.error || 'Could not save EFRIS configuration', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setEfrisSaving(false); }
  };

  const handleTestEfris = async () => {
    if (!selectedOrg) return;
    if (!efrisForm.taxpayerTin.trim() || !efrisForm.deviceNumber.trim()) {
      showToast('Save the TIN and device number first', 'error');
      return;
    }
    setEfrisTesting(true);
    setEfrisTestResult(null);
    try {
      // Persist first so the test runs against the saved configuration.
      const saveRes = await fetch('/api/efris/config', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: selectedOrg.id,
          environment: efrisForm.environment,
          integrationMode: efrisForm.integrationMode,
          taxpayerTin: efrisForm.taxpayerTin.trim(),
          taxpayerName: efrisForm.taxpayerName.trim() || null,
          businessRegistrationNumber: efrisForm.businessRegistrationNumber.trim() || null,
          deviceNumber: efrisForm.deviceNumber.trim(),
          deviceSerialNumber: efrisForm.deviceSerialNumber.trim() || null,
          clientPrivateKeyPem: efrisForm.clientPrivateKeyPem.trim() || undefined,
          serverPublicKeyPem: efrisForm.serverPublicKeyPem.trim() || undefined,
          keyTable: efrisForm.keyTable.trim() || undefined,
          enabled: efrisForm.enabled,
          status: efrisForm.enabled ? 'active' : 'configured',
        }),
      });
      if (!saveRes.ok) {
        const d = await saveRes.json().catch(() => ({}));
        showToast(d.error || 'Could not save configuration', 'error');
        return;
      }
      const res = await fetch('/api/efris/test', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: selectedOrg.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setEfrisTestResult(d.data);
        showToast(d.data?.passed ? 'URA connection OK — all checks passed' : 'Some URA checks failed — see results', d.data?.passed ? 'success' : 'error');
        fetchOrgDetail(selectedOrg.id, orgDetailDate);
      } else {
        showToast(d.error || 'Connection test failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setEfrisTesting(false); }
  };

  // Subscribe this browser to web push (asks permission when needed).
  const handleEnablePush = async () => {
    const token = localStorage.getItem('krown_session_token') || '';
    if (!token) { showToast('Not signed in', 'error'); return; }
    setPushStatus('unknown');
    const r = await enablePush(token);
    if (r === 'enabled') { setPushStatus('on'); showToast('Push notifications enabled — alerts will arrive even when the app is closed'); }
    else if (r === 'denied') { setPushStatus('denied'); showToast('Notifications are blocked — allow them in your browser settings', 'error'); }
    else if (r === 'unsupported') { setPushStatus('unsupported'); showToast('This browser does not support web push', 'error'); }
    else if (r === 'unconfigured') { setPushStatus('unconfigured'); showToast('Web push is not configured (missing VAPID keys)', 'error'); }
    else { setPushStatus('error'); showToast('Could not enable push notifications', 'error'); }
  };

  // Renew a restaurant's annual subscription (+12 months from now/period end).
  const handleRenewSubscription = async (orgId: string) => {
    try {
      const res = await fetch(`/api/super-admin/billing/${orgId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'renew' }),
      });
      if (res.ok) {
        showToast('Subscription renewed for 12 months');
        fetch('/api/super-admin/billing', { headers: authHeaders() })
          .then(r => (r.ok ? r.json() : null))
          .then(d => { if (d?.data) setBilling(d.data); })
          .catch(() => {});
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Renewal failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
  };

  // ===================== FEATURE FLAG ACTIONS =====================
  const handleToggleFlag = async (flagKey: string) => {
    setFlagToggling(flagKey);
    try {
      const flag = featureFlags.find(f => f.key === flagKey);
      const res = await fetch('/api/feature-flags', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ key: flagKey, enabled: !flag?.enabled }),
      });
      if (res.ok) {
        setFeatureFlags(prev => prev.map(f => f.key === flagKey ? { ...f, enabled: !f.enabled } : f));
        showToast(`Feature flag "${flagKey}" ${flag?.enabled ? 'disabled' : 'enabled'}`);
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to toggle feature flag', 'error');
      }
    } catch (e: any) { showToast(e.message || 'Network error', 'error'); } finally {
      setFlagToggling(null);
    }
  };

  // ===================== FILTERED DATA =====================
  const filteredOrgs = orgs.filter(o => {
    if (orgSearch && !o.name?.toLowerCase().includes(orgSearch.toLowerCase()) && !o.contact_email?.toLowerCase().includes(orgSearch.toLowerCase())) return false;
    if (orgStatusFilter !== 'all' && o.status !== orgStatusFilter) return false;
    return true;
  });

  const filteredStaff = allStaff.filter(s => {
    if (staffSearch && !s.name?.toLowerCase().includes(staffSearch.toLowerCase()) && !s.email?.toLowerCase().includes(staffSearch.toLowerCase())) return false;
    if (staffRoleFilter !== 'all' && s.role !== staffRoleFilter) return false;
    if (staffStatusFilter !== 'all' && s.status !== staffStatusFilter) return false;
    if (staffOrgFilter !== 'all' && s.organization_id !== staffOrgFilter) return false;
    return true;
  });

  const filteredDevices = devices.filter(d => {
    if (deviceSearch && !d.device_name?.toLowerCase().includes(deviceSearch.toLowerCase())) return false;
    if (deviceStatusFilter !== 'all' && d.status !== deviceStatusFilter) return false;
    if (deviceTypeFilter !== 'all' && d.device_type !== deviceTypeFilter) return false;
    return true;
  });

  const filteredAlerts = alerts.filter(a => {
    if (alertSeverityFilter !== 'all' && a.severity !== alertSeverityFilter) return false;
    if (alertStatusFilter !== 'all' && a.status !== alertStatusFilter) return false;
    return true;
  });

  const filteredAuditLogs = auditLogs.filter(l => {
    if (auditSearch && !l.action?.toLowerCase().includes(auditSearch.toLowerCase()) && !l.actor_email?.toLowerCase().includes(auditSearch.toLowerCase())) return false;
    return true;
  });

  const filteredConversations = conversations.filter(c => {
    if (convSearch && !c.subject?.toLowerCase().includes(convSearch.toLowerCase())) return false;
    if (convStatusFilter !== 'all' && c.status !== convStatusFilter) return false;
    if (convPriorityFilter !== 'all' && c.priority !== convPriorityFilter) return false;
    return true;
  });

  // Role chips for the broadcast composer (known roles + any role in the data).
  const composerRoleOptions = (() => {
    const labels: Record<string, string> = {
      restaurant_admin: 'Restaurant Admin', branch_manager: 'Manager', admin: 'Admin',
      cashier: 'Cashier', waiter: 'Waiter', senior_waiter: 'Senior Waiter',
      kitchen_staff: 'Kitchen Staff', host: 'Host',
    };
    const set = new Set<string>(['restaurant_admin', 'branch_manager', 'cashier', 'waiter', 'kitchen_staff']);
    allStaff.forEach((s: any) => { if (s?.role) set.add(String(s.role).toLowerCase()); });
    return Array.from(set).sort().map(role => ({
      role,
      label: labels[role] || role.replace(/_/g, ' '),
      count: allStaff.filter(s => String(s?.role || '').toLowerCase() === role).length,
    }));
  })();

  const filteredNotifications = notifications.filter(n => {
    if (notifFilter === 'unread' && n.is_read) return false;
    return true;
  });

  // ===================== DASHBOARD METRICS =====================
  const totalOrgs = orgs.length;
  const activeOrgs = orgs.filter(o => o.status === 'active').length;
  const totalStaffCount = allStaff.length;
  const activeStaffCount = allStaff.filter(s => s.status === 'active' || s.status === 'on_shift').length;
  const totalDevices = devices.length;
  const activeDevices = devices.filter(d => d.status === 'active').length;
  const openAlerts = alerts.filter(a => a.status === 'open').length;
  const openConversations = conversations.filter(c => c.status === 'open' || c.status === 'in_progress' || c.status === 'waiting_for_support').length;
  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  // Chart data - derive from recent audit logs
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const activityTrend = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    const dayLogs = auditLogs.filter(l => {
      const t = new Date(l.created_at).getTime();
      return t >= dayStart && t <= dayEnd;
    });
    return { day: daysOfWeek[d.getDay()], events: dayLogs.length };
  });

  const orgStatusData = [
    { name: 'Active', value: activeOrgs, fill: '#10b981' },
    { name: 'Suspended', value: totalOrgs - activeOrgs, fill: '#ef4444' },
  ];

  // ===================== DASHBOARD REDESIGN DATA =====================
  const fmtUgx = (n: number) => `UGX ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
  const nowMs = wallMs(now);

  const orgExpiringCount = orgs.filter((o: any) => {
    if (!o.subscription_expires_at) return false;
    const d = Math.ceil((new Date(o.subscription_expires_at).getTime() - nowMs) / 86400000);
    return d >= 0 && d <= 14;
  }).length;
  const orgExpiredCount = orgs.filter(
    (o: any) => o.subscription_expires_at && new Date(o.subscription_expires_at).getTime() < nowMs,
  ).length;

  const clock = (() => {
    const d = new Date(wallMs(now));
    return {
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
      date: `${d.toLocaleDateString('en-US', { day: '2-digit' })} ${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getFullYear()}`,
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  })();

  const countSince = (rows: any[], fromMs: number, toMs: number) =>
    rows.filter(r => { const t = new Date(r?.created_at || 0).getTime(); return t >= fromMs && t < toMs; }).length;

  const monthDelta = (rows: any[]) => {
    const nowMs = wallMs(now);
    const cur = countSince(rows, nowMs - 30 * 86400000, nowMs + 1000);
    const prev = countSince(rows, nowMs - 60 * 86400000, nowMs - 30 * 86400000);
    if (prev === 0) return { text: cur > 0 ? `+${cur} new this month` : 'No change this month', up: cur > 0, flat: cur === 0 };
    const pct = Math.round(((cur - prev) / prev) * 100);
    return { text: `${pct >= 0 ? '+' : ''}${pct}% from last month`, up: pct >= 0, flat: pct === 0 };
  };

  const restaurantDelta = monthDelta(orgs);
  const userDelta = monthDelta(allStaff);
  const deviceDelta = monthDelta(devices);

  // Platform Overview: last 7 days, tab switches metric (revenue/orders/users/devices).
  const overviewSeries = (() => {
    const base = new Date(wallMs(now));
    base.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const prevStart = days[0].getTime() - 7 * 86400000;
    const prevEnd = days[0].getTime();

    const fromCreated = (rows: any[]) => {
      const m = new Map<string, number>();
      rows.forEach(r => {
        const t = new Date(r?.created_at || 0);
        if (Number.isNaN(t.getTime()) || t.getTime() < prevStart || t.getTime() >= prevEnd + 86400000) return;
        const k = dayKey(t);
        m.set(k, (m.get(k) || 0) + 1);
      });
      return m;
    };

    let series: { day: string; value: number }[] = [];
    let total = 0;
    let prevTotal = 0;
    let unit: 'money' | 'count' = 'count';

    if (overviewMetric === 'revenue') {
      const rows = analytics?.revenueByDay || [];
      const map = new Map<string, number>(rows.map((r: any): [string, number] => [String(r.date).slice(0, 10), Number(r.revenue || 0)]));
      series = days.map(d => ({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), value: map.get(dayKey(d)) || 0 }));
      total = series.reduce((s, x) => s + x.value, 0);
      prevTotal = rows
        .filter((r: any) => { const t = new Date(r.date).getTime(); return t >= prevStart && t < prevEnd; })
        .reduce((s: number, r: any) => s + Number(r.revenue || 0), 0);
      unit = 'money';
    } else if (overviewMetric === 'orders') {
      const rows = analytics?.ordersByDay || [];
      const map = new Map<string, number>(rows.map((r: any): [string, number] => [String(r.date).slice(0, 10), Number(r.count || r.orders || 0)]));
      series = days.map(d => ({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), value: map.get(dayKey(d)) || 0 }));
      total = series.reduce((s, x) => s + x.value, 0);
      prevTotal = rows
        .filter((r: any) => { const t = new Date(r.date).getTime(); return t >= prevStart && t < prevEnd; })
        .reduce((s: number, r: any) => s + Number(r.count || r.orders || 0), 0);
    } else if (overviewMetric === 'users') {
      const map = fromCreated(allStaff);
      series = days.map(d => ({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), value: map.get(dayKey(d)) || 0 }));
      total = series.reduce((s, x) => s + x.value, 0);
      prevTotal = countSince(allStaff, prevStart, prevEnd);
    } else {
      const map = fromCreated(devices);
      series = days.map(d => ({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), value: map.get(dayKey(d)) || 0 }));
      total = series.reduce((s, x) => s + x.value, 0);
      prevTotal = countSince(devices, prevStart, prevEnd);
    }

    const pct = prevTotal === 0 ? null : Math.round(((total - prevTotal) / prevTotal) * 100);
    return { series, total, prevTotal, pct, unit };
  })();

  // Restaurants panel: first rows + paid-order counts from analytics.
  const topRestaurants = Array.isArray(analytics?.topRestaurants) ? analytics.topRestaurants : [];
  const restaurantPanelRows = orgs.slice(0, 4).map(o => {
    const t = topRestaurants.find((x: any) => x.organization_id === o.id);
    return {
      id: o.id,
      name: o.name,
      status: o.status,
      branches: Number(o.branch_count || 0),
      staff: Number(o.staff_count || 0),
      orders: Number(t?.order_count || 0),
    };
  });

  const billingSummary = billing?.summary || { arr: 0, mrr: 0, activeCount: 0, pastDueCount: 0, expiredCount: 0 };
  const subscribedPct = totalOrgs > 0 ? Math.min(100, Math.round((billingSummary.activeCount / totalOrgs) * 100)) : 0;

  // Distribution map: real branch cities → pins (approximate viewbox coords).
  const CITY_PINS: Record<string, { x: number; y: number }> = {
    kampala: { x: 252, y: 176 }, entebbe: { x: 212, y: 206 }, mukono: { x: 300, y: 168 },
    wakiso: { x: 232, y: 152 }, jinja: { x: 335, y: 186 }, masaka: { x: 185, y: 215 },
    mbarara: { x: 105, y: 235 }, gulu: { x: 215, y: 62 }, lira: { x: 268, y: 96 },
    soroti: { x: 345, y: 95 }, mbale: { x: 372, y: 145 }, 'fort portal': { x: 120, y: 130 },
    hoima: { x: 130, y: 96 }, kabale: { x: 88, y: 250 }, tororo: { x: 386, y: 170 },
    arua: { x: 132, y: 42 }, kasese: { x: 95, y: 165 }, bushenyi: { x: 142, y: 208 },
    iganga: { x: 352, y: 160 },
  };
  const cityPinFor = (label: string) => CITY_PINS[String(label || '').split(',')[0].trim().toLowerCase()] || null;
  const locationCities: any[] = locations?.cities || [];
  const locTotals = locations?.totals || {
    organizations: totalOrgs, activeOrganizations: activeOrgs, branches: 0, activeBranches: 0,
  };

  // ===================== SIDEBAR TABS =====================
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'organizations', icon: Building2, label: 'Organizations' },
    { id: 'restaurants', icon: Store, label: 'Restaurants' },
    { id: 'users', icon: Users, label: 'Users & Roles' },
    { id: 'devices', icon: Smartphone, label: 'Devices' },
    { id: 'billing', icon: CreditCard, label: 'Billing & Subscriptions' },
    { id: 'payments', icon: Wallet, label: 'Payments' },
    { id: 'orders', icon: ShoppingBag, label: 'Orders' },
    { id: 'products', icon: Coffee, label: 'Products' },
    { id: 'inventory', icon: Boxes, label: 'Inventory' },
    { id: 'support', icon: LifeBuoy, label: 'Support' },
    { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'security', icon: Shield, label: 'Security' },
    { id: 'admins', icon: UserCheck, label: 'Admins' },
    { id: 'system-health', icon: Stethoscope, label: 'System Health' },
    { id: 'platform-settings', icon: Settings, label: 'Platform Settings' },
  ];

  // Sidebar System Status card: real probes from /api/super-admin/system-health.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const allServices: any[] = Array.isArray(systemHealth?.services) ? systemHealth.services : [];
  const statusServices = ['database', 'api', 'payments', 'printing', 'efris']
    .map(k => allServices.find(s => s?.key === k))
    .filter(Boolean);
  const servicesForGrid = allServices.length ? allServices : [];
  const statusOverall = !allServices.length
    ? 'unknown'
    : allServices.some(s => s.status === 'error')
      ? 'error'
      : allServices.some(s => s.status === 'warn')
        ? 'warn'
        : 'ok';

  const handleSignOut = () => {
    localStorage.removeItem('krown_session_token');
    localStorage.removeItem('krown_staff_profile');
    sessionStorage.removeItem('krown_active_session');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/';
  };
  const pickSearchResult = (type: 'restaurant' | 'user' | 'device' | 'alert', item: any) => {
    if (type === 'restaurant') { setActiveTab('restaurants'); setSelectedOrg(item); }
    else if (type === 'user') { setActiveTab('users'); setSelectedStaff(item); }
    else if (type === 'device') setActiveTab('devices');
    else if (type === 'alert') setActiveTab('security');
    setShowSearchResults(false);
  };

  return (
    <div className="h-screen bg-[#F4F4F6] dark:bg-[#0A0A0C] p-6 lg:p-10 font-sans flex flex-col lg:flex-row overflow-hidden">
      {/* ==================== SIDEBAR ==================== */}
      <SuperAdminSidebar
        tabs={tabs as any}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as any)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(c => !c)}
        badges={{ security: openAlerts, support: openConversations, notifications: unreadNotifications }}
        statusOverall={statusOverall}
        statusServices={statusServices}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onBackToAdmin={() => { vibrate(30); setView('admin' as any); }}
        onSignOut={handleSignOut}
      />

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Top Header with Global Search */}
        <SuperAdminTopbar
          searchRef={searchInputRef}
          query={globalSearchQuery}
          onQueryChange={handleGlobalSearch}
          isSearching={isSearching}
          results={searchResults}
          showResults={showSearchResults && !!searchResults}
          onFocusResults={() => { if (globalSearchQuery.length >= 2) setShowSearchResults(true); }}
          onClearResults={() => { setGlobalSearchQuery(''); setSearchResults(null); setShowSearchResults(false); }}
          onPickResult={pickSearchResult}
          unreadNotifications={unreadNotifications}
          onOpenNotifications={() => setActiveTab('notifications')}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          user={user}
          profileMenuOpen={profileMenuOpen}
          setProfileMenuOpen={setProfileMenuOpen}
          onRefreshData={() => { fetchDashboardData(); fetchDashboardExtras(); }}
          onSystemStatus={() => setActiveTab('system-health')}
          onBackToAdmin={() => { vibrate(30); setView('admin' as any); }}
          onSignOut={handleSignOut}
        />

        {/* Tab Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ======================== DASHBOARD TAB ======================== */}
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              {/* ---------- HERO BANNER ---------- */}
              <div className="relative overflow-hidden rounded-[2rem] bg-[#0B0B0D] p-6 lg:p-9 flex flex-col lg:flex-row items-start lg:items-center gap-6">
                <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_8%_0%,rgba(249,115,22,0.55),transparent_55%),radial-gradient(90%_90%_at_85%_5%,rgba(168,85,247,0.35),transparent_60%),radial-gradient(70%_70%_at_65%_110%,rgba(236,72,153,0.28),transparent_70%)]" />
                  <svg viewBox="0 0 1200 260" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-[55%] opacity-30">
                    <defs>
                      <linearGradient id="skylineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fb923c" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.45" />
                      </linearGradient>
                    </defs>
                    <path d="M0 260 V170 H40 V130 H75 V175 H110 V100 H150 V60 H175 V120 H210 V150 H250 V90 H285 V40 H310 V110 H350 V145 H395 V95 H430 V130 H470 V70 H505 V160 H545 V120 H585 V175 H630 V140 H670 V85 H705 V50 H735 V130 H780 V165 H820 V110 H860 V150 H905 V95 H945 V135 H985 V170 H1030 V125 H1070 V160 H1110 V140 H1150 V175 H1200 V260 Z" fill="url(#skylineGrad)" />
                    <g fill="#0B0B0D" opacity="0.55">
                      <rect x="160" y="80" width="8" height="8" /><rect x="175" y="80" width="8" height="8" />
                      <rect x="292" y="55" width="8" height="8" /><rect x="306" y="55" width="8" height="8" />
                      <rect x="292" y="75" width="8" height="8" /><rect x="306" y="75" width="8" height="8" />
                      <rect x="712" y="65" width="8" height="8" /><rect x="726" y="65" width="8" height="8" />
                      <rect x="712" y="85" width="8" height="8" /><rect x="726" y="85" width="8" height="8" />
                      <rect x="480" y="85" width="8" height="8" /><rect x="494" y="85" width="8" height="8" />
                    </g>
                  </svg>
                </div>

                <div className="relative flex-1 min-w-0">
                  <p className="text-orange-400/90 text-[11px] font-black uppercase tracking-[0.25em] mb-2">Welcome back &#128075;</p>
                  <h2 className="text-3xl lg:text-[2.5rem] font-black tracking-tight text-white leading-none">
                    KROWN <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">Super Admin</span>
                  </h2>
                  <p className="text-white/60 text-sm mt-3 max-w-lg">Here&apos;s what&apos;s happening across your restaurant platform today.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[
                      { icon: Store, label: `${totalOrgs} restaurants` },
                      { icon: Users, label: `${totalStaffCount} staff members` },
                      { icon: Smartphone, label: `${totalDevices} devices` },
                    ].map(chip => (
                      <span key={chip.label} className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/80 text-[11px] font-semibold px-3 py-1.5 rounded-full backdrop-blur">
                        <chip.icon className="w-3.5 h-3.5 text-orange-400" /> {chip.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative bg-white/10 border border-white/15 rounded-3xl p-5 lg:p-6 min-w-[220px] backdrop-blur-md" data-testid="hero-clock">
                  <p className="text-white/70 text-xs font-bold">{clock.weekday}, {clock.date}</p>
                  <p className="text-white text-4xl font-black tabular-nums mt-1 tracking-tight">{clock.time}</p>
                  <p className="text-white/50 text-xs mt-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Kampala, Uganda</p>
                </div>
              </div>

              {/* ---------- 5 STAT CARDS ---------- */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {[
                  {
                    key: 'restaurants', icon: Store, label: 'Total Restaurants', value: totalOrgs,
                    sub: restaurantDelta.text, subOk: !restaurantDelta.flat || restaurantDelta.up,
                    tint: 'bg-orange-500/10 text-orange-500', onClick: () => setActiveTab('restaurants'),
                  },
                  {
                    key: 'users', icon: Users, label: 'Active Users', value: activeStaffCount,
                    sub: `${userDelta.text} · ${totalStaffCount} total`, subOk: !userDelta.flat || userDelta.up,
                    tint: 'bg-blue-500/10 text-blue-500', onClick: () => setActiveTab('users'),
                  },
                  {
                    key: 'devices', icon: Smartphone, label: 'Active Devices', value: activeDevices,
                    sub: `${deviceDelta.text} · ${totalDevices} total`, subOk: !deviceDelta.flat || deviceDelta.up,
                    tint: 'bg-emerald-500/10 text-emerald-500', onClick: () => setActiveTab('devices'),
                  },
                  {
                    key: 'alerts', icon: AlertTriangle, label: 'Security Alerts', value: openAlerts,
                    sub: openAlerts === 0 ? 'No active threats' : `${openAlerts} need review`,
                    subOk: openAlerts === 0,
                    tint: 'bg-red-500/10 text-red-500', onClick: () => setActiveTab('security'),
                  },
                  {
                    key: 'support', icon: Ticket, label: 'Support Tickets', value: openConversations,
                    sub: openConversations === 0 ? 'All conversations resolved' : `${openConversations} open now`,
                    subOk: openConversations === 0,
                    tint: 'bg-purple-500/10 text-purple-500', onClick: () => setActiveTab('support'),
                  },
                ].map(card => (
                  <button
                    key={card.key}
                    onClick={() => { vibrate(20); card.onClick(); }}
                    className="group text-left bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 shadow-sm rounded-[1.6rem] p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    data-testid={`stat-${card.key}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.tint}`}>
                        <card.icon className="w-5 h-5" />
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                    {loadingDashboard ? (
                      <Skeleton className="h-9 w-16 mt-1.5" />
                    ) : (
                      <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums" data-testid={`stat-value-${card.key}`}>{card.value}</p>
                    )}
                    <p className={`text-[11px] font-semibold mt-1.5 ${card.subOk ? 'text-emerald-500' : 'text-red-500'}`}>{card.sub}</p>
                  </button>
                ))}
              </div>

              {/* ---------- PLATFORM OVERVIEW + RESTAURANTS ---------- */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 shadow-sm rounded-[1.75rem] p-6 lg:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Platform Overview</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Last 7 days · updated live</p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                      {(['revenue', 'orders', 'users', 'devices'] as const).map(m => (
                        <button
                          key={m}
                          data-testid={`ov-seg-${m}`}
                          onClick={() => { vibrate(15); setOverviewMetric(m); }}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${overviewMetric === m ? 'bg-white dark:bg-[#0B0B0D] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end gap-3 mb-1">
                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums" data-testid="overview-total">
                      {loadingDashboard ? '—' : overviewSeries.unit === 'money' ? fmtUgx(overviewSeries.total) : overviewSeries.total.toLocaleString('en-US')}
                    </p>
                    <span className={`text-xs font-bold mb-1.5 ${overviewSeries.pct === null ? 'text-slate-400' : overviewSeries.pct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {overviewSeries.pct === null
                        ? (overviewSeries.total > 0 ? 'New this window' : 'No data yet')
                        : `${overviewSeries.pct >= 0 ? '+' : ''}${overviewSeries.pct}% vs previous 7 days`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4">
                    {overviewMetric === 'revenue' ? 'Gross order value across all payment states' : `New ${overviewMetric} per day`}
                  </p>

                  <div className="h-[220px] w-full" data-testid="overview-chart">
                    {loadingDashboard ? <Skeleton className="h-full w-full" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overviewSeries.series}>
                          <defs>
                            <linearGradient id="ovFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={44}
                            tickFormatter={(v: any) => overviewSeries.unit === 'money' ? (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)) : String(v)} />
                          <Tooltip
                            formatter={(v: any) => [overviewSeries.unit === 'money' ? fmtUgx(Number(v)) : Number(v), overviewMetric]}
                            contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                          />
                          <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#ovFill)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Restaurants panel */}
                  <div className="bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 shadow-sm rounded-[1.75rem] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">Restaurants</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Top tenants by paid orders</p>
                      </div>
                      <button onClick={() => { vibrate(20); setActiveTab('restaurants'); }} className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500 flex items-center gap-1">
                        View all <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {loadingDashboard || loadingOrgs ? (
                      <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : restaurantPanelRows.length === 0 ? (
                      <EmptyState icon={Store} title="No restaurants yet" description="Create a restaurant to see it here." />
                    ) : (
                      <div className="space-y-1" data-testid="dashboard-restaurants">
                        {restaurantPanelRows.map(row => (
                          <button
                            key={row.id}
                            onClick={() => { vibrate(20); setSelectedOrg(row); fetchOrgDetail(row.id); setActiveTab('restaurants'); }}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left group"
                          >
                            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white text-sm font-black flex items-center justify-center shrink-0">
                              {row.name?.charAt(0)?.toUpperCase() || 'R'}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">{row.name}</span>
                              <span className="block text-[10px] text-slate-400">{row.branches} branches · {row.staff} staff</span>
                            </span>
                            <span className="text-right shrink-0">
                              <span className="block text-xs font-black text-slate-900 dark:text-white tabular-nums">{row.orders}</span>
                              <span className="block text-[9px] text-slate-400">orders</span>
                            </span>
                            <StatusBadge status={row.status || 'active'} />
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-400 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Subscription revenue */}
                  <div className="bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 shadow-sm rounded-[1.75rem] p-6 flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Subscription Revenue</h3>
                      <span className="text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-500 px-2 py-1 rounded-lg">All time</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums" data-testid="arr-value">{fmtUgx(billingSummary.arr)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Annual Recurring Revenue</p>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                        <span>{billingSummary.activeCount} / {totalOrgs} restaurants subscribed</span>
                        <span className="text-orange-500">{subscribedPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all" style={{ width: `${subscribedPct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 text-[10px] font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400">{billingSummary.activeCount} active</span>
                      <span className="text-amber-600 dark:text-amber-400">{billingSummary.pastDueCount} past due</span>
                      <span className="text-red-500">{billingSummary.expiredCount} expired</span>
                    </div>
                    <button onClick={() => { vibrate(20); setActiveTab('billing'); }} className="mt-4 w-full text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500 flex items-center justify-center gap-1">
                      Manage billing <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ---------- DISTRIBUTION | ACTIVITY | HEALTH ---------- */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Restaurant distribution map */}
                <div className="bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 shadow-sm rounded-[1.75rem] p-6" data-testid="distribution-card">
                  <div className="mb-4">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Restaurant Distribution</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Branch presence by city</p>
                  </div>
                  {!locations ? (
                    <Skeleton className="h-[200px] w-full rounded-2xl" />
                  ) : (
                    <>
                      <div className="relative bg-gradient-to-b from-slate-50 to-slate-100 dark:from-white/[0.04] dark:to-transparent rounded-2xl overflow-hidden border border-black/5 dark:border-white/5">
                        <svg viewBox="0 0 400 280" className="w-full h-[200px]" data-testid="distribution-map">
                          <path d="M70 35 C130 12 210 18 275 32 C335 45 378 88 382 148 C386 208 342 252 278 264 C214 276 142 270 98 240 C54 210 40 148 50 98 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
                          <path d="M70 35 C130 12 210 18 275 32 C335 45 378 88 382 148 C386 208 342 252 278 264 C214 276 142 270 98 240 C54 210 40 148 50 98 Z" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 6" opacity="0.5" />
                          <ellipse cx="185" cy="252" rx="85" ry="34" fill="#7dd3fc" opacity="0.5" />
                          <path d="M110 90 C170 110 250 120 340 105" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />
                          <path d="M150 210 C200 170 260 150 360 150" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />
                          <path d="M230 40 C245 100 250 160 245 240" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
                          {locationCities.map((c: any) => {
                            const pin = cityPinFor(c.city);
                            if (!pin) return null;
                            return (
                              <g key={`pin-${c.city}`} data-testid={`map-pin-${String(c.city).split(',')[0].trim().toLowerCase()}`}>
                                <circle cx={pin.x} cy={pin.y} r="9" fill="#f97316" opacity="0.25" />
                                <circle cx={pin.x} cy={pin.y} r="5" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
                                <text x={pin.x} y={pin.y - 14} textAnchor="middle" fontSize="9" fontWeight="700" fill="#334155">{c.branches}</text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-[11px] font-semibold text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Active {locTotals.activeBranches}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Inactive {Math.max(0, locTotals.branches - locTotals.activeBranches)}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Total {locTotals.branches}</span>
                      </div>
                      {locationCities.filter((c: any) => !cityPinFor(c.city)).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {locationCities.filter((c: any) => !cityPinFor(c.city)).slice(0, 6).map((c: any) => (
                            <span key={c.city} className="text-[10px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-500 px-2 py-1 rounded-lg">
                              {c.city} · {c.branches}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Recent activity */}
                <div className="bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 shadow-sm rounded-[1.75rem] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Recent Activity</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Audit trail across the platform</p>
                    </div>
                    <button
                      onClick={() => setShowAllActivity(v => !v)}
                      className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500"
                    >
                      {showAllActivity ? 'Show less' : 'View all'}
                    </button>
                  </div>
                  {loadingAudit ? (
                    <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  ) : auditLogs.length === 0 ? (
                    <EmptyState icon={Activity} title="No activity yet" description="Audit events will appear here." />
                  ) : (
                    <div className="space-y-1" data-testid="recent-activity">
                      {(showAllActivity ? auditLogs.slice(0, 50) : auditLogs.slice(0, 6)).map((log: any) => (
                        <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                            {log.action?.includes('LOGIN') ? <Lock className="w-3.5 h-3.5 text-orange-500" /> :
                             log.action?.includes('CREATE') ? <Plus className="w-3.5 h-3.5 text-emerald-500" /> :
                             log.action?.includes('UPDATE') ? <RefreshCw className="w-3.5 h-3.5 text-blue-500" /> :
                             log.action?.includes('DELETE') ? <Trash2 className="w-3.5 h-3.5 text-red-500" /> :
                             <Activity className="w-3.5 h-3.5 text-slate-400" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">{String(log.action || '').replace(/_/g, ' ')}</span>
                            <span className="block text-[10px] text-slate-400 truncate">{log.user_email || log.staff_id || 'System'}{log.branch_name ? ` · ${log.branch_name}` : ''}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">{formatTimeAgo(log.created_at, now)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* System health tiles */}
                <div className="bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 shadow-sm rounded-[1.75rem] p-6 flex flex-col" data-testid="system-health-card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">System Health</h3>
                      <p className={`text-xs mt-0.5 font-semibold flex items-center gap-1.5 ${statusOverall === 'ok' ? 'text-emerald-500' : statusOverall === 'error' ? 'text-red-500' : 'text-amber-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusOverall === 'ok' ? 'bg-emerald-500' : statusOverall === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        {statusOverall === 'ok' ? 'All systems operational' : statusOverall === 'unknown' ? 'Probes loading…' : statusOverall === 'error' ? 'Service issue detected' : 'Degraded performance'}
                      </p>
                    </div>
                    <button
                      onClick={() => { vibrate(20); fetchDashboardExtras(); }}
                      className="flex items-center gap-1.5 text-[11px] font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                      data-testid="live-status-btn"
                    >
                      <RefreshCw className="w-3 h-3" /> Live Status
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 flex-1">
                    {(servicesForGrid.length > 0 ? servicesForGrid : [...Array(6)].map((_, i) => ({ key: `skeleton-${i}`, name: 'Loading', status: 'loading', detail: '' }))).map((svc: any) => {
                      const SvcIcon = statusServiceIcons[svc.key] || Activity;
                      const ok = svc.status === 'ok';
                      const warn = svc.status === 'warn';
                      return (
                        <button
                          key={svc.key}
                          onClick={() => { vibrate(20); setActiveTab('system-health'); }}
                          className={`text-left rounded-2xl border p-3.5 transition-all hover:shadow-sm ${
                            ok ? 'bg-emerald-500/5 border-emerald-500/15' : warn ? 'bg-amber-500/5 border-amber-500/15' : svc.status === 'error' ? 'bg-red-500/5 border-red-500/15' : 'bg-slate-50 dark:bg-white/[0.03] border-black/5 dark:border-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${ok ? 'bg-emerald-500/10 text-emerald-500' : warn ? 'bg-amber-500/10 text-amber-500' : svc.status === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-slate-500/10 text-slate-400'}`}>
                              <SvcIcon className="w-3.5 h-3.5" />
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${svc.status === 'loading' ? 'bg-slate-300 animate-pulse' : ok ? 'bg-emerald-500' : warn ? 'bg-amber-500' : 'bg-red-500'}`} />
                          </div>
                          <p className="text-[11px] font-black text-slate-900 dark:text-white truncate">{svc.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {svc.status === 'loading' ? 'Checking…' : svc.latencyMs !== undefined ? `${svc.latencyMs} ms` : (svc.detail || '')}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => { vibrate(20); setActiveTab('system-health'); }}
                    className="mt-3 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500 flex items-center justify-center gap-1"
                  >
                    View details <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================== ORGANIZATIONS TAB ======================== */}
          {activeTab === 'organizations' && (
            <motion.div key="organizations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Organizations</h2>
                  <p className="text-slate-500 font-medium text-xs">Platform tenants, subscriptions and account lifecycle.</p>
                </div>
                <button
                  onClick={() => { vibrate(20); setShowCreateOrg(true); }}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95 text-xs shrink-0"
                >
                  <Plus className="w-4 h-4" /> New Organization
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <SaSummaryCard icon={Building2} label="Total" value={totalOrgs} tone="orange" hint="All tenants" />
                <SaSummaryCard icon={CheckCircle2} label="Active" value={activeOrgs} tone="emerald" hint="In good standing" />
                <SaSummaryCard icon={Ban} label="Suspended" value={totalOrgs - activeOrgs} tone="red" hint="Access paused" />
                <SaSummaryCard icon={Clock} label="Expiring ≤14d" value={orgExpiringCount} tone="amber" hint="Renewal window" />
                <SaSummaryCard icon={AlertTriangle} label="Expired" value={orgExpiredCount} tone="red" hint="Past period end" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={orgSearch}
                    onChange={e => setOrgSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className={`${saInputCls} pl-8`}
                    data-testid="org-search"
                  />
                </div>
                <select value={orgStatusFilter} onChange={e => setOrgStatusFilter(e.target.value)} className={saSelectCls} data-testid="org-status-filter">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
                <span className="text-[11px] font-semibold text-slate-400 ml-auto">{filteredOrgs.length} of {totalOrgs} organizations</span>
              </div>

              <div className={saTableWrapCls}>
                {loadingOrgs ? (
                  <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : filteredOrgs.length === 0 ? (
                  <EmptyState icon={Building2} title="No organizations found" description="Adjust your filters or create a new organization." />
                ) : (
                  <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                    <table className="w-full text-left border-collapse" data-testid="orgs-table">
                      <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                        <tr className="border-b border-black/5 dark:border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-4 px-6">Organization</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6">Subscription</th>
                          <th className="py-4 px-6">Plan</th>
                          <th className="py-4 px-6">Branches</th>
                          <th className="py-4 px-6">Staff</th>
                          <th className="py-4 px-6">Created</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {filteredOrgs.map((org: any) => {
                          const expMs = org.subscription_expires_at ? new Date(org.subscription_expires_at).getTime() : null;
                          const daysLeft = expMs === null ? null : Math.ceil((expMs - nowMs) / 86400000);
                          const sub = expMs === null
                            ? { label: 'None', cls: 'bg-slate-500/10 text-slate-500' }
                            : daysLeft! < 0
                              ? { label: `Expired ${formatDate(org.subscription_expires_at)}`, cls: 'bg-red-500/10 text-red-500' }
                              : daysLeft! <= 14
                                ? { label: `${daysLeft}d left`, cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' }
                                : { label: `Ends ${formatDate(org.subscription_expires_at)}`, cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
                          return (
                            <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold text-sm flex items-center justify-center shrink-0">
                                    {org.name?.charAt(0)?.toUpperCase() || 'O'}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{org.name}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{org.contact_email || 'No email'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6"><StatusBadge status={org.status || 'active'} /></td>
                              <td className="py-4 px-6">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${sub.cls}`}>{sub.label}</span>
                              </td>
                              <td className="py-4 px-6 text-xs font-bold text-purple-600 dark:text-purple-400">{org.plan_name || 'Free'}</td>
                              <td className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">{org.branch_count || 0}</td>
                              <td className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">{org.staff_count || 0}</td>
                              <td className="py-4 px-6 text-xs text-slate-500">{formatDate(org.created_at)}</td>
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => { vibrate(20); setSelectedOrg(org); fetchOrgDetail(org.id); setActiveTab('restaurants'); }}
                                  className="ml-auto flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500"
                                >
                                  Manage <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================== PAYMENTS TAB ======================== */}
          {activeTab === 'payments' && (
            <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Payments</h2>
                <p className="text-slate-500 font-medium text-xs">Payment outcomes recorded on orders across every restaurant.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <SaSummaryCard icon={DollarSign} label="Collected today" value={fmtUgx(saPayments.summary?.today || 0)} tone="emerald" hint={`${saPayments.summary?.paidCount ?? 0} paid orders all time`} />
                <SaSummaryCard icon={CalendarDays} label="Last 7 days" value={fmtUgx(saPayments.summary?.last7d || 0)} tone="blue" hint="Paid amounts" />
                <SaSummaryCard icon={TrendingUp} label="Last 30 days" value={fmtUgx(saPayments.summary?.last30d || 0)} tone="purple" hint="Paid amounts" />
                <SaSummaryCard icon={Clock} label="Outstanding" value={fmtUgx(saPayments.summary?.outstanding || 0)} tone="amber" hint={`${saPayments.summary?.pendingCount ?? 0} awaiting settlement`} />
                <SaSummaryCard icon={Receipt} label="Payment records" value={saPayments.meta?.total ?? 0} tone="slate" hint="Matching current filters" />
              </div>

              {Array.isArray(saPayments.summary?.byMethod) && saPayments.summary.byMethod.length > 0 && (
                <div className="flex flex-wrap items-center gap-2" data-testid="pay-methods">
                  {saPayments.summary.byMethod.map((m: any) => (
                    <span key={m.method} className="flex items-center gap-1.5 bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span className="capitalize">{m.method}</span>
                      <span className="text-slate-400">{m.count} · {fmtUgx(m.amount)}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={saPaySearch} onChange={e => setSaPaySearch(e.target.value)} placeholder="Search order id, restaurant, method..." className={`${saInputCls} pl-8`} data-testid="pay-search" />
                </div>
                <select value={saPayStatus} onChange={e => setSaPayStatus(e.target.value)} className={saSelectCls} data-testid="pay-status">
                  <option value="all">All payment statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="partially_paid">Partially paid</option>
                </select>
                <select value={saPayMethod} onChange={e => setSaPayMethod(e.target.value)} className={saSelectCls} data-testid="pay-method">
                  <option value="all">All methods</option>
                  {(saPayments.summary?.byMethod || []).map((m: any) => (
                    <option key={m.method} value={m.method}>{m.method}</option>
                  ))}
                </select>
                <select value={saPayOrg} onChange={e => setSaPayOrg(e.target.value)} className={saSelectCls} data-testid="pay-org">
                  <option value="all">All restaurants</option>
                  {orgs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>

              <div className={saTableWrapCls}>
                {loadingSaPayments ? (
                  <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : !saPayments.rows?.length ? (
                  <EmptyState icon={Wallet} title="No payments found" description="No payment records match the current filters. Paid orders will appear here." />
                ) : (
                  <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                    <table className="w-full text-left border-collapse" data-testid="payments-table">
                      <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                        <tr className="border-b border-black/5 dark:border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-4 px-6">Date</th>
                          <th className="py-4 px-6">Order</th>
                          <th className="py-4 px-6">Restaurant</th>
                          <th className="py-4 px-6">Method</th>
                          <th className="py-4 px-6 text-right">Amount</th>
                          <th className="py-4 px-6">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {saPayments.rows.map((r: any) => (
                          <tr key={r.order_id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-6 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                            <td className="py-3.5 px-6 text-xs font-mono text-slate-500">#{String(r.order_id || '').slice(0, 8)}</td>
                            <td className="py-3.5 px-6">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.organization_name || 'Unknown'}</p>
                              <p className="text-[10px] text-slate-400">{r.branch_name || '—'}</p>
                            </td>
                            <td className="py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-300 capitalize">{r.payment_method || 'unspecified'}</td>
                            <td className="py-3.5 px-6 text-right text-sm font-black text-slate-900 dark:text-white tabular-nums">
                              {fmtUgx(r.payment_status === 'paid' ? Number(r.paid_amount || 0) : Number(r.total || 0))}
                            </td>
                            <td className="py-3.5 px-6"><StatusBadge status={r.payment_status || 'unpaid'} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-6 py-3 border-t border-black/5 dark:border-white/5 text-[11px] text-slate-400 font-semibold">
                      Showing {saPayments.rows.length} of {saPayments.meta?.total ?? saPayments.rows.length} payments
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================== ORDERS TAB ======================== */}
          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Orders</h2>
                <p className="text-slate-500 font-medium text-xs">Every order placed across the platform, newest first.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <SaSummaryCard icon={ShoppingBag} label="Total orders" value={saOrders.summary?.total ?? 0} tone="orange" hint="All time" />
                <SaSummaryCard icon={CalendarDays} label="Last 7 days" value={saOrders.summary?.last7d ?? 0} tone="blue" hint={`${saOrders.summary?.last30d ?? 0} in 30 days`} />
                <SaSummaryCard icon={CheckCircle2} label="Paid" value={saOrders.summary?.paid ?? 0} tone="emerald" hint={`${saOrders.summary?.awaiting ?? 0} awaiting payment`} />
                <SaSummaryCard icon={DollarSign} label="Paid revenue" value={fmtUgx(saOrders.summary?.revenue || 0)} tone="purple" hint={`Avg ${fmtUgx(saOrders.summary?.avgOrderValue || 0)}`} />
                <SaSummaryCard icon={Receipt} label="Matching filters" value={saOrders.meta?.total ?? 0} tone="slate" hint="Current result set" />
              </div>

              {Array.isArray(saOrders.summary?.byStatus) && saOrders.summary.byStatus.length > 0 && (
                <div className="flex flex-wrap items-center gap-2" data-testid="order-status-chips">
                  {saOrders.summary.byStatus.map((s: any) => (
                    <button
                      key={s.status}
                      onClick={() => { vibrate(15); setSaOrderStatus(saOrderStatus === s.status ? 'all' : s.status); }}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold border transition-all ${
                        saOrderStatus === s.status
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white dark:bg-[#121214]/80 border-black/5 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:border-orange-300'
                      }`}
                    >
                      <span className="capitalize">{String(s.status || 'unknown').replace(/_/g, ' ')}</span>
                      <span className="opacity-60">{s.count}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={saOrderSearch} onChange={e => setSaOrderSearch(e.target.value)} placeholder="Search order id, branch, table..." className={`${saInputCls} pl-8`} data-testid="order-search" />
                </div>
                <select value={saOrderStatus} onChange={e => setSaOrderStatus(e.target.value)} className={saSelectCls} data-testid="order-status">
                  <option value="all">All statuses</option>
                  {(saOrders.summary?.byStatus || []).map((s: any) => (
                    <option key={s.status} value={s.status}>{String(s.status || 'unknown').replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <select value={saOrderOrg} onChange={e => setSaOrderOrg(e.target.value)} className={saSelectCls} data-testid="order-org">
                  <option value="all">All restaurants</option>
                  {orgs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>

              <div className={saTableWrapCls}>
                {loadingSaOrders ? (
                  <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : !saOrders.rows?.length ? (
                  <EmptyState icon={ShoppingBag} title="No orders found" description="No orders match the current filters. New orders will stream in here." />
                ) : (
                  <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                    <table className="w-full text-left border-collapse" data-testid="orders-table">
                      <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                        <tr className="border-b border-black/5 dark:border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-4 px-6">Created</th>
                          <th className="py-4 px-6">Order</th>
                          <th className="py-4 px-6">Restaurant</th>
                          <th className="py-4 px-6">Table</th>
                          <th className="py-4 px-6">Items</th>
                          <th className="py-4 px-6 text-right">Total</th>
                          <th className="py-4 px-6">Payment</th>
                          <th className="py-4 px-6">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {saOrders.rows.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-6 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                            <td className="py-3.5 px-6 text-xs font-mono text-slate-500">#{String(r.id || '').slice(0, 8)}</td>
                            <td className="py-3.5 px-6">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.organization_name || 'Unknown'}</p>
                              <p className="text-[10px] text-slate-400">{r.branch_name || '—'}{r.type ? ` · ${r.type}` : ''}</p>
                            </td>
                            <td className="py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-300">{r.table_number || '—'}</td>
                            <td className="py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-300">{Number(r.item_count || 0)}</td>
                            <td className="py-3.5 px-6 text-right text-sm font-black text-slate-900 dark:text-white tabular-nums">{fmtUgx(r.total || 0)}</td>
                            <td className="py-3.5 px-6"><StatusBadge status={r.payment_status || 'unpaid'} /></td>
                            <td className="py-3.5 px-6"><StatusBadge status={r.status || 'pending'} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-6 py-3 border-t border-black/5 dark:border-white/5 text-[11px] text-slate-400 font-semibold">
                      Showing {saOrders.rows.length} of {saOrders.meta?.total ?? saOrders.rows.length} orders
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================== PRODUCTS TAB ======================== */}
          {activeTab === 'products' && (
            <motion.div key="products" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Products</h2>
                <p className="text-slate-500 font-medium text-xs">Menu catalogue across all restaurants, with EFRIS mapping status.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <SaSummaryCard icon={Coffee} label="Total" value={saProducts.summary?.total ?? 0} tone="orange" hint="Catalogue size" />
                <SaSummaryCard icon={CheckCircle2} label="Available" value={saProducts.summary?.available ?? 0} tone="emerald" hint="On menus now" />
                <SaSummaryCard icon={Ban} label="Unavailable" value={saProducts.summary?.unavailable ?? 0} tone="red" hint="Hidden from POS" />
                <SaSummaryCard icon={Boxes} label="Inventory linked" value={saProducts.summary?.inventoryLinked ?? 0} tone="blue" hint="Auto stock deduct" />
                <SaSummaryCard icon={DollarSign} label="Avg price" value={fmtUgx(saProducts.summary?.avgPrice || 0)} tone="purple" hint={`Catalogue ${fmtUgx(saProducts.summary?.catalogueValue || 0)}`} />
                <SaSummaryCard icon={Receipt} label="EFRIS mapped" value={saProducts.summary?.efrisMapped ?? 0} tone="amber" hint="Fiscal items" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={saProdSearch} onChange={e => setSaProdSearch(e.target.value)} placeholder="Search product, category, restaurant..." className={`${saInputCls} pl-8`} data-testid="prod-search" />
                </div>
                <select value={saProdAvail} onChange={e => setSaProdAvail(e.target.value)} className={saSelectCls} data-testid="prod-avail">
                  <option value="all">All availability</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
                <select value={saProdOrg} onChange={e => setSaProdOrg(e.target.value)} className={saSelectCls} data-testid="prod-org">
                  <option value="all">All restaurants</option>
                  {orgs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <span className="text-[11px] font-semibold text-slate-400 ml-auto">{saProducts.meta?.total ?? 0} products</span>
              </div>

              <div className={saTableWrapCls}>
                {loadingSaProducts ? (
                  <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : !saProducts.rows?.length ? (
                  <EmptyState icon={Coffee} title="No products found" description="Menu items created by restaurants will appear here." />
                ) : (
                  <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                    <table className="w-full text-left border-collapse" data-testid="products-table">
                      <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                        <tr className="border-b border-black/5 dark:border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-4 px-6">Product</th>
                          <th className="py-4 px-6">Restaurant</th>
                          <th className="py-4 px-6">Category</th>
                          <th className="py-4 px-6 text-right">Price</th>
                          <th className="py-4 px-6">Inventory</th>
                          <th className="py-4 px-6">EFRIS</th>
                          <th className="py-4 px-6">Available</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {saProducts.rows.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-3">
                                {r.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={r.image} alt="" className="w-9 h-9 rounded-lg object-cover bg-slate-100 dark:bg-white/5" />
                                ) : (
                                  <span className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                    <Coffee className="w-4 h-4" />
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.name}</p>
                                  {r.requires_kitchen && <p className="text-[10px] text-slate-400">Kitchen prep</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-6">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{r.organization_name || 'Unknown'}</p>
                              <p className="text-[10px] text-slate-400">{r.branch_name || '—'}</p>
                            </td>
                            <td className="py-3.5 px-6 text-xs text-slate-500">{r.category || 'Uncategorised'}</td>
                            <td className="py-3.5 px-6 text-right text-sm font-black text-slate-900 dark:text-white tabular-nums">{fmtUgx(r.price || 0)}</td>
                            <td className="py-3.5 px-6">
                              {r.deduct_from_inventory
                                ? <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold">Linked</span>
                                : <span className="px-2 py-1 rounded-md bg-slate-500/10 text-slate-400 text-[10px] font-bold">Manual</span>}
                            </td>
                            <td className="py-3.5 px-6">
                              {Number(r.efris_mapped) > 0
                                ? <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Mapped</span>
                                : <span className="px-2 py-1 rounded-md bg-slate-500/10 text-slate-400 text-[10px] font-bold">—</span>}
                            </td>
                            <td className="py-3.5 px-6"><StatusBadge status={r.available ? 'available' : 'unavailable'} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================== INVENTORY TAB ======================== */}
          {activeTab === 'inventory' && (
            <motion.div key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Inventory</h2>
                <p className="text-slate-500 font-medium text-xs">Stock levels, low-stock alerts and recent movements across branches.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <SaSummaryCard icon={Boxes} label="Stock items" value={saInventory.summary?.total ?? 0} tone="orange" hint="Ingredients tracked" />
                <SaSummaryCard icon={AlertTriangle} label="Low stock" value={saInventory.summary?.lowStock ?? 0} tone="amber" hint="At or below minimum" />
                <SaSummaryCard icon={XCircle} label="Out of stock" value={saInventory.summary?.outOfStock ?? 0} tone="red" hint="Quantity is zero" />
                <SaSummaryCard icon={DollarSign} label="Stock value" value={fmtUgx(saInventory.summary?.stockValue || 0)} tone="emerald" hint="Quantity × unit cost" />
                <SaSummaryCard icon={Activity} label="Movements (7d)" value={saInventory.summary?.movements7d ?? 0} tone="blue" hint="Stock in / out events" />
              </div>

              {Number(saInventory.summary?.lowStock) > 0 && (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3" data-testid="low-stock-banner">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {saInventory.summary.lowStock} ingredient{saInventory.summary.lowStock === 1 ? '' : 's'} at or below the minimum threshold.
                  </p>
                  <button
                    onClick={() => { vibrate(15); setSaInvStock(saInvStock === 'low' ? 'all' : 'low'); }}
                    className="ml-auto text-[11px] font-black text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    {saInvStock === 'low' ? 'Show all' : 'Show low stock'}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={saInvSearch} onChange={e => setSaInvSearch(e.target.value)} placeholder="Search ingredient, supplier, branch..." className={`${saInputCls} pl-8`} data-testid="inv-search" />
                </div>
                <select value={saInvStock} onChange={e => setSaInvStock(e.target.value)} className={saSelectCls} data-testid="inv-stock">
                  <option value="all">All stock states</option>
                  <option value="ok">Healthy</option>
                  <option value="low">Low stock</option>
                  <option value="out">Out of stock</option>
                </select>
                <select value={saInvOrg} onChange={e => setSaInvOrg(e.target.value)} className={saSelectCls} data-testid="inv-org">
                  <option value="all">All restaurants</option>
                  {orgs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <span className="text-[11px] font-semibold text-slate-400 ml-auto">{saInventory.meta?.total ?? 0} items</span>
              </div>

              <div className={saTableWrapCls}>
                {loadingSaInventory ? (
                  <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : !saInventory.rows?.length ? (
                  <EmptyState icon={Boxes} title="No inventory found" description="Ingredients added by restaurants will appear here with stock thresholds." />
                ) : (
                  <div className="overflow-x-auto overflow-y-auto max-h-[55vh] custom-scrollbar">
                    <table className="w-full text-left border-collapse" data-testid="inventory-table">
                      <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                        <tr className="border-b border-black/5 dark:border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-4 px-6">Ingredient</th>
                          <th className="py-4 px-6">Restaurant</th>
                          <th className="py-4 px-6">On hand</th>
                          <th className="py-4 px-6">Minimum</th>
                          <th className="py-4 px-6">State</th>
                          <th className="py-4 px-6 text-right">Stock value</th>
                          <th className="py-4 px-6">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {saInventory.rows.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-6">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{r.category || 'General'}{r.supplier ? ` · ${r.supplier}` : ''}</p>
                            </td>
                            <td className="py-3.5 px-6">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{r.organization_name || 'Unknown'}</p>
                              <p className="text-[10px] text-slate-400">{r.branch_name || '—'}</p>
                            </td>
                            <td className="py-3.5 px-6 text-sm font-black text-slate-900 dark:text-white tabular-nums">
                              {Number(r.quantity)} <span className="text-[10px] font-semibold text-slate-400">{r.unit || ''}</span>
                            </td>
                            <td className="py-3.5 px-6 text-xs text-slate-500 tabular-nums">{r.min_threshold != null ? Number(r.min_threshold) : '—'}</td>
                            <td className="py-3.5 px-6"><StatusBadge status={r.stock_state || 'ok'} /></td>
                            <td className="py-3.5 px-6 text-right text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">{fmtUgx(r.stock_value || 0)}</td>
                            <td className="py-3.5 px-6 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(r.updated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {Array.isArray(saInventory.summary?.recent) && saInventory.summary.recent.length > 0 && (
                <div className="bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 shadow-sm rounded-[1.75rem] p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Recent stock movements</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Latest inventory events across all branches</p>
                    </div>
                  </div>
                  <div className="space-y-1" data-testid="inventory-movements">
                    {saInventory.summary.recent.slice(0, 6).map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${String(m.type).toLowerCase().includes('in') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {String(m.type).toLowerCase().includes('in') ? <Plus className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">{m.ingredientName || m.ingredient_name}</span>
                          <span className="block text-[10px] text-slate-400 truncate">
                            {String(m.type || '').replace(/_/g, ' ')} · {m.organizationName || 'Unknown'}{m.branchName ? ` · ${m.branchName}` : ''}
                          </span>
                        </span>
                        <span className={`text-xs font-black tabular-nums ${Number(m.quantityChange) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {Number(m.quantityChange) >= 0 ? '+' : ''}{Number(m.quantityChange)}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">{formatTimeAgo(m.createdAt, now)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ======================== RESTAURANTS TAB ======================== */}
          {activeTab === 'restaurants' && (
            <motion.div key="restaurants" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Restaurants</h2>
                  <p className="text-slate-500 font-medium text-xs">Manage all tenant organizations on the platform.</p>
                </div>
                <button
                  onClick={() => setShowCreateOrg(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95 text-xs shrink-0"
                >
                  <Plus className="w-4 h-4" /> Create Restaurant
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={orgSearch}
                    onChange={e => setOrgSearch(e.target.value)}
                    placeholder="Search restaurants..."
                    className="w-full bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                </div>
                <select
                  value={orgStatusFilter}
                  onChange={e => setOrgStatusFilter(e.target.value)}
                  className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Table */}
              <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                {loadingOrgs ? (
                  <div className="p-6 space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : filteredOrgs.length === 0 ? (
                  <EmptyState icon={Store} title="No Restaurants Found" description="Create your first restaurant organization to get started." />
                ) : (
                  <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                        <tr className="border-b border-black/5 dark:border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-4 px-6">Restaurant</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6">Branches</th>
                          <th className="py-4 px-6">Staff</th>
                          <th className="py-4 px-6">Plan</th>
                          <th className="py-4 px-6">Created</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {filteredOrgs.map((org: any) => (
                          <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                                  {org.name?.charAt(0)?.toUpperCase() || 'R'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white text-sm">{org.name}</p>
                                  <p className="text-[11px] text-slate-500">{org.contact_email || 'No email'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6"><StatusBadge status={org.status || 'active'} /></td>
                            <td className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">{org.branch_count || 0}</td>
                            <td className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">{org.staff_count || 0}</td>
                            <td className="py-4 px-6">
                              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{org.plan_name || 'Free'}</span>
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-500">{formatDate(org.created_at)}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  onClick={() => openEditOrg(org)}
                                  className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                                  title="Edit Restaurant"
                                >
                                  <Pencil className="w-4 h-4 text-blue-500" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (selectedOrg?.id === org.id) {
                                      setSelectedOrg(null);
                                      setOrgDetail(null);
                                    } else {
                                      setSelectedOrg(org);
                                      fetchOrgDetail(org.id);
                                    }
                                  }}
                                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4 text-slate-400" />
                                </button>
                                {org.status === 'active' ? (
                                  <button
                                    onClick={() => setConfirmModal({
                                      title: 'Suspend Restaurant',
                                      message: `Are you sure you want to suspend "${org.name}"? This will pause all staff accounts and cancel the subscription.`,
                                      action: () => handleSuspendOrg(org.id),
                                    })}
                                    disabled={orgActionLoading === org.id}
                                    className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:opacity-50"
                                    title="Suspend"
                                  >
                                    {orgActionLoading === org.id ? <LoadingSpinner size="sm" /> : <Ban className="w-4 h-4 text-red-500" />}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleReactivateOrg(org.id)}
                                    disabled={orgActionLoading === org.id}
                                    className="p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                                    title="Reactivate"
                                  >
                                    {orgActionLoading === org.id ? <LoadingSpinner size="sm" /> : <RotateCcw className="w-4 h-4 text-emerald-500" />}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Org Detail Panel */}
              <AnimatePresence>
                {selectedOrg && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] p-8 ring-1 ring-black/5 dark:ring-white/10">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedOrg.name} — Details</h3>
                        <div className="flex items-center gap-2">
                          <button onClick={() => fetchOrgDetail(selectedOrg.id)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all" title="Refresh">
                            <RefreshCw className={`w-4 h-4 text-slate-400 ${orgDetailLoading ? 'animate-spin' : ''}`} />
                          </button>
                          <button onClick={() => { setSelectedOrg(null); setOrgDetail(null); }} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"><X className="w-4 h-4 text-slate-400" /></button>
                        </div>
                      </div>

                      {/* Date Picker + Summary Cards */}
                      <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-500">Date:</label>
                          <input
                            type="date"
                            value={orgDetailDate}
                            onChange={e => { setOrgDetailDate(e.target.value); if (selectedOrg) fetchOrgDetail(selectedOrg.id, e.target.value); }}
                            className="bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          />
                        </div>
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-200/30 dark:border-orange-500/20">
                            <p className="text-[10px] font-bold uppercase text-orange-500">Branches</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{orgDetail?.summary?.totalBranches ?? selectedOrg.branch_count ?? 0}</p>
                            <p className="text-[10px] text-slate-400">{orgDetail?.summary?.activeBranches ?? 0} active</p>
                          </div>
                          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-200/30 dark:border-blue-500/20">
                            <p className="text-[10px] font-bold uppercase text-blue-500">Staff</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{orgDetail?.summary?.totalStaff ?? selectedOrg.staff_count ?? 0}</p>
                            <p className="text-[10px] text-slate-400">{orgDetail?.summary?.activeStaff ?? 0} active</p>
                          </div>
                          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/30 dark:border-emerald-500/20">
                            <p className="text-[10px] font-bold uppercase text-emerald-500">Today&apos;s Sales</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">UGX {((orgDetail?.sales?.collected ?? 0) as number).toLocaleString()}</p>
                            <p className="text-[10px] text-slate-400">{orgDetail?.sales?.orders ?? 0} orders</p>
                          </div>
                          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200/30 dark:border-purple-500/20">
                            <p className="text-[10px] font-bold uppercase text-purple-500">Meals</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{orgDetail?.sales?.meals ?? 0}</p>
                            <p className="text-[10px] text-slate-400">prepared today</p>
                          </div>
                          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-sky-500/10 border border-cyan-200/30 dark:border-cyan-500/20">
                            <p className="text-[10px] font-bold uppercase text-cyan-500">Devices</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{orgDetail?.summary?.connectedDevices ?? 0}/{orgDetail?.summary?.totalDevices ?? 0}</p>
                            <p className="text-[10px] text-slate-400">connected</p>
                          </div>
                        </div>
                      </div>

                      {/* Branches List */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Branches</h4>
                          <button onClick={() => setShowCreateBranch(true)} className="flex items-center gap-1.5 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-orange-600 transition-all">
                            <Plus className="w-3.5 h-3.5" /> Add Branch
                          </button>
                        </div>
                        {orgDetailLoading ? (
                          <div className="flex items-center gap-2 py-4"><LoadingSpinner size="sm" /><span className="text-sm text-slate-400">Loading...</span></div>
                        ) : orgDetail?.branches?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {orgDetail.branches.map((b: any) => (
                              <div key={b.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:border-orange-300/50 dark:hover:border-orange-500/30 transition-all">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</h5>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>{b.status}</span>
                                </div>
                                {b.location && <p className="text-xs text-slate-500 mb-1">{b.location}{b.city ? `, ${b.city}` : ''}</p>}
                                <div className="flex gap-3 mt-2">
                                  <span className="text-[10px] font-bold text-blue-500">{b.staff_count ?? 0} staff</span>
                                  <span className="text-[10px] font-bold text-emerald-500">{b.today_orders ?? 0} orders today</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 py-4 text-center">No branches yet. Click &quot;Add Branch&quot; to create one.</p>
                        )}
                      </div>

                      {/* Staff List */}
                      {orgDetail?.staff?.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Staff</h4>
                          <div className="space-y-2">
                            {orgDetail.staff.slice(0, 10).map((s: any) => (
                              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold">{(s.name || '?')[0]}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.name}</p>
                                  <p className="text-[10px] text-slate-400">{s.email} · {s.role?.replace(/_/g, ' ')}</p>
                                </div>
                                <span className="text-[10px] text-slate-400">{s.branch_name || 'No branch'}</span>
                              </div>
                            ))}
                            {orgDetail.staff.length > 10 && <p className="text-xs text-slate-400 text-center">+{orgDetail.staff.length - 10} more staff</p>}
                          </div>
                        </div>
                      )}

                      {/* Device Connections */}
                      {orgDetail?.devices?.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Device Connections</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {orgDetail.devices.map((d: any) => (
                              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <div className={`w-2.5 h-2.5 rounded-full ${d.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{d.name || d.type}</p>
                                  <p className="text-[10px] text-slate-500">{d.branch_name || 'Unassigned'} · {d.type}</p>
                                </div>
                                <span className={`text-[10px] font-bold ${d.connected ? 'text-emerald-500' : 'text-slate-400'}`}>{d.connected ? 'Online' : 'Offline'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* EFRIS Fiscal Diagnostics + URA setup (no secrets returned) */}
                      <div>
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">EFRIS — URA Connection</h4>
                          <div className="flex items-center gap-2">
                            {orgDetail?.efris?.configured && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${orgDetail.efris.enabled && orgDetail.efris.status === 'active' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                                {orgDetail.efris.enabled && orgDetail.efris.status === 'active' ? 'ACTIVE' : (orgDetail.efris.status || 'CONFIGURED').toUpperCase()}
                              </span>
                            )}
                            <button
                              onClick={openEfrisForm}
                              className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold transition-all flex items-center gap-1.5"
                              title="Configure the URA EFRIS connection for this restaurant"
                            >
                              <Pencil className="w-3 h-3" />
                              {orgDetail?.efris?.configured ? 'Edit URA connection' : 'Set up URA connection'}
                            </button>
                          </div>
                        </div>

                        {showEfrisForm && (
                          <div className="p-4 mb-3 rounded-2xl border border-orange-500/30 bg-orange-500/5 space-y-3" data-testid="efris-setup-form">
                            {efrisLoading ? (
                              <p className="text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading configuration…</p>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">URA Environment *</label>
                                    <select
                                      value={efrisForm.environment}
                                      onChange={e => setEfrisForm(p => ({ ...p, environment: e.target.value }))}
                                      className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                                    >
                                      <option value="sandbox">Sandbox (mock URA)</option>
                                      <option value="uat">UAT — URA test servers</option>
                                      <option value="production">Production — URA live servers</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Integration mode</label>
                                    <select
                                      value={efrisForm.integrationMode}
                                      onChange={e => setEfrisForm(p => ({ ...p, integrationMode: e.target.value }))}
                                      className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                                    >
                                      <option value="online">Online (real-time)</option>
                                      <option value="offline">Offline enabler</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Taxpayer TIN *</label>
                                    <input
                                      type="text"
                                      value={efrisForm.taxpayerTin}
                                      onChange={e => setEfrisForm(p => ({ ...p, taxpayerTin: e.target.value }))}
                                      placeholder="e.g. 1000000001"
                                      className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Taxpayer name</label>
                                    <input
                                      type="text"
                                      value={efrisForm.taxpayerName}
                                      onChange={e => setEfrisForm(p => ({ ...p, taxpayerName: e.target.value }))}
                                      className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Device number *</label>
                                    <input
                                      type="text"
                                      value={efrisForm.deviceNumber}
                                      onChange={e => setEfrisForm(p => ({ ...p, deviceNumber: e.target.value }))}
                                      placeholder="e.g. KROWN-POS-01"
                                      className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Business registration no.</label>
                                    <input
                                      type="text"
                                      value={efrisForm.businessRegistrationNumber}
                                      onChange={e => setEfrisForm(p => ({ ...p, businessRegistrationNumber: e.target.value }))}
                                      className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Device serial number</label>
                                  <input
                                    type="text"
                                    value={efrisForm.deviceSerialNumber}
                                    onChange={e => setEfrisForm(p => ({ ...p, deviceSerialNumber: e.target.value }))}
                                    className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                                  />
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Client private key (PEM, stored encrypted)</label>
                                    <textarea
                                      value={efrisForm.clientPrivateKeyPem}
                                      onChange={e => setEfrisForm(p => ({ ...p, clientPrivateKeyPem: e.target.value }))}
                                      placeholder="Leave blank to keep the stored key"
                                      rows={2}
                                      className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-2.5 text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none resize-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">URA server public key (PEM)</label>
                                    <textarea
                                      value={efrisForm.serverPublicKeyPem}
                                      onChange={e => setEfrisForm(p => ({ ...p, serverPublicKeyPem: e.target.value }))}
                                      placeholder="Leave blank to keep the stored key"
                                      rows={2}
                                      className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-2.5 text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none resize-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Key table</label>
                                    <textarea
                                      value={efrisForm.keyTable}
                                      onChange={e => setEfrisForm(p => ({ ...p, keyTable: e.target.value }))}
                                      placeholder="Leave blank to keep the stored key table"
                                      rows={2}
                                      className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-2.5 text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none resize-none"
                                    />
                                  </div>
                                </div>

                                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={efrisForm.enabled}
                                    onChange={e => setEfrisForm(p => ({ ...p, enabled: e.target.checked }))}
                                    className="mt-0.5 w-4 h-4 accent-orange-500"
                                  />
                                  <span className="text-xs">
                                    <span className="font-bold text-slate-800 dark:text-white">Automatic receipts &amp; invoices</span>
                                    <span className="block text-[11px] text-slate-500 mt-0.5">Every paid order is fiscalized with URA in real time — fiscal receipt and invoice are generated without manual steps.</span>
                                  </span>
                                </label>

                                {efrisTestResult && (
                                  <div className="p-3 rounded-xl bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase text-slate-500">Connection test {efrisTestResult.sandbox ? '(sandbox)' : ''}</p>
                                    {efrisTestResult.tests?.map((t: any, i: number) => (
                                      <div key={i} className="flex items-start justify-between gap-3 text-[11px]">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{t.name}</span>
                                        <span className={`font-black ${t.status === 'passed' ? 'text-emerald-500' : t.status === 'warning' ? 'text-amber-500' : 'text-red-500'}`}>
                                          {String(t.status).toUpperCase()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setShowEfrisForm(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-white/5"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleTestEfris}
                                    disabled={efrisTesting || efrisSaving || efrisLoading}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
                                    title="Save, then verify connectivity, clock sync, initialization and login against URA"
                                  >
                                    {efrisTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                    Test URA connection
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSaveEfris}
                                    disabled={efrisSaving || efrisLoading}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
                                  >
                                    {efrisSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Save connection
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {!orgDetail?.efris?.configured && !showEfrisForm ? (
                          <div className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10">
                            <p className="text-xs text-slate-500">EFRIS has not been configured for this restaurant. Connect to URA to fiscalize receipts and invoices automatically.</p>
                            <button onClick={openEfrisForm} className="shrink-0 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold">Set up</button>
                          </div>
                        ) : !showEfrisForm && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Environment</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{orgDetail.efris.environment || '—'}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Mode</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{orgDetail.efris.integrationMode || '—'}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <p className="text-[10px] font-bold uppercase text-slate-400">TIN</p>
                                <p className="text-sm font-bold font-mono text-slate-900 dark:text-white">{orgDetail.efris.taxpayerTin || '—'}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Device</p>
                                <p className="text-sm font-bold font-mono text-slate-900 dark:text-white">{orgDetail.efris.deviceNumber || '—'}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(orgDetail.efris.countsByStatus || {}).map(([status, count]) => (
                                <span key={status} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                  {String(status).replace(/_/g, ' ')}: {String(count)}
                                </span>
                              ))}
                              {(!orgDetail.efris.countsByStatus || Object.keys(orgDetail.efris.countsByStatus).length === 0) && (
                                <span className="text-[10px] text-slate-400">No fiscal transactions in selected period</span>
                              )}
                            </div>
                            {Array.isArray(orgDetail.efris.recent) && orgDetail.efris.recent.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Recent transactions</p>
                                {orgDetail.efris.recent.map((t: any) => (
                                  <div key={t.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-xs">
                                    <div className="min-w-0">
                                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">{t.invoice_no || t.fiscal_document_number || t.order_id}</p>
                                      <p className="text-[10px] text-slate-500">{new Date(t.created_at).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        t.fiscal_status === 'fiscalized' ? 'bg-emerald-500/15 text-emerald-600'
                                          : t.fiscal_status === 'rejected' ? 'bg-red-500/15 text-red-500'
                                          : t.fiscal_status === 'unknown' ? 'bg-amber-500/15 text-amber-600'
                                          : 'bg-slate-200/60 text-slate-600'
                                      }`}>{String(t.fiscal_status || '').replace(/_/g, ' ')}</span>
                                      {t.error_message && <p className="text-[9px] text-red-400 mt-0.5 max-w-[140px] truncate">{t.error_message}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] text-slate-400">
                              Last success: {orgDetail.efris.lastSuccessfulCommunication ? new Date(orgDetail.efris.lastSuccessfulCommunication).toLocaleString() : 'never'}
                              {' · '}Activated: {orgDetail.efris.fiscalActivationAt ? new Date(orgDetail.efris.fiscalActivationAt).toLocaleString() : '—'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Create Branch Modal */}
              <AnimatePresence>
                {showCreateBranch && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-md w-full border border-black/10 dark:border-white/10 shadow-2xl">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Add Branch to {selectedOrg?.name}</h3>
                      <form onSubmit={handleCreateBranch} className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Branch Name *</label>
                          <input type="text" value={createBranchForm.name} onChange={e => setCreateBranchForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Kampala Central" className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Location</label>
                          <input type="text" value={createBranchForm.location} onChange={e => setCreateBranchForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Plot 12, Kampala Road" className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">City</label>
                          <input type="text" value={createBranchForm.city} onChange={e => setCreateBranchForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Kampala" className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white" />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => { setShowCreateBranch(false); setCreateBranchForm({ name: '', location: '', city: '' }); }} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm">Cancel</button>
                          <button type="submit" disabled={createBranchLoading || !createBranchForm.name.trim()} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 text-sm">
                            {createBranchLoading ? <LoadingSpinner size="sm" /> : 'Create Branch'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ======================== USERS TAB ======================== */}
          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Users</h2>
                  <p className="text-slate-500 font-medium text-xs">Search and manage all staff across restaurants.</p>
                </div>
                <button
                  onClick={() => {
                    if (orgs.length > 0 && !addUserForm.organizationId) {
                      setAddUserForm(p => ({ ...p, organizationId: orgs[0].id }));
                    }
                    setShowAddUser(true);
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add User
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                </div>
                <select value={staffRoleFilter} onChange={e => setStaffRoleFilter(e.target.value)} className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer">
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="branch_manager">Branch Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="senior_waiter">Senior Waiter</option>
                  <option value="head_chef">Head Chef</option>
                  <option value="kitchen_staff">Kitchen Staff</option>
                </select>
                <select value={staffStatusFilter} onChange={e => setStaffStatusFilter(e.target.value)} className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="banned">Banned</option>
                  <option value="on_shift">On Shift</option>
                  <option value="off_shift">Off Shift</option>
                </select>
                <select value={staffOrgFilter} onChange={e => setStaffOrgFilter(e.target.value)} className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer">
                  <option value="all">All Organizations</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>

              {/* Table */}
              <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                {loadingStaff ? (
                  <div className="p-6 space-y-3">
                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <EmptyState icon={Users} title="No Users Found" description="No staff members match your filters." />
                ) : (
                  <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                        <tr className="border-b border-black/5 dark:border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-4 px-6">User</th>
                          <th className="py-4 px-6">Role</th>
                          <th className="py-4 px-6">Restaurant</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6">Last Login</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {filteredStaff.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <Image src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'U')}&background=f97316&color=fff&bold=true&size=80`} alt="" width={36} height={36} className="w-9 h-9 rounded-xl object-cover" unoptimized />
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</p>
                                  <p className="text-[11px] text-slate-500">{s.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                                {s.role?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-xs font-semibold text-slate-500">{s.org_name || 'N/A'}</td>
                            <td className="py-4 px-6"><StatusBadge status={s.status || 'active'} /></td>
                            <td className="py-4 px-6 text-xs text-slate-500">{s.last_login_at ? formatTimeAgo(s.last_login_at) : 'Never'}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1 justify-end">
                                <button onClick={() => handleViewStaff(s)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all" title="View Details">
                                  <Eye className="w-4 h-4 text-slate-400" />
                                </button>
                                <button onClick={() => { setShowEditEmail(s); setEditEmailForm({ email: s.email || '' }); }} className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all" title="Change Email">
                                  <Pencil className="w-4 h-4 text-blue-500" />
                                </button>
                                {s.status !== 'banned' ? (
                                  <button
                                    onClick={() => setConfirmModal({
                                      title: 'Suspend User',
                                      message: `Suspend ${s.name}? They will be unable to log in.`,
                                      action: () => handleStaffStatus(s.id, 'paused'),
                                    })}
                                    disabled={staffActionLoading === s.id}
                                    className="p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all disabled:opacity-50"
                                    title="Suspend"
                                  >
                                    <Ban className="w-4 h-4 text-amber-500" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleStaffStatus(s.id, 'active')}
                                    disabled={staffActionLoading === s.id}
                                    className="p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                                    title="Reactivate"
                                  >
                                    <UserCheck className="w-4 h-4 text-emerald-500" />
                                  </button>
                                )}
                                <button onClick={() => { setShowResetPin(s.id); setNewPin(''); }} className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all" title="Reset PIN">
                                  <KeyRound className="w-4 h-4 text-blue-500" />
                                </button>
                                <button onClick={() => setShowResetPassword(s.id)} className="p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all" title="Send Reset Email">
                                  <Mail className="w-4 h-4 text-purple-500" />
                                </button>
                                <button onClick={() => { setShowSetStaffPassword(s.id); setStaffPasswordValue(''); }} className="p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all" title="Reset Password (direct, no email)">
                                  <Lock className="w-4 h-4 text-emerald-600" />
                                </button>
                                <button onClick={() => setShowDeleteUser(s)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all" title="Delete User">
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Reset PIN Modal */}
              <AnimatePresence>
                {showResetPin && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-sm w-full border border-black/10 dark:border-white/10 shadow-2xl">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Reset Staff PIN</h3>
                      <input
                        type="password"
                        value={newPin}
                        onChange={e => setNewPin(e.target.value)}
                        placeholder="Enter new 4-6 digit PIN"
                        maxLength={6}
                        className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white text-center tracking-widest mb-4"
                      />
                      <div className="flex gap-3">
                        <button onClick={() => setShowResetPin(null)} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm">Cancel</button>
                        <button
                          onClick={() => handleResetPin(showResetPin)}
                          disabled={staffActionLoading === showResetPin || !/^\d{4,6}$/.test(newPin)}
                          className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 text-sm"
                        >
                          {staffActionLoading === showResetPin ? <LoadingSpinner size="sm" /> : 'Save PIN'}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Reset Password Confirmation */}
              <AnimatePresence>
                {showResetPassword && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-sm w-full border border-black/10 dark:border-white/10 shadow-2xl">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 mx-auto mb-4">
                        <Mail className="w-6 h-6 text-purple-500" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">Send Password Reset</h3>
                      <p className="text-sm text-slate-500 mb-6 text-center">A password reset link will be sent to this staff member&apos;s email address. They can then set their own new password securely.</p>
                      <div className="flex gap-3">
                        <button onClick={() => setShowResetPassword(null)} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm">Cancel</button>
                        <button
                          onClick={() => handleResetPassword(showResetPassword)}
                          disabled={staffActionLoading === showResetPassword}
                          className="flex-1 bg-purple-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                        >
                          {staffActionLoading === showResetPassword ? <LoadingSpinner size="sm" /> : <><Mail className="w-4 h-4" /> Send Reset Email</>}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}

                {showSetStaffPassword && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-sm w-full border border-black/10 dark:border-white/10 shadow-2xl">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mx-auto mb-4">
                        <Lock className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">Reset Password</h3>
                      <p className="text-sm text-slate-500 mb-4 text-center">Set a new password directly for <strong className="text-slate-900 dark:text-white">{allStaff.find((x: any) => x.id === showSetStaffPassword)?.name || 'this user'}</strong>. No email is sent.</p>
                      <input
                        type="password"
                        value={staffPasswordValue}
                        onChange={e => setStaffPasswordValue(e.target.value)}
                        placeholder="New password (min 8 characters)"
                        minLength={8}
                        className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white mb-2"
                      />
                      <div className="flex gap-3 mt-4">
                        <button onClick={() => { setShowSetStaffPassword(null); setStaffPasswordValue(''); }} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm">Cancel</button>
                        <button
                          onClick={() => handleSetStaffPassword(showSetStaffPassword)}
                          disabled={staffActionLoading === showSetStaffPassword}
                          className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                        >
                          {staffActionLoading === showSetStaffPassword ? <LoadingSpinner size="sm" /> : <><Lock className="w-4 h-4" /> Set Password</>}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Delete User Confirmation Modal */}
              <AnimatePresence>
                {showDeleteUser && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-sm w-full border border-black/10 dark:border-white/10 shadow-2xl">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto mb-4">
                        <Trash2 className="w-6 h-6 text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">Permanently Delete User</h3>
                      <p className="text-sm text-slate-500 mb-2 text-center">Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white">{showDeleteUser.name}</strong>?</p>
                      <p className="text-xs text-red-500 mb-6 text-center font-medium">This action cannot be undone. The user will be removed from the database entirely.</p>
                      <div className="flex gap-3">
                        <button onClick={() => setShowDeleteUser(null)} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm">Cancel</button>
                        <button
                          onClick={handleDeleteUser}
                          disabled={deleteUserLoading}
                          className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-500/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                        >
                          {deleteUserLoading ? <LoadingSpinner size="sm" /> : <><Trash2 className="w-4 h-4" /> Delete Permanently</>}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Change Email Modal */}
              <AnimatePresence>
                {showEditEmail && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-sm w-full border border-black/10 dark:border-white/10 shadow-2xl">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 mx-auto mb-4">
                        <Pencil className="w-6 h-6 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">Change Email</h3>
                      <p className="text-sm text-slate-500 mb-4 text-center">Update email for <strong className="text-slate-900 dark:text-white">{showEditEmail.name}</strong></p>
                      <input
                        type="email"
                        value={editEmailForm.email}
                        onChange={e => setEditEmailForm({ email: e.target.value })}
                        placeholder="new.email@example.com"
                        className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white text-center mb-4"
                      />
                      <p className="text-[10px] text-slate-400 text-center mb-4">Login still works because the user ID stays the same.</p>
                      <div className="flex gap-3">
                        <button onClick={() => { setShowEditEmail(null); setEditEmailForm({ email: '' }); }} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm">Cancel</button>
                        <button
                          onClick={handleEditEmail}
                          disabled={editEmailLoading || !editEmailForm.email.trim()}
                          className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                        >
                          {editEmailLoading ? <LoadingSpinner size="sm" /> : <><Pencil className="w-4 h-4" /> Update Email</>}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Add User Modal */}
              <AnimatePresence>
                {showAddUser && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-lg w-full border border-black/10 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Add User</h3>
                        <button onClick={() => { setShowAddUser(false); setAddUserForm({ name: '', email: '', pin: '', role: 'cashier', organizationId: '', branchId: '' }); }} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"><X className="w-5 h-5 text-slate-400" /></button>
                      </div>
                      <form onSubmit={handleAddUser} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                          <input type="text" required value={addUserForm.name} onChange={e => setAddUserForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. John Doe" className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Email *</label>
                          <input type="email" required value={addUserForm.email} onChange={e => setAddUserForm(p => ({ ...p, email: e.target.value }))} placeholder="user@restaurant.com" className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-orange-500/5 border border-orange-500/20 rounded-xl px-3 py-2">
                          No password is set here. After saving, an automatic password setup email is sent to this user.
                        </p>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">PIN (for POS login)</label>
                          <input type="password" value={addUserForm.pin} onChange={e => setAddUserForm(p => ({ ...p, pin: e.target.value }))} placeholder="4-6 digits (optional)" maxLength={6} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 tracking-widest text-center" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Role *</label>
                          <select value={addUserForm.role} onChange={e => setAddUserForm(p => ({ ...p, role: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer">
                            <option value="cashier">Cashier</option>
                            <option value="branch_manager">Branch Manager</option>
                            <option value="restaurant_admin">Restaurant Admin</option>
                            <option value="senior_waiter">Senior Waiter</option>
                            <option value="head_chef">Head Chef</option>
                            <option value="kitchen_staff">Kitchen Staff</option>
                          </select>
                        </div>
                        <SearchableSelect
                          label="Restaurant"
                          required
                          value={addUserForm.organizationId}
                          onChange={orgId => setAddUserForm(p => ({ ...p, organizationId: orgId, branchId: '' }))}
                          options={orgs.map(o => ({ value: o.id, label: o.name, sublabel: o.contact_email }))}
                          placeholder="Select restaurant..."
                        />
                        <SearchableSelect
                          label="Branch"
                          value={addUserForm.branchId}
                          onChange={branchId => setAddUserForm(p => ({ ...p, branchId }))}
                          options={addUserBranches.map((b: any) => ({ value: b.id, label: b.name, sublabel: b.city || b.location }))}
                          placeholder={addUserForm.organizationId ? 'Select branch (optional)' : 'Select restaurant first'}
                        />
                        <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => { setShowAddUser(false); setAddUserForm({ name: '', email: '', pin: '', role: 'cashier', organizationId: '', branchId: '' }); }} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">Cancel</button>
                          <button type="submit" disabled={addUserLoading} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                            {addUserLoading ? <><LoadingSpinner size="sm" /> Creating...</> : 'Create User'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          {activeTab === 'devices' && (
            <motion.div key="devices" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Devices</h2>
                  <p className="text-slate-500 font-medium text-xs">Register, monitor, and manage all connected POS devices.</p>
                </div>
                <button
                  onClick={() => {
                    if (orgs.length > 0 && !setupDeviceForm.organizationId) {
                      setSetupDeviceForm(prev => ({ ...prev, organizationId: orgs[0].id }));
                    }
                    setShowSetupDevice(true);
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Setup Device
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)} placeholder="Search devices..." className="w-full bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all" />
                </div>
                <select value={deviceStatusFilter} onChange={e => setDeviceStatusFilter(e.target.value)} className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="revoked">Revoked</option>
                  <option value="pending">Pending</option>
                </select>
                <select value={deviceTypeFilter} onChange={e => setDeviceTypeFilter(e.target.value)} className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer">
                  <option value="all">All Types</option>
                  <option value="pos">POS Terminal</option>
                  <option value="waiter_tablet">Waiter Tablet</option>
                  <option value="kitchen">Kitchen Display</option>
                  <option value="manager_desk">Manager Desk</option>
                  <option value="admin_desk">Admin Desk</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                {loadingDevices ? (
                  <div className="p-6 space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <EmptyState icon={Smartphone} title="No Devices Found" description="No registered devices match your filters." />
                ) : (
                  <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                        <tr className="border-b border-black/5 dark:border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-4 px-6">Device</th>
                          <th className="py-4 px-6">Type</th>
                          <th className="py-4 px-6">Restaurant</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6">Last Seen</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {filteredDevices.map((d: any) => (
                          <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                  {d.device_type === 'pos_terminal' ? <Monitor className="w-5 h-5 text-orange-500" /> :
                                   d.device_type === 'tablet' ? <Tablet className="w-5 h-5 text-blue-500" /> :
                                   d.device_type === 'mobile' ? <Phone className="w-5 h-5 text-emerald-500" /> :
                                   <Smartphone className="w-5 h-5 text-purple-500" />}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white text-sm">{d.device_name}</p>
                                  <p className="text-[11px] text-slate-500 font-mono">{d.device_fingerprint?.substring(0, 16)}...</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-xs font-semibold text-slate-500 capitalize">{d.device_type?.replace(/_/g, ' ')}</td>
                            <td className="py-4 px-6 text-xs font-semibold text-slate-500">
                              <span className="block font-bold text-slate-700 dark:text-slate-300">{d.organization_name || 'Unknown restaurant'}</span>
                              <span className="block text-[11px] font-medium text-slate-500">{d.branch_name || 'No branch assigned'}</span>
                            </td>
                            <td className="py-4 px-6"><StatusBadge status={d.status || 'pending'} /></td>
                            <td className="py-4 px-6 text-xs text-slate-500">{formatTimeAgo(d.last_seen_at || d.updated_at)}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1 justify-end">
                                {d.status !== 'active' && (
                                  <button
                                    onClick={() => handleDeviceAction(d.id, 'activate')}
                                    disabled={deviceActionLoading === d.id}
                                    className="p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                                    title="Activate"
                                  >
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                  </button>
                                )}
                                {d.status === 'active' && (
                                  <button
                                    onClick={() => setConfirmModal({
                                      title: 'Suspend Device',
                                      message: `Suspend "${d.device_name}"? It will be unable to connect.`,
                                      action: () => handleDeviceAction(d.id, 'suspend'),
                                    })}
                                    disabled={deviceActionLoading === d.id}
                                    className="p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all disabled:opacity-50"
                                    title="Suspend"
                                  >
                                    <Ban className="w-4 h-4 text-amber-500" />
                                  </button>
                                )}
                                {d.status !== 'revoked' && (
                                  <button
                                    onClick={() => setConfirmModal({
                                      title: 'Revoke Device',
                                      message: `Permanently revoke "${d.device_name}"? This cannot be undone.`,
                                      action: () => handleDeviceAction(d.id, 'revoke'),
                                    })}
                                    disabled={deviceActionLoading === d.id}
                                    className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:opacity-50"
                                    title="Revoke"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Setup Device Modal */}
              <AnimatePresence>
                {showSetupDevice && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-md w-full border border-black/10 dark:border-white/10 shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <Smartphone className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Setup Device</h3>
                            <p className="text-xs text-slate-500">Generate an enrollment token</p>
                          </div>
                        </div>
                        <button onClick={() => { setShowSetupDevice(false); setGeneratedEnrollmentToken(null); }} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {generatedEnrollmentToken ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Device Enrollment Token</p>
                            <p className="font-mono text-xl font-extrabold text-emerald-700 dark:text-emerald-300 tracking-wider select-all break-all">{generatedEnrollmentToken}</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 flex flex-col items-center gap-2" data-testid="device-activation-qr">
                            <div className="bg-white p-2 rounded-xl">
                              <QRCodeSVG
                                value={`KROWN-ACTIVATE:${generatedEnrollmentToken}`}
                                size={168}
                                level="M"
                                bgColor="#ffffff"
                                fgColor="#0f172a"
                                imageSettings={{ src: 'https://i.ibb.co/wh2T8MZ7/file-00000000c36482088cf56fe82910d3c4.png', height: 34, width: 34, excavate: true }}
                              />
                            </div>
                            <p className="text-[11px] text-slate-500 text-center">Scan on the target device&apos;s activation screen to enroll it — no typing needed.</p>
                          </div>
                          <button
                            onClick={() => { navigator.clipboard.writeText(generatedEnrollmentToken); showToast('Token copied to clipboard!'); }}
                            className="w-full py-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-all"
                          >
                            <Copy className="w-4 h-4" /> Copy Token
                          </button>
                          <p className="text-xs text-slate-500 text-center">Give this token to the device user. This token expires in 10 minutes.</p>
                          <button
                            onClick={() => {
                              setShowSetupDevice(false);
                              setGeneratedEnrollmentToken(null);
                            }}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl shadow-lg hover:opacity-90 transition-all text-sm"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleSetupDevice} className="space-y-4">
                          <SearchableSelect
                            label="Target Organization"
                            required
                            value={setupDeviceForm.organizationId}
                            onChange={orgId => {
                              setSetupDeviceForm({ ...setupDeviceForm, organizationId: orgId, branchId: '' });
                              if (!orgId) { setSetupDeviceBranches([]); return; }
                              const headers = authHeaders();
                              fetch(`/api/super-admin/branches?organizationId=${orgId}`, { headers })
                                .then(r => r.ok ? r.json() : { data: [] })
                                .then((d: any) => setSetupDeviceBranches(d?.data || []))
                                .catch(() => setSetupDeviceBranches([]));
                            }}
                            options={orgs.map((o: any) => ({ value: o.id, label: o.name, sublabel: o.contact_email }))}
                            placeholder="Select Organization"
                          />

                          <SearchableSelect
                            label="Target Branch"
                            required
                            value={setupDeviceForm.branchId}
                            onChange={branchId => setSetupDeviceForm({ ...setupDeviceForm, branchId })}
                            options={setupDeviceBranches.map((b: any) => ({ value: b.id, label: b.name, sublabel: b.city || b.location }))}
                            placeholder={setupDeviceForm.organizationId ? 'Select Branch' : 'Select Organization first'}
                          />

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Device Name</label>
                            <input
                              type="text"
                              value={setupDeviceForm.deviceName}
                              onChange={e => setSetupDeviceForm({ ...setupDeviceForm, deviceName: e.target.value })}
                              placeholder="e.g. Front Counter POS 1"
                              className="w-full bg-slate-100 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Device Type</label>
                            <select
                              value={setupDeviceForm.deviceType}
                              onChange={e => setSetupDeviceForm({ ...setupDeviceForm, deviceType: e.target.value })}
                              className="w-full bg-slate-100 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none"
                            >
                              <option value="pos">POS Terminal</option>
                              <option value="waiter_tablet">Waiter Tablet</option>
                              <option value="kitchen">Kitchen Display</option>
                              <option value="manager_desk">Manager Desk</option>
                              <option value="admin_desk">Admin Desk</option>
                              <option value="general">General</option>
                            </select>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => { setShowSetupDevice(false); setGeneratedEnrollmentToken(null); }}
                              className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={setupDeviceLoading}
                              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                            >
                              {setupDeviceLoading ? <LoadingSpinner size="sm" /> : 'Generate Token'}
                            </button>
                          </div>
                        </form>
                      )}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ======================== SECURITY TAB ======================== */}
          {activeTab === 'security' && (
            <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Security</h2>
                <p className="text-slate-500 font-medium text-xs">Monitor security alerts, login activity, and audit logs.</p>
              </div>

              {/* Alerts Section */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Security Alerts</h3>
                  <div className="flex gap-2">
                    <select value={alertSeverityFilter} onChange={e => setAlertSeverityFilter(e.target.value)} className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer">
                      <option value="all">All Severity</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="info">Info</option>
                    </select>
                    <select value={alertStatusFilter} onChange={e => setAlertStatusFilter(e.target.value)} className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer">
                      <option value="all">All Status</option>
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                  {loadingAlerts ? (
                    <div className="p-6 space-y-3">
                      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                  ) : filteredAlerts.length === 0 ? (
                    <EmptyState icon={ShieldCheck} title="No Alerts" description="No security alerts match your filters. The platform is secure." />
                  ) : (
                    <div className="divide-y divide-black/5 dark:divide-white/5">
                      {filteredAlerts.map((alert: any) => (
                        <div key={alert.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="shrink-0">
                                {alert.severity === 'critical' ? <ShieldAlert className="w-5 h-5 text-red-500" /> :
                                 alert.severity === 'high' ? <AlertTriangle className="w-5 h-5 text-orange-500" /> :
                                 alert.severity === 'medium' ? <AlertCircle className="w-5 h-5 text-yellow-500" /> :
                                 <Info className="w-5 h-5 text-blue-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{alert.title}</p>
                                  <SeverityBadge severity={alert.severity} />
                                </div>
                                {alert.description && <p className="text-xs text-slate-500 truncate">{alert.description}</p>}
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-[10px] text-slate-400">{alert.alert_type?.replace(/_/g, ' ')}</span>
                                  {alert.source_ip && <span className="text-[10px] text-slate-400 font-mono">IP: {alert.source_ip}</span>}
                                  <span className="text-[10px] text-slate-400">{formatTimeAgo(alert.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <StatusBadge status={alert.status || 'open'} />
                              {alert.status === 'open' && (
                                <>
                                  <button
                                    onClick={() => handleAlertAction(alert.id, 'resolved')}
                                    disabled={alertActionLoading === alert.id}
                                    className="p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                                    title="Resolve"
                                  >
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                  </button>
                                  <button
                                    onClick={() => handleAlertAction(alert.id, 'dismissed')}
                                    disabled={alertActionLoading === alert.id}
                                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                                    title="Dismiss"
                                  >
                                    <XCircle className="w-4 h-4 text-slate-400" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Audit Log */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Audit Log</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="Search audit logs..." className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 w-64" />
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                  {loadingAudit ? (
                    <div className="p-6 space-y-3">
                      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : filteredAuditLogs.length === 0 ? (
                    <EmptyState icon={Activity} title="No Audit Logs" description="No audit events match your search." />
                  ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                          <tr className="border-b border-black/5 dark:border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            <th className="py-3 px-6">Action</th>
                            <th className="py-3 px-6">Actor</th>
                            <th className="py-3 px-6">Role</th>
                            <th className="py-3 px-6">Result</th>
                            <th className="py-3 px-6">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                          {filteredAuditLogs.slice(0, 50).map((log: any) => (
                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                              <td className="py-3 px-6">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{log.action}</span>
                                {log.details && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</p>}
                              </td>
                              <td className="py-3 px-6 text-xs font-medium text-slate-500">{log.actor_email || log.staff_id || 'System'}</td>
                              <td className="py-3 px-6 text-xs font-medium text-slate-500 capitalize">{log.actor_role?.replace(/_/g, ' ') || '-'}</td>
                              <td className="py-3 px-6">
                                {log.result === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                                 log.result === 'failure' ? <XCircle className="w-4 h-4 text-red-500" /> :
                                 <CircleDot className="w-4 h-4 text-slate-400" />}
                              </td>
                              <td className="py-3 px-6 text-[11px] text-slate-400">{formatTimeAgo(log.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================== SUPPORT TAB ======================== */}
          {activeTab === 'support' && (
            <motion.div key="support" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Support</h2>
                  <p className="text-slate-500 font-medium text-xs">Manage support conversations and AI assistance.</p>
                </div>
                <button
                  onClick={() => setShowAiChat(!showAiChat)}
                  className={`px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 text-xs shrink-0 ${showAiChat ? 'bg-purple-600 text-white shadow-purple-500/20' : 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-purple-500/20'}`}
                >
                  <Sparkles className="w-4 h-4" /> AI Chatbot
                </button>
              </div>

              {/* Ratings (progress bars) */}
              {supportRatings && (
                <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] p-6 ring-1 ring-black/5 dark:ring-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Customer Ratings</h3>
                      <p className="text-xs text-slate-500">{supportRatings.summary.totalReviews} review{supportRatings.summary.totalReviews === 1 ? '' : 's'} · average {supportRatings.summary.averageRating}/5</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {supportRatings.summary.delighted} delighted</span>
                      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold"><span className="w-2 h-2 rounded-full bg-amber-500" /> {supportRatings.summary.okay} okay</span>
                      <span className="flex items-center gap-1.5 text-red-500 font-bold"><span className="w-2 h-2 rounded-full bg-red-500" /> {supportRatings.summary.unhappy} unhappy</span>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {[...supportRatings.bars].reverse().map((bar: any) => (
                      <div key={bar.star} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 w-6 text-right">{bar.star}★</span>
                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${bar.star >= 4 ? 'bg-emerald-500' : bar.star === 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${bar.percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 w-14 text-right">{bar.count} · {bar.percent}%</span>
                      </div>
                    ))}
                  </div>
                  {supportRatings.recent?.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5 space-y-2">
                      {supportRatings.recent.slice(0, 3).map((r: any) => (
                        <div key={r.id} className="flex items-start gap-2 text-xs">
                          <span className="text-amber-500 font-black shrink-0">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                          <span className="text-slate-600 dark:text-slate-300 truncate">{r.review || r.subject}</span>
                          <span className="text-slate-400 shrink-0 ml-auto">{r.org_name || ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AI Chat Panel */}
              <AnimatePresence>
                {showAiChat && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 shadow-2xl rounded-[2rem] p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Support Assistant</h3>
                          <p className="text-xs text-slate-500">Ask questions about the platform, troubleshooting, or analytics.</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={aiQuery}
                          onChange={e => setAiQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAiQuery()}
                          placeholder="Ask a question..."
                          className="flex-1 bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                        <button
                          onClick={handleAiQuery}
                          disabled={aiLoading || !aiQuery.trim()}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-50 transition-all"
                        >
                          {aiLoading ? <LoadingSpinner size="sm" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                      {aiResponse && (
                        <div className="mt-4 p-4 bg-white dark:bg-[#121214] rounded-2xl border border-black/5 dark:border-white/10">
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{aiResponse}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={convSearch} onChange={e => setConvSearch(e.target.value)} placeholder="Search conversations..." className="w-full bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all" />
                </div>
                <select value={convStatusFilter} onChange={e => setConvStatusFilter(e.target.value)} className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none cursor-pointer">
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_for_support">Waiting for Human</option>
                  <option value="waiting">Waiting</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select value={convPriorityFilter} onChange={e => setConvPriorityFilter(e.target.value)} className="bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none cursor-pointer">
                  <option value="all">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Conversation List + Detail Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* List */}
                <div className={`${selectedConv ? 'lg:col-span-2' : 'lg:col-span-5'}`}>
                  <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                    {loadingConversations ? (
                      <div className="p-6 space-y-3">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                      </div>
                    ) : filteredConversations.length === 0 ? (
                      <EmptyState icon={MessageSquare} title="No Conversations" description="No support tickets match your filters." />
                    ) : (
                      <div className="divide-y divide-black/5 dark:divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {filteredConversations.map((conv: any) => (
                          <button
                            key={conv.id}
                            onClick={() => { setSelectedConv(conv); setConvDetails(null); setShowConvDetails(false); loadConvMessages(conv.id); }}
                            className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${selectedConv?.id === conv.id ? 'bg-orange-500/5 border-l-2 border-orange-500' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-bold text-slate-900 dark:text-white text-sm truncate flex-1">{conv.subject || 'Untitled'}</p>
                              <StatusBadge status={conv.status || 'open'} />
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                              {conv.human_joined && <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold flex items-center gap-1"><Headset className="w-3 h-3" /> Human</span>}
                              {conv.escalated_at && conv.status !== 'resolved' && conv.status !== 'closed' && <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-bold">Escalated</span>}
                              {conv.hidden_for_customer && <span className="bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded font-bold">Ended</span>}
                              {conv.priority && <SeverityBadge severity={conv.priority} />}
                              {conv.category && <span className="bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">{conv.category}</span>}
                              <span>{formatTimeAgo(conv.created_at)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Detail */}
                {selectedConv && (
                  <div className="lg:col-span-3">
                    <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] p-6 ring-1 ring-black/5 dark:ring-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedConv.subject}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={selectedConv.status} />
                            {selectedConv.priority && <SeverityBadge severity={selectedConv.priority} />}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!callTarget && selectedConv.customer_staff_id && !selectedConv.hidden_for_customer && selectedConv.status !== 'closed' && (
                            <button
                              onClick={handleStartCall}
                              className="px-3 py-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
                              title="Call this user (voice)"
                            >
                              <Phone className="w-3.5 h-3.5" /> Call
                            </button>
                          )}
                          <button
                            onClick={handleExportConvCsv}
                            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold transition-all flex items-center gap-1.5"
                            title="Export this chat as CSV"
                          >
                            <Download className="w-3.5 h-3.5" /> CSV
                          </button>
                          <button
                            onClick={handleExportConvScreenshot}
                            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold transition-all flex items-center gap-1.5"
                            title="Save this chat as an image"
                          >
                            <Camera className="w-3.5 h-3.5" /> Screenshot
                          </button>
                          <button
                            onClick={() => loadConvDetails(selectedConv.id)}
                            disabled={convDetailsLoading}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${showConvDetails ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                            title="User details, restaurant, device and login sessions"
                          >
                            <Info className="w-3.5 h-3.5" /> Details
                          </button>
                          {selectedConv.status !== 'resolved' && (
                            <button onClick={() => handleConvStatus(selectedConv.id, 'resolved')} disabled={convActionLoading === selectedConv.id} className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all">
                              Resolve
                            </button>
                          )}
                          {!selectedConv.hidden_for_customer && selectedConv.status !== 'closed' && (
                            <button
                              onClick={() => handleEndConversation(selectedConv.id)}
                              disabled={endingConversation === selectedConv.id}
                              className="px-3 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all flex items-center gap-1.5"
                              title="End the chat — history stays with you, hidden from the customer"
                            >
                              {endingConversation === selectedConv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} End Chat
                            </button>
                          )}
                          <button onClick={() => setSelectedConv(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>

                      {/* User details panel (rep view) */}
                      {showConvDetails && (
                        <div className="mb-4 p-4 bg-slate-50 dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-2xl">
                          {convDetailsLoading && (
                            <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading user details…</p>
                          )}
                          {!convDetailsLoading && convDetails && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Person</p>
                                  <p className="font-bold text-slate-800 dark:text-white">{convDetails.staff?.name || 'Unknown user'}</p>
                                  <p className="text-slate-500">{convDetails.staff?.email || '—'}</p>
                                  <p className="text-slate-500">{convDetails.staff?.role || ''} · {convDetails.staff?.branch || '—'}</p>
                                  <p className="text-slate-400 text-[10px] mt-1">Last login: {convDetails.staff?.last_login_at ? new Date(convDetails.staff.last_login_at).toLocaleString() : 'never'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Restaurant / Device</p>
                                  <p className="font-bold text-slate-800 dark:text-white">{convDetails.organization?.name || '—'}</p>
                                  <p className="text-slate-500">{convDetails.organization?.contact_email || ''}</p>
                                  <p className="text-slate-500 text-[11px]">{convDetails.device ? `${convDetails.device.device_name || convDetails.device.device_type} (${convDetails.device.status})` : 'No device recorded'}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-black text-slate-400 mb-1.5">Login sessions · {convDetails.totalLogins} total</p>
                                {convDetails.loginDates?.length === 0 && <p className="text-[11px] text-slate-400">No login sessions recorded.</p>}
                                {convDetails.loginDates?.slice(0, 5).map((date: string) => (
                                  <div key={date} className="mb-2">
                                    <p className="text-[10px] font-bold text-slate-500 mb-1">{date}</p>
                                    <div className="space-y-1">
                                      {(convDetails.loginsByDate[date] || []).slice(0, 4).map((s: any) => (
                                        <div key={s.id} className="flex items-center gap-2 text-[10px] text-slate-500 bg-white dark:bg-white/5 px-2 py-1 rounded-lg">
                                          <Clock className="w-3 h-3 shrink-0" />
                                          <span className="font-bold">{new Date(s.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          <span className="font-mono">{s.ip || '—'}</span>
                                          <span className="truncate flex-1 text-right text-slate-400">{(s.userAgent || '').slice(0, 40)}</span>
                                        </div>
                                      ))}
                                      {(convDetails.loginsByDate[date] || []).length > 4 && (
                                        <p className="text-[9px] text-slate-400 pl-2">+{(convDetails.loginsByDate[date] || []).length - 4} more</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Messages */}
                      <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar mb-4">
                        {convMessages.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-8">No messages yet.</p>
                        ) : (
                          convMessages.map((msg: any) => (
                            <div key={msg.id} className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender_type === 'agent' ? 'bg-orange-500 text-white rounded-br-md' : msg.sender_type === 'customer' ? 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white rounded-bl-md' : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-bl-md italic'}`}>
                                {msg.sender_type === 'agent' && (
                                  <p className="flex items-center gap-1 text-[9px] font-black uppercase text-white/80 mb-1"><Headset className="w-3 h-3" /> You · Human agent</p>
                                )}
                                {msg.sender_type === 'customer' && (
                                  <p className="text-[9px] font-black uppercase text-slate-400 mb-1">{selectedConv?.customer_name || 'Customer'}</p>
                                )}
                                <p>{msg.content}</p>
                                <p className={`text-[10px] mt-1 ${msg.sender_type === 'agent' ? 'text-white/70' : 'text-slate-400'}`}>{formatTimeAgo(msg.created_at, now)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Reply */}
                      {selectedConv.status !== 'closed' && !selectedConv.hidden_for_customer && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={convMessageInput}
                            onChange={e => setConvMessageInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSendConvMessage(selectedConv.id); }}
                            placeholder="Type a reply — shown to the customer with a Human agent badge…"
                            className="flex-1 bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          />
                          <button onClick={() => handleSendConvMessage(selectedConv.id)} disabled={!convMessageInput.trim()} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold disabled:opacity-50 transition-all">
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================== NOTIFICATIONS TAB ======================== */}
          {activeTab === 'notifications' && (
            <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Notifications</h2>
                  <p className="text-slate-500 font-medium text-xs">Notification center — all platform alerts and messages.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowComposer(true)}
                    disabled={sendingTestNotif}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all flex items-center gap-2 disabled:opacity-60"
                    title="Write a message and push it to selected roles (in-app + email)"
                  >
                    <Send className="w-4 h-4" />
                    Send Broadcast
                  </button>
                  <button
                    onClick={handleEnablePush}
                    disabled={pushStatus === 'unsupported' || pushStatus === 'denied'}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-60 ${pushStatus === 'on' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                    title="Web push: alerts arrive even when the app is closed"
                  >
                    <Bell className="w-4 h-4" />
                    {pushStatus === 'on' ? 'Push On' : pushStatus === 'denied' ? 'Push Blocked' : pushStatus === 'unsupported' ? 'Push N/A' : 'Enable Push'}
                  </button>
                  <button
                    onClick={() => setNotifFilter(notifFilter === 'unread' ? 'all' : 'unread')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${notifFilter === 'unread' ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                  >
                    {notifFilter === 'unread' ? 'Show All' : 'Unread Only'}
                  </button>
                  <button
                    onClick={handleMarkAllRead}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <CheckCheck className="w-4 h-4" /> Mark All Read
                  </button>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                {loadingNotifications ? (
                  <div className="p-6 space-y-3">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <EmptyState icon={Bell} title="No Notifications" description={notifFilter === 'unread' ? "You're all caught up!" : "No notifications yet."} />
                ) : (
                  <div className="divide-y divide-black/5 dark:divide-white/5">
                    {filteredNotifications.map((notif: any) => (
                      <div key={notif.id} className={`p-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-start gap-4 ${!notif.is_read ? 'bg-orange-500/5' : ''}`}>
                        <div className="shrink-0 mt-0.5">
                          {!notif.is_read ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`text-sm ${!notif.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>{notif.title}</p>
                            {notif.priority && <SeverityBadge severity={notif.priority} />}
                          </div>
                          {notif.message && <p className="text-xs text-slate-500 truncate">{notif.message}</p>}
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-slate-400">{notif.type?.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-slate-400">{formatTimeAgo(notif.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================== ANALYTICS TAB ======================== */}
          {activeTab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Platform Analytics</h2>
                  <p className="text-slate-500 font-medium text-xs">Revenue, orders, and growth metrics across all restaurants.</p>
                </div>
                <div className="flex items-center gap-2">
                  {(['7', '30', '90'] as const).map(days => (
                    <button
                      key={days}
                      onClick={() => setAnalyticsTimeframe(days)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${analyticsTimeframe === days ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                    >
                      {days} Days
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setLoadingAnalytics(true);
                      fetch('/api/super-admin/analytics', { headers: authHeaders() })
                        .then(r => r.ok ? r.json() : null)
                        .then(d => { setAnalytics(d?.data || DEFAULT_ANALYTICS); setLoadingAnalytics(false); showToast('Analytics refreshed!'); })
                        .catch(() => { setAnalytics(DEFAULT_ANALYTICS); setLoadingAnalytics(false); showToast('Failed to refresh analytics', 'error'); });
                    }}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-all ml-2"
                    title="Refresh Analytics"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {loadingAnalytics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-[2rem] p-6 text-white shadow-lg shadow-orange-500/20">
                      <DollarSign className="w-8 h-8 mb-2 opacity-80" />
                      <p className="text-3xl font-black">{((analytics?.totalRevenue || 0)).toLocaleString()}</p>
                      <p className="text-xs opacity-80">Total Revenue (UGX)</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <Activity className="w-8 h-8 mb-2 text-blue-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{analytics?.totalOrders || 0}</p>
                      <p className="text-xs text-slate-500">Total Orders</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <Store className="w-8 h-8 mb-2 text-emerald-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{analytics?.activeRestaurants || 0}/{analytics?.totalRestaurants || 0}</p>
                      <p className="text-xs text-slate-500">Active Restaurants</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <Users className="w-8 h-8 mb-2 text-purple-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{analytics?.activeStaff || 0}/{analytics?.totalStaff || 0}</p>
                      <p className="text-xs text-slate-500">Active Staff</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Revenue (Last {analyticsTimeframe} Days)</h3>
                      {analytics?.revenueByDay?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={analytics.revenueByDay.map((d: any) => ({ date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: Number(d.revenue) }))}>
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="revenue" stroke="#f97316" fill="#f9731620" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : <p className="text-center text-slate-500 py-8">No revenue recorded yet</p>}
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Orders (Last {analyticsTimeframe} Days)</h3>
                      {analytics?.ordersByDay?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={analytics.ordersByDay.map((d: any) => ({ date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), orders: Number(d.count) }))}>
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <p className="text-center text-slate-500 py-8">No order activity recorded yet</p>}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Staff Breakdown by Role</h3>
                    {analytics?.staffByRole?.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {analytics.staffByRole.map((r: any) => (
                          <div key={r.role} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                              <Users className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                              <p className="text-lg font-bold text-slate-900 dark:text-white">{Number(r.count)}</p>
                              <p className="text-[10px] text-slate-500 capitalize">{r.role?.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-center text-slate-500 py-4">No staff roles found</p>}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ======================== BILLING TAB ======================== */}
          {activeTab === 'billing' && (
            <motion.div key="billing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Billing & Subscriptions</h2>
                <p className="text-slate-500 font-medium text-xs">Annual billing — every restaurant is billed for 12 months from the onboarding date.</p>
              </div>
              {loadingBilling || !billing ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] p-6 text-white">
                      <DollarSign className="w-8 h-8 mb-2 opacity-80" />
                      <p className="text-3xl font-black">{(billing.summary?.arr || 0).toLocaleString()} UGX</p>
                      <p className="text-xs opacity-80">Annual Recurring Revenue</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <CheckCircle className="w-8 h-8 mb-2 text-emerald-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{billing.summary?.activeCount || 0}</p>
                      <p className="text-xs text-slate-500">Active Subscriptions</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <AlertTriangle className="w-8 h-8 mb-2 text-amber-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{billing.summary?.pastDueCount || 0}</p>
                      <p className="text-xs text-slate-500">Past Due</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <XCircle className="w-8 h-8 mb-2 text-red-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{billing.summary?.expiredCount || 0}</p>
                      <p className="text-xs text-slate-500">Expired</p>
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Subscription Plans <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-orange-500 text-white align-middle">ANNUAL</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {billing.plans?.map((plan: any) => (
                        <div key={plan.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/5">
                          <h4 className="font-bold text-slate-900 dark:text-white">{plan.display_name}</h4>
                          <p className="text-2xl font-black text-orange-500 mt-2">{Number(plan.annual_price_ugx ?? plan.monthly_price_ugx * 12).toLocaleString()} UGX<span className="text-xs text-slate-500 font-normal">/year</span></p>
                          <div className="mt-3 space-y-1 text-xs text-slate-500">
                            <p>{plan.max_branches} branches</p>
                            <p>{plan.max_staff} staff</p>
                            <p>{plan.max_menu_items} menu items</p>
                            <p>{plan.max_orders_per_day} orders/day</p>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-3">
                            {plan.features?.map((f: string) => (
                              <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">{f}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Subscriptions</h3>
                    {billing.subscriptions?.length > 0 ? (
                      <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                            <tr className="border-b border-black/10 dark:border-white/10">
                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Restaurant</th>
                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Plan</th>
                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Cycle</th>
                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Status</th>
                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Expires</th>
                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Days Left</th>
                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {billing.subscriptions.map((sub: any) => (
                              <tr key={sub.id} className="border-b border-black/5 dark:border-white/5">
                                <td className="py-3 px-4 text-sm font-bold text-slate-900 dark:text-white">{sub.org_name}</td>
                                <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{sub.plan_display_name || sub.plan_name}</td>
                                <td className="py-3 px-4"><span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold uppercase">{sub.billing_cycle || 'annual'}</span></td>
                                <td className="py-3 px-4"><StatusBadge status={sub.status} /></td>
                                <td className="py-3 px-4 text-xs text-slate-500">{sub.current_period_end ? formatDate(sub.current_period_end) : '—'}</td>
                                <td className="py-3 px-4 text-xs font-bold">
                                  {sub.status === 'active' && sub.days_remaining !== undefined ? (
                                    <span className={sub.days_remaining <= 7 ? 'text-red-500' : sub.days_remaining <= 30 ? 'text-amber-500' : 'text-emerald-500'}>
                                      {sub.days_remaining}d
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => handleRenewSubscription(sub.organization_id)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-orange-500 hover:text-white text-slate-600 dark:text-slate-300 text-[11px] font-bold transition-all flex items-center gap-1"
                                    title="Renew for another 12 months"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Renew +1y
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 py-8">No subscriptions found</p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ======================== ADMINS TAB ======================== */}
          {activeTab === 'admins' && (
            <motion.div key="admins" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Super Admins</h2>
                  <p className="text-slate-500 font-medium text-xs">{admins.length} admin accounts</p>
                </div>
                <button onClick={() => setShowCreateAdmin(true)} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm">
                  <Plus className="w-4 h-4" /> Add Admin
                </button>
              </div>
              {loadingAdmins ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : (
                <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] overflow-hidden">
                  <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                        <tr className="border-b border-black/10 dark:border-white/10">
                          <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase">Name</th>
                          <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase">Email</th>
                          <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase">Status</th>
                          <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase">Last Login</th>
                          <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admins.map((admin: any) => (
                          <tr key={admin.id} className="border-b border-black/5 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                                  {admin.name?.charAt(0)}
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{admin.name}</p>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">{admin.email}</td>
                            <td className="py-4 px-6"><StatusBadge status={admin.status === undefined ? 'active' : admin.status} /></td>
                            <td className="py-4 px-6 text-xs text-slate-500">{formatDateTime(admin.last_login_at)}</td>
                            <td className="py-4 px-6">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setShowSetAdminPassword(admin); setAdminPasswordValue(''); }}
                                  className="p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                  title="Set Password (direct, no email)"
                                >
                                  <Lock className="w-4 h-4 text-emerald-600" />
                                </button>
                                <button
                                  onClick={async () => {
                                    setAdminActionLoading(admin.id);
                                    try {
                                      const nextStatus = admin.status === 'active' ? 'inactive' : 'active';
                                      const res = await fetch(`/api/super-admin/admins/${admin.id}`, {
                                        method: 'PUT', headers: authHeaders(),
                                        body: JSON.stringify({ status: nextStatus }),
                                      });
                                      if (res.ok) {
                                        setAdmins((prev: any[]) => prev.map((a: any) => a.id === admin.id ? { ...a, status: nextStatus } : a));
                                        showToast(`Admin ${nextStatus === 'active' ? 'activated' : 'deactivated'}`);
                                      } else {
                                        const d = await res.json().catch(() => ({}));
                                        showToast(d.error || 'Failed to update admin', 'error');
                                      }
                                    } catch (e: any) { showToast(e.message || 'Network error', 'error'); }
                                    setAdminActionLoading(null);
                                  }}
                                  disabled={adminActionLoading === admin.id}
                                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
                                >
                                  {admin.status === 'active' ? <Ban className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {admins.length === 0 && <p className="text-center text-slate-500 py-8">No admins found</p>}
                </div>
              )}
            </motion.div>
          )}

          {/* ======================== SYSTEM HEALTH TAB ======================== */}
          {activeTab === 'system-health' && (
            <motion.div key="system-health" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">System Health</h2>
                  <p className="text-slate-500 font-medium text-xs">Database, server, and infrastructure status.</p>
                </div>
                <button onClick={() => { setLoadingSystemHealth(true); fetch('/api/super-admin/system-health', { headers: authHeaders() }).then(r => r.ok ? r.json() : null).then(d => { if (d?.data) setSystemHealth(d.data); setLoadingSystemHealth(false); }).catch(() => setLoadingSystemHealth(false)); }} className="bg-slate-100 dark:bg-white/5 border border-black/10 dark:border-white/10 p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              {loadingSystemHealth || !systemHealth ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`rounded-[2rem] p-6 ${systemHealth.database?.status === 'ok' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' : 'bg-gradient-to-br from-red-500 to-red-600 text-white'}`}>
                      <Database className="w-8 h-8 mb-2 opacity-80" />
                      <p className="text-3xl font-black">{systemHealth.database?.status === 'ok' ? 'OK' : 'Error'}</p>
                      <p className="text-xs opacity-80">Database</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <Activity className="w-8 h-8 mb-2 text-blue-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{systemHealth.database?.latencyMs || 0}ms</p>
                      <p className="text-xs text-slate-500">DB Latency</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <HardDrive className="w-8 h-8 mb-2 text-purple-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{systemHealth.database?.sizeFormatted || 'N/A'}</p>
                      <p className="text-xs text-slate-500">DB Size</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <Network className="w-8 h-8 mb-2 text-orange-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{systemHealth.database?.activeConnections || 0}</p>
                      <p className="text-xs text-slate-500">Active Connections</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <Server className="w-8 h-8 mb-2 text-slate-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{systemHealth.server?.nodeVersion || 'N/A'}</p>
                      <p className="text-xs text-slate-500">Node.js</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <Clock className="w-8 h-8 mb-2 text-emerald-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{systemHealth.server?.uptime ? `${Math.floor(systemHealth.server.uptime / 3600)}h ${Math.floor((systemHealth.server.uptime % 3600) / 60)}m` : 'N/A'}</p>
                      <p className="text-xs text-slate-500">Uptime</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <Cpu className="w-8 h-8 mb-2 text-blue-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{systemHealth.server?.memory ? `${(systemHealth.server.memory.rss / 1024 / 1024).toFixed(0)}MB` : 'N/A'}</p>
                      <p className="text-xs text-slate-500">Memory (RSS)</p>
                    </div>
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <Gauge className="w-8 h-8 mb-2 text-amber-500" />
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{systemHealth.recentErrors?.length || 0}</p>
                      <p className="text-xs text-slate-500">Errors (24h)</p>
                    </div>
                  </div>
                  {systemHealth.tables?.length > 0 && (
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Table Sizes</h3>
                      <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                            <tr className="border-b border-black/10 dark:border-white/10">
                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Table</th>
                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Rows</th>
                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Size</th>
                            </tr>
                          </thead>
                          <tbody>
                            {systemHealth.tables.slice(0, 15).map((t: any) => (
                              <tr key={t.table_name} className="border-b border-black/5 dark:border-white/5">
                                <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{t.table_name}</td>
                                <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{Number(t.row_count).toLocaleString()}</td>
                                <td className="py-3 px-4 text-sm text-slate-500">{t.total_size}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {systemHealth.recentErrors?.length > 0 && (
                    <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Errors (24h)</h3>
                      <div className="space-y-2">
                        {systemHealth.recentErrors.slice(0, 10).map((e: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{e.action}</p>
                              <p className="text-xs text-slate-500">{e.actor} &middot; {formatDateTime(e.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ======================== PLATFORM SETTINGS TAB ======================== */}
          {activeTab === 'platform-settings' && (
            <motion.div key="platform-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Platform Settings</h2>
                  <p className="text-slate-500 font-medium text-xs">Global platform configuration.</p>
                </div>
                <button
                  onClick={async () => {
                    setSettingsSaving(true);
                    try {
                      const res = await fetch('/api/super-admin/platform-settings', {
                        method: 'PUT', headers: authHeaders(),
                        body: JSON.stringify({ settings: platformSettings.map((s: any) => ({ key: s.key, value: s.value })) }),
                      });
                      if (res.ok) {
                        const d = await res.json();
                        if (d.data) setPlatformSettings(d.data);
                        showToast('Platform settings saved successfully');
                      } else {
                        const d = await res.json().catch(() => ({}));
                        showToast(d.error || 'Failed to save settings', 'error');
                      }
                    } catch (e: any) { showToast(e.message || 'Network error', 'error'); }
                    setSettingsSaving(false);
                  }}
                  disabled={settingsSaving}
                  className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {settingsSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Check className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
              {loadingPlatformSettings ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : (
                <div className="bg-white/80 dark:bg-[#121214]/80 border border-white/40 dark:border-white/5 rounded-[2rem] p-8">
                  <div className="space-y-6">
                    {platformSettings.map((setting: any) => (
                      <div key={setting.key} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{setting.key.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-slate-500">Current value: {JSON.stringify(setting.value)}</p>
                        </div>
                        {setting.key === 'maintenance_mode' ? (
                          <button
                            onClick={() => {
                              setPlatformSettings((prev: any[]) => prev.map((s: any) => s.key === 'maintenance_mode' ? { ...s, value: { enabled: !s.value?.enabled } } : s));
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${setting.value?.enabled ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${setting.value?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        ) : setting.key === 'max_login_attempts' || setting.key === 'session_timeout_minutes' ? (
                          <input
                            type="number"
                            value={setting.value?.max || setting.value?.minutes || 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setPlatformSettings((prev: any[]) => prev.map((s: any) => s.key === setting.key ? { ...s, value: { [setting.key === 'max_login_attempts' ? 'max' : 'minutes']: val } } : s));
                            }}
                            className="w-24 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-right"
                          />
                        ) : (
                          <input
                            type="text"
                            value={setting.value?.value || setting.value?.language || ''}
                            onChange={(e) => {
                              const key = setting.value?.language !== undefined ? 'language' : 'value';
                              setPlatformSettings((prev: any[]) => prev.map((s: any) => s.key === setting.key ? { ...s, value: { ...s.value, [key]: e.target.value } } : s));
                            }}
                            className="w-64 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ======================== SETTINGS TAB ======================== */}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h2>
                <p className="text-slate-500 font-medium text-xs">Feature flags, system health, and platform configuration.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Feature Flags */}
                <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] p-8 ring-1 ring-black/5 dark:ring-white/10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                      <Flag className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Feature Flags</h3>
                      <p className="text-xs text-slate-500">Toggle platform features on/off</p>
                    </div>
                  </div>

                  {loadingFlags ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                  ) : featureFlags.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No feature flags configured.</p>
                  ) : (
                    <div className="space-y-2">
                      {featureFlags.map((flag: any) => (
                        <div key={flag.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{flag.key}</p>
                            {flag.description && <p className="text-[11px] text-slate-500">{flag.description}</p>}
                            <span className="text-[10px] text-slate-400">Scope: {flag.scope}</span>
                          </div>
                          <button
                            onClick={() => handleToggleFlag(flag.key)}
                            disabled={flagToggling === flag.key}
                            className={`w-12 h-7 rounded-full transition-all relative ${flag.enabled ? 'bg-orange-500' : 'bg-slate-200 dark:bg-white/10'}`}
                          >
                            {flagToggling === flag.key ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${flag.enabled ? 'left-6' : 'left-1'}`} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* System Health */}
                <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] p-8 ring-1 ring-black/5 dark:ring-white/10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">System Health</h3>
                      <p className="text-xs text-slate-500">Infrastructure and service status</p>
                    </div>
                  </div>

                  {loadingHealth || !health ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className={`flex items-center justify-between p-4 rounded-2xl border ${health.status === 'healthy' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        <div className="flex items-center gap-3">
                          <HeartPulse className={`w-5 h-5 ${health.status === 'healthy' ? 'text-emerald-500' : 'text-red-500'}`} />
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Platform Status</p>
                            <p className="text-xs text-slate-500">Last checked: {formatDateTime(health.timestamp)}</p>
                          </div>
                        </div>
                        <StatusBadge status={health.status === 'healthy' ? 'active' : 'suspended'} />
                      </div>

                      {Object.entries(health.checks || {}).map(([key, check]: [string, any]) => (
                        <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                          <div className="flex items-center gap-3">
                            {key === 'database' ? <Database className="w-4 h-4 text-slate-400" /> :
                             <Server className="w-4 h-4 text-slate-400" />}
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{key}</p>
                              {check.latencyMs !== undefined && <p className="text-[10px] text-slate-400">Latency: {check.latencyMs}ms</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {check.status === 'ok' ? (
                              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> OK</span>
                            ) : (
                              <span className="text-xs font-bold text-red-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Error</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Platform Config Summary */}
              <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] p-8 ring-1 ring-black/5 dark:ring-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Gauge className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Platform Summary</h3>
                    <p className="text-xs text-slate-500">Key platform metrics at a glance</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 text-center">
                    <Store className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalOrgs}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Organizations</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 text-center">
                    <Users className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalStaffCount}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Staff Members</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 text-center">
                    <Smartphone className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalDevices}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Registered Devices</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 text-center">
                    <Flag className="w-5 h-5 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{featureFlags.length}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Active Features</p>
                  </div>
                </div>
              </div>

              {/* Security Audit Logs */}
              <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-2xl rounded-[2rem] p-8 ring-1 ring-black/5 dark:ring-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Security Audit Logs</h3>
                    <p className="text-xs text-slate-500">Filter by restaurant, branch, user, action, and date range</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  <SearchableSelect
                    label="Restaurant"
                    value={secAuditOrgFilter}
                    onChange={v => { setSecAuditOrgFilter(v); setSecAuditBranchFilter('all'); }}
                    options={[{ value: 'all', label: 'All Restaurants' }, ...orgs.map((o: any) => ({ value: o.id, label: o.name }))]}
                    placeholder="All Restaurants"
                  />
                  <SearchableSelect
                    label="Branch"
                    value={secAuditBranchFilter}
                    onChange={setSecAuditBranchFilter}
                    options={[{ value: 'all', label: 'All Branches' }, ...secAuditBranches.map((b: any) => ({ value: b.id, label: b.name }))]}
                    placeholder={secAuditOrgFilter === 'all' ? 'Select restaurant first' : 'All Branches'}
                  />
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">User Search</label>
                    <input
                      type="text"
                      value={secAuditUserFilter}
                      onChange={e => setSecAuditUserFilter(e.target.value)}
                      placeholder="Email or user ID..."
                      className="w-full bg-slate-100 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Action</label>
                    <select
                      value={secAuditActionFilter}
                      onChange={e => setSecAuditActionFilter(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer"
                    >
                      <option value="all">All Actions</option>
                      <option value="LOGIN">Login</option>
                      <option value="LOGOUT">Logout</option>
                      <option value="CREATE">Create</option>
                      <option value="UPDATE">Update</option>
                      <option value="DELETE">Delete</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Date From</label>
                    <input
                      type="date"
                      value={secAuditDateFrom}
                      onChange={e => setSecAuditDateFrom(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Date To</label>
                    <input
                      type="date"
                      value={secAuditDateTo}
                      onChange={e => setSecAuditDateTo(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                </div>

                <button
                  onClick={fetchSecurityAuditLogs}
                  disabled={secAuditLoading}
                  className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2 mb-4"
                >
                  {secAuditLoading ? <><LoadingSpinner size="sm" /> Searching...</> : <><Search className="w-4 h-4" /> Search Logs</>}
                </button>

                {secAuditResults.length > 0 && (
                  <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-white dark:bg-[#121214] shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                        <tr className="border-b border-black/5 dark:border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">Time</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">User</th>
                          <th className="py-3 px-4">User ID</th>
                          <th className="py-3 px-4">Branch</th>
                          <th className="py-3 px-4">IP Address</th>
                          <th className="py-3 px-4">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {secAuditResults.slice(0, 100).map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                            <td className="py-3 px-4">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{log.action?.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500">{log.user_email || '-'}</td>
                            <td className="py-3 px-4 text-[10px] text-slate-400 font-mono">{log.staff_id ? log.staff_id.slice(0, 8) + '...' : '-'}</td>
                            <td className="py-3 px-4 text-xs text-slate-500">{log.branch_name || '-'}</td>
                            <td className="py-3 px-4 text-[10px] text-slate-400 font-mono">{log.ip_address || '-'}</td>
                            <td className="py-3 px-4">
                              {log.result === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                               log.result === 'failure' ? <XCircle className="w-4 h-4 text-red-500" /> :
                               <CircleDot className="w-4 h-4 text-slate-400" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[10px] text-slate-400 mt-2 text-right">Showing {Math.min(secAuditResults.length, 100)} of {secAuditResults.length} logs</p>
                  </div>
                )}
                {secAuditResults.length === 0 && !secAuditLoading && (
                  <p className="text-sm text-slate-400 text-center py-8">Click &quot;Search Logs&quot; to query audit events with filters above.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>

      {/* ==================== BROADCAST COMPOSER MODAL ==================== */}
      <AnimatePresence>
        {showComposer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-lg w-full border border-black/10 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Send Broadcast</h3>
                  <p className="text-xs text-slate-500 mt-1">Push a message to the selected roles — in-app, web push and email.</p>
                </div>
                <button onClick={() => setShowComposer(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Title (optional)</label>
                  <input
                    type="text"
                    value={composerTitle}
                    onChange={e => setComposerTitle(e.target.value)}
                    placeholder="e.g. System maintenance tonight"
                    maxLength={140}
                    className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Message *</label>
                  <textarea
                    value={composerMessage}
                    onChange={e => setComposerMessage(e.target.value)}
                    placeholder="Write the announcement…"
                    rows={4}
                    maxLength={4000}
                    className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 text-right">{composerMessage.length}/4000</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Audience — select roles *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {composerRoleOptions.map(opt => {
                      const selected = composerRoles.includes(opt.role);
                      return (
                        <button
                          key={opt.role}
                          type="button"
                          onClick={() => toggleComposerRole(opt.role)}
                          className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${selected ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                          <span className="truncate">{opt.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${selected ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>{opt.count}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setComposerToAdmins(v => !v)}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${composerToAdmins ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    >
                      <span className="truncate">Platform admins</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${composerToAdmins ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>SA</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Priority</label>
                    <select
                      value={composerPriority}
                      onChange={e => setComposerPriority(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Channels</label>
                    <button
                      type="button"
                      onClick={() => setComposerEmail(v => !v)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl border text-xs font-bold transition-all ${composerEmail ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-400'}`}
                    >
                      <span>In-app + email</span>
                      {composerEmail ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-4 h-4 rounded border border-current" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowComposer(false)} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">Cancel</button>
                  <button
                    type="button"
                    onClick={handleSendBroadcast}
                    disabled={sendingTestNotif || !composerMessage.trim()}
                    className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {sendingTestNotif ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send Broadcast</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== CREATE RESTAURANT MODAL ==================== */}
      <AnimatePresence>
        {showCreateOrg && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-lg w-full border border-black/10 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Create Restaurant</h3>
                <button onClick={() => setShowCreateOrg(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Restaurant Name *</label>
                  <input type="text" required value={createOrgForm.name} onChange={e => setCreateOrgForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. My Restaurant" className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Contact Email</label>
                    <input type="email" value={createOrgForm.contactEmail} onChange={e => setCreateOrgForm(p => ({ ...p, contactEmail: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                    <input type="tel" value={createOrgForm.contactPhone} onChange={e => setCreateOrgForm(p => ({ ...p, contactPhone: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Tax ID</label>
                    <input type="text" value={createOrgForm.taxId} onChange={e => setCreateOrgForm(p => ({ ...p, taxId: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Address</label>
                    <input type="text" value={createOrgForm.address} onChange={e => setCreateOrgForm(p => ({ ...p, address: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Annual Plan (billed for 12 months) *</label>
                  <select
                    value={createOrgForm.planName}
                    onChange={e => setCreateOrgForm(p => ({ ...p, planName: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="starter">Starter Annual — 1,500,000 UGX/year</option>
                    <option value="growth">Growth Annual — 3,500,000 UGX/year</option>
                    <option value="professional">Professional Annual — 15,000,000 UGX/year</option>
                    <option value="enterprise">Enterprise Annual — 8,000,000 UGX/year</option>
                  </select>
                </div>

                <div className="border-t border-black/5 dark:border-white/5 pt-4 mt-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Initial Branch (Optional)</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Branch Name</label>
                      <input type="text" value={createOrgForm.branchName} onChange={e => setCreateOrgForm(p => ({ ...p, branchName: e.target.value }))} placeholder="e.g. Main Branch" className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Branch Location</label>
                      <input type="text" value={createOrgForm.branchLocation} onChange={e => setCreateOrgForm(p => ({ ...p, branchLocation: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-black/5 dark:border-white/5 pt-4 mt-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Restaurant Admin (Required)</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Admin Name *</label>
                        <input type="text" required value={createOrgForm.adminName} onChange={e => setCreateOrgForm(p => ({ ...p, adminName: e.target.value }))} placeholder="e.g. John Admin" className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                      </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Admin Email *</label>
                      <input type="email" required value={createOrgForm.adminEmail} onChange={e => setCreateOrgForm(p => ({ ...p, adminEmail: e.target.value }))} placeholder="admin@restaurant.com" className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                    </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-orange-500/5 border border-orange-500/20 rounded-xl px-3 py-2">
                      No password is set here. A secure password setup link will automatically be emailed to the admin.
                    </p>
                  </div>
                </div>

                <div className="border-t border-black/5 dark:border-white/5 pt-4 mt-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Branch Manager (Optional)</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Manager Name</label>
                        <input type="text" value={createOrgForm.managerName} onChange={e => setCreateOrgForm(p => ({ ...p, managerName: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Manager Email</label>
                        <input type="email" value={createOrgForm.managerEmail} onChange={e => setCreateOrgForm(p => ({ ...p, managerEmail: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Manager Phone</label>
                      <input type="tel" value={createOrgForm.managerPhone} onChange={e => setCreateOrgForm(p => ({ ...p, managerPhone: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowCreateOrg(false)} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">Cancel</button>
                  <button type="submit" disabled={orgActionLoading === 'create'} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                    {orgActionLoading === 'create' ? <><LoadingSpinner size="sm" /> Creating...</> : 'Create Restaurant'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Restaurant Modal */}
        {showEditOrg && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-lg w-full border border-black/10 dark:border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Restaurant</h3>
                <button onClick={() => { setShowEditOrg(false); setEditingOrgId(null); }} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleEditOrg} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Restaurant Name *</label>
                  <input type="text" required value={editOrgForm.name} onChange={e => setEditOrgForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Contact Email</label>
                    <input type="email" value={editOrgForm.contactEmail} onChange={e => setEditOrgForm(p => ({ ...p, contactEmail: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                    <input type="tel" value={editOrgForm.contactPhone} onChange={e => setEditOrgForm(p => ({ ...p, contactPhone: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Tax ID</label>
                    <input type="text" value={editOrgForm.taxId} onChange={e => setEditOrgForm(p => ({ ...p, taxId: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Address</label>
                    <input type="text" value={editOrgForm.address} onChange={e => setEditOrgForm(p => ({ ...p, address: e.target.value }))} className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setShowEditOrg(false); setEditingOrgId(null); }} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">Cancel</button>
                  <button type="submit" disabled={orgActionLoading === editingOrgId} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                    {orgActionLoading === editingOrgId ? <><LoadingSpinner size="sm" /> Saving...</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

      {/* ==================== CREATE ADMIN MODAL ==================== */}
      <AnimatePresence>
        {showCreateAdmin && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-md w-full border border-black/10 dark:border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <UserCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add Super Admin</h3>
                    <p className="text-xs text-slate-500">Create new platform administrator</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateAdmin(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                  <input type="text" required value={createAdminForm.name} onChange={e => setCreateAdminForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Sarah Connor" className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Email Address *</label>
                  <input type="email" required value={createAdminForm.email} onChange={e => setCreateAdminForm(p => ({ ...p, email: e.target.value }))} placeholder="admin@restaurant.com" className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-orange-500/5 border border-orange-500/20 rounded-xl px-3 py-2">
                  No password is set here. After creating, use &quot;Set Password&quot; in the admins table to provision their login.
                </p>
                {createAdminError && <p className="text-xs text-red-500 font-medium">{createAdminError}</p>}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowCreateAdmin(false)} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm">Cancel</button>
                  <button type="submit" disabled={adminActionLoading === 'create'} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2 transition-all">
                    {adminActionLoading === 'create' ? <><LoadingSpinner size="sm" /> Creating...</> : 'Create Admin'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showSetAdminPassword && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-sm w-full border border-black/10 dark:border-white/10 shadow-2xl">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mx-auto mb-4">
                <Lock className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">Set Admin Password</h3>
              <p className="text-sm text-slate-500 mb-4 text-center">Set a new password for <strong className="text-slate-900 dark:text-white">{showSetAdminPassword.name}</strong> ({showSetAdminPassword.email}).</p>
              <input
                type="password"
                value={adminPasswordValue}
                onChange={e => setAdminPasswordValue(e.target.value)}
                placeholder="New password (min 8 characters)"
                minLength={8}
                className="w-full bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setShowSetAdminPassword(null); setAdminPasswordValue(''); }} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm">Cancel</button>
                <button
                  onClick={handleSetAdminPassword}
                  disabled={adminActionLoading === showSetAdminPassword.id}
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {adminActionLoading === showSetAdminPassword.id ? <LoadingSpinner size="sm" /> : <><Lock className="w-4 h-4" /> Set Password</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== STAFF DETAILS MODAL ==================== */}
      <AnimatePresence>
        {selectedStaff && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2rem] max-w-lg w-full border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
              <div className="relative px-6 pt-6 pb-4 border-b border-black/10 dark:border-white/10">
                <button onClick={() => { setSelectedStaff(null); setStaffDetail(null); }} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10" title="Close">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
                <div className="flex items-center gap-4 pr-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
                    {(staffDetail?.name || selectedStaff.name || '?').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">{staffDetail?.name || selectedStaff.name}</h3>
                      <StatusBadge status={(staffDetail || selectedStaff).status || 'active'} />
                    </div>
                    <p className="text-sm text-slate-500 truncate">{staffDetail?.email || selectedStaff.email}</p>
                    <p className="text-xs text-slate-400 font-medium capitalize mt-0.5">{(staffDetail || selectedStaff).role?.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {staffDetailLoading && (
                  <div className="flex items-center justify-center py-6"><LoadingSpinner /></div>
                )}

                {!staffDetailLoading && staffDetail && (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Info className="w-3 h-3" /> Account</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div><p className="text-xs text-slate-400">Phone</p><p className="font-medium text-slate-700 dark:text-slate-300">{staffDetail.phone || '—'}</p></div>
                        <div><p className="text-xs text-slate-400">Last Login</p><p className="font-medium text-slate-700 dark:text-slate-300">{staffDetail.last_login_at ? formatDateTime(staffDetail.last_login_at) : 'Never'}</p></div>
                        <div><p className="text-xs text-slate-400">Created</p><p className="font-medium text-slate-700 dark:text-slate-300">{formatDateTime(staffDetail.created_at)}</p></div>
                        <div><p className="text-xs text-slate-400">Email Verified</p><p className="font-medium text-slate-700 dark:text-slate-300">{staffDetail.email_verified ? 'Yes' : 'No'}</p></div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Building2 className="w-3 h-3" /> Restaurant</p>
                      <div className="bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                        <Store className="w-4 h-4 text-orange-500 shrink-0" />
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{staffDetail.organization_name || 'No restaurant assigned'}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Assigned Branch</p>
                      <div className="bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{staffDetail.branch_name || 'No branch assigned'}</p>
                          {staffDetail.branch_name && (
                            <p className="text-xs text-slate-400">{[staffDetail.branch_location, staffDetail.branch_city].filter(Boolean).join(', ') || 'Location not set'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Features & Permissions</p>
                      {staffDetail.permissions?.includes('*') ? (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All features enabled</p>
                        </div>
                      ) : staffDetail.permissions?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {staffDetail.permissions.map((p: string) => (
                            <span key={p} className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold">
                              {p.replace(/[:._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No permissions granted</p>
                      )}
                    </div>
                  </>
                )}

                {!staffDetailLoading && !staffDetail && (
                  <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">Could not load full details. Showing basic row information.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== CONFIRM MODAL ==================== */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-sm w-full border border-black/10 dark:border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{confirmModal.title}</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm">Cancel</button>
                <button
                  onClick={confirmModal.action}
                  disabled={confirmModal.loading}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-500/20 disabled:opacity-50 text-sm"
                >
                  {confirmModal.loading ? <LoadingSpinner size="sm" /> : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== VOICE CALL PANEL ==================== */}
      <SuperAdminCallPanel target={callTarget} onEnded={() => setCallTarget(null)} />

      {/* ==================== TOAST FEEDBACK ==================== */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 right-6 z-50">
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-500 text-white border-red-400'}`}>
              {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
