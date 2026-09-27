// POST /api/efris/transactions/[id]/credit-note — raise a credit note against a
// fiscalized transaction (T110). Requires efris:adjust + manager authorization.
import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';
import { resolveEfrisOrganizationId } from '@/lib/services/efris-tenant.service';
import { getSql } from '@/lib/neon-server';
import { generateId } from '@/lib/id';
import { getEfrisConfigWithSecrets } from '@/lib/services/efris-config.service';
import { resolveEfrisAdapter } from '@/lib/efris/client';
import { getFiscalTransaction } from '@/lib/services/efris-transaction.service';
import { canCredit } from '@/lib/efris/state-machine';
import { rebuildAndSubmit, buildSellerProfile } from '@/lib/services/efris-submit.service';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (!hasPermission(ctx.role, 'efris:adjust')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const organizationId = await resolveEfrisOrganizationId(ctx, ctx.isSuperAdmin ? String(body.organizationId || '') : null);
    if (!organizationId) return NextResponse.json({ data: null, error: 'organizationId is required' }, { status: 400 });
    const reason = String(body.reason || '').slice(0, 1024);
    const reasonCode = String(body.reasonCode || '').slice(0, 3);
    if (!reason) return NextResponse.json({ data: null, error: 'A reason for the credit note is required' }, { status: 400 });

    const sql = getSql();
    const parent = await getFiscalTransaction(organizationId, id);
    if (!parent) return NextResponse.json({ data: null, error: 'Transaction not found' }, { status: 404 });
    if (!canCredit(parent.fiscalStatus)) {
      return NextResponse.json({ data: null, error: 'A credit note can only be issued against a fiscalized transaction' }, { status: 409 });
    }

    const config = await getEfrisConfigWithSecrets(organizationId);
    if (!config || !config.taxpayerTin || !config.deviceNumber) {
      return NextResponse.json({ data: null, error: 'EFRIS is not configured for this restaurant' }, { status: 400 });
    }

    const creditId = generateId();
    await sql`
      INSERT INTO efris_transactions (
        id, organization_id, branch_id, order_id, transaction_type,
        krown_reference, fiscal_status, submission_status, gross_amount,
        tax_amount, net_amount, currency, operator_name, buyer_tin, buyer_name,
        credit_note_parent_id, reason, reason_code, created_at, updated_at
      ) VALUES (
        ${creditId}, ${organizationId}, ${parent.branchId}, ${parent.orderId},
        'credit_note', ${`${parent.krownReference}-CN-${String(Date.now()).slice(-6)}`},
        'credit_pending', 'not_started', ${parent.grossAmount}, ${parent.taxAmount},
        ${parent.netAmount}, ${parent.currency}, ${parent.operatorName},
        ${parent.buyerTin}, ${parent.buyerName},
        ${parent.id}, ${reason}, ${reasonCode || null}, NOW(), NOW()
      )
    `;

    await logAuditEvent({
      organizationId: organizationId,
      userId: ctx.userId,
      userEmail: '',
      actorRole: ctx.role,
      action: 'EFRIS_CREDIT_NOTE_INITIATED',
      targetType: 'efris_transaction',
      targetId: creditId,
      details: { parentId: parent.id, reason },
    }).catch(() => {});

    const adapter = resolveEfrisAdapter({
      environment: config.environment,
      integrationMode: config.integrationMode,
      offlineEnablerHost: config.offlineEnablerHost,
      offlineEnablerPort: config.offlineEnablerPort,
    });

    const envelopeOptions = {
      interfaceCode: 'T110' as const,
      tin: config.taxpayerTin,
      brn: config.businessRegistrationNumber || '',
      deviceNo: config.deviceNumber,
      userName: 'admin',
    };

    const seller = await buildSellerProfile(organizationId, {
      tin: config.taxpayerTin,
      brn: config.businessRegistrationNumber || '',
      taxpayerName: config.taxpayerName,
    });

    const result = await rebuildAndSubmit({
      organizationId: organizationId,
      transactionId: creditId,
      actor: { userId: ctx.userId, role: ctx.role },
      adapter,
      envelopeOptions,
      seller,
      creditNote: {
        invoiceNo: parent.invoiceNo || parent.fiscalDocumentNumber || '',
        oriInvoiceId: parent.invoiceNo || parent.fiscalDocumentNumber,
        reason,
        reasonCode,
      },
    });

    if (result.fiscalized) {
      await sql`UPDATE efris_transactions SET fiscal_status='credited', updated_at=NOW() WHERE id=${parent.id} AND organization_id=${organizationId}`;
    }

    return NextResponse.json({ data: { ...result, creditTransactionId: creditId } });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'Failed to issue credit note' }, { status: 500 });
  }
}
