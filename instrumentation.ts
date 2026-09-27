// Next.js instrumentation hook — runs once when the server starts.
// Schedules the subscription expiry checker by calling the internal cron
// endpoint (keeps this file free of any imports so its compile stays clean).

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.DISABLE_SUBSCRIPTION_CRON === '1') return;
  if ((globalThis as any).__krownSubscriptionCronStarted) return;
  (globalThis as any).__krownSubscriptionCronStarted = true;

  const origin = (process.env.APP_URL || '').replace(/\/$/, '');
  const secret = process.env.CRON_SECRET || '';

  const runCheck = async (label: string) => {
    if (!origin) {
      if (label === 'startup') console.warn('[cron:subscriptions] APP_URL not set — cron not scheduled');
      return;
    }
    try {
      const url = `${origin}/api/cron/subscriptions${secret ? `?secret=${encodeURIComponent(secret)}` : ''}`;
      const res = await fetch(url, { method: 'POST' });
      const json: any = await res.json().catch(() => ({}));
      if (json?.warned || json?.expired) {
        console.log(`[cron:subscriptions] ${label}: warned=${json.warned} expired=${json.expired}`);
      } else if (!res.ok) {
        console.warn(`[cron:subscriptions] ${label}: HTTP ${res.status}`);
      }
    } catch (e: any) {
      console.warn(`[cron:subscriptions] ${label} failed:`, e?.message || e);
    }
  };

  // First run shortly after boot, then every 6 hours.
  const initial = setTimeout(() => runCheck('startup'), 45_000);
  const interval = setInterval(() => runCheck('interval'), 6 * 60 * 60 * 1000);
  if (typeof initial.unref === 'function') initial.unref();
  if (typeof interval.unref === 'function') interval.unref();

  console.log('[cron:subscriptions] scheduled: startup+45s, then every 6h');
}
