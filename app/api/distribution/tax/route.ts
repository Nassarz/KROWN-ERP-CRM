import { NextResponse } from 'next/server';
import { createTaxObligation } from '@/lib/distribution/enterprise-services';
import { sqlRaw } from '@/lib/neon-server';

export async function GET(req: Request) {
  try {
    const items = await sqlRaw(`SELECT * FROM tax_obligations ORDER BY due_date ASC`);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch tax obligations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await createTaxObligation({}, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create tax obligation' }, { status: 500 });
  }
}
