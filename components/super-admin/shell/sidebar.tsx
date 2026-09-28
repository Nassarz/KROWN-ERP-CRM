'use client';

import React from 'react';
import {
  ChevronLeft, ChevronRight, Sun, Moon, Crown, ArrowUpRight, LogOut,
  Database, Server, HardDrive, Wallet, Printer, Receipt, Activity,
} from 'lucide-react';
import { vibrate } from '@/lib/utils';

const statusServiceIcons: Record<string, any> = {
  database: Database, api: Server, storage: HardDrive,
  payments: Wallet, printing: Printer, efris: Receipt,
};

export type SidebarTab = { id: string; label: string; icon: any };

export function SuperAdminSidebar({
  tabs,
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapsed,
  badges,
  statusOverall,
  statusServices,
  isDark,
  onToggleTheme,
  onBackToAdmin,
  onSignOut,
}: {
  tabs: SidebarTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  badges: { security?: number; support?: number; notifications?: number };
  statusOverall: string;
  statusServices: any[];
  isDark: boolean;
  onToggleTheme: () => void;
  onBackToAdmin: () => void;
  onSignOut: () => void;
}) {
  return (
    <aside
      data-testid="sa-sidebar"
      className={`w-full ${collapsed ? 'lg:w-[84px]' : 'lg:w-[268px]'} shrink-0 mb-6 lg:mb-0 lg:mr-3 flex flex-col lg:h-full`}
    >
      <div className="bg-[#0B0B0D] rounded-[28px] p-4 flex flex-col lg:h-full overflow-hidden text-white">
        {/* Brand */}
        <div className="flex items-center justify-between gap-2 mb-5 lg:mb-6 px-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/40 shrink-0">
              <span className="text-white font-black text-lg leading-none">K</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-extrabold tracking-tight text-white text-base leading-tight">KROWN</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-orange-400 font-bold">Super Admin</p>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapsed}
            className="hidden lg:flex p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-row lg:flex-col gap-1 lg:flex-1 overflow-x-auto lg:overflow-y-auto custom-scrollbar pb-1 lg:pb-0 -mx-1 px-1">
          {tabs.map(tab => {
            const badge =
              tab.id === 'security' ? badges.security
              : tab.id === 'support' ? badges.support
              : tab.id === 'notifications' ? badges.notifications
              : undefined;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { vibrate(20); onTabChange(tab.id); }}
                title={tab.label}
                data-testid={`sa-nav-${tab.id}`}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition-all shrink-0 text-[13px] relative ${
                  active
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                } ${collapsed ? 'lg:justify-center lg:px-0 lg:w-full' : ''}`}
              >
                <tab.icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{tab.label}</span>}
                {badge !== undefined && badge > 0 && (
                  <span className={`${active ? 'bg-white/25 text-white' : 'bg-red-500 text-white'} text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center ml-auto`}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Status card (real probes) */}
        {!collapsed && (
          <div className="mt-3 bg-white/[0.06] border border-white/10 rounded-2xl p-4 hidden lg:block" data-testid="sa-system-status">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-white">System Status</p>
              <span className={`w-2 h-2 rounded-full ${statusOverall === 'ok' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : statusOverall === 'warn' ? 'bg-amber-400' : statusOverall === 'error' ? 'bg-red-400' : 'bg-white/30 animate-pulse'}`} />
            </div>
            <p className="text-[10px] text-white/50 mb-3">
              {statusOverall === 'ok' ? 'All systems operational' : statusOverall === 'unknown' ? 'Loading probes…' : statusOverall === 'error' ? 'Service issue detected' : 'Degraded performance'}
            </p>
            <div className="space-y-0.5">
              {(statusServices.length > 0
                ? statusServices
                : ['Database', 'API Services', 'Payment Gateway', 'Printing OS', 'EFRIS (UAT)'].map((n, i) => ({ key: `loading-${i}`, name: n, status: 'loading' }))
              ).map((svc: any) => {
                const SvcIcon = statusServiceIcons[svc.key] || Activity;
                return (
                  <button
                    key={svc.key}
                    onClick={() => { vibrate(20); onTabChange('system-health'); }}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all group"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${svc.status === 'loading' ? 'bg-white/20 animate-pulse' : svc.status === 'ok' ? 'bg-emerald-400' : svc.status === 'warn' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <SvcIcon className="w-3.5 h-3.5 text-white/40 group-hover:text-orange-400 transition-colors shrink-0" />
                    <span className="text-[11px] text-white/60 group-hover:text-white font-medium flex-1 text-left truncate">{svc.name}</span>
                    <ChevronRight className="w-3 h-3 text-white/25 group-hover:text-orange-400 shrink-0" />
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { vibrate(20); onTabChange('system-health'); }}
              className="mt-2 text-[11px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1"
            >
              View Details <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Brand footer card */}
        {!collapsed && (
          <div className="mt-3 hidden lg:block rounded-2xl p-4 bg-gradient-to-br from-white/10 to-white/[0.03] border border-white/10" data-testid="sa-erp-footer">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">KROWN ERP</p>
                <p className="text-[10px] text-white/40">v2.4.0 · Super Admin</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-3 pt-3 border-t border-white/10 flex lg:flex-col gap-1 items-center lg:items-stretch">
          <button
            onClick={onToggleTheme}
            title="Toggle theme"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all text-xs font-semibold ${collapsed ? 'lg:justify-center lg:w-full' : ''}`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!collapsed && <span className="hidden lg:inline">Toggle Theme</span>}
          </button>
          <button
            onClick={() => { vibrate(30); onBackToAdmin(); }}
            title="Back to Admin"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all text-xs font-semibold ${collapsed ? 'lg:justify-center lg:w-full' : ''}`}
          >
            <ChevronLeft className="w-4 h-4" />
            {!collapsed && <span className="hidden lg:inline">Back to Admin</span>}
          </button>
          <button
            onClick={onSignOut}
            title="Sign out"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-xs font-semibold ${collapsed ? 'lg:justify-center lg:w-full' : ''}`}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="hidden lg:inline">Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
