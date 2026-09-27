// GET /api/efris/products — product mapping list
// PUT /api/efris/products — map/unmap a product
import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/rbac';
import { listProductMappings, mapProduct, unmapProduct } from '@/lib/services/efris-product.service';

export async function GET(request: NextRequest) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (!hasPermission(ctx.role, 'efris:view')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

  try {
    const search = request.nextUrl.searchParams.get('search') || undefined;
    const status = request.nextUrl.searchParams.get('status') || undefined;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100', 10) || 100;
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10) || 0;
    const result = await listProductMappings(ctx.organizationId, {
      search,
      status: status as any,
      limit,
      offset,
    });
    return NextResponse.json({ data: result });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'Failed to load product mappings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (!hasPermission(ctx.role, 'efris:configure')) return NextResponse.json({ data: null, error: 'Insufficient permissions' }, { status: 403 });

  try {
    const body = await request.json();
    const productId = String(body.productId || '');
    if (!productId) return NextResponse.json({ data: null, error: 'productId is required' }, { status: 400 });

    if (body.unmap) {
      await unmapProduct({ organizationId: ctx.organizationId, productId, actor: { userId: ctx.userId, role: ctx.role } });
      return NextResponse.json({ data: { unmapped: true } });
    }

    const taxCategory = String(body.taxCategory || 'A').toUpperCase();
    if (!['A', 'B', 'C', 'D', 'E'].includes(taxCategory)) {
      return NextResponse.json({ data: null, error: 'taxCategory must be A, B, C, D or E' }, { status: 400 });
    }
    const mapping = await mapProduct({
      organizationId: ctx.organizationId,
      productId,
      actor: { userId: ctx.userId, role: ctx.role },
      taxCategory: taxCategory as any,
      commodityCategoryId: body.commodityCategoryId || null,
      commodityGoodsId: body.commodityGoodsId || null,
      goodsCode: body.goodsCode || null,
      unitOfMeasure: body.unitOfMeasure || null,
    });
    return NextResponse.json({ data: mapping });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: e?.message || 'Failed to update product mapping' }, { status: 500 });
  }
}
