// KROWN — central notification dispatcher.
// Every platform event funnels through here: in-app row + web push (+ optional email).

import { getSql } from '@/lib/neon-server';
import { generateId } from '@/lib/id';
import { sendPushToRecipient, type RecipientKind } from './push.service';
import { sendEmail } from './email.service';
import { logEmail } from './email-log.service';

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface NotifyInput {
  recipientKind: RecipientKind;
  recipientId: string;
  /** Required for staff, must be omitted/null for super admins. */
  organizationId?: string | null;
  type: string;
  title: string;
  message?: string;
  priority?: NotificationPriority;
  linkUrl?: string;
  linkType?: string;
  metadata?: Record<string, any>;
}

export interface NotifyResult {
  notificationId: string;
  pushed: number;
}

/** Insert an in-app notification and fan it out to web push subscribers. */
export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const sql = getSql();
  const id = generateId();
  // Super-admin notifications are platform-wide: organization_id stays NULL
  // (the column FKs to organizations and SA has no tenant row).
  const orgId = input.recipientKind === 'super_admin' ? null : input.organizationId || null;

  await sql`
    INSERT INTO notifications (id, organization_id, recipient_id, type, title, message, link_url, link_type, priority, metadata)
    VALUES (${id}, ${orgId}, ${input.recipientId}, ${input.type}, ${input.title}, ${input.message || null}, ${input.linkUrl || null}, ${input.linkType || null}, ${input.priority || 'normal'}, ${JSON.stringify(input.metadata || {})})
  `.catch(async (e: any) => {
    // Retry without org scoping if a caller passed a non-existent org id.
    if (orgId) {
      await sql`
        INSERT INTO notifications (id, organization_id, recipient_id, type, title, message, link_url, link_type, priority, metadata)
        VALUES (${id}, NULL, ${input.recipientId}, ${input.type}, ${input.title}, ${input.message || null}, ${input.linkUrl || null}, ${input.linkType || null}, ${input.priority || 'normal'}, ${JSON.stringify(input.metadata || {})})
      `;
    } else {
      throw e;
    }
  });

  let pushed = 0;
  try {
    pushed = await sendPushToRecipient(input.recipientId, input.recipientKind, {
      title: input.title,
      body: input.message || '',
      url: input.linkUrl || '/',
      tag: `${input.type}-${id}`,
      priority: input.priority || 'normal',
    });
  } catch {
    /* push is best-effort */
  }

  return { notificationId: id, pushed };
}

/** Notify every active super admin (in-app + push). */
export async function notifySuperAdmins(
  input: Omit<NotifyInput, 'recipientKind' | 'recipientId' | 'organizationId'>
): Promise<number> {
  const sql = getSql();
  const rows = await sql`SELECT id FROM super_admins WHERE status = 'active'`;
  let count = 0;
  for (const row of rows as any[]) {
    await notify({ ...input, recipientKind: 'super_admin', recipientId: row.id });
    count++;
  }
  return count;
}

/** Notify one staff member (in-app + push). */
export async function notifyStaff(
  organizationId: string,
  staffId: string,
  input: Omit<NotifyInput, 'recipientKind' | 'recipientId' | 'organizationId'>
): Promise<NotifyResult> {
  return notify({ ...input, recipientKind: 'staff', recipientId: staffId, organizationId });
}

/** Send a templated email with delivery logging (email_logs). */
export async function sendTemplatedEmail(opts: {
  to: string;
  template: { subject: string; html: string; text: string };
  emailType: string;
  organizationId?: string | null;
  staffId?: string | null;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  const result = await sendEmail({
    to: opts.to,
    subject: opts.template.subject,
    html: opts.template.html,
    text: opts.template.text,
  });
  await logEmail({
    organizationId: opts.organizationId ?? undefined,
    staffId: opts.staffId ?? undefined,
    emailType: opts.emailType,
    recipientEmail: opts.to,
    subject: opts.template.subject,
    status: result.success ? 'sent' : 'failed',
    messageId: result.messageId,
    errorMessage: result.error,
    metadata: opts.metadata,
  });
  return result;
}

/** Convenience: email + in-app + push for one address/recipient pair. */
export async function notifyWithEmail(opts: NotifyInput & {
  email: string;
  template: { subject: string; html: string; text: string };
  emailType: string;
}): Promise<NotifyResult> {
  const result = await notify(opts);
  await sendTemplatedEmail({
    to: opts.email,
    template: opts.template,
    emailType: opts.emailType,
    organizationId: opts.organizationId,
    staffId: opts.recipientKind === 'staff' ? opts.recipientId : undefined,
  });
  return result;
}
