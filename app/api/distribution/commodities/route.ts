import { NextResponse } from 'next/server';
import { getCommodities, saveCommodity } from '@/lib/distribution/service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || undefined;
    const search = searchParams.get('search') || undefined;

    const items = await getCommodities({ branchId }, search);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch commodities' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const branchId = body.branchId || undefined;

    const saved = await saveCommodity({ branchId }, body);
    return NextResponse.json(saved);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save commodity' }, { status: 500 });
  }
}
