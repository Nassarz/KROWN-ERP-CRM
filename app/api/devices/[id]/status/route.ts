import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedTenantContext } from '@/lib/tenant';
import { getSql } from '@/lib/neon-server';
import { activateDevice, suspendDevice, revokeDevice } from '@/lib/services/device.service';
import { hasPermission } from '@/lib/rbac';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await extractVerifiedTenantContext(request);
    if (!ctx) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(ctx.role, 'devices:update')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

    const { id } = await params;
    if (!id || id.length > 128) return NextResponse.json({ data: null, error: 'Invalid device id' }, { status: 400 });
    const body = await request.json();
    const action = String(body.action || '').trim().toLowerCase();
    const validActions = new Set(['activate', 'suspend', 'revoke']);
    if (!validActions.has(action)) return NextResponse.json({ data: null, error: 'Invalid device action' }, { status: 400 });

    // Platform Super Admins may manage a device belonging to any restaurant.
    // Tenant users are always routed through the tenant-scoped service methods.
    if (ctx.isSuperAdmin) {
      const sql = getSql();
      const existing = await sql`
        SELECT id, organization_id, status, trust_status
        FROM devices WHERE id=${id} LIMIT 1
      `;
      if (!existing.length) return NextResponse.json({ data: null, error: 'Device not found' }, { status: 404 });
      const device = existing[0] as any;
      let updated;
      if (action === 'activate') {
        updated = await sql`
          UPDATE devices SET status='active', trust_status=CASE WHEN trust_status='revoked' THEN 'trusted' ELSE trust_status END,
            revoked_at=NULL, revoked_by=NULL, updated_at=NOW()
          WHERE id=${id}
          RETURNING *
        `;
      } else if (action === 'suspend') {
        updated = await sql`
          UPDATE devices SET status='suspended', updated_at=NOW() WHERE id=${id} RETURNING *
        `;
        await sql`UPDATE staff_sessions SET status='revoked', revoked_at=NOW(), revoked_reason='device_suspended' WHERE device_id=${id} AND status='active'`;
      } else {
        // devices.revoked_by references staff.id. A platform super-admin is stored in
        // super_admins, so attribute the revocation to a valid staff member of that
        // restaurant when possible; otherwise clear the column.
        let revokedBy: string | null = null;
        const staffMatch = await sql`SELECT id FROM staff WHERE id=${ctx.userId} AND organization_id=${device.organization_id} LIMIT 1`;
        if (staffMatch.length) revokedBy = String((staffMatch[0] as any).id);
        if (!revokedBy) {
          const restaurantStaff = await sql`
            SELECT id FROM staff
            WHERE organization_id=${device.organization_id} AND status='active'
            ORDER BY created_at ASC LIMIT 1
          `;
          if (restaurantStaff.length) revokedBy = String((restaurantStaff[0] as any).id);
        }
        updated = await sql`
          UPDATE devices SET status='revoked', trust_status='revoked', revoked_at=NOW(), revoked_by=${revokedBy}, updated_at=NOW()
          WHERE id=${id} RETURNING *
        `;
        await sql`UPDATE staff_sessions SET status='revoked', revoked_at=NOW(), revoked_reason='device_revoked' WHERE device_id=${id} AND status='active'`;
      }
      return NextResponse.json({ data: updated[0], previousStatus: device.status });
    }

    let device;
    if (action === 'activate') device = await activateDevice(ctx, id);
    else if (action === 'suspend') device = await suspendDevice(ctx, id);
    else device = await revokeDevice(ctx, id, String(body.reason || ''));
    return NextResponse.json({ data: device });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
