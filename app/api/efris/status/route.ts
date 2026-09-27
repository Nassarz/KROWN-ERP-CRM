// GET /api/efris/status — overall EFRIS status for the tenant (no secrets)
import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';
import { resolveEfrisOrganizationId } from '@/lib/services/efris-tenant.service';
import { getSql } from '@/lib/neon-server';
import { getEfrisConfigSafe } from '@/lib/services/efris-config.service';
import { productReadinessSummary } from '@/lib/services/efris-product.service';
import { getLastTimeSync } from '@/lib/services/efris-time.service';
import { listNeedingReconciliation } from '@/lib/services/efris-reconciliation.service';

export async function GET(request: NextRequest) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (!hasPermission(ctx.role, 'efris:view')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

  try {
    const organizationId = await resolveEfrisOrganizationId(ctx, request.nextUrl.searchParams.get('organizationId'));
    if (!organizationId) return NextResponse.json({ data: null, error: 'organizationId is required' }, { status: 400 });
    const sql = getSql();
    const config = await getEfrisConfigSafe(organizationId, ctx.branchId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayStats, statusCounts, queueCounts, readiness, lastSync, attention] = await Promise.all([
      sql`
        SELECT
          COUNT(*) FILTER (WHERE fiscal_status = 'fiscalized' AND created_at >= ${today.toISOString()})::int AS fiscalized_today,
          COUNT(*) FILTER (WHERE created_at >= ${today.toISOString()})::int AS transactions_today,
          COALESCE(SUM(gross_amount) FILTER (WHERE fiscal_status = 'fiscalized' AND created_at >= ${today.toISOString()}), 0)::float8 AS fiscalized_amount_today
        FROM efris_transactions WHERE organization_id = ${organizationId}
      `,
      sql`
        SELECT fiscal_status, COUNT(*)::int AS count FROM efris_transactions
        WHERE organization_id = ${organizationId} GROUP BY fiscal_status
      `,
      sql`
        SELECT status, COUNT(*)::int AS count FROM efris_queue
        WHERE organization_id = ${organizationId} GROUP BY status
      `,
      productReadinessSummary(organizationId),
      getLastTimeSync(organizationId),
      listNeedingReconciliation(organizationId, 20),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of statusCounts as any[]) statusMap[row.fiscal_status] = Number(row.count);
    const queueMap: Record<string, number> = {};
    for (const row of queueCounts as any[]) queueMap[row.status] = Number(row.count);

    return NextResponse.json({
      data: {
        configured: !!config,
        enabled: config?.enabled ?? false,
        mode: config?.integrationMode ?? null,
        environment: config?.environment ?? null,
        configStatus: config?.status ?? 'not_configured',
        taxpayerTin: config?.taxpayerTin ?? null,
        deviceNumber: config?.deviceNumber ?? null,
        lastSuccessfulCommunication: config?.lastSuccessfulCommunication ?? null,
        lastSynchronization: config?.lastSynchronization ?? null,
        fiscalizedToday: Number((todayStats as any[])[0]?.fiscalized_today ?? 0),
        transactionsToday: Number((todayStats as any[])[0]?.transactions_today ?? 0),
        fiscalizedAmountToday: Number((todayStats as any[])[0]?.fiscalized_amount_today ?? 0),
        byStatus: statusMap,
        queue: queueMap,
        needsAttention: (attention as any[]).length,
        productReadiness: readiness,
        timeSync: lastSync,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'Failed to load EFRIS status' }, { status: 500 });
  }
}
