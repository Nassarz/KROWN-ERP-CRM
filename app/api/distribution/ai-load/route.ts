import { NextResponse } from 'next/server';
import { getAiLoadRecommendation } from '@/lib/distribution/enterprise-services';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId') || 'agent-001';
    const vehicleId = searchParams.get('vehicleId') || 'veh-001';

    const recommendation = await getAiLoadRecommendation({}, agentId, vehicleId);
    return NextResponse.json(recommendation);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch AI load recommendation' }, { status: 500 });
  }
}
