import { NextResponse } from 'next/server';
import { createBudgetRequisition } from '@/lib/distribution/enterprise-services';
import { sqlRaw } from '@/lib/neon-server';

export async function GET(req: Request) {
  try {
    const items = await sqlRaw(`SELECT r.*, bl.category_name FROM budget_requisitions r JOIN budget_lines bl ON r.budget_line_id = bl.id ORDER BY r.created_at DESC`);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch requisitions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await createBudgetRequisition({}, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create budget requisition' }, { status: 500 });
  }
}
