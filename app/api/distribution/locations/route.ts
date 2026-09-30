import { NextResponse } from 'next/server';
import { getStockLocations } from '@/lib/distribution/transfers-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || undefined;
    const locations = await getStockLocations({ branchId });
    return NextResponse.json(locations);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch stock locations' }, { status: 500 });
  }
}
