import { NextResponse } from 'next/server';
import { getTruckStockSummary } from '@/lib/distribution/transfers-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || undefined;
    const vehicleId = searchParams.get('vehicleId') || undefined;
    const items = await getTruckStockSummary({ branchId }, vehicleId);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch truck stock' }, { status: 500 });
  }
}
