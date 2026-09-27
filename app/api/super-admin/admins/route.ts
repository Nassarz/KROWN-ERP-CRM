import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';
import { hashPassword } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { cached, cacheClear } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const sql = getSql();
  try {
    const admins = await cached('sa:admins:v1', 10_000, () => sql`
      SELECT id, name, email, status, created_at, last_login_at
      FROM super_admins
      ORDER BY created_at DESC
    `);
    return NextResponse.json(
      { data: admins },
      { headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=15' } }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list admins' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, password } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
  }
  if (password && password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const sql = getSql();
  try {
    const existing = await sql`SELECT id FROM super_admins WHERE email = ${email.toLowerCase().trim()} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    // No password is chosen during creation — it is provisioned later from the
    // Super Admins table via "Set Password" (direct portal reset).
    const password_hash = password ? await hashPassword(password) : null;
    const result = await sql`
      INSERT INTO super_admins (name, email, password_hash, status)
      VALUES (${name}, ${email.toLowerCase().trim()}, ${password_hash}, 'active')
      RETURNING id, name, email, status, created_at
    `;

    await logAuditEvent({
      userId: ctx.userId, userEmail: 'super_admin', actorRole: 'super_admin',
      action: 'SUPER_ADMIN_ACCOUNT_CREATE', targetType: 'super_admin', targetId: result[0].id,
      details: { name, email: email.toLowerCase().trim(), passwordSet: Boolean(password) },
    }).catch(() => {});

    cacheClear('sa:');

    return NextResponse.json({
      data: result[0],
      message: password
        ? 'Admin created'
        : 'Admin created. Use "Set Password" to provision their login credentials.',
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create admin' }, { status: 500 });
  }
}
