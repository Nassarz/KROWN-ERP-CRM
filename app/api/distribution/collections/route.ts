import { NextResponse } from 'next/server';
import { recordFieldCollection } from '@/lib/distribution/field-sales-service';
import { sqlRaw } from '@/lib/neon-server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    let query = `SELECT fr.*, c.name as customer_name FROM financial_receipts fr JOIN customers c ON fr.customer_id = c.id WHERE 1=1`;
    const params: any[] = [];

    if (sessionId) {
      params.push(sessionId);
      query += ` AND fr.route_session_id = $${params.length}`;
    }
    query += ` ORDER BY fr.created_at DESC`;

    const receipts = await sqlRaw(query, params);
    return NextResponse.json(receipts);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch receipts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await recordFieldCollection({}, {
      operationId: body.operationId,
      routeSessionId: body.routeSessionId,
      salesAgentId: body.salesAgentId,
      vehicleId: body.vehicleId,
      customerId: body.customerId,
      receivableId: body.receivableId,
      amountUGX: Number(body.amountUGX || 0),
      paymentMethod: body.paymentMethod || 'cash',
      paymentReference: body.paymentReference,
      notes: body.notes
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to record collection' }, { status: 500 });
  }
}
