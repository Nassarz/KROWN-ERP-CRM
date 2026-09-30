import { NextResponse } from 'next/server';
import { getTransfers, createTransfer } from '@/lib/distribution/transfers-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || undefined;
    const status = searchParams.get('status') || undefined;
    const items = await getTransfers({ branchId }, status);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch transfers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { branchId, userEmail, ...input } = body;
    const saved = await createTransfer({ branchId }, input, userEmail || 'system@krown.app');
    return NextResponse.json(saved);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create transfer' }, { status: 500 });
  }
}
