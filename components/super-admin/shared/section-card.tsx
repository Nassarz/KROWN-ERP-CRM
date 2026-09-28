import React from 'react';
import { saPanelCls } from './tokens';

/** Card with header (title/subtitle/action) + body. */
export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = '',
  testId,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  testId?: string;
}) {
  return (
    <section className={`${saPanelCls} overflow-hidden ${className}`} data-testid={testId}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName || 'px-5 pb-5'}>{children}</div>
    </section>
  );
}
