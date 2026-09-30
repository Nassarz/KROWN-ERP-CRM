import { NextResponse } from 'next/server';
import { getEodReconciliation } from '@/lib/distribution/field-sales-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

    const reconciliation = await getEodReconciliation({}, sessionId);
    return NextResponse.json(reconciliation);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch EOD reconciliation' }, { status: 500 });
  }
}
