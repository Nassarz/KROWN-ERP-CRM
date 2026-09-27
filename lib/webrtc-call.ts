// Shared WebRTC helpers for in-system voice calls (signaling via /api/calls).

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

export function callHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('krown_session_token') || '' : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function createPeer(onLocalCandidate: (c: any) => void): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  pc.onicecandidate = e => {
    if (e.candidate) onLocalCandidate(e.candidate.toJSON ? e.candidate.toJSON() : e.candidate);
  };
  return pc;
}

/** Try to grab the mic; returns null when permission/devices are unavailable. */
export async function getMicStream(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return null;
    }
  }
}

export async function postCandidate(callId: string, candidate: any): Promise<void> {
  try {
    await fetch(`/api/calls/${callId}`, {
      method: 'POST',
      headers: callHeaders(),
      body: JSON.stringify({ action: 'candidate', candidate }),
    });
  } catch { /* candidate delivery retried by future candidates */ }
}

export function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function teardownCall(pc: RTCPeerConnection | null, stream: MediaStream | null): void {
  try { pc?.getSenders().forEach(s => { try { s.track?.stop(); } catch { /* noop */ } }); } catch { /* noop */ }
  try { stream?.getTracks().forEach(t => t.stop()); } catch { /* noop */ }
  try { pc?.close(); } catch { /* noop */ }
}

const LOGO = 'https://i.ibb.co/wh2T8MZ7/file-00000000c36482088cf56fe82910d3c4.png';

/**
 * Web-Audio ring tone. `ring` is the callee's incoming ring (double beep),
 * `ringback` is the caller's tone while waiting for an answer.
 * Returns a stop function; safe to call in any browser (no-ops when unsupported).
 */
export function startRingTone(kind: 'ring' | 'ringback' = 'ring'): () => void {
  if (typeof window === 'undefined') return () => {};
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return () => {};
    const ctx: AudioContext = new AC();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 440;
    osc.connect(gain);
    osc.start();

    const onMs = kind === 'ring' ? 420 : 400;
    const offMs = kind === 'ring' ? 280 : 2000;
    const beep = () => {
      try {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
        gain.gain.setValueAtTime(0.12, now + onMs / 1000 - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + onMs / 1000);
      } catch { /* ctx closed */ }
    };
    beep();
    const interval = setInterval(beep, onMs + offMs);

    return () => {
      try { clearInterval(interval); } catch { /* noop */ }
      try { osc.stop(); } catch { /* noop */ }
      try { ctx.close(); } catch { /* noop */ }
    };
  } catch {
    return () => {};
  }
}

export type CallNotifyAction = 'accept' | 'decline';

/**
 * Show an OS notification for an incoming call with Accept/Decline actions.
 * Actions are delivered back through the service worker as a `call-action`
 * message, so the user can answer straight from the notification.
 * Returns a cleanup fn that removes the listener and closes the notification.
 */
export async function showCallNotification(opts: {
  tag: string;
  title: string;
  body: string;
  onAction?: (action: CallNotifyAction) => void;
}): Promise<() => void> {
  let cleanup: () => void = () => {};
  try {
    if (typeof window === 'undefined') return cleanup;
    if (typeof Notification === 'undefined') return cleanup;

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission().catch(() => 'denied' as NotificationPermission);
    }
    if (permission !== 'granted') return cleanup;

    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (d && d.type === 'call-action' && d.tag === opts.tag && opts.onAction) {
        opts.onAction(d.action as CallNotifyAction);
      }
    };

    // Register the SW ourselves so call notifications work even before the
    // user ever enables web push.
    const reg = await (navigator as any).serviceWorker?.register('/sw.js').catch(() => null);
    const ready = reg
      ? await Promise.race([
          navigator.serviceWorker.ready,
          new Promise(res => setTimeout(() => res(null), 3000)),
        ])
      : null;

    if (ready && typeof (ready as any).showNotification === 'function') {
      navigator.serviceWorker.addEventListener('message', onMessage);
      await (ready as any).showNotification(opts.title, {
        body: opts.body,
        tag: opts.tag,
        requireInteraction: true,
        icon: LOGO,
        badge: LOGO,
        vibrate: [250, 120, 250],
        data: { url: '/', callActions: ['accept', 'decline'] },
      });
      cleanup = () => {
        try { navigator.serviceWorker.removeEventListener('message', onMessage); } catch { /* noop */ }
        try { (ready as any).getNotifications({ tag: opts.tag }).then((ns: any[]) => ns.forEach(n => n.close())).catch(() => {}); } catch { /* noop */ }
      };
    } else {
      const n = new Notification(opts.title, {
        body: opts.body,
        tag: opts.tag,
        requireInteraction: true,
        icon: LOGO,
      });
      n.onclick = () => { window.focus(); n.close(); };
      cleanup = () => { try { n.close(); } catch { /* noop */ } };
    }
  } catch { /* notifications unsupported */ }
  return cleanup;
}

/**
 * Route remote call audio to the loudspeaker (`on`) or the default/earpiece
 * output (`off`). Uses setSinkId when the browser exposes it and always keeps
 * the volume at full level for the speaker.
 */
export async function setLoudspeaker(audio: HTMLAudioElement | null, on: boolean): Promise<boolean> {
  if (!audio) return false;
  try {
    const sinkable = audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
    if (typeof sinkable.setSinkId === 'function' && typeof (navigator as any).mediaDevices?.enumerateAudioOutputs === 'function') {
      const devices = await (navigator as any).mediaDevices.enumerateAudioOutputs();
      const target = on ? (devices.find((d: any) => /speaker|external/i.test(d.label)) || devices[0]) : (devices.find((d: any) => /head|ear/i.test(d.label)) || devices[0]);
      if (target?.deviceId) await sinkable.setSinkId(target.deviceId);
    }
    audio.volume = on ? 1 : 0.7;
    return true;
  } catch {
    try { audio.volume = on ? 1 : 0.7; } catch { /* noop */ }
    return false;
  }
}
