// GET /api/efris/config — safe configuration (no secrets)
// PUT /api/efris/config — update configuration (secrets accepted once, never returned)
import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';
import { getEfrisConfigSafe, upsertEfrisConfig } from '@/lib/services/efris-config.service';
import { resolveEfrisOrganizationId } from '@/lib/services/efris-tenant.service';
import { logAuditEvent } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (!hasPermission(ctx.role, 'efris:view')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

  try {
    const organizationId = await resolveEfrisOrganizationId(ctx, request.nextUrl.searchParams.get('organizationId'));
    if (!organizationId) return NextResponse.json({ data: null, error: 'organizationId is required' }, { status: 400 });
    const config = await getEfrisConfigSafe(organizationId, ctx.branchId);
    return NextResponse.json({ data: config });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'Failed to load EFRIS configuration' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (!hasPermission(ctx.role, 'efris:configure')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

  try {
    const body = await request.json();
    const organizationId = await resolveEfrisOrganizationId(ctx, ctx.isSuperAdmin ? String(body.organizationId || '') : null);
    if (!organizationId) return NextResponse.json({ data: null, error: 'organizationId is required' }, { status: 400 });

    // Secrets may be submitted but are NEVER returned by GET
    const config = await upsertEfrisConfig({
      organizationId,
      branchId: typeof body.branchId === 'string' ? body.branchId : null,
      actor: { userId: ctx.userId, role: ctx.role },
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      integrationMode: body.integrationMode,
      environment: body.environment,
      status: body.status,
      taxpayerTin: body.taxpayerTin,
      taxpayerName: body.taxpayerName,
      businessRegistrationNumber: body.businessRegistrationNumber,
      deviceNumber: body.deviceNumber,
      deviceSerialNumber: body.deviceSerialNumber,
      offlineEnablerHost: body.offlineEnablerHost,
      offlineEnablerPort: body.offlineEnablerPort,
      offlineUpdaterPort: body.offlineUpdaterPort,
      clientPrivateKeyPem: body.clientPrivateKeyPem,
      serverPublicKeyPem: body.serverPublicKeyPem,
      keyTable: body.keyTable,
    });

    if (body.status === 'active' || body.enabled === true) {
      await logAuditEvent({
        organizationId,
        userId: ctx.userId,
        userEmail: '',
        actorRole: ctx.role,
        action: 'EFRIS_ACTIVATED',
        targetType: 'efris_config',
        targetId: config.id,
        details: { mode: config.integrationMode },
      }).catch(() => {});
    }

    return NextResponse.json({ data: config });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'Failed to update EFRIS configuration' }, { status: 500 });
  }
}
