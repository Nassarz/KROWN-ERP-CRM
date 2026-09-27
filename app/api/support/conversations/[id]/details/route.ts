// Rep-facing user details for a support conversation: who they are, which
// restaurant/branch/device they use, and their recent login sessions.

import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = extractTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const sql = getSql();

  try {
    const convRows = await sql`
      SELECT sc.id, sc.organization_id, sc.customer_staff_id, sc.device_id, sc.subject, sc.status, sc.created_at
      FROM support_conversations sc
      WHERE sc.id = ${id}
    `;
    if (!convRows.length) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    const conv = convRows[0] as any;

    const [staffRows, orgRows, deviceRows, loginRows] = await Promise.all([
      conv.customer_staff_id
        ? sql`SELECT id, name, email, phone, role, branch, status, last_login_at, created_at FROM staff WHERE id = ${conv.customer_staff_id}`
        : Promise.resolve([] as any[]),
      conv.organization_id
        ? sql`SELECT id, name, slug, contact_email, contact_phone FROM organizations WHERE id = ${conv.organization_id}`
        : Promise.resolve([] as any[]),
      conv.device_id
        ? sql`SELECT id, device_name, device_type, status, last_seen_at, created_at FROM devices WHERE id = ${conv.device_id}`
        : Promise.resolve([] as any[]),
      conv.customer_staff_id
        ? sql`
            SELECT id, device_id, ip_address, user_agent, status, created_at, last_active_at, expires_at
            FROM staff_sessions
            WHERE staff_id = ${conv.customer_staff_id}
            ORDER BY created_at DESC
            LIMIT 30
          `
        : Promise.resolve([] as any[]),
    ]);

    const staff = (staffRows[0] as any) || null;
    const organization = (orgRows[0] as any) || null;
    const device = (deviceRows[0] as any) || null;

    // Group login sessions by calendar date (newest first).
    const loginsByDate: Record<string, any[]> = {};
    for (const s of loginRows as any[]) {
      const d = new Date(s.created_at).toISOString().slice(0, 10);
      (loginsByDate[d] ||= []).push({
        id: s.id,
        time: s.created_at,
        ip: s.ip_address,
        device: s.device_id,
        userAgent: (s.user_agent || '').slice(0, 120),
        status: s.status,
        lastActiveAt: s.last_active_at,
      });
    }
    const loginDates = Object.keys(loginsByDate).sort((a, b) => b.localeCompare(a));

    return NextResponse.json({
      data: {
        conversation: { id: conv.id, subject: conv.subject, status: conv.status, createdAt: conv.created_at },
        staff,
        organization,
        device,
        loginsByDate,
        loginDates,
        totalLogins: (loginRows as any[]).length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load user details' }, { status: 500 });
  }
}
