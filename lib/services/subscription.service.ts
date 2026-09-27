// KROWN — annual subscription service.
// Access remains unlimited (we never cut a tenant off silently); subscriptions
// exist for annual billing, renewals and expiry notifications.

import { getSql } from '@/lib/neon-server';
import { generateId } from '@/lib/id';
import { notify, notifySuperAdmins, sendTemplatedEmail } from './notify';
import { subscriptionExpiryEmail, subscriptionExpiredEmail } from './email-templates';
import { getAppUrl } from './email.service';

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  monthly_price_ugx: number;
  annual_price_ugx: number;
  billing_cycle: string;
  max_branches: number;
  max_staff: number;
  max_menu_items: number;
  max_orders_per_day: number;
  features: string[];
  is_active: boolean;
  created_at: any;
}

export interface OrgSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  plan_name?: string;
  plan_display_name?: string;
  status: string;
  billing_cycle: string;
  started_at: any;
  current_period_start: any;
  current_period_end: any;
  renewal_notified_at?: any;
  expired_notified_at?: any;
  trial_ends_at?: any;
  cancel_at?: any;
  created_at: any;
}

export interface UsageCounts {
  branches: number;
  staff: number;
  menu_items: number;
  orders_today: number;
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export async function getPlans(): Promise<SubscriptionPlan[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM subscription_plans WHERE is_active = true
    ORDER BY annual_price_ugx ASC
  `;
  return rows as unknown as SubscriptionPlan[];
}

export async function getOrgSubscription(orgId: string): Promise<OrgSubscription | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT ts.*, sp.name as plan_name, sp.display_name as plan_display_name
    FROM tenant_subscriptions ts
    LEFT JOIN subscription_plans sp ON sp.id = ts.plan_id
    WHERE ts.organization_id = ${orgId}
    ORDER BY ts.created_at DESC
    LIMIT 1
  `;
  return (rows[0] as unknown as OrgSubscription) || null;
}

/**
 * Create the standard 12-month subscription for a freshly onboarded restaurant.
 * Idempotent: returns the existing row when one already exists.
 */
export async function ensureAnnualSubscription(
  orgId: string,
  planName?: string | null
): Promise<OrgSubscription> {
  const sql = getSql();
  const existing = await getOrgSubscription(orgId);
  if (existing) return existing;

  const desired = (planName || 'growth').trim().toLowerCase();
  const planRows = await sql`SELECT id, name FROM subscription_plans WHERE is_active = true`;
  const plans = planRows as any[];
  const plan =
    plans.find(p => String(p.name).toLowerCase() === desired) ||
    plans.find(p => String(p.name).toLowerCase() === 'growth') ||
    plans[0];
  if (!plan) throw new Error('No active subscription plans are configured');

  const id = generateId();
  await sql`
    INSERT INTO tenant_subscriptions
      (id, organization_id, plan_id, status, started_at, current_period_start, current_period_end, billing_cycle, plan_name)
    VALUES
      (${id}, ${orgId}, ${plan.id}, 'active', NOW(), NOW(), NOW() + INTERVAL '1 year', 'annual', ${plan.name})
  `;
  return (await getOrgSubscription(orgId)) as OrgSubscription;
}

/** Renew (extend 12 months from now or from the current end if still ahead). */
export async function renewSubscription(subId: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE tenant_subscriptions
    SET current_period_start = GREATEST(NOW(), COALESCE(current_period_start, NOW())),
        current_period_end = GREATEST(NOW(), COALESCE(current_period_end, NOW())) + INTERVAL '1 year',
        status = 'active',
        renewal_notified_at = NULL,
        expired_notified_at = NULL
    WHERE id = ${subId}
  `;
}

// ── Expiry checker (cron / instrumentation / on-demand) ────────────────────

export interface ExpiryCheckResult {
  warned: number;
  expired: number;
  checkedAt: string;
}

/**
 * - Warn (2 days before expiry, once): restaurant admins + super admins,
 *   via in-app notification, web push and email.
 * - Expire (on/after expiry date, once): flip status and notify the same way.
 */
export async function checkSubscriptionExpiries(): Promise<ExpiryCheckResult> {
  const sql = getSql();
  const now = new Date();
  const nowIso = now.toISOString();
  const warnBefore = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

  // 1) Expiring within 2 days and not yet warned
  const expiring = await sql`
    SELECT ts.id, ts.organization_id, ts.plan_name, ts.current_period_end,
           o.name as org_name
    FROM tenant_subscriptions ts
    JOIN organizations o ON o.id = ts.organization_id
    WHERE ts.status = 'active'
      AND ts.current_period_end IS NOT NULL
      AND ts.current_period_end <= ${warnBefore}
      AND ts.current_period_end > ${nowIso}
      AND ts.renewal_notified_at IS NULL
  `;

  let warned = 0;
  for (const row of expiring as any[]) {
    const daysLeft = Math.max(0, Math.ceil((new Date(row.current_period_end).getTime() - now.getTime()) / 86_400_000));
    const expiresAt = new Date(row.current_period_end).toUTCString();
    const planName = row.plan_name || 'Annual';
    const renewUrl = `${getAppUrl()}/super-admin?tab=billing`;

    // Super admins (in-app + push + email)
    const admins = (await sql`SELECT id, name, email FROM super_admins WHERE status = 'active'`) as any[];
    for (const admin of admins) {
      const tpl = subscriptionExpiryEmail({
        recipientName: admin.name || 'Super Admin',
        restaurantName: row.org_name,
        planName,
        expiresAt,
        daysLeft,
        renewUrl,
        toSuperAdmin: true,
      });
      await notify({
        recipientKind: 'super_admin',
        recipientId: admin.id,
        type: 'subscription_expiring',
        title: `${row.org_name} subscription expires ${daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}`,
        message: `${planName} annual plan ends ${expiresAt}.`,
        priority: 'high',
        linkUrl: '/super-admin?tab=billing',
        linkType: 'tab',
        metadata: { organizationId: row.organization_id, daysLeft },
      }).catch(() => {});
      await sendTemplatedEmail({ to: admin.email, emailType: 'subscription_expiring', template: tpl }).catch(() => {});
    }

    // Restaurant administrators (in-app + push + email)
    const adminsOfOrg = (await sql`
      SELECT id, name, email FROM staff
      WHERE organization_id = ${row.organization_id}
        AND lower(role) IN ('restaurant_admin', 'admin')
        AND status = 'active'
        AND email IS NOT NULL
    `) as any[];
    for (const staff of adminsOfOrg) {
      const tpl = subscriptionExpiryEmail({
        recipientName: staff.name || 'Administrator',
        restaurantName: row.org_name,
        planName,
        expiresAt,
        daysLeft,
        renewUrl,
      });
      await notify({
        recipientKind: 'staff',
        recipientId: staff.id,
        organizationId: row.organization_id,
        type: 'subscription_expiring',
        title: `Your subscription expires ${daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}`,
        message: `Your ${planName} annual plan ends ${expiresAt}. Renew to avoid interruption.`,
        priority: 'high',
        linkUrl: '/',
        metadata: { daysLeft },
      }).catch(() => {});
      await sendTemplatedEmail({ to: staff.email, emailType: 'subscription_expiring', template: tpl, organizationId: row.organization_id, staffId: staff.id }).catch(() => {});
    }

    await sql`UPDATE tenant_subscriptions SET renewal_notified_at = NOW() WHERE id = ${row.id}`.catch(() => {});
    warned++;
  }

  // 2) Expired (period end passed, still marked active) — notify once
  const expired = await sql`
    SELECT ts.id, ts.organization_id, ts.plan_name, ts.current_period_end, o.name as org_name
    FROM tenant_subscriptions ts
    JOIN organizations o ON o.id = ts.organization_id
    WHERE ts.status = 'active'
      AND ts.current_period_end IS NOT NULL
      AND ts.current_period_end <= ${nowIso}
      AND ts.expired_notified_at IS NULL
  `;

  let expiredCount = 0;
  for (const row of expired as any[]) {
    const expiredAt = new Date(row.current_period_end).toUTCString();
    const planName = row.plan_name || 'Annual';
    const renewUrl = `${getAppUrl()}/super-admin?tab=billing`;

    const admins = (await sql`SELECT id, name, email FROM super_admins WHERE status = 'active'`) as any[];
    for (const admin of admins) {
      const tpl = subscriptionExpiredEmail({
        recipientName: admin.name || 'Super Admin',
        restaurantName: row.org_name,
        planName,
        expiredAt,
        renewUrl,
        toSuperAdmin: true,
      });
      await notify({
        recipientKind: 'super_admin',
        recipientId: admin.id,
        type: 'subscription_expired',
        title: `${row.org_name} subscription expired`,
        message: `${planName} annual plan ended ${expiredAt}.`,
        priority: 'urgent',
        linkUrl: '/super-admin?tab=billing',
        linkType: 'tab',
        metadata: { organizationId: row.organization_id },
      }).catch(() => {});
      await sendTemplatedEmail({ to: admin.email, emailType: 'subscription_expired', template: tpl }).catch(() => {});
    }

    const adminsOfOrg = (await sql`
      SELECT id, name, email FROM staff
      WHERE organization_id = ${row.organization_id}
        AND lower(role) IN ('restaurant_admin', 'admin')
        AND status = 'active'
        AND email IS NOT NULL
    `) as any[];
    for (const staff of adminsOfOrg) {
      const tpl = subscriptionExpiredEmail({
        recipientName: staff.name || 'Administrator',
        restaurantName: row.org_name,
        planName,
        expiredAt,
        renewUrl,
      });
      await notify({
        recipientKind: 'staff',
        recipientId: staff.id,
        organizationId: row.organization_id,
        type: 'subscription_expired',
        title: 'Your subscription has expired',
        message: `The ${planName} annual plan ended ${expiredAt}. Renew to restore full service.`,
        priority: 'urgent',
        linkUrl: '/',
        metadata: {},
      }).catch(() => {});
      await sendTemplatedEmail({ to: staff.email, emailType: 'subscription_expired', template: tpl, organizationId: row.organization_id, staffId: staff.id }).catch(() => {});
    }

    await sql`
      UPDATE tenant_subscriptions SET status = 'expired', expired_notified_at = NOW() WHERE id = ${row.id}
    `.catch(() => {});
    expiredCount++;
  }

  return { warned, expired: expiredCount, checkedAt: now.toISOString() };
}

/** Usage is reported for operational analytics, not billing caps. */
export async function getUsage(orgId: string): Promise<UsageCounts> {
  const sql = getSql();
  const [branches, staff, menuItems, ordersToday] = (await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM branches WHERE organization_id = ${orgId}`,
    sql`SELECT COUNT(*)::int as count FROM staff WHERE organization_id = ${orgId} AND role != 'super_admin'`,
    sql`SELECT COUNT(*)::int as count FROM products WHERE organization_id = ${orgId}`,
    sql`SELECT COUNT(*)::int as count FROM orders WHERE organization_id = ${orgId} AND created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'`,
  ])) as { count: number }[][];

  return {
    branches: branches[0]?.count ?? 0,
    staff: staff[0]?.count ?? 0,
    menu_items: menuItems[0]?.count ?? 0,
    orders_today: ordersToday[0]?.count ?? 0,
  };
}

/** Kept for API compatibility: access is never capped. */
export async function checkLimit(
  _orgId: string,
  _resource: 'branches' | 'staff' | 'menu_items' | 'orders',
  currentCount: number
): Promise<{ allowed: boolean; limit: number; current: number }> {
  return { allowed: true, limit: Number.POSITIVE_INFINITY, current: currentCount };
}
