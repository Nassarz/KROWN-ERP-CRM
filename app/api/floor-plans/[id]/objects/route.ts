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
    const sectionId = request.nextUrl.searchParams.get('sectionId') || undefined;
    const objects = await fpService.listObjects(ctx, id, sectionId);
    return NextResponse.json({ data: objects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list objects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(ctx.role, 'zones:create')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  try {
    const body = await request.json();
    if (!body?.sectionId) return NextResponse.json({ error: 'Section ID is required' }, { status: 400 });
    if (!body?.objectType) return NextResponse.json({ error: 'Object type is required' }, { status: 400 });
    const name = String(body?.name || 'Table').trim().slice(0, 100);
    const object = await fpService.createObject(ctx, {
      floorPlanId: id,
      sectionId: body.sectionId,
      objectType: body.objectType,
      name,
      shape: body.shape,
      x: body.x,
      y: body.y,
      width: body.width,
      height: body.height,
      rotation: body.rotation,
      capacity: body.capacity,
      seatsConfig: body.seatsConfig,
      status: body.status,
      color: body.color,
      metadata: body.metadata,
      zIndex: body.zIndex,
    });
    return NextResponse.json({ data: object }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create object' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(ctx.role, 'zones:update')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  try {
    const body = await request.json();
    if (Array.isArray(body?.updates)) {
      await fpService.batchUpdateObjects(ctx, body.updates);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to batch update objects' }, { status: 500 });
  }
}
