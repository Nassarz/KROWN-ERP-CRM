import { NextRequest, NextResponse } from 'next/server';
import * as fpService from '@/lib/services/floor-plan.service';
import { extractTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(ctx.role, 'zones:read')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  try {
    const plan = await fpService.getFloorPlan(ctx, id);
    if (!plan) return NextResponse.json({ error: 'Floor plan not found' }, { status: 404 });
    const sections = await fpService.listSections(ctx, id);
    const objects = await fpService.listObjects(ctx, id);
    return NextResponse.json({ data: { ...plan, sections, objects } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get floor plan' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(ctx.role, 'zones:update')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  try {
    const body = await request.json();
    const plan = await fpService.updateFloorPlan(ctx, id, {
      name: body?.name ? String(body.name).trim().slice(0, 255) : undefined,
      description: body?.description,
      branchId: body?.branchId,
    });
    return NextResponse.json({ data: plan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update floor plan' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(ctx.role, 'zones:delete')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  try {
    await fpService.deleteFloorPlan(ctx, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete floor plan' }, { status: 500 });
  }
}
