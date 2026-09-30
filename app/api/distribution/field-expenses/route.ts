import { NextResponse } from 'next/server';
import { recordFieldExpense } from '@/lib/distribution/field-sales-service';
import { sqlRaw } from '@/lib/neon-server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    let query = `SELECT fe.*, a.name as agent_name FROM field_expenses fe LEFT JOIN sales_agents a ON fe.sales_agent_id = a.id WHERE 1=1`;
    const params: any[] = [];
    if (sessionId) {
      params.push(sessionId);
      query += ` AND fe.route_session_id = $${params.length}`;
    }
    query += ` ORDER BY fe.created_at DESC`;

    const items = await sqlRaw(query, params);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch field expenses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await recordFieldExpense({}, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to record field expense' }, { status: 500 });
  }
}
