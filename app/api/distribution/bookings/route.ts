import { NextResponse } from 'next/server';
import { createBooking } from '@/lib/distribution/field-sales-service';
import { sqlRaw } from '@/lib/neon-server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const customerId = searchParams.get('customerId');

    let query = `SELECT b.*, c.name as customer_name FROM bookings b JOIN customers c ON b.customer_id = c.id WHERE 1=1`;
    const params: any[] = [];
    if (sessionId) {
      params.push(sessionId);
      query += ` AND b.route_session_id = $${params.length}`;
    }
    if (customerId) {
      params.push(customerId);
      query += ` AND b.customer_id = $${params.length}`;
    }
    query += ` ORDER BY b.created_at DESC`;

    const items = await sqlRaw(query, params);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await createBooking({}, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create booking' }, { status: 500 });
  }
}
