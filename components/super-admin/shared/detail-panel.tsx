import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { motionTokens } from './tokens';

/**
 * Right-side detail panel (blueprint pattern for Organizations/Restaurants/
 * Users/Billing/Orders/Support). Static sticky column on lg+, full-screen
 * overlay with backdrop on smaller viewports. Own scroll, header with title,
 * badges slot, close button, optional Edit/Action slot, optional tab row.
 */
export function DetailPanel({
  open,
  onClose,
  title,
  subtitle,
  badges,
  actions,
  tabs,
  children,
  width = 'lg:w-[420px] xl:w-[460px]',
  testId = 'detail-panel',
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
  testId?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="dp-backdrop"
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.backdropMs / 1000 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            key="dp-panel"
            data-testid={testId}
            role="complementary"
            aria-label={typeof title === 'string' ? title : 'Details'}
            className={`fixed inset-y-0 right-0 z-50 w-full max-w-full ${width} lg:static lg:z-auto lg:inset-auto lg:shrink-0 bg-white dark:bg-[#121214] border border-black/5 dark:border-white/5 lg:rounded-2xl shadow-2xl lg:shadow-sm flex flex-col overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]`}
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ duration: motionTokens.drawerMs / 1000, ease: motionTokens.easeOut }}
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-black/5 dark:border-white/5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-slate-900 dark:text-white truncate">{title}</h3>
                  {badges}
                </div>
                {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {actions}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close details"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {tabs && <div className="px-3 pt-1">{tabs}</div>}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
