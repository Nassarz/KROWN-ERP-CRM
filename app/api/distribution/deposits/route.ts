import { NextResponse } from 'next/server';
import { createDepositBatch } from '@/lib/distribution/enterprise-services';
import { sqlRaw } from '@/lib/neon-server';

export async function GET(req: Request) {
  try {
    const items = await sqlRaw(`SELECT * FROM deposit_batches ORDER BY created_at DESC`);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch deposit batches' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await createDepositBatch({}, { ...body, userEmail: body.userEmail || 'cashier@krown.ug' });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create deposit batch' }, { status: 500 });
  }
}
