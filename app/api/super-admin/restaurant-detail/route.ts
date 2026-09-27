import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/neon-server';
import { extractVerifiedTenantContext } from '@/lib/tenant';

function parseDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function GET(request: NextRequest) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  const organizationId = request.nextUrl.searchParams.get('organizationId');
  if (!organizationId || !/^[0-9a-fA-F-]{36}$/.test(organizationId)) {
    return NextResponse.json({ error: 'A valid restaurant is required' }, { status: 400 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const from = parseDate(request.nextUrl.searchParams.get('from'), todayStart);
  const to = parseDate(request.nextUrl.searchParams.get('to'), todayEnd);

  try {
    const sql = getSql();

    const orgRows = await sql`SELECT id, name, contact_email, contact_phone, status, created_at FROM organizations WHERE id = ${organizationId} LIMIT 1`;
    if (!orgRows.length) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

    const [branches, staff, sales, devices, efrisConfig, efrisCounts, efrisRecent] = await Promise.all([
      sql`
        SELECT b.id, b.name, b.location, b.city, b.status, b.created_at,
          (SELECT COUNT(*)::int FROM staff s WHERE s.assigned_branch_id = b.id AND s.status = 'active') AS staff_count,
          (SELECT COUNT(*)::int FROM orders o WHERE o.branch_name = b.name AND o.created_at >= ${from.toISOString()}::timestamptz AND o.created_at < ${to.toISOString()}::timestamptz) AS today_orders
        FROM branches b
        WHERE b.organization_id = ${organizationId}
        ORDER BY b.name ASC
      `,
      sql`
        SELECT s.id, s.name, s.email, s.role, s.status, s.assigned_branch_id, s.last_login_at, b.name AS branch_name
        FROM staff s
        LEFT JOIN branches b ON b.id = s.assigned_branch_id
        WHERE s.organization_id = ${organizationId} AND s.status NOT IN ('deleted')
        ORDER BY s.name ASC
      `,
      sql`
        SELECT
          COUNT(*) FILTER (WHERE status <> 'cancelled' AND (payment_status IN ('paid','partial','partially_paid') OR status = 'completed'))::int AS orders,
          COALESCE(SUM(CASE WHEN status <> 'cancelled' AND payment_status IN ('paid','partial','partially_paid') THEN COALESCE(paid_amount, 0) ELSE 0 END), 0)::numeric AS collected,
          COALESCE(SUM(CASE WHEN status <> 'cancelled' AND (payment_status IN ('paid','partial','partially_paid') OR status = 'completed') THEN total ELSE 0 END), 0)::numeric AS sales,
          COALESCE(SUM(CASE WHEN status <> 'cancelled' AND (payment_status IN ('paid','partial','partially_paid') OR status = 'completed') THEN (
            SELECT COALESCE(SUM((item->>'quantity')::numeric), 0)
            FROM jsonb_array_elements(COALESCE(items::jsonb, '[]'::jsonb)) item
          ) ELSE 0 END), 0)::numeric AS meals
        FROM orders
        WHERE organization_id = ${organizationId}
          AND created_at >= ${from.toISOString()}::timestamptz
          AND created_at < ${to.toISOString()}::timestamptz
      `,
      sql`
        SELECT d.id, d.device_name AS name, d.device_type AS type, d.status, d.trust_status, d.last_seen_at, b.name AS branch_name
        FROM devices d
        LEFT JOIN branches b ON b.id = d.branch_id
        WHERE d.organization_id = ${organizationId}
        ORDER BY d.last_seen_at DESC NULLS LAST
      `,
      // EFRIS diagnostics — SAFE fields only (never secrets / encrypted keys)
      sql`
        SELECT id, enabled, integration_mode, environment, status,
               taxpayer_tin, taxpayer_name, business_registration_number,
               device_number, device_serial_number,
               last_successful_communication, last_synchronization,
               fiscal_activation_at, updated_at
        FROM efris_configurations
        WHERE organization_id = ${organizationId}
        ORDER BY (branch_id IS NOT NULL), created_at ASC
        LIMIT 1
      `,
      sql`
        SELECT fiscal_status, COUNT(*)::int AS count
        FROM efris_transactions
        WHERE organization_id = ${organizationId}
          AND created_at >= ${from.toISOString()}::timestamptz
          AND created_at < ${to.toISOString()}::timestamptz
        GROUP BY fiscal_status
        ORDER BY count DESC
      `,
      sql`
        SELECT id, order_id, transaction_type, fiscal_status, submission_status,
               invoice_no, fiscal_document_number, antifake_code,
               error_code, error_message, attempt_count,
               created_at, updated_at
        FROM efris_transactions
        WHERE organization_id = ${organizationId}
        ORDER BY created_at DESC
        LIMIT 8
      `,
    ]);

    return NextResponse.json({
      data: {
        organization: orgRows[0],
        range: { from: from.toISOString(), to: to.toISOString() },
        branches,
        staff,
        sales: {
          orders: Number(sales[0]?.orders || 0),
          collected: Number(sales[0]?.collected || 0),
          sales: Number(sales[0]?.sales || 0),
          meals: Number(sales[0]?.meals || 0),
        },
        devices: devices.map((d: any) => ({
          ...d,
          connected: d.status === 'active' && d.trust_status !== 'revoked' && d.last_seen_at && (Date.now() - new Date(d.last_seen_at).getTime() < 5 * 60 * 1000),
        })),
        summary: {
          totalBranches: branches.length,
          activeBranches: branches.filter((b: any) => b.status === 'active').length,
          totalStaff: staff.length,
          activeStaff: staff.filter((s: any) => s.status === 'active').length,
          totalDevices: devices.length,
          connectedDevices: devices.filter((d: any) => d.status === 'active' && d.trust_status !== 'revoked' && d.last_seen_at && (Date.now() - new Date(d.last_seen_at).getTime() < 5 * 60 * 1000)).length,
        },
        efris: {
          configured: !!efrisConfig?.length,
          enabled: !!(efrisConfig as any[])[0]?.enabled,
          environment: (efrisConfig as any[])[0]?.environment ?? null,
          integrationMode: (efrisConfig as any[])[0]?.integration_mode ?? null,
          status: (efrisConfig as any[])[0]?.status ?? null,
          taxpayerTin: (efrisConfig as any[])[0]?.taxpayer_tin ?? null,
          taxpayerName: (efrisConfig as any[])[0]?.taxpayer_name ?? null,
          deviceNumber: (efrisConfig as any[])[0]?.device_number ?? null,
          lastSuccessfulCommunication: (efrisConfig as any[])[0]?.last_successful_communication ?? null,
          fiscalActivationAt: (efrisConfig as any[])[0]?.fiscal_activation_at ?? null,
          updatedAt: (efrisConfig as any[])[0]?.updated_at ?? null,
          countsByStatus: Object.fromEntries((efrisCounts as any[]).map((r) => [r.fiscal_status, r.count])),
          recent: efrisRecent,
        },
      },
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error: any) {
    console.error('Restaurant detail error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load restaurant details' }, { status: 500 });
  }
}
