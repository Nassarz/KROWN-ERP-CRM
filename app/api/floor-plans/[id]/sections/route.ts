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
    const sections = await fpService.listSections(ctx, id);
    return NextResponse.json({ data: sections });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list sections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = extractTenantContext(request);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(ctx.role, 'zones:create')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim().slice(0, 255);
    if (!name) return NextResponse.json({ error: 'Section name is required' }, { status: 400 });
    const section = await fpService.createSection(ctx, {
      floorPlanId: id,
      name,
      icon: body?.icon,
      description: body?.description,
      sortOrder: body?.sortOrder,
      backgroundColor: body?.backgroundColor,
    });
    return NextResponse.json({ data: section }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create section' }, { status: 500 });
  }
}
