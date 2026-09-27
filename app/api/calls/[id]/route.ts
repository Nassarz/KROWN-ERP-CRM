// Single call session: SDP answer, ICE candidates, accept/decline/hangup.

import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';

export const runtime = 'nodejs';

async function loadCall(sql: any, id: string) {
  const rows = await sql`SELECT * FROM call_sessions WHERE id = ${id}`;
  return rows[0] || null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const sql = getSql();
  try {
    const call = await loadCall(sql, id);
    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    if (call.caller_id !== ctx.userId && call.callee_id !== ctx.userId && !ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ data: call }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load call' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const sql = getSql();

  let body: any = {};
  try { body = await request.json(); } catch { /* empty */ }

  try {
    const call = await loadCall(sql, id);
    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });

    if (body.action === 'candidate') {
      const from = call.caller_id === ctx.userId ? 'caller' : call.callee_id === ctx.userId ? 'callee' : null;
      if (!from) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const cand = { from, candidate: body.candidate || null, at: Date.now() };
      await sql`
        UPDATE call_sessions
        SET candidates = candidates || ${JSON.stringify([cand])}::jsonb
        WHERE id = ${id}
      `;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Call update failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const sql = getSql();

  let body: any = {};
  try { body = await request.json(); } catch { /* empty */ }
  const action = String(body.action || '');

  try {
    const call = await loadCall(sql, id);
    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });

    const isCaller = call.caller_id === ctx.userId;
    const isCallee = call.callee_id === ctx.userId;
    if (!isCaller && !isCallee && !ctx.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    switch (action) {
      case 'accept': {
        if (!isCallee) return NextResponse.json({ error: 'Only the callee can accept' }, { status: 403 });
        if (call.status !== 'ringing') return NextResponse.json({ error: `Call is ${call.status}` }, { status: 409 });
        await sql`
          UPDATE call_sessions
          SET status = 'answered', answer = ${JSON.stringify(body.answer || null)}::jsonb, answered_at = NOW()
          WHERE id = ${id}
        `;
        break;
      }
      case 'decline': {
        if (!isCallee) return NextResponse.json({ error: 'Only the callee can decline' }, { status: 403 });
        await sql`UPDATE call_sessions SET status = 'declined', ended_at = NOW() WHERE id = ${id} AND status = 'ringing'`;
        break;
      }
      case 'hangup': {
        await sql`UPDATE call_sessions SET status = 'ended', ended_at = NOW() WHERE id = ${id} AND status IN ('ringing', 'answered', 'declined')`;
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const fresh = await loadCall(sql, id);
    return NextResponse.json({ data: fresh });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Call update failed' }, { status: 500 });
  }
}
