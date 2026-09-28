import React from 'react';

/** Page title block per blueprint: bold title, muted subtitle, right-aligned actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5" data-testid="page-header">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white truncate">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}
