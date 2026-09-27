// Customer support widget API — bot-first chat for restaurant staff.
// Actions: boot | start | send | messages | review | history

import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import {
  bootChat, startChat, customerSend, submitReview, fetchMessagesForCustomer,
} from '@/lib/services/support-bot.service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx || ctx.isSuperAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const snapshot = await bootChat(ctx);
    return NextResponse.json({ data: snapshot });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load chat' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx || ctx.isSuperAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try { body = await request.json(); } catch { /* empty */ }

  const action = String(body.action || 'boot');
  const conversationId = body.conversationId ? String(body.conversationId) : '';

  try {
    switch (action) {
      case 'boot': {
        const snapshot = await bootChat(ctx);
        return NextResponse.json({ data: snapshot });
      }
      case 'start': {
        const snapshot = await startChat(ctx, body.subject ? String(body.subject) : undefined);
        return NextResponse.json({ data: snapshot });
      }
      case 'send': {
        if (!conversationId) return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
        const text = String(body.text || '').slice(0, 4000);
        const optionId = body.option ? String(body.option) : undefined;
        if (!text && !optionId) return NextResponse.json({ error: 'text or option is required' }, { status: 400 });
        const result = await customerSend(ctx, conversationId, text, optionId);
        return NextResponse.json({ data: result });
      }
      case 'messages': {
        if (!conversationId) return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
        const messages = await fetchMessagesForCustomer(ctx, conversationId);
        return NextResponse.json({ data: messages });
      }
      case 'review': {
        if (!conversationId) return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
        const rating = Number(body.rating || 0);
        if (rating < 1 || rating > 5) return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 });
        const result = await submitReview(ctx, conversationId, rating, body.review ? String(body.review) : '');
        return NextResponse.json({ data: result });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Chat failed' }, { status: 500 });
  }
}
