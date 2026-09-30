import { NextResponse } from 'next/server';
import { createVanSale } from '@/lib/distribution/field-sales-service';
import { sqlRaw } from '@/lib/neon-server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const customerId = searchParams.get('customerId');

    let query = `SELECT vs.*, c.name as customer_name, a.name as agent_name FROM van_sales vs JOIN customers c ON vs.customer_id = c.id LEFT JOIN sales_agents a ON vs.sales_agent_id = a.id WHERE 1=1`;
    const params: any[] = [];

    if (sessionId) {
      params.push(sessionId);
      query += ` AND vs.route_session_id = $${params.length}`;
    }
    if (customerId) {
      params.push(customerId);
      query += ` AND vs.customer_id = $${params.length}`;
    }
    query += ` ORDER BY vs.created_at DESC`;

    const sales = await sqlRaw(query, params);
    return NextResponse.json(sales);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch van sales' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await createVanSale({}, {
      operationId: body.operationId,
      routeSessionId: body.routeSessionId,
      salesAgentId: body.salesAgentId,
      vehicleId: body.vehicleId,
      truckStockLocationId: body.truckStockLocationId,
      customerId: body.customerId,
      customerLocationId: body.customerLocationId,
      saleType: body.saleType || 'cash',
      lines: body.lines || [],
      userEmail: body.userEmail || 'agent@krown.ug'
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create van sale' }, { status: 500 });
  }
}
