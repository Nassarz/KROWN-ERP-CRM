// KROWN — Web Push service (VAPID). Delivers notifications even when the
// app is closed, via the service worker in public/sw.js.

import { getSql } from '@/lib/neon-server';

export type RecipientKind = 'staff' | 'super_admin';

// web-push pulls in Node 'http'/'https' — load it lazily so non-Node bundle
// targets (instrumentation edge pass) never try to resolve it statically.
type WebPushModule = typeof import('web-push');
let webpush: WebPushModule | null = null;

async function getWebpush(): Promise<WebPushModule | null> {
  if (webpush) return webpush;
  try {
    const mod = await import('web-push');
    webpush = (((mod as any).default || mod) as WebPushModule);
    return webpush;
  } catch {
    return null;
  }
}

let configured = false;

async function ensureConfigured(): Promise<boolean> {
  if (configured) return true;
  const publicVapid = process.env.VAPID_PUBLIC_KEY;
  const privateVapid = process.env.VAPID_PRIVATE_KEY;
  if (!publicVapid || !privateVapid) return false;
  const wp = await getWebpush();
  if (!wp) return false;
  wp.setVapidDetails(
    process.env.VAPID_SUBJECT || `mailto:${process.env.SMTP_USER || 'support@krown.app'}`,
    publicVapid,
    privateVapid
  );
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export interface PushSubscriptionInput {
  recipient_id: string;
  recipient_kind: RecipientKind;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  user_agent?: string;
}

export async function saveSubscription(input: PushSubscriptionInput): Promise<void> {
  if (!(await ensureConfigured())) throw new Error('Web push is not configured (VAPID keys missing)');
  const sql = getSql();
  await sql`
    INSERT INTO push_subscriptions (recipient_id, recipient_kind, endpoint, p256dh, auth, user_agent, last_used_at)
    VALUES (${input.recipient_id}, ${input.recipient_kind}, ${input.endpoint}, ${input.keys.p256dh}, ${input.keys.auth}, ${input.user_agent || null}, NOW())
    ON CONFLICT (endpoint) DO UPDATE
      SET recipient_id = EXCLUDED.recipient_id,
          recipient_kind = EXCLUDED.recipient_kind,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          last_used_at = NOW()
  `;
}

export async function removeSubscription(endpoint: string, recipientId?: string): Promise<void> {
  const sql = getSql();
  if (recipientId) {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint} AND recipient_id = ${recipientId}`;
  } else {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  priority?: string;
}

/**
 * Fan a push out to one recipient. Dead subscriptions (404/410) are removed.
 * Returns the number of endpoints successfully notified.
 */
export async function sendPushToRecipient(
  recipientId: string,
  recipientKind: RecipientKind,
  payload: PushPayload
): Promise<number> {
  if (!(await ensureConfigured())) return 0;
  const wp = await getWebpush();
  if (!wp) return 0;
  const sql = getSql();
  const rows = await sql`
    SELECT id, endpoint, p256dh, auth FROM push_subscriptions
    WHERE recipient_id = ${recipientId} AND recipient_kind = ${recipientKind}
  `;
  if (!rows.length) return 0;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    tag: payload.tag || `krown-${payload.priority || 'normal'}`,
    priority: payload.priority || 'normal',
  });

  let delivered = 0;
  for (const row of rows as any[]) {
    try {
      await wp.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        body,
        { TTL: 60 * 60 * 24, urgency: payload.priority === 'urgent' ? 'high' : 'normal' }
      );
      delivered++;
      await sql`UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = ${row.id}`.catch(() => {});
    } catch (e: any) {
      const status = e?.statusCode || e?.status;
      if (status === 404 || status === 410 || status === 401 || status === 403) {
        await sql`DELETE FROM push_subscriptions WHERE id = ${row.id}`.catch(() => {});
      }
    }
  }
  return delivered;
}

/** Send the same payload to every active super admin push endpoint. */
export async function sendPushToAllSuperAdmins(payload: PushPayload): Promise<number> {
  if (!(await ensureConfigured())) return 0;
  const sql = getSql();
  const rows = await sql`
    SELECT DISTINCT recipient_id FROM push_subscriptions WHERE recipient_kind = 'super_admin'
  `;
  let total = 0;
  for (const row of rows as any[]) {
    total += await sendPushToRecipient(row.recipient_id, 'super_admin', payload);
  }
  return total;
}
