'use client';

// Staff notification center — floating bell with unread badge, a panel listing
// notifications (expandable "Read more", mark read), an "Ask for support"
// shortcut, and Apple-style animated popups whenever a new notification lands.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, CheckCheck, Headset, ChevronDown, Sparkles } from 'lucide-react';

interface Notif {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  priority?: string;
  link_url?: string;
  created_at?: string;
  is_read?: boolean;
  read?: boolean;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('krown_session_token') || '' : '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function timeLabel(iso?: string): string {
  if (!iso) return '';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return ''; }
}

const PRIORITY_RING: Record<string, string> = {
  urgent: 'ring-2 ring-red-500/50',
  high: 'ring-2 ring-amber-400/40',
};

export default function StaffNotificationCenter() {
  const [items, setItems] = useState<Notif[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toastExpandedId, setToastExpandedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Notif[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=50', { headers: authHeaders() });
      if (!res.ok) return;
      const d = await res.json();
      const rows: Notif[] = (d.data || []).map((n: any) => ({ ...n, is_read: n.is_read ?? n.read ?? false }));
      if (!initializedRef.current) {
        initializedRef.current = true;
        rows.forEach(n => seenRef.current.add(n.id));
      } else {
        const fresh = rows.filter(n => !seenRef.current.has(n.id));
        if (fresh.length) {
          fresh.forEach(n => seenRef.current.add(n.id));
          setToasts(prev => [...fresh, ...prev].slice(0, 3));
        }
      }
      setItems(rows);
    } catch { /* offline */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  // Auto-dismiss popups after 8s (expanded ones linger until closed).
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts
      .filter(t => t.id !== toastExpandedId)
      .map(t => setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 8000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, toastExpandedId]);

  const markRead = async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    setToasts(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    try { await fetch(`/api/notifications/${id}`, { method: 'PATCH', headers: authHeaders() }); } catch { /* noop */ }
  };

  const markAll = async () => {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    setToasts(prev => prev.map(n => ({ ...n, is_read: true })));
    try { await fetch('/api/notifications/read', { method: 'POST', headers: authHeaders(), body: '{}' }); } catch { /* noop */ }
  };

  const askSupport = () => {
    setPanelOpen(false);
    window.dispatchEvent(new CustomEvent('krown:open-support'));
  };

  const unread = items.filter(n => !n.is_read).length;
  const visible = unreadOnly ? items.filter(n => !n.is_read) : items;

  return (
    <>
      {/* ── Floating bell ── */}
      <button
        type="button"
        onClick={() => setPanelOpen(v => !v)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        data-testid="staff-notif-bell"
        className="fixed z-[72] top-3 right-3 w-11 h-11 rounded-full bg-white/90 dark:bg-black/80 border border-black/10 dark:border-white/10 shadow-xl backdrop-blur-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <Bell className="w-5 h-5 text-slate-700 dark:text-slate-200" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            data-testid="staff-notif-panel"
            className="fixed z-[73] top-16 right-3 w-[min(380px,94vw)] max-h-[min(560px,76vh)] flex flex-col bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-[1.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.45)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-slate-900 dark:text-white">Notifications</p>
                {unread > 0 && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-orange-500 text-white">{unread}</span>}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setUnreadOnly(v => !v)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${unreadOnly ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}
                >
                  Unread
                </button>
                <button onClick={markAll} title="Mark all read" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">
                  <CheckCheck className="w-4 h-4 text-slate-500" />
                </button>
                <button onClick={() => setPanelOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {visible.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-10">You&apos;re all caught up.</p>
              )}
              {visible.map(n => {
                const expanded = expandedId === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => { if (!n.is_read) markRead(n.id); setExpandedId(expanded ? null : n.id); }}
                    className={`w-full text-left px-4 py-3 border-b border-black/5 dark:border-white/5 flex gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${!n.is_read ? 'bg-orange-500/5' : ''}`}
                  >
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? 'bg-orange-500' : 'bg-slate-300 dark:bg-white/20'}`} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`text-xs truncate ${!n.is_read ? 'font-black text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>{n.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{timeLabel(n.created_at)}</span>
                      </span>
                      {n.message && (
                        <span className={`block text-[11px] text-slate-500 mt-0.5 ${expanded ? 'whitespace-pre-wrap' : 'truncate'}`}>
                          {expanded ? n.message : n.message}
                        </span>
                      )}
                      <span className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold uppercase text-slate-400">{(n.type || '').replace(/_/g, ' ')}</span>
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${expanded ? 'text-orange-500' : 'text-slate-400'}`}>
                          {expanded ? 'Read less' : 'Read more'} <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={askSupport}
              data-testid="staff-ask-support"
              className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black hover:opacity-95 transition-opacity"
            >
              <Headset className="w-4 h-4" /> Ask for support
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Apple-style popups for new notifications ── */}
      <div className="fixed z-[80] top-3 right-16 sm:right-16 flex flex-col items-end gap-2 pointer-events-none w-[min(340px,calc(100vw-5.5rem))]">
        <AnimatePresence>
          {toasts.map(n => {
            const expanded = toastExpandedId === n.id;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: -28, scale: 0.85, borderRadius: 999 }}
                animate={{ opacity: 1, y: 0, scale: 1, borderRadius: expanded ? 26 : 22 }}
                exit={{ opacity: 0, scale: 0.9, y: -16 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                data-testid="notif-popup"
                className={`pointer-events-auto w-full bg-white/95 dark:bg-[#121214]/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.35)] overflow-hidden ${PRIORITY_RING[n.priority || ''] || ''}`}
              >
                <div className="flex items-start gap-3 px-4 pt-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{n.title}</p>
                    <p className={`text-[11px] text-slate-500 mt-0.5 ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                      {n.message || 'Open the app to view this notification.'}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-slate-400">{timeLabel(n.created_at)}</span>
                      <span className="flex items-center gap-1">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={e => { e.stopPropagation(); setToastExpandedId(expanded ? null : n.id); }}
                          onKeyDown={e => { if (e.key === 'Enter') setToastExpandedId(expanded ? null : n.id); }}
                          className="text-[10px] font-black text-orange-500 hover:underline cursor-pointer"
                        >
                          {expanded ? 'Show less' : 'Read more'}
                        </span>
                        {!n.is_read && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={async e => { e.stopPropagation(); await markRead(n.id); setToasts(prev => prev.filter(t => t.id !== n.id)); }}
                            onKeyDown={async e => { if (e.key === 'Enter') { await markRead(n.id); setToasts(prev => prev.filter(t => t.id !== n.id)); } }}
                            className="text-[10px] font-black text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer inline-flex items-center gap-0.5"
                          >
                            <Check className="w-3 h-3" /> Read
                          </span>
                        )}
                      </span>
                    </div>
                    {expanded && n.link_url && (
                      <a
                        href={n.link_url}
                        onClick={() => setToasts(prev => prev.filter(t => t.id !== n.id))}
                        className="inline-block mt-2 text-[11px] font-black text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg"
                      >
                        Open
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => setToasts(prev => prev.filter(t => t.id !== n.id))}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 shrink-0"
                    aria-label="Dismiss"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
                {!expanded && <div className="h-2" />}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
