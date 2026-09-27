'use client';

// KROWN support widget — Dynamic-Island style pill + chat overlay.
// Bot-first triage, human as last option, star-rating review flow.
// Renders for restaurant staff (admin / manager / cashier / kitchen / POS).

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, X, Send, Star, Bot, Headset, History, ChevronLeft, Loader2, CheckCircle2,
} from 'lucide-react';

interface BotOption { id: string; label: string; human?: boolean }
interface Snapshot {
  conversation: any | null;
  messages: any[];
  stage: string;
  options: BotOption[];
  botState: any;
  history: any[];
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('krown_session_token') || '' : '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function profileName(): string {
  try {
    const raw = localStorage.getItem('krown_staff_profile');
    if (raw) return JSON.parse(raw)?.name || 'Staff';
  } catch { /* ignore */ }
  return 'Staff';
}

function timeLabel(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [view, setView] = useState<'chat' | 'history' | 'thread'>('chat');
  const [historyThread, setHistoryThread] = useState<{ id: string; subject: string } | null>(null);
  const [historyMsgs, setHistoryMsgs] = useState<any[] | null>(null);
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [sendingReview, setSendingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLButtonElement | null>(null);
  // Pill position: null = default (top middle). Persisted while dragging.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [overlayAnchor, setOverlayAnchor] = useState<{ left: number; top: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const justDraggedRef = useRef(false);

  const name = profileName();
  const conv = snapshot?.conversation || null;
  const waitingHuman = conv?.status === 'waiting_for_support' && !conv?.rating;
  const needsReview = snapshot?.stage === 'await_review';

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/support/chat', { headers: authHeaders() });
      if (!res.ok) return;
      const d = await res.json();
      if (d?.data) setSnapshot(d.data);
    } catch { /* offline/polling — ignore */ }
  }, []);

  // Background poll: keeps the pill state fresh (slow) and the open chat live (fast).
  useEffect(() => {
    refresh();
    const fast = setInterval(() => { if (open) refresh(); }, 4000);
    const slow = setInterval(() => { if (!open) refresh(); }, 45_000);
    return () => { clearInterval(fast); clearInterval(slow); };
  }, [open, refresh]);

  // Other UI (notification panel "Ask for support") can open this widget.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('krown:open-support', onOpen);
    return () => window.removeEventListener('krown:open-support', onOpen);
  }, []);

  // Keep thread scrolled to the newest message.
  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [open, snapshot?.messages?.length, view, snapshot?.stage]);

  const startChat = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const d = await res.json();
      if (res.ok && d?.data) { setSnapshot(d.data); setView('chat'); }
      else setError(d?.error || 'Could not start chat');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const send = async (text?: string, option?: string) => {
    if (!conv) return;
    const content = (text ?? input).trim();
    if (!content && !option) return;
    setSending(true); setError(null);
    if (!option) setInput('');
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', conversationId: conv.id, text: content, option }),
      });
      const d = await res.json();
      if (res.ok && d?.data) {
        setSnapshot(prev => prev ? {
          ...prev,
          conversation: d.data.conversation,
          messages: [...(prev.messages || []), ...(d.data.newMessages || [])],
          stage: d.data.stage,
          options: d.data.options || [],
        } : prev);
      } else setError(d?.error || 'Message failed');
    } catch { setError('Network error'); }
    finally { setSending(false); }
  };

  const submitReview = async (rating: number, skipText?: boolean) => {
    if (!conv || rating < 1) return;
    setSendingReview(true); setError(null);
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', conversationId: conv.id, rating, review: skipText ? '' : reviewText }),
      });
      const d = await res.json();
      if (res.ok && d?.data) {
        setStars(0); setReviewText('');
        await refresh();
      } else setError(d?.error || 'Could not save review');
    } catch { setError('Network error'); }
    finally { setSendingReview(false); }
  };

  const openHistoryThread = async (h: { id: string; subject: string }) => {
    setHistoryThread(h); setHistoryMsgs(null); setView('thread');
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'messages', conversationId: h.id }),
      });
      const d = await res.json();
      setHistoryMsgs(res.ok ? (d?.data || []) : []);
    } catch { setHistoryMsgs([]); }
  };

  // Restore the saved pill position (top-middle by default).
  useEffect(() => {
    try {
      const raw = localStorage.getItem('krown_island_pos');
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.x === 'number' && typeof p?.y === 'number') setPos(p);
      }
    } catch { /* ignore */ }
    const onResize = () => {
      setPos(prev => {
        if (!prev) return prev;
        const x = Math.min(Math.max(8, prev.x), Math.max(8, window.innerWidth - 160));
        const y = Math.min(Math.max(8, prev.y), Math.max(8, window.innerHeight - 48));
        return x === prev.x && y === prev.y ? prev : { x, y };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleOpen = () => {
    if (justDraggedRef.current) return;
    setOpen(v => {
      const willOpen = !v;
      if (willOpen && pillRef.current) {
        const r = pillRef.current.getBoundingClientRect();
        const w = Math.min(420, window.innerWidth * 0.94);
        const h = Math.min(640, window.innerHeight * 0.8);
        const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
        const top = Math.min(Math.max(8, r.bottom + 8), window.innerHeight - h - 8);
        setOverlayAnchor({ left, top });
      }
      return willOpen;
    });
  };

  const onPillPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cur = pos || { x: rect.left, y: rect.top };
    dragRef.current = { x: e.clientX, y: e.clientY, px: cur.x, py: cur.y, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  };

  const onPillPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    const el = e.currentTarget;
    const nx = Math.min(Math.max(8, d.px + dx), Math.max(8, window.innerWidth - el.offsetWidth - 8));
    const ny = Math.min(Math.max(8, d.py + dy), Math.max(8, window.innerHeight - el.offsetHeight - 8));
    setPos({ x: nx, y: ny });
  };

  const onPillPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    if (d?.moved) {
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 80);
      setPos(p => {
        if (p) { try { localStorage.setItem('krown_island_pos', JSON.stringify(p)); } catch { /* noop */ } }
        return p;
      });
    }
  };

  const messages = snapshot?.messages || [];

  return (
    <>
      {/* ── Dynamic Island pill (draggable, defaults to top middle) ── */}
      <button
        type="button"
        ref={pillRef}
        onClick={toggleOpen}
        onPointerDown={onPillPointerDown}
        onPointerMove={onPillPointerMove}
        onPointerUp={onPillPointerUp}
        onPointerCancel={() => { dragRef.current = null; }}
        onDoubleClick={() => { setPos(null); try { localStorage.removeItem('krown_island_pos'); } catch { /* noop */ } }}
        aria-label="Open support chat"
        data-testid="support-island"
        title="Drag to move · double-click to re-center"
        style={{ ...(pos ? { left: pos.x, top: pos.y } : {}), touchAction: 'none' }}
        className={`fixed z-[70] flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-slate-900/95 dark:bg-black/90 border border-white/10 text-white shadow-2xl hover:scale-[1.03] active:scale-95 transition-transform backdrop-blur-xl cursor-grab active:cursor-grabbing ${pos ? '' : 'top-3 left-1/2 -translate-x-1/2'}`}
      >
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-[11px] font-black">
          {name.charAt(0).toUpperCase() || 'S'}
        </span>
        <span className="text-xs font-bold tracking-wide max-w-[160px] truncate">{name}</span>
        <span className="flex items-center gap-1.5 ml-1">
          {waitingHuman ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
              <Headset className="w-3 h-3" /> Human
            </span>
          ) : (
            <MessageCircle className="w-3.5 h-3.5 text-orange-400" />
          )}
          {!open && messages.some(m => m.sender_type !== 'customer' && !m.is_read) && (
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          )}
        </span>
        {open && <X className="w-3.5 h-3.5 text-white/60 ml-1" />}
      </button>

      {/* ── Chat overlay ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            data-testid="support-widget"
            style={overlayAnchor ? { left: overlayAnchor.left, top: overlayAnchor.top } : undefined}
            className={`fixed z-[69] w-[min(420px,94vw)] h-[min(640px,80vh)] flex flex-col bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-[1.75rem] shadow-[0_30px_80px_rgba(0,0,0,0.45)] overflow-hidden ${overlayAnchor ? '' : 'top-14 left-1/2 -translate-x-1/2'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              <div className="flex items-center gap-2.5">
                {view !== 'chat' ? (
                  <button onClick={() => { setView('chat'); setHistoryThread(null); }} className="p-1 -ml-1 rounded-lg hover:bg-white/20">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                ) : null}
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  {waitingHuman ? <Headset className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-bold">{view === 'history' ? 'Chat History' : view === 'thread' ? (historyThread?.subject || 'Past chat') : 'KROWN Support'}</p>
                  <p className="text-[10px] opacity-90">
                    {view !== 'chat' ? 'Read-only' : waitingHuman ? 'Human agent notified — hang tight' : 'Assistant · replies instantly'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {view === 'chat' && (
                  <button onClick={() => setView('history')} title="History" className="p-1.5 rounded-lg hover:bg-white/20">
                    <History className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} title="Close" className="p-1.5 rounded-lg hover:bg-white/20">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            {view === 'history' ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {(snapshot?.history || []).length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-10">No past conversations yet.</p>
                )}
                {(snapshot?.history || []).map(h => (
                  <button
                    key={h.id}
                    onClick={() => openHistoryThread(h)}
                    className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-orange-500/10 border border-black/5 dark:border-white/5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{h.subject}</p>
                      {h.rating ? (
                        <span className="text-[10px] text-amber-500 font-bold">{'★'.repeat(h.rating)}</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">{h.status}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(h.updated_at).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            ) : view === 'thread' ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/50 dark:bg-black/20">
                {!historyMsgs && <p className="text-center text-xs text-slate-400 py-10"><Loader2 className="w-4 h-4 inline animate-spin" /> Loading…</p>}
                {historyMsgs && historyMsgs.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-10">This conversation was ended by our team.<br />Its history is kept on our side — start a new chat if you still need help.</p>
                )}
                {(historyMsgs || []).map(m => (
                  <div key={m.id} className={`flex ${m.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3.5 py-2.5 text-xs leading-relaxed rounded-2xl ${
                      m.sender_type === 'customer'
                        ? 'bg-orange-500 text-white rounded-br-md'
                        : m.sender_type === 'agent'
                          ? 'bg-emerald-100 dark:bg-emerald-500/15 text-slate-800 dark:text-emerald-100 rounded-bl-md border border-emerald-200 dark:border-emerald-500/20'
                          : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 rounded-bl-md border border-black/5 dark:border-white/10'
                    }`}>
                      {m.sender_type === 'agent' && <span className="block text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-1">Human agent</span>}
                      {m.sender_type === 'ai' && <span className="block text-[9px] font-black uppercase text-orange-500 mb-1">KROWN Bot</span>}
                      <span className="whitespace-pre-wrap break-words">{m.content}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Live thread */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/50 dark:bg-black/20">
                  {error && <p className="text-[11px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">{error}</p>}

                  {!conv && !loading && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-xl">
                        <Headset className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Need a hand?</p>
                        <p className="text-xs text-slate-500 mt-1">Our assistant answers instantly, and a human specialist is one tap away.</p>
                      </div>
                      <button onClick={startChat} disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-60 flex items-center gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                        Start a chat
                      </button>
                    </div>
                  )}

                  {conv && messages.map(m => {
                    const isCustomer = m.sender_type === 'customer';
                    const isHuman = m.sender_type === 'agent';
                    const isBot = m.sender_type === 'ai';
                    const isSystem = m.sender_type === 'system';
                    if (isSystem) {
                      return (
                        <div key={m.id} className="flex justify-center">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">{m.content}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={m.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed rounded-2xl ${
                          isCustomer
                            ? 'bg-orange-500 text-white rounded-br-md'
                            : isHuman
                              ? 'bg-emerald-100 dark:bg-emerald-500/15 text-slate-800 dark:text-emerald-100 rounded-bl-md border border-emerald-200 dark:border-emerald-500/20'
                              : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 rounded-bl-md border border-black/5 dark:border-white/10'
                        }`}>
                          {isHuman && (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-1">
                              <Headset className="w-3 h-3" /> Human agent
                            </span>
                          )}
                          {isBot && (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase text-orange-500 mb-1">
                              <Bot className="w-3 h-3" /> KROWN Bot
                            </span>
                          )}
                          <span className="whitespace-pre-wrap break-words">{m.content}</span>
                          <span className={`block text-[9px] mt-1 ${isCustomer ? 'text-white/70' : 'text-slate-400'}`}>{timeLabel(m.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Triage / confirm quick options */}
                  {conv && (snapshot?.options || []).length > 0 && !sending && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(snapshot!.options || []).map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => send('', opt.id)}
                          disabled={sending}
                          className={`text-[11px] font-bold px-3.5 py-2 rounded-xl border transition-all disabled:opacity-50 ${
                            opt.human
                              ? 'border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                              : 'border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/5 hover:bg-orange-500/15'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Star review (skippable text) */}
                  {needsReview && (
                    <div className="bg-white dark:bg-white/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-800 dark:text-white">How was your support experience?</p>
                      <div className="flex gap-1.5" onMouseLeave={() => setHoverStars(0)}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStars(s)}
                            onMouseEnter={() => setHoverStars(s)}
                            className="transition-transform hover:scale-110"
                            aria-label={`${s} star`}
                          >
                            <Star className={`w-7 h-7 ${(hoverStars || stars) >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewText}
                        onChange={e => setReviewText(e.target.value)}
                        placeholder="Anything else? (optional — you can skip)"
                        rows={2}
                        className="w-full text-xs bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitReview(Math.max(1, stars))}
                          disabled={stars < 1 || sendingReview}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {sendingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Submit rating
                        </button>
                        <button
                          onClick={() => submitReview(4, true)}
                          disabled={sendingReview}
                          className="px-4 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-white/5 rounded-xl"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Composer */}
                {conv && !needsReview && (
                  <div className="p-3 border-t border-black/5 dark:border-white/10 bg-white dark:bg-[#121214]">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                        placeholder={waitingHuman ? 'Waiting for the human agent — you can keep typing…' : 'Type your message…'}
                        disabled={sending}
                        className="flex-1 bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-60"
                      />
                      <button
                        onClick={() => send()}
                        disabled={sending || !input.trim()}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 rounded-xl disabled:opacity-40 transition-all"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 text-center mt-1.5">
                      Bot first · humans only if needed · history stays with you
                    </p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
