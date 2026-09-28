import React from 'react';

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    online: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    suspended: 'bg-red-500/10 text-red-600 dark:text-red-400',
    banned: 'bg-red-500/10 text-red-600 dark:text-red-400',
    paused: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    inactive: 'bg-slate-500/10 text-slate-500',
    offline: 'bg-slate-500/10 text-slate-500',
    pending: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    on_shift: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    off_shift: 'bg-slate-500/10 text-slate-500',
    on_leave: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    open: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    closed: 'bg-slate-500/10 text-slate-500',
    dismissed: 'bg-slate-500/10 text-slate-500',
    in_progress: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    waiting: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    waiting_for_support: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    critical: 'bg-red-500/10 text-red-600 dark:text-red-400',
    high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    info: 'bg-slate-500/10 text-slate-500',
    paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    unpaid: 'bg-red-500/10 text-red-600 dark:text-red-400',
    partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    partially_paid: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    delivered: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    preparing: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    ready: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    served: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
    voided: 'bg-red-500/10 text-red-600 dark:text-red-400',
    refunded: 'bg-red-500/10 text-red-600 dark:text-red-400',
    available: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    unavailable: 'bg-slate-500/10 text-slate-500',
    out: 'bg-red-500/10 text-red-600 dark:text-red-400',
    ok: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    trial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    expiring: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    expired: 'bg-red-500/10 text-red-600 dark:text-red-400',
    connected: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    not_configured: 'bg-slate-500/10 text-slate-500',
    processing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
    refunded_partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${colors[status] || colors.info}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-black',
    low: 'bg-blue-500 text-white',
    info: 'bg-slate-500 text-white',
  };
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${colors[severity] || colors.info}`}
    >
      {severity}
    </span>
  );
}
