import { NextResponse } from 'next/server';
import { acceptTransfer } from '@/lib/distribution/transfers-service';

// POST /api/distribution/transfers/[id]/accept
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { branchId, userEmail, acceptedItems } = body;
    const result = await acceptTransfer(
      { branchId },
      id,
      acceptedItems || [],
      userEmail || 'system@krown.app'
    );
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to accept transfer' }, { status: 500 });
  }
}
