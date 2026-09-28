import React from 'react';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';
import { saCardCls } from './tokens';

// Vertical-bar micro sparkline used inside MetricCards (blueprint pattern).
export function Sparkline({
  values,
  tone = 'orange',
  className = '',
}: {
  values: number[];
  tone?: 'orange' | 'emerald' | 'blue' | 'purple';
  className?: string;
}) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const bar: Record<string, string> = {
    orange: 'bg-orange-400 dark:bg-orange-500',
    emerald: 'bg-emerald-400 dark:bg-emerald-500',
    blue: 'bg-blue-400 dark:bg-blue-500',
    purple: 'bg-purple-400 dark:bg-purple-500',
  };
  return (
    <div className={`flex items-end gap-[3px] h-9 ${className}`} aria-hidden>
      {values.map((v, i) => (
        <div
          key={i}
          className={`w-[5px] rounded-t-sm ${bar[tone]}`}
          style={{ height: `${Math.max(12, Math.round((v / max) * 100))}%`, opacity: 0.4 + (i / values.length) * 0.6 }}
        />
      ))}
    </div>
  );
}

type Tone = 'orange' | 'emerald' | 'red' | 'blue' | 'purple' | 'amber' | 'slate' | 'cyan';

const iconTile: Record<Tone, string> = {
  orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
  emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  red: 'bg-gradient-to-br from-red-500 to-rose-600',
  blue: 'bg-gradient-to-br from-blue-500 to-indigo-600',
  purple: 'bg-gradient-to-br from-purple-500 to-violet-600',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-500',
  slate: 'bg-gradient-to-br from-slate-500 to-slate-600',
  cyan: 'bg-gradient-to-br from-cyan-500 to-blue-600',
};

const deltaCls = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-red-500 dark:text-red-400',
  flat: 'text-slate-500 dark:text-slate-400',
} as const;

/**
 * KPI metric card per blueprint: tinted icon tile, label, big value,
 * signed delta, optional sparkline, optional chevron.
 */
export function MetricCard({
  icon: Icon,
  tone = 'orange',
  label,
  value,
  delta,
  hint,
  spark,
  sparkTone = 'orange',
  chevron = false,
  onClick,
  testId,
}: {
  icon: LucideIcon;
  tone?: Tone;
  label: string;
  value: React.ReactNode;
  delta?: { dir: 'up' | 'down' | 'flat'; text: string };
  hint?: string;
  spark?: number[];
  sparkTone?: 'orange' | 'emerald' | 'blue' | 'purple';
  chevron?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      data-testid={testId}
      className={`relative text-left ${saCardCls} px-5 py-4 transition-transform duration-150 ${
        onClick ? 'hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40 cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm ${iconTile[tone]}`}
          >
            <Icon className="w-5 h-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
              {label}
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-tight mt-0.5 truncate">
              {value}
            </p>
          </div>
        </div>
        {chevron && (
          <span className="text-slate-300 dark:text-slate-600 shrink-0" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2 mt-3">
        <div className="min-w-0">
          {delta && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${deltaCls[delta.dir]}`}>
              {delta.dir === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
              {delta.dir === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
              {delta.text}
            </span>
          )}
          {hint && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
              {delta ? ' · ' : ''}
              {hint}
            </p>
          )}
        </div>
        {spark && <Sparkline values={spark} tone={sparkTone} />}
      </div>
    </Comp>
  );
}

/** Compact summary tile used inside list tabs (Payments/Orders/Products/Inventory). */
export function SaSummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'slate',
}: {
  icon: any;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'slate' | 'orange' | 'emerald' | 'red' | 'blue' | 'purple' | 'amber';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-500/10 text-slate-500',
    orange: 'bg-orange-500/10 text-orange-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    red: 'bg-red-500/10 text-red-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };
  return (
    <div className={saCardCls} data-testid={`sum-${String(label).toLowerCase().replace(/[^a-z]+/g, '-')}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </span>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
      </div>
      <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums truncate">{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{hint}</p>}
    </div>
  );
}
