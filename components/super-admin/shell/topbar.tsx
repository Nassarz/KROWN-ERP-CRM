'use client';

import React from 'react';
import {
  Search, X, Loader2, Sun, Moon, Bell, ChevronDown, ChevronLeft,
  Store, Users, Smartphone, Shield, RefreshCw, HeartPulse, LogOut,
} from 'lucide-react';
import { vibrate } from '@/lib/utils';
import { StatusBadge, SeverityBadge } from '@/components/super-admin/shared';

export function SuperAdminTopbar({
  searchRef,
  query,
  onQueryChange,
  isSearching,
  results,
  showResults,
  onFocusResults,
  onClearResults,
  onPickResult,
  unreadNotifications,
  onOpenNotifications,
  isDark,
  onToggleTheme,
  user,
  profileMenuOpen,
  setProfileMenuOpen,
  onRefreshData,
  onSystemStatus,
  onBackToAdmin,
  onSignOut,
}: {
  searchRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  onQueryChange: (v: string) => void;
  isSearching: boolean;
  results: any;
  showResults: boolean;
  onFocusResults: () => void;
  onClearResults: () => void;
  onPickResult: (type: 'restaurant' | 'user' | 'device' | 'alert', item: any) => void;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  user: any;
  profileMenuOpen: boolean;
  setProfileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onRefreshData: () => void;
  onSystemStatus: () => void;
  onBackToAdmin: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="shrink-0 flex flex-col md:flex-row items-center justify-between gap-4 py-1 mb-6 relative" data-testid="sa-topbar">
      {/* Global Search Bar */}
      <div className="relative flex-1 max-w-xl w-full">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onFocus={onFocusResults}
            placeholder="Search restaurants, staff, devices, orders, alerts..."
            aria-label="Global search"
            className="w-full bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 shadow-sm rounded-xl pl-10 pr-14 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500 absolute right-3 top-1/2 -translate-y-1/2" />
          ) : query ? (
            <button
              onClick={onClearResults}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:block text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-md px-1.5 py-0.5 pointer-events-none">⌘K</kbd>
          )}
        </div>

        {/* Live Search Dropdown */}
        {showResults && results && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl z-50 p-4 max-h-96 overflow-y-auto custom-scrollbar space-y-4" data-testid="sa-search-results">
            {results.restaurants?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Store className="w-3 h-3 text-orange-500" /> Restaurants</p>
                <div className="space-y-1">
                  {results.restaurants.map((r: any) => (
                    <div key={r.id} onClick={() => onPickResult('restaurant', r)} className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{r.name}</span>
                      <span className="text-[10px] text-slate-400">{r.contact_email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.users?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users className="w-3 h-3 text-blue-500" /> Users</p>
                <div className="space-y-1">
                  {results.users.map((u: any) => (
                    <div key={u.id} onClick={() => onPickResult('user', u)} className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{u.name}</span>
                        <span className="text-[10px] text-slate-400 ml-2">({u.role})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{u.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.devices?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Smartphone className="w-3 h-3 text-purple-500" /> Devices</p>
                <div className="space-y-1">
                  {results.devices.map((d: any) => (
                    <div key={d.id} onClick={() => onPickResult('device', d)} className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{d.device_name}</span>
                      <StatusBadge status={d.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.alerts?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Shield className="w-3 h-3 text-red-500" /> Security Alerts</p>
                <div className="space-y-1">
                  {results.alerts.map((a: any) => (
                    <div key={a.id} onClick={() => onPickResult('alert', a)} className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{a.title}</span>
                      <SeverityBadge severity={a.severity} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!results.restaurants?.length && !results.users?.length && !results.devices?.length && !results.alerts?.length) && (
              <p className="text-xs text-slate-500 text-center py-4">No results found for &quot;{query}&quot;</p>
            )}
          </div>
        )}
      </div>

      {/* Right actions: theme, notifications bell, account menu */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleTheme}
          className="bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 shadow-sm p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          title="Toggle theme"
          aria-label="Toggle theme"
          data-testid="sa-theme-toggle"
        >
          {isDark ? <Sun className="w-4 h-4 text-slate-500" /> : <Moon className="w-4 h-4 text-slate-500" />}
        </button>

        <button
          onClick={() => { vibrate(20); onOpenNotifications(); }}
          className="relative bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 shadow-sm p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          title="Notifications"
          aria-label={`Notifications${unreadNotifications > 0 ? `, ${unreadNotifications} unread` : ''}`}
          data-testid="sa-bell"
        >
          <Bell className="w-4 h-4 text-slate-500" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow-lg">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </button>

        <div className="relative">
          {profileMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />}
          <button
            onClick={() => setProfileMenuOpen(o => !o)}
            data-testid="sa-avatar"
            className="relative z-50 flex items-center gap-2 bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 shadow-sm pl-1 pr-2.5 py-1 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          >
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white text-xs font-black flex items-center justify-center">
              {(user?.name || 'Platform Admin').charAt(0).toUpperCase()}
            </span>
            <span className="hidden md:flex flex-col items-start leading-tight">
              <span className="text-xs font-bold text-slate-900 dark:text-white">{user?.name || 'Platform Admin'}</span>
              <span className="text-[10px] text-slate-500 font-medium">Super Admin</span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {profileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl z-50 p-2" data-testid="sa-profile-menu">
              <div className="px-3 py-2 border-b border-black/5 dark:border-white/5 mb-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Platform Admin'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'intcodeug@gmail.com'}</p>
                <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full">Super Admin</span>
              </div>
              <button
                onClick={() => { setProfileMenuOpen(false); onRefreshData(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh data
              </button>
              <button
                onClick={() => { setProfileMenuOpen(false); onSystemStatus(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                data-testid="sa-menu-system-health"
              >
                <HeartPulse className="w-3.5 h-3.5" /> System status
              </button>
              <button
                onClick={() => { setProfileMenuOpen(false); vibrate(30); onBackToAdmin(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back to Admin
              </button>
              <button
                onClick={() => { setProfileMenuOpen(false); onSignOut(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
