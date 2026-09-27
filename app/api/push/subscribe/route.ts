// Web push subscription management (per authenticated recipient).

import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { saveSubscription, removeSubscription, getVapidPublicKey } from '@/lib/services/push.service';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey(), configured: Boolean(getVapidPublicKey()) });
}

export async function POST(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const endpoint = String(body?.endpoint || '');
  const p256dh = String(body?.keys?.p256dh || '');
  const auth = String(body?.keys?.auth || '');
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'endpoint and keys.p256dh/keys.auth are required' }, { status: 400 });
  }
  if (endpoint.length > 2000) return NextResponse.json({ error: 'Endpoint too long' }, { status: 400 });

  try {
    await saveSubscription({
      recipient_id: ctx.userId,
      recipient_kind: ctx.isSuperAdmin ? 'super_admin' : 'staff',
      endpoint,
      keys: { p256dh, auth },
      user_agent: request.headers.get('user-agent')?.slice(0, 255) || undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let endpoint = '';
  try {
    const body = await request.json();
    endpoint = String(body?.endpoint || '');
  } catch {
    endpoint = request.nextUrl.searchParams.get('endpoint') || '';
  }
  if (!endpoint) return NextResponse.json({ error: 'endpoint is required' }, { status: 400 });
  await removeSubscription(endpoint, ctx.userId);
  return NextResponse.json({ ok: true });
}
