// ============================================================================
// KROWN ERP — EFRIS tenant resolution helper
// Tenant users are ALWAYS locked to their own organization. Platform super
// admins may inspect/configure a specific restaurant by passing an explicit
// organizationId that MUST exist in the organizations table. The browser
// NEVER controls the tenant boundary for restaurant roles.
// ============================================================================

import { getSql } from '@/lib/neon-server';
import type { TenantContext } from '@/lib/tenant';

export async function resolveEfrisOrganizationId(
  ctx: TenantContext,
  requested: string | null | undefined,
): Promise<string | null> {
  if (!ctx.isSuperAdmin) {
    return ctx.organizationId;
  }
  if (!requested) return null;
  const sql = getSql();
  const rows = await sql`SELECT id FROM organizations WHERE id = ${requested} LIMIT 1`;
  return rows.length ? String((rows[0] as any).id) : null;
}
