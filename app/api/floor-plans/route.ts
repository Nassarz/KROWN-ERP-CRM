import { NextRequest, NextResponse } from 'next/server';
import * as fpService from '@/lib/services/floor-plan.service';
import { extractTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(ctx.role, 'zones:read')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  try {
    const branchId = request.nextUrl.searchParams.get('branchId') || ctx.branchId || undefined;
    const plans = await fpService.listFloorPlans(ctx, branchId);
    return NextResponse.json({ data: plans });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list floor plans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(ctx.role, 'zones:create')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim().slice(0, 255);
    const branchId = body?.branchId || ctx.branchId;
    if (!name) return NextResponse.json({ error: 'Floor plan name is required' }, { status: 400 });
    if (!branchId) return NextResponse.json({ error: 'Branch is required' }, { status: 400 });
    const plan = await fpService.createFloorPlan(ctx, { name, branchId, description: body?.description });
    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create floor plan' }, { status: 500 });
  }
}
