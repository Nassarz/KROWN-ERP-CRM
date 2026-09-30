import { NextResponse } from 'next/server';
import { recordCustomerReturn } from '@/lib/distribution/field-sales-service';
import { sqlRaw } from '@/lib/neon-server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    let query = `SELECT cr.*, c.name as customer_name FROM customer_returns cr JOIN customers c ON cr.customer_id = c.id WHERE 1=1`;
    const params: any[] = [];
    if (sessionId) {
      params.push(sessionId);
      query += ` AND cr.route_session_id = $${params.length}`;
    }
    query += ` ORDER BY cr.created_at DESC`;

    const items = await sqlRaw(query, params);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch customer returns' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await recordCustomerReturn({}, { ...body, userEmail: body.userEmail || 'agent@krown.ug' });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to record customer return' }, { status: 500 });
  }
}
