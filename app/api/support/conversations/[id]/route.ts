import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getConversation, updateStatus, resolveConversation, closeConversation, reopenConversation } from '@/lib/services/support.service';
import { getSql } from '@/lib/neon-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = extractTenantContext(request);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await getConversation(ctx, id);
    if (!result) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = extractTenantContext(request);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status: newStatus, ended } = body;

    if (!newStatus) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    let conversation;
    switch (newStatus) {
      case 'resolved':
        conversation = await resolveConversation(ctx, id);
        break;
      case 'closed':
        conversation = await closeConversation(ctx, id);
        break;
      case 'open':
        conversation = await reopenConversation(ctx, id);
        break;
      default:
        conversation = await updateStatus(ctx, id, newStatus);
    }

    // Rep ends the chat: history stays for the rep, hidden from the customer.
    if (ended) {
      const sql = getSql();
      await sql`
        UPDATE support_conversations
        SET hidden_for_customer = true, ended_by = 'agent', ended_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
      `.catch(() => {});
      const rows = await sql`SELECT * FROM support_conversations WHERE id = ${id}`;
      conversation = rows[0] || conversation;
    }

    return NextResponse.json({ data: conversation });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e.message || 'Internal server error' }, { status: 500 });
  }
}
