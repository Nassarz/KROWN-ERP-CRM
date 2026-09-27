// Voice call signaling (DB-backed polling + WebRTC SDP exchange).
// POST: super-admin creates an outgoing call (ringing).
// GET inbox: staff polls for an incoming call; GET outbox: super-admin polls outgoing.

import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';
import { notify } from '@/lib/services/notify';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sql = getSql();
  const url = new URL(request.url);
  const inbox = url.searchParams.get('inbox');
  const outbox = url.searchParams.get('outbox');

  try {
    if (inbox) {
      // Staff: latest call addressed to me in the last 2 minutes.
      const rows = await sql`
        SELECT * FROM call_sessions
        WHERE callee_id = ${ctx.userId}
          AND started_at > NOW() - INTERVAL '2 minutes'
        ORDER BY started_at DESC
        LIMIT 1
      `;
      return NextResponse.json({ data: rows[0] || null }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (outbox) {
      // Super admin: my recent outgoing calls that are still live (plus the last one).
      const rows = await sql`
        SELECT * FROM call_sessions
        WHERE caller_id = ${ctx.userId}
          AND started_at > NOW() - INTERVAL '5 minutes'
        ORDER BY started_at DESC
        LIMIT 5
      `;
      return NextResponse.json({ data: rows }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ error: 'inbox or outbox is required' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load calls' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx || !ctx.isSuperAdmin) {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const gate = rateLimit(`call-create:${ctx.userId}`, 20, 60_000);
  if (!gate.allowed) return NextResponse.json({ error: 'Too many call attempts' }, { status: 429 });

  let body: any = {};
  try { body = await request.json(); } catch { /* empty */ }
  const calleeId = body.calleeId ? String(body.calleeId) : '';
  if (!calleeId) return NextResponse.json({ error: 'calleeId is required' }, { status: 400 });

  const sql = getSql();
  try {
    const callee = (await sql`SELECT id, name, organization_id FROM staff WHERE id = ${calleeId} AND status <> 'suspended'`) as any[];
    if (!callee.length) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });

    // One live outgoing call at a time per SA.
    const live = (await sql`
      SELECT id FROM call_sessions
      WHERE caller_id = ${ctx.userId} AND status IN ('ringing', 'answered')
      LIMIT 1
    `) as any[];
    if (live.length) {
      await sql`UPDATE call_sessions SET status = 'ended', ended_at = NOW() WHERE id = ${live[0].id}`;
    }

    const id = crypto.randomUUID();
    await sql`
      INSERT INTO call_sessions (id, caller_id, caller_kind, callee_id, callee_kind, organization_id, status, offer)
      VALUES (${id}, ${ctx.userId}, 'super_admin', ${calleeId}, 'staff', ${callee[0].organization_id || null}, 'ringing', ${JSON.stringify(body.offer || null)}::jsonb)
    `;

    await notify({
      recipientKind: 'staff',
      recipientId: calleeId,
      organizationId: callee[0].organization_id || null,
      type: 'incoming_call',
      title: 'Incoming call from KROWN Support',
      message: 'A KROWN super admin is calling you.',
      priority: 'high',
      linkUrl: '/support',
      linkType: 'tab',
      metadata: { callId: id },
    }).catch(() => {});

    const rows = await sql`SELECT * FROM call_sessions WHERE id = ${id}`;
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to start call' }, { status: 500 });
  }
}
