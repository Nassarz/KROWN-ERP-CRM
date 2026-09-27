// Send a test notification (in-app + web push + email) to every super admin.

import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { notify, sendTemplatedEmail } from '@/lib/services/notify';
import { testNotificationEmail } from '@/lib/services/email-templates';
import { getSql } from '@/lib/neon-server';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const rl = rateLimit(`test-notification:${ctx.userId}`, 5, 10 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many test notifications — try again in a few minutes' }, { status: 429 });
  }

  const sql = getSql();
  const admins = await sql`SELECT id, name, email FROM super_admins WHERE status = 'active'`;
  if (!admins.length) {
    return NextResponse.json({ error: 'No active super admins found' }, { status: 404 });
  }

  const results: any[] = [];
  for (const admin of admins as any[]) {
    const notified = await notify({
      recipientKind: 'super_admin',
      recipientId: admin.id,
      type: 'system',
      title: 'Test notification',
      message: 'Notifications are working: in-app, web push and email are all delivering for this super-admin account.',
      priority: 'normal',
      linkUrl: '/super-admin?tab=notifications',
      linkType: 'tab',
      metadata: { test: true },
    }).catch((e: any) => ({ ok: false, error: e?.message }));

    const email = await sendTemplatedEmail({
      to: admin.email,
      emailType: 'test_notification',
      template: testNotificationEmail({ adminName: admin.name || 'Super Admin' }),
    }).catch((e: any) => ({ success: false, error: e?.message }));

    results.push({
      id: admin.id,
      email: admin.email,
      inApp: notified && (notified as any).ok !== false,
      emailSent: Boolean(email && (email as any).success !== false),
    });
  }

  return NextResponse.json({
    ok: true,
    message: `Test notification sent to ${results.length} super admin${results.length === 1 ? '' : 's'} (in-app + push + email).`,
    results,
  });
}
