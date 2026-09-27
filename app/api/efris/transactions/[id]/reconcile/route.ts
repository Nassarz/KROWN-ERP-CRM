// POST /api/efris/transactions/[id]/reconcile — resolve unknown outcomes
// Requires efris:reconcile. NEVER resubmits blindly.
import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';
import { resolveEfrisOrganizationId } from '@/lib/services/efris-tenant.service';
import { getEfrisConfigWithSecrets } from '@/lib/services/efris-config.service';
import { resolveEfrisAdapter } from '@/lib/efris/client';
import { reconcileFiscalTransaction } from '@/lib/services/efris-reconciliation.service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (!hasPermission(ctx.role, 'efris:reconcile')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const organizationId = await resolveEfrisOrganizationId(ctx, ctx.isSuperAdmin ? String(body.organizationId || '') : null);
    if (!organizationId) return NextResponse.json({ data: null, error: 'organizationId is required' }, { status: 400 });
    const config = await getEfrisConfigWithSecrets(organizationId);
    if (!config || !config.taxpayerTin || !config.deviceNumber) {
      return NextResponse.json({ data: null, error: 'EFRIS is not configured for this restaurant' }, { status: 400 });
    }

    const adapter = resolveEfrisAdapter({
      environment: config.environment,
      integrationMode: config.integrationMode,
      offlineEnablerHost: config.offlineEnablerHost,
      offlineEnablerPort: config.offlineEnablerPort,
    });

    const result = await reconcileFiscalTransaction({
      organizationId: organizationId,
      transactionId: id,
      actor: { userId: ctx.userId, role: ctx.role },
      adapter,
      envelopeOptions: {
        interfaceCode: 'T107',
        tin: config.taxpayerTin,
        brn: config.businessRegistrationNumber || '',
        deviceNo: config.deviceNumber,
        userName: 'admin',
      },
    });

    return NextResponse.json({ data: result });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'Reconciliation failed' }, { status: 500 });
  }
}
