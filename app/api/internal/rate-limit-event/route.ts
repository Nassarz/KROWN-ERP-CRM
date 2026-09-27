// Internal endpoint: middleware reports blocked clients here (fire-and-forget).
// Dedupes aggressively so a flood produces at most one alert per IP per 10 min.

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientIpOf } from '@/lib/rate-limit';
import { notify, sendTemplatedEmail } from '@/lib/services/notify';
import { rateLimitAlertEmail } from '@/lib/services/email-templates';
import { getSql } from '@/lib/neon-server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const clientIp = clientIpOf(request);
  const dedupe = rateLimit(`rl-event:${clientIp}`, 1, 10 * 60_000);
  if (!dedupe.allowed) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    /* keep defaults */
  }

  const ip = String(body.ip || clientIp);
  const path = String(body.path || '/api');
  const rule = String(body.rule || 'api');
  const count = Number(body.count || 0);

  const title = 'Rate limiting triggered';
  const message = `Blocked ${count}+ requests to ${path} from ${ip} (${rule}).`;

  let admins: any[] = [];
  try {
    admins = await getSql()`SELECT id, name, email FROM super_admins WHERE status = 'active'`;
  } catch {
    return NextResponse.json({ ok: true, skipped: true });
  }

  for (const admin of admins) {
    // In-app + push
    await notify({
      recipientKind: 'super_admin',
      recipientId: admin.id,
      type: 'rate_limit',
      title,
      message,
      priority: 'high',
      linkUrl: '/super-admin?tab=notifications',
      linkType: 'tab',
      metadata: { ip, path, rule, count },
    }).catch(() => {});
    // Email (deduped above: at most one email per source IP per 10 minutes)
    await sendTemplatedEmail({
      to: admin.email,
      emailType: 'rate_limit_alert',
      template: rateLimitAlertEmail({
        adminName: admin.name || 'Super Admin',
        ip,
        path,
        count,
        windowSeconds: 60,
      }),
      metadata: { ip, path, rule },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
