import { NextResponse } from 'next/server';
import { startRouteSession, getActiveRouteSession } from '@/lib/distribution/field-sales-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    if (!agentId) return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });

    const session = await getActiveRouteSession({}, agentId);
    return NextResponse.json(session || { active: false });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch route session' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await startRouteSession({}, {
      routeId: body.routeId,
      salesAgentId: body.salesAgentId,
      vehicleId: body.vehicleId,
      deviceId: body.deviceId,
      openingCashFloat: body.openingCashFloat || 0,
      userEmail: body.userEmail || 'agent@krown.ug'
    });
    return NextResponse.json(session);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to start route session' }, { status: 500 });
  }
}
