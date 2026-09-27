// KROWN — customer support bot state machine (widget-facing).
// Bot-first triage → knowledge-base answers → human only as the last option →
// review request on resolution → escalation notices to super admins.

import { getSql } from '@/lib/neon-server';
import { TenantContext, setTenantContext } from '@/lib/tenant';
import { generateId } from '@/lib/id';
import { getAIResponse } from './support.service';
import { notify, sendTemplatedEmail } from './notify';
import { supportEscalationEmail } from './email-templates';

export interface BotOption {
  id: string;
  label: string;
  human?: boolean;
  intent?: string;
}

export const TRIAGE_OPTIONS: BotOption[] = [
  { id: 'login', label: 'Login problems', intent: 'login' },
  { id: 'slow', label: 'App is slow or freezing', intent: 'slow' },
  { id: 'orders', label: 'Orders or billing issue', intent: 'orders' },
  { id: 'printer', label: 'Printer or hardware', intent: 'printer' },
  { id: 'other', label: 'Something else', intent: 'other' },
  { id: 'human', label: 'Talk to a human', human: true }, // LAST option, always last
];

const CONFIRM_OPTIONS: BotOption[] = [
  { id: 'solved', label: "Yes, that solved it" },
  { id: 'broken', label: 'No, still broken' },
  { id: 'human', label: 'Talk to a human', human: true },
];

const INTENT_SEED_QUESTIONS: Record<string, string> = {
  login: 'I cannot log in to KROWN POS',
  slow: 'The app is slow or freezing',
  orders: 'Problem with orders or billing',
  printer: 'Printer is not working',
  other: '',
};

export interface ChatSnapshot {
  conversation: any | null;
  messages: any[];
  stage: string;
  options: BotOption[];
  botState: any;
  history: any[];
}

function normalizeStage(state: any): string {
  return String(state?.stage || 'triage');
}

async function loadConversation(ctx: TenantContext, convId: string): Promise<any | null> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  const rows = await sql`
    SELECT * FROM support_conversations
    WHERE id = ${convId} AND organization_id = ${ctx.organizationId}
  `;
  return (rows[0] as any) || null;
}

async function loadMessages(convId: string, limit = 200): Promise<any[]> {
  const sql = getSql();
  return await sql`
    SELECT * FROM support_messages
    WHERE conversation_id = ${convId}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
}

async function listHistory(ctx: TenantContext): Promise<any[]> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  return await sql`
    SELECT id, subject, status, rating, reviewed_at, hidden_for_customer, created_at, updated_at
    FROM support_conversations
    WHERE organization_id = ${ctx.organizationId}
      AND customer_staff_id = ${ctx.userId}
      AND (hidden_for_customer = false OR hidden_for_customer IS NULL)
    ORDER BY updated_at DESC
    LIMIT 10
  `;
}

async function saveMessage(
  convId: string,
  ctx: TenantContext,
  content: string,
  senderType: 'customer' | 'ai' | 'agent' | 'system',
  metadata?: Record<string, any>
): Promise<any> {
  const sql = getSql();
  const id = generateId();
  await sql`
    INSERT INTO support_messages (id, conversation_id, sender_id, sender_type, content, message_type, is_internal_note, metadata, organization_id, branch_id)
    VALUES (${id}, ${convId}, ${ctx.userId}, ${senderType}, ${content}, 'text', false, ${JSON.stringify(metadata || {})}, ${ctx.organizationId}, ${ctx.branchId || null})
  `;
  if (senderType === 'customer') {
    await sql`
      UPDATE support_conversations
      SET last_customer_message_at = NOW(), updated_at = NOW(),
          status = CASE WHEN status IN ('open', 'waiting_for_customer') THEN 'waiting_for_support' ELSE status END
      WHERE id = ${convId}
    `;
  } else if (senderType === 'agent') {
    await sql`
      UPDATE support_conversations
      SET last_agent_message_at = NOW(), updated_at = NOW(), human_joined = true,
          first_response_at = COALESCE(first_response_at, NOW())
      WHERE id = ${convId}
    `;
  }
  const rows = await sql`SELECT * FROM support_messages WHERE id = ${id}`;
  return rows[0];
}

async function saveState(convId: string, state: Record<string, any>): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE support_conversations SET bot_state = ${JSON.stringify(state)}::jsonb, updated_at = NOW()
    WHERE id = ${convId}
  `;
}

// ── Escalation ──────────────────────────────────────────────────────────────

async function escalateToHuman(ctx: TenantContext, conv: any, reason: string): Promise<void> {
  const sql = getSql();
  if (conv.escalated_at) {
    // Already escalated once — keep waiting, don't re-notify.
    await saveState(conv.id, { ...(conv.bot_state || {}), stage: 'waiting_human', escalated: true });
    return;
  }

  const state = { ...(conv.bot_state || {}), stage: 'waiting_human', escalated: true, reason };
  await sql`
    UPDATE support_conversations
    SET status = 'waiting_for_support', escalated_at = NOW(), bot_state = ${JSON.stringify(state)}::jsonb, updated_at = NOW()
    WHERE id = ${conv.id}
  `;

  const staffName = await (async () => {
    try {
      const rows = await sql`SELECT name, email FROM staff WHERE id = ${ctx.userId}`;
      return rows[0] as any;
    } catch { return null; }
  })();

  const orgName = await (async () => {
    try {
      const rows = await sql`SELECT name FROM organizations WHERE id = ${ctx.organizationId}`;
      return (rows[0] as any)?.name || 'Unknown restaurant';
    } catch { return 'Unknown restaurant'; }
  })();

  const escalateUrl = `${process.env.APP_URL || ''}/super-admin?tab=support`;

  let admins: any[] = [];
  try {
    admins = await sql`SELECT id, name, email FROM super_admins WHERE status = 'active'`;
  } catch { admins = []; }

  for (const admin of admins) {
    await notify({
      recipientKind: 'super_admin',
      recipientId: admin.id,
      type: 'support_escalation',
      title: 'Support chat escalated to human',
      message: `${staffName?.name || 'A user'} from ${orgName} needs a human agent: "${conv.subject}".`,
      priority: 'high',
      linkUrl: '/super-admin?tab=support',
      linkType: 'tab',
      metadata: { conversationId: conv.id, organizationId: ctx.organizationId },
    }).catch(() => {});
    await sendTemplatedEmail({
      to: admin.email,
      emailType: 'support_escalation',
      template: supportEscalationEmail({
        adminName: admin.name || 'Super Admin',
        customerName: staffName?.name || 'A user',
        restaurantName: orgName,
        subjectLine: conv.subject,
        category: conv.category || 'technical',
        conversationUrl: escalateUrl,
      }),
      metadata: { conversationId: conv.id },
    }).catch(() => {});
  }
}

// ── Public chat operations ─────────────────────────────────────────────────

/** Resume an active conversation or return null (widget shows "Start"). */
export async function bootChat(ctx: TenantContext): Promise<ChatSnapshot> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);

  const active = await sql`
    SELECT * FROM support_conversations
    WHERE organization_id = ${ctx.organizationId}
      AND customer_staff_id = ${ctx.userId}
      AND status NOT IN ('closed')
      AND (hidden_for_customer = false OR hidden_for_customer IS NULL)
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  const conversation = (active[0] as any) || null;
  const history = await listHistory(ctx);

  if (!conversation) {
    return { conversation: null, messages: [], stage: 'idle', options: [], botState: {}, history };
  }

  const messages = await loadMessages(conversation.id);
  const stage = normalizeStage(conversation.bot_state);
  let options: BotOption[] = [];
  if (stage === 'triage') options = TRIAGE_OPTIONS;
  else if (stage === 'await_confirm') options = CONFIRM_OPTIONS;
  else if (stage === 'await_review') options = [];

  return { conversation, messages, stage, options, botState: conversation.bot_state || {}, history };
}

/** Open (or reopen) a conversation and send the bot greeting. */
export async function startChat(ctx: TenantContext, subject?: string): Promise<ChatSnapshot> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);

  // Reuse an existing open conversation if present.
  const existing = await sql`
    SELECT * FROM support_conversations
    WHERE organization_id = ${ctx.organizationId}
      AND customer_staff_id = ${ctx.userId}
      AND status NOT IN ('closed')
      AND (hidden_for_customer = false OR hidden_for_customer IS NULL)
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  let conv: any = existing[0];
  if (!conv) {
    const id = generateId();
    const botState = { stage: 'triage' };
    await sql`
      INSERT INTO support_conversations
        (id, organization_id, customer_staff_id, category, status, priority, subject, bot_state, context)
      VALUES
        (${id}, ${ctx.organizationId}, ${ctx.userId}, 'technical', 'open', 'normal',
         ${subject || 'Support chat'}, ${JSON.stringify(botState)}::jsonb, ${JSON.stringify({ source: 'widget' })}::jsonb)
    `;
    conv = (await sql`SELECT * FROM support_conversations WHERE id = ${id}`)[0];
    await saveMessage(conv.id, ctx, "Hi! I'm the KROWN assistant. What's going on — pick a topic below or type it in your own words.", 'ai', { options: TRIAGE_OPTIONS });
  }

  return bootChat(ctx);
}

async function botReplyForTriage(text: string, optionId?: string): Promise<{ content: string; options: BotOption[] }> {
  const option = TRIAGE_OPTIONS.find(o => o.id === optionId);
  if (option?.human) {
    return { content: '__ESCALATE__', options: [] };
  }

  const seed = option?.intent
    ? INTENT_SEED_QUESTIONS[option.intent] || text
    : text || 'Something else';

  const ai = await getAIResponse(seed);
  if (ai.confidence === 0) {
    return {
      content: "Thanks for describing it. Could you tell me a bit more about what happens and when it started? (Or pick an option below — if I still can't fix it, I'll bring in a human.)",
      options: [
        { id: 'broken', label: 'Still not working' },
        { id: 'human', label: 'Talk to a human', human: true },
      ],
    };
  }
  return {
    content: `${ai.answer}\n\nDid this solve your problem?`,
    options: CONFIRM_OPTIONS,
  };
}

export async function customerSend(
  ctx: TenantContext,
  convId: string,
  text: string,
  optionId?: string
): Promise<{ conversation: any; newMessages: any[]; options: BotOption[]; stage: string }> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);

  const conv = await loadConversation(ctx, convId);
  if (!conv) throw new Error('Conversation not found');
  if (conv.hidden_for_customer) throw new Error('This conversation has ended. Start a new one.');
  if (conv.status === 'closed') throw new Error('This conversation is closed. Start a new one.');

  const state = conv.bot_state || {};
  const stage = normalizeStage(state);
  const created: any[] = [];

  // Persist the user's message first.
  if (text && !optionId) {
    created.push(await saveMessage(convId, ctx, text, 'customer'));
  } else if (optionId) {
    const opt = [...TRIAGE_OPTIONS, ...CONFIRM_OPTIONS].find(o => o.id === optionId);
    created.push(await saveMessage(convId, ctx, opt?.label || optionId, 'customer', { optionId }));
  }

  // ── Explicit "talk to a human" at any stage: LAST-resort escalation ──
  if (optionId === 'human') {
    await escalateToHuman(ctx, conv, 'User asked for a human');
    created.push(await saveMessage(
      convId, ctx,
      "Of course — I've alerted our human support team. A super-admin agent will jump in here shortly. You'll see a \"Human agent\" badge when they reply.",
      'ai'
    ));
    const fresh = await loadConversation(ctx, convId);
    return { conversation: fresh, newMessages: created, options: [], stage: 'waiting_human' };
  }

  if (stage === 'waiting_human') {
    // Customer keeps talking while waiting — just store it for the agent.
    const fresh = await loadConversation(ctx, convId);
    return { conversation: fresh, newMessages: created, options: [], stage: 'waiting_human' };
  }

  if (stage === 'await_review') {
    // Text input is ignored until a rating arrives; remind politely.
    created.push(await saveMessage(convId, ctx, 'Whenever you\'re ready, tap the stars above to rate the help you got — or just close this chat.', 'ai'));
    const fresh = await loadConversation(ctx, convId);
    return { conversation: fresh, newMessages: created, options: [], stage: 'await_review' };
  }

  if (stage === 'await_confirm' && optionId === 'solved') {
    await sql`
      UPDATE support_conversations
      SET status = 'resolved', resolved_at = NOW(), bot_state = ${JSON.stringify({ stage: 'await_review' })}::jsonb, updated_at = NOW()
      WHERE id = ${convId}
    `;
    created.push(await saveMessage(convId, ctx, "Wonderful! Glad that helped. Before you go — how would you rate this chat? ⭐", 'ai', { reviewPrompt: true }));
    const fresh = await loadConversation(ctx, convId);
    return { conversation: fresh, newMessages: created, options: [], stage: 'await_review' };
  }

  if (stage === 'await_confirm' && optionId === 'broken') {
    const attempts = Number(state.attempts || 0) + 1;
    if (attempts >= 2) {
      // Bot exhausted — human is the last resort.
      await escalateToHuman(ctx, conv, 'Bot could not resolve after 2 attempts');
      created.push(await saveMessage(
        convId, ctx,
        "I've reached the end of what I can fix automatically — I'm handing you over to a human specialist on our team now. Sorry for the runaround!",
        'ai'
      ));
      const fresh = await loadConversation(ctx, convId);
      return { conversation: fresh, newMessages: created, options: [], stage: 'waiting_human' };
    }
    const deeper = await getAIResponse(`${state.topic || ''} still not working, more details`);
    const deeperOpts = deeper.confidence > 0 ? CONFIRM_OPTIONS : [];
    await saveState(convId, { ...state, stage: deeper.confidence > 0 ? 'await_confirm' : 'resolving', attempts });
    created.push(await saveMessage(
      convId, ctx,
      deeper.confidence > 0
        ? `Let's dig deeper: ${deeper.answer}\n\nDid that do it?`
        : "I'm sorry that didn't fix it. Could you share one more detail — the exact error message or what you were doing when it happened?",
      'ai',
      { options: deeperOpts }
    ));
    const fresh = await loadConversation(ctx, convId);
    return { conversation: fresh, newMessages: created, options: deeperOpts, stage: deeper.confidence > 0 ? 'await_confirm' : 'resolving' };
  }

  // ── Triage stage (first message or free text) ──
  const seedText = optionId
    ? (INTENT_SEED_QUESTIONS[TRIAGE_OPTIONS.find(o => o.id === optionId)?.intent || ''] || text)
    : text;
  const topic = optionId || 'free_text';
  await saveState(convId, { stage: 'resolving', topic, attempts: 0, startedAt: state.startedAt || new Date().toISOString() });

  const reply = await botReplyForTriage(seedText, optionId);
  if (reply.content === '__ESCALATE__') {
    await escalateToHuman(ctx, conv, 'User selected talk to a human');
    created.push(await saveMessage(
      convId, ctx,
      "Of course — I've alerted our human support team. A super-admin agent will jump in here shortly. You'll see a \"Human agent\" badge when they reply.",
      'ai'
    ));
    const fresh = await loadConversation(ctx, convId);
    return { conversation: fresh, newMessages: created, options: [], stage: 'waiting_human' };
  }

  const hasOptions = reply.options.length > 0;
  const freshTriage = normalizeStage(state) === 'triage';
  await saveState(convId, { stage: hasOptions ? 'await_confirm' : 'resolving', topic, attempts: freshTriage ? 0 : Number(state.attempts || 0) });
  created.push(await saveMessage(convId, ctx, reply.content, 'ai', hasOptions ? { options: reply.options } : {}));
  const fresh = await loadConversation(ctx, convId);
  return { conversation: fresh, newMessages: created, options: reply.options, stage: hasOptions ? 'await_confirm' : 'resolving' };
}

/** Store a star rating (+ optional review) on a resolved conversation. */
export async function submitReview(
  ctx: TenantContext,
  convId: string,
  rating: number,
  review?: string
): Promise<{ conversation: any; message: any }> {
  const sql = getSql();
  await setTenantContext(sql, ctx.organizationId);
  const conv = await loadConversation(ctx, convId);
  if (!conv) throw new Error('Conversation not found');

  const r = Math.min(5, Math.max(1, Math.round(Number(rating) || 0)));
  const reviewText = (review || '').trim().slice(0, 2000);

  await sql`
    UPDATE support_conversations
    SET rating = ${r}, review = ${reviewText || null}, reviewed_at = NOW(),
        bot_state = ${JSON.stringify({ ...(conv.bot_state || {}), stage: 'done' })}::jsonb,
        updated_at = NOW()
    WHERE id = ${convId}
  `;
  const message = await saveMessage(
    convId, ctx,
    reviewText ? `Rating: ${'★'.repeat(r)}${'☆'.repeat(5 - r)} — "${reviewText}"` : `Rating: ${'★'.repeat(r)}${'☆'.repeat(5 - r)}`,
    'system'
  );
  await saveMessage(convId, ctx, 'Thank you for the feedback! If anything else comes up, just open this chat again. 🙏', 'ai');

  const fresh = await loadConversation(ctx, convId);
  return { conversation: fresh, message };
}

/** Load messages (for polling + history view). Hides ended threads from customer. */
export async function fetchMessagesForCustomer(ctx: TenantContext, convId: string): Promise<any[]> {
  const conv = await loadConversation(ctx, convId);
  if (!conv) throw new Error('Conversation not found');
  if (conv.hidden_for_customer && conv.ended_by) {
    // Ended by a human: history is kept for the rep, hidden for the customer.
    return [];
  }
  return loadMessages(convId);
}
