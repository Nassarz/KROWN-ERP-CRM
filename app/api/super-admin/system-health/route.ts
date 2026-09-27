import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';
import { cached } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ServiceStatus = 'ok' | 'warn' | 'error';

interface ServiceProbe {
  key: string;
  name: string;
  status: ServiceStatus;
  latencyMs?: number;
  detail?: string;
}

// Every probe below measures a real signal: DB round trip, a loopback HTTP call
// through the app, database size, payment/print activity in the last 24h, and
// the stored EFRIS configuration state. No synthetic latencies.
async function probeServices(request: NextRequest, sql: any): Promise<ServiceProbe[]> {
  const settle = async (p: Promise<ServiceProbe>): Promise<ServiceProbe> =>
    p.catch((e: any) => ({ key: 'unknown', name: 'Unknown', status: 'error', detail: e?.message || 'Probe failed' } as ServiceProbe));

  const database = settle((async (): Promise<ServiceProbe> => {
    const start = Date.now();
    const conns = await sql`SELECT COUNT(*)::int AS count FROM pg_stat_activity WHERE state = 'active'`;
    const latencyMs = Date.now() - start;
    return {
      key: 'database',
      name: 'Database',
      status: latencyMs < 800 ? 'ok' : 'warn',
      latencyMs,
      detail: `${Number(conns[0]?.count ?? 0)} active connections`,
    };
  })());

  const api = settle((async (): Promise<ServiceProbe> => {
    const start = Date.now();
    const res = await fetch(new URL('/api/health', request.url), {
      signal: AbortSignal.timeout(5000),
      headers: { accept: 'application/json' },
    });
    const latencyMs = Date.now() - start;
    return {
      key: 'api',
      name: 'API Services',
      status: res.ok && latencyMs < 2000 ? 'ok' : res.ok ? 'warn' : 'error',
      latencyMs,
      detail: res.ok ? 'Round trip healthy' : `HTTP ${res.status}`,
    };
  })());

  const storage = settle((async (): Promise<ServiceProbe> => {
    const row = await sql`SELECT pg_database_size(current_database()) AS size`;
    const mb = Number(row[0]?.size ?? 0) / 1024 / 1024;
    return {
      key: 'storage',
      name: 'Storage',
      status: mb > 500 ? 'error' : mb > 400 ? 'warn' : 'ok',
      detail: `${mb.toFixed(1)} MB used`,
    };
  })());

  const payments = settle((async (): Promise<ServiceProbe> => {
    const row = await sql`
      SELECT COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid,
             MAX(created_at) AS last_paid_at
      FROM orders
      WHERE created_at > NOW() - INTERVAL '24 hours'`;
    const paid = Number(row[0]?.paid ?? 0);
    const last = row[0]?.last_paid_at;
    return {
      key: 'payments',
      name: 'Payment Gateway',
      status: 'ok',
      detail: paid > 0
        ? `${paid} payment${paid === 1 ? '' : 's'} in 24h${last ? ` · last ${new Date(last).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}`
        : 'No payments in last 24h',
    };
  })());

  const printing = settle((async (): Promise<ServiceProbe> => {
    const row = await sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'failed' OR last_error IS NOT NULL)::int AS failed
      FROM print_jobs
      WHERE created_at > NOW() - INTERVAL '24 hours'`;
    const total = Number(row[0]?.total ?? 0);
    const failed = Number(row[0]?.failed ?? 0);
    return {
      key: 'printing',
      name: 'Printing OS',
      status: failed > 0 ? 'error' : 'ok',
      detail: total > 0 ? `${total} job${total === 1 ? '' : 's'} in 24h · ${failed} failed` : 'No print jobs in 24h',
    };
  })());

  const efris = settle((async (): Promise<ServiceProbe> => {
    const row = await sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'active')::int AS active,
             COUNT(*) FILTER (WHERE status = 'configured')::int AS configured,
             COUNT(*) FILTER (WHERE status = 'error')::int AS errored,
             MAX(environment) AS environment
      FROM efris_configurations`;
    const total = Number(row[0]?.total ?? 0);
    const active = Number(row[0]?.active ?? 0);
    const configured = Number(row[0]?.configured ?? 0);
    const errored = Number(row[0]?.errored ?? 0);
    const environment = row[0]?.environment || 'sandbox';
    return {
      key: 'efris',
      name: `EFRIS (${String(environment).toUpperCase()})`,
      status: errored > 0 ? 'error' : total === 0 ? 'warn' : active > 0 ? 'ok' : 'warn',
      detail: total === 0
        ? 'Not configured'
        : `${active} active · ${configured} configured of ${total}`,
    };
  })());

  return Promise.all([database, api, storage, payments, printing, efris]);
}

export async function GET(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const sql = getSql();

  try {
    const start = Date.now();
    await sql`SELECT 1`;
    const latencyMs = Date.now() - start;

    const [dbSize, activeConns, tableStats, recentErrors, services] = await Promise.all([
      sql`SELECT pg_database_size(current_database()) as size`,
      sql`SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = 'active'`,
      sql`SELECT
        schemaname,
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 25`,
      sql`SELECT
        action,
        user_email as actor,
        details,
        created_at
      FROM audit_logs
      WHERE result = 'failure'
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 20`,
      cached('sa:system-health:services:v1', 15_000, () => probeServices(request, sql)),
    ]);

    const overall: ServiceStatus = services.some(s => s.status === 'error')
      ? 'error'
      : services.some(s => s.status === 'warn')
        ? 'warn'
        : 'ok';

    return NextResponse.json({
      data: {
        database: {
          status: 'ok',
          latencyMs,
          sizeBytes: Number(dbSize[0]?.size ?? 0),
          sizeFormatted: `${(Number(dbSize[0]?.size ?? 0) / 1024 / 1024).toFixed(2)} MB`,
          activeConnections: Number(activeConns[0]?.count ?? 0),
        },
        services,
        overall,
        tables: tableStats,
        recentErrors,
        server: {
          uptime: Math.floor(process.uptime()),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform,
        },
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch health' }, { status: 500 });
  }
}
