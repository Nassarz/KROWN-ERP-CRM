import { NextRequest, NextResponse } from 'next/server';
import * as fpService from '@/lib/services/floor-plan.service';
import { extractTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; objectId: string }> }) {
  const { objectId } = await params;
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(ctx.role, 'zones:update')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  try {
    const body = await request.json();
    const object = await fpService.updateObject(ctx, objectId, body);
    return NextResponse.json({ data: object });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update object' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; objectId: string }> }) {
  const { objectId } = await params;
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(ctx.role, 'zones:delete')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  try {
    await fpService.deleteObject(ctx, objectId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete object' }, { status: 500 });
  }
}
