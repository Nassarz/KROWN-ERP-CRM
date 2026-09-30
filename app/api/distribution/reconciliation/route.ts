import { NextResponse } from 'next/server';
import { submitAgentSettlement } from '@/lib/distribution/enterprise-services';
import { sqlRaw } from '@/lib/neon-server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    let query = `SELECT s.*, a.name as agent_name, v.registration_number as vehicle_reg FROM agent_settlements s LEFT JOIN sales_agents a ON s.sales_agent_id = a.id LEFT JOIN vehicles v ON s.vehicle_id = v.id WHERE 1=1`;
    const params: any[] = [];
    if (sessionId) {
      params.push(sessionId);
      query += ` AND s.route_session_id = $${params.length}`;
    }
    query += ` ORDER BY s.created_at DESC`;

    const items = await sqlRaw(query, params);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch settlements' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await submitAgentSettlement({}, { ...body, userEmail: body.userEmail || 'supervisor@krown.ug' });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to submit reconciliation' }, { status: 500 });
  }
}
