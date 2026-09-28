// Shared design tokens for the Super Admin premium redesign.
// Class strings are the single source of truth — screens import from here,
// never redefine their own near-duplicates.

export const saCardCls =
  'bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 shadow-sm rounded-2xl p-4';

export const saPanelCls =
  'bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 shadow-sm rounded-2xl';

export const saInputCls =
  'bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 w-full sm:w-auto';

export const saSelectCls =
  'bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 font-semibold';

export const saTableWrapCls =
  'bg-white dark:bg-[#121214]/80 border border-black/5 dark:border-white/5 shadow-sm rounded-[1.75rem] overflow-hidden';

export const thCls =
  'px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-left';

export const tdCls =
  'px-4 py-3.5 text-xs text-slate-700 dark:text-slate-200 align-middle';

export const btnPrimaryCls =
  'bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm shadow-orange-500/20 active:scale-[.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap';

export const btnSecondaryCls =
  'bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap';

export const btnGhostCls =
  'rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors inline-flex items-center gap-1.5';

export const segmentedCls =
  'inline-flex items-center gap-0.5 bg-slate-100 dark:bg-white/5 rounded-xl p-1';

export const segmentedItemCls = ({ active }: { active: boolean }) =>
  active
    ? 'bg-blue-600 text-white shadow-sm rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors'
    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors';

export const tabItemCls = ({ active }: { active: boolean }) =>
  active
    ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20'
    : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5';

export const chipCls = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  slate: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
} as const;

// Motion tokens (master prompt §30).
export const motionTokens = {
  easeOut: [0.22, 1, 0.36, 1] as const,
  pageMs: 280,
  drawerMs: 240,
  backdropMs: 140,
  dialogMs: 200,
  navMs: 200,
  staggerMs: 40,
};
