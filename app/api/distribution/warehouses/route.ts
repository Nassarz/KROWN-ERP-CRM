import { NextResponse } from 'next/server';
import { getWarehouses, saveWarehouse } from '@/lib/distribution/service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || undefined;
    const items = await getWarehouses({ branchId });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch warehouses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const saved = await saveWarehouse({ branchId: body.branchId }, body);
    return NextResponse.json(saved);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save warehouse' }, { status: 500 });
  }
}
