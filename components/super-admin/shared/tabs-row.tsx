import React from 'react';
import { tabItemCls } from './tokens';

export type TabItem = { id: string; label: string; icon?: any; count?: number };

/** Icon+label tab row — active state = light orange pill (all blueprints). */
export function TabsRow({
  items,
  active,
  onChange,
  ariaLabel,
  testId = 'tabs',
  size = 'md',
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  testId?: string;
  size?: 'sm' | 'md';
}) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs';
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label={ariaLabel} data-testid={testId}>
      {items.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={`${testId}-${t.id}`}
            onClick={() => onChange(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl border font-bold whitespace-nowrap transition-colors duration-150 ${pad} ${tabItemCls(
              { active: isActive },
            )}`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {t.label}
            {typeof t.count === 'number' && (
              <span
                className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
                  isActive ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Text-only pill tabs (Billing, Users detail, Order detail…). */
export function TextTabs({
  items,
  active,
  onChange,
  ariaLabel,
  testId = 'text-tabs',
}: {
  items: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  testId?: string;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-black/5 dark:border-white/5" role="tablist" aria-label={ariaLabel} data-testid={testId}>
      {items.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={`${testId}-${t.id}`}
            onClick={() => onChange(t.id)}
            className={`px-3.5 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
