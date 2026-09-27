// POST /api/efris/test — run connection/time/login tests against the adapter
// Requires efris:configure. Uses the tenant's own configuration ONLY.
import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';
import { resolveEfrisOrganizationId } from '@/lib/services/efris-tenant.service';
import { getEfrisConfigWithSecrets } from '@/lib/services/efris-config.service';
import { resolveEfrisAdapter } from '@/lib/efris/client';
import { synchronizeEfrisTime } from '@/lib/services/efris-time.service';
import { userSafeEfrisMessage, classifyEfrisError } from '@/lib/efris/errors';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (!hasPermission(ctx.role, 'efris:configure')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

  try {
    const body = await request.json().catch(() => ({}));
    const organizationId = await resolveEfrisOrganizationId(ctx, ctx.isSuperAdmin ? String(body.organizationId || '') : null);
    if (!organizationId) return NextResponse.json({ data: null, error: 'organizationId is required' }, { status: 400 });
    const config = await getEfrisConfigWithSecrets(organizationId);
    if (!config) return NextResponse.json({ data: null, error: 'EFRIS is not configured for this restaurant' }, { status: 400 });
    if (!config.taxpayerTin || !config.deviceNumber) {
      return NextResponse.json({ data: null, error: 'TIN and device number are required before testing' }, { status: 400 });
    }

    const adapter = resolveEfrisAdapter({
      environment: config.environment,
      integrationMode: config.integrationMode,
      offlineEnablerHost: config.offlineEnablerHost,
      offlineEnablerPort: config.offlineEnablerPort,
    });

    const envelope = {
      interfaceCode: 'T101' as const,
      tin: config.taxpayerTin,
      brn: config.businessRegistrationNumber || '',
      deviceNo: config.deviceNumber,
      userName: 'admin',
    };

    const tests: Array<{ name: string; status: 'passed' | 'failed' | 'warning'; message: string }> = [];

    // 1. Reachability
    try {
      const probe = await adapter.probe();
      tests.push({
        name: 'Service reachability',
        status: probe.reachable ? 'passed' : 'failed',
        message: probe.reachable ? `Responded in ${probe.latencyMs}ms` : 'Could not reach the EFRIS service',
      });
    } catch (e: any) {
      tests.push({ name: 'Service reachability', status: 'failed', message: 'Could not reach the EFRIS service' });
    }

    // 2. Server time (T101)
    const timeSync = await synchronizeEfrisTime({
      organizationId: organizationId,
      adapter,
      envelopeOptions: envelope,
    });
    tests.push({ name: 'Clock synchronization', status: timeSync.status === 'ok' ? 'passed' : timeSync.status === 'warning' ? 'warning' : 'failed', message: timeSync.message });

    // 3. Initialization (T102)
    try {
      const init = await adapter.initialize(envelope);
      tests.push({
        name: 'Device initialization',
        status: init.success ? 'passed' : 'failed',
        message: init.success ? 'Device initialized' : init.returnMessage || 'Initialization failed',
      });
    } catch (e: any) {
      tests.push({ name: 'Device initialization', status: 'failed', message: userSafeEfrisMessage(classifyEfrisError(e)) });
    }

    // 4. Login (T103)
    try {
      const login = await adapter.login(envelope);
      tests.push({
        name: 'Authentication',
        status: login.success ? 'passed' : 'failed',
        message: login.success ? 'Logged in successfully' : login.returnMessage || 'Login failed',
      });
    } catch (e: any) {
      tests.push({ name: 'Authentication', status: 'failed', message: userSafeEfrisMessage(classifyEfrisError(e)) });
    }

    const allPassed = tests.every(t => t.status !== 'failed');
    await logAuditEvent({
      organizationId: organizationId,
      userId: ctx.userId,
      userEmail: '',
      actorRole: ctx.role,
      action: 'EFRIS_TEST_RUN',
      targetType: 'efris_config',
      targetId: config.id,
      details: { passed: allPassed, tests: tests.map(t => t.name) },
    }).catch(() => {});

    return NextResponse.json({ data: { passed: allPassed, tests, sandbox: config.environment === 'sandbox' } });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'EFRIS test failed' }, { status: 500 });
  }
}
