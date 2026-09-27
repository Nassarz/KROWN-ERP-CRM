import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/neon-server';
import { extractTenantContext } from '@/lib/tenant';
import { generateId } from '@/lib/id';
import { sendPasswordResetEmail } from '@/lib/services/password-reset.service';
import { ensureAnnualSubscription } from '@/lib/services/subscription.service';
import { logAuditEvent } from '@/lib/audit';
import { cached, cacheClear } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const ctx = extractTenantContext(request);
    if (!ctx || ctx.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    const orgs = await cached('sa:orgs:v1', 15_000, () => getSql()`
      SELECT o.*,
        (SELECT COUNT(*)::int FROM branches WHERE organization_id = o.id) as branch_count,
        (SELECT COUNT(*)::int FROM staff WHERE organization_id = o.id) as staff_count,
        (SELECT ts.status FROM tenant_subscriptions ts WHERE ts.organization_id = o.id ORDER BY ts.created_at DESC LIMIT 1) as subscription_status,
        COALESCE(
          (SELECT sp.display_name FROM tenant_subscriptions ts JOIN subscription_plans sp ON sp.id = ts.plan_id
           WHERE ts.organization_id = o.id ORDER BY ts.created_at DESC LIMIT 1),
          'Annual'::text
        ) as plan_name,
        (SELECT ts.current_period_end FROM tenant_subscriptions ts WHERE ts.organization_id = o.id ORDER BY ts.created_at DESC LIMIT 1) as subscription_expires_at
      FROM organizations o
      ORDER BY o.created_at DESC
    `);

    return NextResponse.json(
      { data: orgs },
      { headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=30' } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load restaurants' }, { status: 500 });
  }
}

function buildSlug(name: string): string {
  let base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!base) base = 'restaurant';
  return base.slice(0, 80);
}

export async function POST(request: NextRequest) {
  try {
    const ctx = extractTenantContext(request);
    if (!ctx || ctx.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const contactEmail = String(body?.contactEmail || '').trim();
    const contactPhone = String(body?.contactPhone || '').trim();
    const taxId = String(body?.taxId || '').trim();
    const address = String(body?.address || '').trim();
    const branchName = String(body?.branchName || '').trim() || 'Main Branch';
    const branchLocation = String(body?.branchLocation || '').trim() || address || 'Kampala, Uganda';
    const adminName = String(body?.adminName || '').trim();
    const adminEmail = String(body?.adminEmail || '').trim().toLowerCase();
    const managerName = String(body?.managerName || '').trim();
    const managerEmail = String(body?.managerEmail || '').trim().toLowerCase();
    const managerPhone = String(body?.managerPhone || '').trim();
    const planName = String(body?.planName || 'growth').trim().toLowerCase();

    if (!name) return NextResponse.json({ error: 'Restaurant name is required' }, { status: 400 });
    if (!adminName) return NextResponse.json({ error: 'Restaurant Admin name is required' }, { status: 400 });
    if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return NextResponse.json({ error: 'A valid Restaurant Admin email is required' }, { status: 400 });
    }
    if (managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail)) {
      return NextResponse.json({ error: 'A valid Branch Manager email is required' }, { status: 400 });
    }

    const sql = getSql();

    const duplicate = await sql`
      SELECT 'staff' AS src FROM staff WHERE lower(email) = ${adminEmail}
      UNION ALL
      SELECT 'staff' FROM staff WHERE ${managerEmail} <> '' AND lower(email) = ${managerEmail}
      UNION ALL
      SELECT 'admin' FROM super_admins WHERE lower(email) = ${adminEmail}
      UNION ALL
      SELECT 'admin' FROM super_admins WHERE ${managerEmail} <> '' AND lower(email) = ${managerEmail}
      LIMIT 1
    `;
    if (duplicate.length) {
      return NextResponse.json({ error: 'That email address is already in use' }, { status: 409 });
    }

    const orgId = generateId();
    const branchId = generateId();
    const adminId = generateId();
    const managerId = generateId();

    const baseSlug = buildSlug(name);
    let slug = baseSlug;
    const slugTaken = await sql`SELECT 1 FROM organizations WHERE slug = ${slug} LIMIT 1`;
    if (slugTaken.length) slug = `${baseSlug.slice(0, 68)}-${orgId.replace(/-/g, '').slice(0, 11)}`;

    // No passwords are ever created here — accounts start without a password and
    // receive an automated password-reset email instead.
    try {
      await sql`
        INSERT INTO organizations (id, name, slug, contact_email, contact_phone, tax_id, address, status, settings)
        VALUES (${orgId}, ${name}, ${slug}, ${contactEmail || null}, ${contactPhone || null}, ${taxId || null}, ${address || null}, 'active', '{"unlimited_access": true}'::jsonb)
      `;
      await sql`
        INSERT INTO branches (id, name, location, city, manager, manager_name, phone, email, tax_id, organization_id, status)
        VALUES (${branchId}, ${branchName}, ${branchLocation}, NULL, ${managerName || adminName}, ${managerName || adminName}, ${managerPhone || contactPhone || null}, ${managerEmail || contactEmail || null}, ${taxId || null}, ${orgId}, 'active')
      `;
      await sql`
        INSERT INTO staff (id, name, email, phone, role, branch, assigned_branch_id, organization_id, status, password_hash, password_argon2, email_verified, device_bound, created_at, updated_at)
        VALUES (${adminId}, ${adminName}, ${adminEmail}, ${contactPhone || null}, 'restaurant_admin', ${branchName}, ${branchId}, ${orgId}, 'active', NULL, NULL, false, false, NOW(), NOW())
      `;
      if (managerName && managerEmail) {
        await sql`
          INSERT INTO staff (id, name, email, phone, role, branch, assigned_branch_id, organization_id, status, password_hash, password_argon2, email_verified, device_bound, created_at, updated_at)
          VALUES (${managerId}, ${managerName}, ${managerEmail}, ${managerPhone || null}, 'manager', ${branchName}, ${branchId}, ${orgId}, 'active', NULL, NULL, false, false, NOW(), NOW())
        `;
      }
    } catch (e: any) {
      // Best-effort cleanup so a partial failure never leaves an orphaned restaurant.
      await sql`DELETE FROM staff WHERE id IN (${adminId}, ${managerId})`.catch(() => {});
      await sql`DELETE FROM branches WHERE id = ${branchId}`.catch(() => {});
      await sql`DELETE FROM organizations WHERE id = ${orgId}`.catch(() => {});
      throw e;
    }

    // Every restaurant is onboarded on a 12-month annual subscription.
    const subscription = await ensureAnnualSubscription(orgId, planName).catch(() => null);
    cacheClear('sa:');

    await logAuditEvent({
      organizationId: orgId, userId: ctx.userId, userEmail: 'super_admin', actorRole: 'super_admin',
      action: 'SUPER_ADMIN_ORG_CREATE', targetType: 'organization', targetId: orgId,
      details: { name, slug, adminEmail, branchName, planName, billingCycle: 'annual' },
    }).catch(() => {});

    // Automated password setup: nobody types a password during creation.
    const adminEmailResult = await sendPasswordResetEmail(adminId, 'KROWN Platform').catch(err => ({ success: false, error: err?.message || 'send failed' }));
    const managerEmailResult = managerName && managerEmail
      ? await sendPasswordResetEmail(managerId, 'KROWN Platform').catch(err => ({ success: false, error: err?.message || 'send failed' }))
      : null;

    const emailSent = adminEmailResult.success && (!managerEmailResult || managerEmailResult.success);
    const message = emailSent
      ? `Restaurant created. Password setup emails sent to ${adminEmail}${managerEmailResult ? ` and ${managerEmail}` : ''}.`
      : `Restaurant created, but a password setup email could not be sent (${adminEmailResult.error || managerEmailResult?.error || 'unknown error'}). You can resend it from the Users tab.`;

    return NextResponse.json({
      data: {
        organization: { id: orgId, name, slug },
        branch: { id: branchId, name: branchName },
        admin: { id: adminId, name: adminName, email: adminEmail, role: 'restaurant_admin' },
        manager: managerName && managerEmail ? { id: managerId, name: managerName, email: managerEmail, role: 'manager' } : null,
        unlimited: true,
        planName: subscription?.plan_name || planName,
        billingCycle: 'annual',
        subscriptionExpiresAt: subscription?.current_period_end || null,
        resetEmailSent: emailSent,
        message,
      },
    }, { status: 201 });
  } catch (e: any) {
    const message = e?.message || 'Failed to create restaurant';
    const status = /already in use|already exists|required|valid/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
