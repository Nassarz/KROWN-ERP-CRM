import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { btnSecondaryCls, segmentedCls, segmentedItemCls } from './tokens';

/**
 * Filter bar per blueprint: white rounded bar with search, controls slot,
 * Reset action and optional right-side segmented toggle (view mode / range).
 */
export function FilterBar({
  search,
  onSearchChange,
  placeholder = 'Search…',
  controls,
  onReset,
  right,
  testId = 'filter-bar',
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  placeholder?: string;
  controls?: React.ReactNode;
  onReset?: () => void;
  right?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div
      className="bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 shadow-sm rounded-2xl p-3 flex flex-wrap items-center gap-2"
      data-testid={testId}
    >
      {onSearchChange && (
        <div className="relative flex-1 min-w-[180px] sm:min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
        </div>
      )}
      {controls}
      {onReset && (
        <button type="button" onClick={onReset} className={btnSecondaryCls}>
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      )}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

/** Segmented control (date range / view mode) — active state per blueprint. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: T; label?: React.ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className={segmentedCls} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          title={o.title}
          onClick={() => onChange(o.id)}
          className={segmentedItemCls({ active: value === o.id })}
        >
          {o.label ?? o.id}
        </button>
      ))}
    </div>
  );
}

/** Grid / list / map view toggle used by Restaurants (blueprint 06_51). */
export function ViewToggle({
  view,
  onChange,
  views,
}: {
  view: string;
  onChange: (v: any) => void;
  views: { id: any; icon: any; label: string }[];
}) {
  return (
    <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-white/5 rounded-xl p-1" role="group" aria-label="View mode">
      {views.map((v) => {
        const Icon = v.icon;
        const active = view === v.id;
        return (
          <button
            key={v.id}
            type="button"
            title={v.label}
            aria-label={v.label}
            aria-pressed={active}
            onClick={() => onChange(v.id)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              active
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
