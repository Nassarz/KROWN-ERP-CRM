import { NextResponse } from 'next/server';
import { createSupplierPayout } from '@/lib/distribution/enterprise-services';
import { sqlRaw } from '@/lib/neon-server';

export async function GET(req: Request) {
  try {
    const items = await sqlRaw(`SELECT po.*, s.name as supplier_name FROM supplier_payouts po JOIN suppliers s ON po.supplier_id = s.id ORDER BY po.created_at DESC`);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch payouts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await createSupplierPayout({}, { ...body, userEmail: body.userEmail || 'finance@krown.ug' });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to process supplier payout' }, { status: 500 });
  }
}
