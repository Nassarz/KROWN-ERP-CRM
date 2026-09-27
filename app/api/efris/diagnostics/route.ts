// GET /api/efris/diagnostics — diagnostics cards (no secrets)
import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';
import { resolveEfrisOrganizationId } from '@/lib/services/efris-tenant.service';
import { getSql } from '@/lib/neon-server';
import { getEfrisConfigSafe } from '@/lib/services/efris-config.service';
import { getLastTimeSync } from '@/lib/services/efris-time.service';
import { listNeedingReconciliation } from '@/lib/services/efris-reconciliation.service';

type Health = 'healthy' | 'warning' | 'error' | 'not_configured';

export async function GET(request: NextRequest) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (!hasPermission(ctx.role, 'efris:view')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

  try {
    const organizationId = await resolveEfrisOrganizationId(ctx, request.nextUrl.searchParams.get('organizationId'));
    if (!organizationId) return NextResponse.json({ data: null, error: 'organizationId is required' }, { status: 400 });
    const sql = getSql();
    const config = await getEfrisConfigSafe(organizationId, ctx.branchId);
    const timeSync = await getLastTimeSync(organizationId);
    const attention = await listNeedingReconciliation(organizationId, 100);

    const [queueStats, lastSubmission] = await Promise.all([
      sql`
        SELECT status, COUNT(*)::int AS count FROM efris_queue
        WHERE organization_id = ${organizationId} GROUP BY status
      `,
      sql`
        SELECT created_at, status FROM efris_submissions
        WHERE organization_id = ${organizationId}
        ORDER BY created_at DESC LIMIT 1
      `,
    ]);

    const queueMap: Record<string, number> = {};
    for (const row of queueStats as any[]) queueMap[row.status] = Number(row.count);

    const cards: Array<{ id: string; label: string; health: Health; detail: string }> = [];
    const configured = !!config;

    cards.push({
      id: 'service',
      label: 'KROWN EFRIS Service',
      health: configured ? 'healthy' : 'not_configured',
      detail: configured
        ? `Mode: ${config.integrationMode === 'offline' ? 'Offline Enabler' : 'Online System-to-System'} (${config.environment})`
        : 'EFRIS has not been configured for this restaurant',
    });

    cards.push({
      id: 'ura',
      label: 'URA connection',
      health: config?.lastSuccessfulCommunication ? 'healthy' : configured ? 'warning' : 'not_configured',
      detail: config?.lastSuccessfulCommunication
        ? `Last successful communication ${config.lastSuccessfulCommunication}`
        : 'No successful communication yet',
    });

    cards.push({
      id: 'device',
      label: 'Device',
      health: config?.deviceNumber ? 'healthy' : configured ? 'error' : 'not_configured',
      detail: config?.deviceNumber ? `Device ${config.deviceNumber}` : 'No device registered',
    });

    cards.push({
      id: 'auth',
      label: 'Authentication',
      health: config?.status === 'active' ? 'healthy' : configured ? 'warning' : 'not_configured',
      detail: config?.status === 'active' ? 'Configured and active' : config?.status === 'testing' ? 'In testing' : 'Not activated',
    });

    cards.push({
      id: 'clock',
      label: 'Clock synchronization',
      health: !timeSync ? (configured ? 'warning' : 'not_configured') : timeSync.status === 'ok' ? 'healthy' : timeSync.status === 'warning' ? 'warning' : 'error',
      detail: timeSync ? `Offset ${Math.round(timeSync.offsetMs / 1000)}s (${timeSync.createdAt})` : 'Never synchronized',
    });

    cards.push({
      id: 'certificate',
      label: 'Certificate',
      health: config?.status === 'active' || config?.status === 'testing' ? 'healthy' : configured ? 'warning' : 'not_configured',
      detail: 'Secure key material is stored encrypted at rest',
    });

    cards.push({
      id: 'offline',
      label: 'Offline Enabler',
      health: config?.integrationMode === 'offline' ? 'healthy' : 'not_configured',
      detail: config?.integrationMode === 'offline'
        ? `${config.offlineEnablerHost}:${config.offlineEnablerPort}`
        : 'Online mode — offline enabler not used',
    });

    const pending = (queueMap['pending'] ?? 0) + (queueMap['retrying'] ?? 0) + (queueMap['in_progress'] ?? 0);
    cards.push({
      id: 'queue',
      label: 'Queue',
      health: (attention as any[]).length > 0 ? 'warning' : pending > 0 ? 'warning' : 'healthy',
      detail: `${pending} pending · ${attention.length} needing reconciliation · ${queueMap['dead'] ?? 0} dead`,
    });

    cards.push({
      id: 'last_submission',
      label: 'Last successful submission',
      health: lastSubmission.length ? 'healthy' : 'not_configured',
      detail: lastSubmission.length ? `${lastSubmission[0].created_at} (${lastSubmission[0].status})` : 'No submissions yet',
    });

    return NextResponse.json({ data: { cards, sandbox: config?.environment === 'sandbox' } });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'Failed to load diagnostics' }, { status: 500 });
  }
}
