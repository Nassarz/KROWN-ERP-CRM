import { NextResponse } from 'next/server';
import { createBudget } from '@/lib/distribution/enterprise-services';
import { sqlRaw } from '@/lib/neon-server';

export async function GET(req: Request) {
  try {
    const budgets = await sqlRaw(`SELECT * FROM budgets ORDER BY created_at DESC`);
    for (const b of budgets) {
      const lines = await sqlRaw(`SELECT * FROM budget_lines WHERE budget_id = $1`, [b.id]);
      b.lines = lines;
    }
    return NextResponse.json(budgets);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch budgets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await createBudget({}, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create budget' }, { status: 500 });
  }
}
