'use client';

// Staff-side incoming call UI — polls for ringing calls from the super admin,
// Accept (WebRTC audio answer) / Decline, then an in-call panel.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Mic, MicOff, Loader2, Headset, Volume2, VolumeX } from 'lucide-react';
import { callHeaders, createPeer, getMicStream, postCandidate, mmss, teardownCall, startRingTone, showCallNotification, setLoudspeaker } from '@/lib/webrtc-call';

type Phase = 'idle' | 'ringing' | 'connecting' | 'active' | 'ended';

export default function IncomingCall() {
  const [call, setCall] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [statusNote, setStatusNote] = useState('');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<HTMLAudioElement | null>(null);
  const callIdRef = useRef<string | null>(null);
  const acceptedRef = useRef(false);
  const dismissedRef = useRef<Set<string>>(new Set());
  const remoteAnsweredRef = useRef(false);
  const handlersRef = useRef<{ accept?: () => void; decline?: () => void }>({});

  const cleanup = useCallback((note?: string) => {
    teardownCall(pcRef.current, micRef.current);
    pcRef.current = null;
    micRef.current = null;
    acceptedRef.current = false;
    remoteAnsweredRef.current = false;
    callIdRef.current = null;
    setMicOn(true);
    setSeconds(0);
    if (note) setStatusNote(note);
    setPhase(p => (p === 'idle' ? p : 'ended'));
    setTimeout(() => { setPhase('idle'); setCall(null); setStatusNote(''); }, 2600);
  }, []);

  // Inbox poll — only while not in an accepted call.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (cancelled || acceptedRef.current) return;
      try {
        const res = await fetch('/api/calls?inbox=1', { headers: callHeaders() });
        if (!res.ok) return;
        const d = await res.json();
        const c = d.data;
        if (!c || cancelled) return;
        if (dismissedRef.current.has(c.id)) return;
        if (c.status === 'ringing') {
          callIdRef.current = c.id;
          setCall(c);
          setPhase(p => (p === 'ringing' || p === 'connecting' || p === 'active' ? p : 'ringing'));
        } else if ((c.status === 'ended' || c.status === 'declined') && callIdRef.current === c.id) {
          if (!acceptedRef.current) {
            dismissedRef.current.add(c.id);
            cleanup(c.status === 'declined' ? 'Call declined' : 'Caller hung up');
          }
        } else if (c.status === 'answered' && !acceptedRef.current && callIdRef.current !== c.id) {
          // Answered in another tab — nothing to do here.
        }
      } catch { /* offline */ }
    };
    poll();
    const t = setInterval(poll, 2500);
    return () => { cancelled = true; clearInterval(t); };
  }, [cleanup]);

  // In-call polling: remote candidates + hangup status.
  useEffect(() => {
    if (phase !== 'active' && phase !== 'connecting') return;
    const id = callIdRef.current;
    if (!id) return;
    let cancelled = false;
    const added = new Set<string>();

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/calls/${id}`, { headers: callHeaders() });
        if (!res.ok) return;
        const d = await res.json();
        const c = d.data;
        if (!c || cancelled) return;
        for (const cand of c.candidates || []) {
          if (cand.from !== 'caller') continue;
          const key = JSON.stringify(cand.candidate);
          if (added.has(key)) continue;
          added.add(key);
          try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(cand.candidate)); } catch { /* race */ }
        }
        if ((c.status === 'ended' || c.status === 'declined') && !cancelled) {
          cleanup('The call has ended');
        }
      } catch { /* transient */ }
    };
    poll();
    const t = setInterval(poll, 1500);
    return () => { cancelled = true; clearInterval(t); };
  }, [phase, cleanup]);

  // Ring while a call is incoming: audible tone + OS notification with
  // Accept/Decline, so the call can be answered from the notification itself.
  useEffect(() => {
    if (phase !== 'ringing' || !call) return;
    const stopTone = startRingTone('ring');
    let cancelled = false;
    let cleanupNotif: (() => void) | null = null;
    const caller = call.caller_name || 'KROWN Support';
    showCallNotification({
      tag: `krown-call-${call.id}`,
      title: `${caller} is calling`,
      body: 'Incoming voice call — Accept or Decline.',
      onAction: action => {
        if (action === 'accept') handlersRef.current.accept?.();
        else handlersRef.current.decline?.();
      },
    }).then(cleanup => {
      if (cancelled) cleanup();
      else cleanupNotif = cleanup;
    });
    return () => {
      cancelled = true;
      stopTone();
      cleanupNotif?.();
    };
  }, [phase, call?.id]);

  // Call duration ticker.
  useEffect(() => {
    if (phase !== 'active') return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const accept = async () => {
    if (!call || phase !== 'ringing') return;
    setPhase('connecting');
    acceptedRef.current = true;
    callIdRef.current = call.id;
    try {
      const mic = await getMicStream();
      micRef.current = mic;
      const pc = createPeer(c => { if (call.id) postCandidate(call.id, c); });
      pcRef.current = pc;
      if (mic) mic.getTracks().forEach(t => pc.addTrack(t, mic));
      pc.ontrack = e => {
        if (remoteRef.current) {
          remoteRef.current.srcObject = e.streams[0];
          remoteRef.current.play().catch(() => {});
        }
      };
      await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const res = await fetch(`/api/calls/${call.id}`, {
        method: 'PATCH',
        headers: callHeaders(),
        body: JSON.stringify({ action: 'accept', answer }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        cleanup(d.error || 'Could not accept the call');
        return;
      }
      setPhase('active');
      setSeconds(0);
      setStatusNote('');
    } catch (e: any) {
      cleanup(e?.message || 'Failed to connect audio');
    }
  };

  const decline = async () => {
    if (!call) return;
    dismissedRef.current.add(call.id);
    try {
      await fetch(`/api/calls/${call.id}`, {
        method: 'PATCH',
        headers: callHeaders(),
        body: JSON.stringify({ action: 'decline' }),
      });
    } catch { /* noop */ }
    setPhase('idle');
    setCall(null);
  };

  // Latest handlers for the OS notification's Accept/Decline buttons.
  useEffect(() => {
    handlersRef.current = { accept, decline };
  });

  const hangup = async () => {
    const id = callIdRef.current;
    if (id) {
      try {
        await fetch(`/api/calls/${id}`, {
          method: 'PATCH',
          headers: callHeaders(),
          body: JSON.stringify({ action: 'hangup' }),
        });
      } catch { /* noop */ }
    }
    cleanup('Call ended');
  };

  const toggleMic = () => {
    const on = !micOn;
    micRef.current?.getAudioTracks().forEach(t => { t.enabled = on; });
    setMicOn(on);
  };

  const toggleSpeaker = () => {
    const on = !speakerOn;
    setSpeakerOn(on);
    setLoudspeaker(remoteRef.current, on).catch(() => {});
  };

  const callerName = call?.caller_name || 'KROWN Support';

  return (
    <>
      <audio ref={remoteRef} autoPlay playsInline />
      <AnimatePresence>
        {(phase === 'ringing' || phase === 'connecting' || phase === 'active' || phase === 'ended') && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            data-testid="incoming-call"
            className="fixed z-[95] bottom-6 right-6 w-[320px] bg-[#121214] border border-white/10 rounded-[1.75rem] shadow-[0_30px_70px_rgba(0,0,0,0.6)] overflow-hidden text-white"
          >
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 px-5 py-4 flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Headset className="w-6 h-6" />
                </div>
                {phase === 'ringing' && (
                  <span className="absolute inset-0 rounded-full border-2 border-white/70 animate-ping" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black truncate">{callerName}</p>
                <p className="text-[11px] opacity-90">
                  {phase === 'ringing' && 'Incoming voice call…'}
                  {phase === 'connecting' && 'Connecting…'}
                  {phase === 'active' && mmss(seconds)}
                  {phase === 'ended' && (statusNote || 'Call ended')}
                </p>
              </div>
            </div>

            <div className="p-4 flex items-center justify-center gap-4">
              {phase === 'ringing' && (
                <>
                  <button
                    onClick={decline}
                    data-testid="decline-call"
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-95"
                    aria-label="Decline"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                  <button
                    onClick={accept}
                    data-testid="accept-call"
                    className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-all active:scale-95 animate-pulse"
                    aria-label="Accept"
                  >
                    <Phone className="w-6 h-6" />
                  </button>
                </>
              )}
              {phase === 'connecting' && (
                <p className="text-xs text-slate-300 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Establishing secure audio…</p>
              )}
              {phase === 'active' && (
                <>
                  <button
                    onClick={toggleMic}
                    data-testid="toggle-mic"
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${micOn ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500/80 hover:bg-red-500'}`}
                    aria-label={micOn ? 'Mute' : 'Unmute'}
                  >
                    {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={toggleSpeaker}
                    data-testid="toggle-speaker"
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${speakerOn ? 'bg-orange-500/90 hover:bg-orange-500' : 'bg-white/10 hover:bg-white/20'}`}
                    aria-label={speakerOn ? 'Speaker off (earpiece)' : 'Loudspeaker on'}
                  >
                    {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={hangup}
                    data-testid="hangup-call"
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-95"
                    aria-label="Hang up"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </>
              )}
              {phase === 'ended' && (
                <p className="text-xs text-slate-400 py-2">{statusNote || 'Call ended'}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
