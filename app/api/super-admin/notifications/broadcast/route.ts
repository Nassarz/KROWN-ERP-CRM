// Role-targeted broadcast: in-app notification + web push (+ optional email)
// for every active staff member in the selected roles, and/or super admins.

import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { notify } from '@/lib/services/notify';
import { sendEmail, escapeHtml, getAppUrl } from '@/lib/services/email.service';
import { getSql } from '@/lib/neon-server';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const MAX_RECIPIENTS = 500;
const VALID_ROLES = new Set([
  'restaurant_admin', 'branch_manager', 'manager', 'admin', 'cashier', 'waiter',
  'senior_waiter', 'kitchen_staff', 'chef', 'host',
]);

function broadcastEmailHtml(opts: { title: string; message: string }) {
  const appUrl = getAppUrl();
  const logo = 'https://i.ibb.co/wh2T8MZ7/file-00000000c36482088cf56fe82910d3c4.png';
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0b0b0d;padding:32px 16px;color:#e5e7eb">
    <div style="max-width:520px;margin:0 auto;background:#121214;border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#f97316,#f59e0b);padding:24px 28px">
        <img src="${logo}" alt="KROWN" width="40" height="40" style="border-radius:10px;display:block" />
        <p style="margin:14px 0 0;font-size:20px;font-weight:800;color:#fff">${escapeHtml(opts.title)}</p>
      </div>
      <div style="padding:24px 28px">
        <p style="font-size:15px;line-height:1.65;color:#d1d5db;white-space:pre-wrap;margin:0">${escapeHtml(opts.message)}</p>
        <a href="${appUrl}" style="display:inline-block;margin-top:24px;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:12px">Open KROWN POS</a>
        <p style="margin-top:26px;font-size:12px;color:#6b7280">You are receiving this because a KROWN platform administrator sent an announcement to your role.</p>
      </div>
    </div>
  </div>`;
}

export async function POST(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const rl = rateLimit(`broadcast-notification:${ctx.userId}`, 10, 10 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many broadcasts — try again in a few minutes' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const title = String(body.title || '').trim().slice(0, 140) || 'Announcement from KROWN';
    const message = String(body.message || '').trim().slice(0, 4000);
    const priority = ['urgent', 'high', 'normal', 'low'].includes(body.priority) ? body.priority : 'normal';
    const roles = Array.isArray(body.roles)
      ? Array.from(new Set(body.roles.map((r: any) => String(r || '').toLowerCase().trim()).filter((r: string) => VALID_ROLES.has(r))))
      : [];
    const includeSuperAdmins = body.includeSuperAdmins === true;
    const withEmail = body.email !== false;

    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    if (!roles.length && !includeSuperAdmins) {
      return NextResponse.json({ error: 'Select at least one audience' }, { status: 400 });
    }

    const sql = getSql();
    const staff = roles.length
      ? await sql`
          SELECT s.id, s.name, s.email, s.organization_id, o.name AS organization_name, s.role
          FROM staff s
          LEFT JOIN organizations o ON o.id = s.organization_id
          WHERE lower(s.role) = ANY(${roles}::text[])
            AND s.status IN ('active', 'on_shift')
          ORDER BY s.created_at ASC
          LIMIT ${MAX_RECIPIENTS}`
      : [];

    const admins = includeSuperAdmins
      ? await sql`SELECT id, name, email FROM super_admins WHERE status = 'active'`
      : [];

    if (!staff.length && !admins.length) {
      return NextResponse.json({ error: 'No active recipients match the selected roles' }, { status: 404 });
    }

    let inApp = 0;
    let pushed = 0;
    let emailsSent = 0;
    const failures: string[] = [];

    for (const person of staff as any[]) {
      try {
        const res = await notify({
          recipientKind: 'staff',
          recipientId: person.id,
          organizationId: person.organization_id,
          type: 'announcement',
          title,
          message,
          priority: priority as any,
          linkUrl: '/',
          linkType: 'page',
          metadata: { broadcast: true, roles, by: ctx.userId },
        });
        inApp += 1;
        if (res?.pushed) pushed += res.pushed;
      } catch (e: any) {
        failures.push(`${person.email}: ${e?.message || 'in-app failed'}`);
      }

      if (withEmail && person.email) {
        const email = await sendEmail({
          to: person.email,
          subject: title,
          html: broadcastEmailHtml({ title, message }),
        }).catch((e: any) => ({ success: false, error: e?.message }));
        if (email?.success) emailsSent += 1;
        else failures.push(`${person.email}: ${email?.error || 'email failed'}`);
      }
    }

    for (const admin of admins as any[]) {
      try {
        const res = await notify({
          recipientKind: 'super_admin',
          recipientId: admin.id,
          type: 'announcement',
          title,
          message,
          priority: priority as any,
          linkUrl: '/super-admin?tab=notifications',
          linkType: 'tab',
          metadata: { broadcast: true, roles, by: ctx.userId },
        });
        inApp += 1;
        if (res?.pushed) pushed += res.pushed;
      } catch (e: any) {
        failures.push(`${admin.email}: ${e?.message || 'in-app failed'}`);
      }

      if (withEmail && admin.email) {
        const email = await sendEmail({
          to: admin.email,
          subject: title,
          html: broadcastEmailHtml({ title, message }),
        }).catch((e: any) => ({ success: false, error: e?.message }));
        if (email?.success) emailsSent += 1;
        else failures.push(`${admin.email}: ${email?.error || 'email failed'}`);
      }
    }

    const total = staff.length + admins.length;
    const summary = `Sent to ${total} recipient${total === 1 ? '' : 's'} — ${inApp} in-app, ${pushed} pushed${withEmail ? `, ${emailsSent} emailed` : ''}.`;
    return NextResponse.json({ ok: true, message: summary, total, inApp, pushed, emailsSent, failures });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Broadcast failed' }, { status: 500 });
  }
}
