'use client';

// Super-admin voice call panel (caller side): rings the staff member via
// /api/calls, exchanges SDP/ICE by polling, shows live in-call controls.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Mic, MicOff, Loader2, Headset, User, Volume2, VolumeX } from 'lucide-react';
import { callHeaders, createPeer, getMicStream, postCandidate, mmss, teardownCall, startRingTone, setLoudspeaker } from '@/lib/webrtc-call';

interface CallTarget { id: string; name: string }

type Phase = 'dialing' | 'ringing' | 'active' | 'ended';

export default function SuperAdminCallPanel({ target, onEnded }: { target: CallTarget | null; onEnded: () => void }) {
  const [phase, setPhase] = useState<Phase>('dialing');
  const [seconds, setSeconds] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [note, setNote] = useState('Calling…');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<HTMLAudioElement | null>(null);
  const callIdRef = useRef<string | null>(null);
  const remoteSetRef = useRef(false);
  const addedRef = useRef<Set<string>>(new Set());
  const endedRef = useRef(false);
  const cancelRef = useRef(false);

  const endCall = useCallback((message?: string) => {
    if (endedRef.current) return;
    endedRef.current = true;
    cancelRef.current = true;
    const id = callIdRef.current;
    if (id) {
      fetch(`/api/calls/${id}`, {
        method: 'PATCH',
        headers: callHeaders(),
        body: JSON.stringify({ action: 'hangup' }),
      }).catch(() => {});
    }
    teardownCall(pcRef.current, micRef.current);
    pcRef.current = null;
    micRef.current = null;
    callIdRef.current = null;
    remoteSetRef.current = false;
    addedRef.current = new Set();
    setSeconds(0);
    setMicOn(true);
    setPhase('ended');
    setNote(message || 'Call ended');
    setTimeout(() => { endedRef.current = false; onEnded(); }, 2200);
  }, [onEnded]);

  // Place the call whenever a new target arrives.
  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    endedRef.current = false;
    cancelRef.current = false;
    callIdRef.current = null;
    remoteSetRef.current = false;
    addedRef.current = new Set();
    setPhase('dialing');
    setSeconds(0);
    setNote('Calling…');

    (async () => {
      try {
        const mic = await getMicStream();
        if (cancelled) { mic?.getTracks().forEach(t => t.stop()); return; }
        micRef.current = mic;

        let createdCallId: string | null = null;
        const pc = createPeer(c => { if (createdCallId) postCandidate(createdCallId, c); });
        pcRef.current = pc;
        if (mic) mic.getTracks().forEach(t => pc.addTrack(t, mic));
        pc.ontrack = e => {
          if (remoteRef.current) {
            remoteRef.current.srcObject = e.streams[0];
            remoteRef.current.play().catch(() => {});
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const res = await fetch('/api/calls', {
          method: 'POST',
          headers: callHeaders(),
          body: JSON.stringify({ calleeId: target.id, offer }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) endCall(d.error || 'Could not start the call');
          return;
        }
        if (cancelled || cancelRef.current) {
          fetch(`/api/calls/${d.data.id}`, { method: 'PATCH', headers: callHeaders(), body: JSON.stringify({ action: 'hangup' }) }).catch(() => {});
          teardownCall(pc, mic);
          return;
        }
        createdCallId = d.data.id;
        callIdRef.current = d.data.id;
        setPhase('ringing');
        setNote(`Ringing ${target.name}…`);
      } catch (e: any) {
        if (!cancelled) endCall(e?.message || 'Failed to start the call');
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id]);

  // Poll the call: ICE from callee, answer SDP, status transitions.
  useEffect(() => {
    const id = callIdRef.current;
    if (!target || !id || phase === 'ended') return;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || endedRef.current) return;
      try {
        const res = await fetch(`/api/calls/${id}`, { headers: callHeaders() });
        if (!res.ok) return;
        const d = await res.json();
        const c = d.data;
        if (!c || cancelled) return;

        for (const cand of c.candidates || []) {
          if (cand.from !== 'callee') continue;
          const key = JSON.stringify(cand.candidate);
          if (addedRef.current.has(key)) continue;
          addedRef.current.add(key);
          try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(cand.candidate)); } catch { /* race */ }
        }

        if (c.answer && !remoteSetRef.current && pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(c.answer));
            remoteSetRef.current = true;
          } catch { /* retry next poll */ }
        }

        if (c.status === 'answered' && phase !== 'active') {
          setPhase('active');
          setSeconds(0);
          setNote('Connected');
        } else if (c.status === 'declined' && phase === 'ringing') {
          endCall('The user declined the call');
        } else if (c.status === 'ended') {
          endCall(phase === 'ringing' ? 'No answer — call ended' : 'Call ended');
        }
      } catch { /* transient */ }
    };
    poll();
    const t = setInterval(poll, 1500);
    return () => { cancelled = true; clearInterval(t); };
  }, [target, phase, endCall]);

  // Auto-timeout while ringing.
  useEffect(() => {
    if (phase !== 'ringing') return;
    const t = setTimeout(() => endCall('No answer — call ended'), 45_000);
    return () => clearTimeout(t);
  }, [phase, endCall]);

  // Ringback tone while waiting for the callee to answer.
  useEffect(() => {
    if (phase !== 'ringing') return;
    return startRingTone('ringback');
  }, [phase]);

  useEffect(() => {
    if (phase !== 'active') return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

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

  return (
    <>
      <audio ref={remoteRef} autoPlay playsInline />
      <AnimatePresence>
        {target && (
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            data-testid="sa-call-panel"
            className="fixed z-[95] bottom-6 right-6 w-[300px] bg-[#121214] border border-white/10 rounded-[1.75rem] shadow-[0_30px_70px_rgba(0,0,0,0.6)] overflow-hidden text-white"
          >
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 px-5 py-4 flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  {phase === 'active' || phase === 'ended' ? <Headset className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>
                {phase === 'ringing' && <span className="absolute inset-0 rounded-full border-2 border-white/70 animate-ping" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black truncate">{target.name}</p>
                <p className="text-[11px] opacity-90">
                  {phase === 'active' ? mmss(seconds) : note}
                </p>
              </div>
            </div>

            <div className="p-4 flex items-center justify-center gap-4">
              {(phase === 'dialing' || phase === 'ringing') && (
                <>
                  <p className="text-xs text-slate-300 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {phase === 'dialing' ? 'Starting…' : 'Ringing…'}
                  </p>
                  <button
                    onClick={() => endCall('Call cancelled')}
                    data-testid="sa-cancel-call"
                    className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-95"
                    aria-label="Cancel call"
                    title="Cancel"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                </>
              )}
              {phase === 'active' && (
                <>
                  <button
                    onClick={toggleMic}
                    data-testid="sa-toggle-mic"
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${micOn ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500/80 hover:bg-red-500'}`}
                    aria-label={micOn ? 'Mute' : 'Unmute'}
                  >
                    {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={toggleSpeaker}
                    data-testid="sa-toggle-speaker"
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${speakerOn ? 'bg-orange-500/90 hover:bg-orange-500' : 'bg-white/10 hover:bg-white/20'}`}
                    aria-label={speakerOn ? 'Speaker off (earpiece)' : 'Loudspeaker on'}
                  >
                    {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => endCall('Call ended')}
                    data-testid="sa-hangup"
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-95"
                    aria-label="Hang up"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </>
              )}
              {phase === 'ended' && <p className="text-xs text-slate-400 py-2">{note}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
