import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { motionTokens, btnPrimaryCls, btnSecondaryCls } from './tokens';

/**
 * Typed confirmation dialog (§29/§52) — replaces native alert()/confirm().
 * Use for every destructive action (suspend, remove admin, delete device…).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.backdropMs / 1000 }}
            onClick={loading ? undefined : onCancel}
          />
          <motion.div
            className="relative w-full max-w-md bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl p-5"
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: motionTokens.dialogMs / 1000, ease: motionTokens.easeOut }}
          >
            <div className="flex items-start gap-3">
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  tone === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">{title}</h3>
                {description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button type="button" onClick={onCancel} disabled={loading} className={btnSecondaryCls}>
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`${btnPrimaryCls} ${
                  tone === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : ''
                }`}
              >
                {loading ? 'Working…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
