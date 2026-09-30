import { NextResponse } from 'next/server';
import { createSupplierPayable } from '@/lib/distribution/enterprise-services';
import { sqlRaw } from '@/lib/neon-server';

export async function GET(req: Request) {
  try {
    const items = await sqlRaw(`SELECT p.*, s.name as supplier_name FROM supplier_payables p JOIN suppliers s ON p.supplier_id = s.id ORDER BY p.due_date ASC`);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch payables' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await createSupplierPayable({}, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create payable' }, { status: 500 });
  }
}
