// POST /api/efris/dev/scenario — DEVELOPMENT ONLY mock scenario switch
// Enables deterministic failure testing (timeout, rejection, unknown) against
// the sandbox mock adapter. Refuses to run outside development.
import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedTenantContext } from '@/lib/tenant';
import { getMockScenario, setMockScenario } from '@/lib/efris/client';
import type { MockScenario } from '@/lib/efris/adapters/mock.adapter';

const VALID_SCENARIOS: MockScenario[] = [
  'success', 'rejection', 'timeout-before-submit', 'timeout-after-submit',
  'authentication-error', 'validation-error', 'unknown', 'slow-response',
];

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ data: null, error: 'Not available in production' }, { status: 404 });
  }
  return NextResponse.json({ data: { scenario: getMockScenario() } });
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ data: null, error: 'Not available in production' }, { status: 404 });
  }
  const ctx = await extractVerifiedTenantContext(request);
  if (!ctx) return NextResponse.json({ data: null, error: 'Authentication required' }, { status: 401 });
  if (ctx.role !== 'super_admin') return NextResponse.json({ data: null, error: 'Super Admin access required' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const scenario = String(body.scenario || '');
  if (!VALID_SCENARIOS.includes(scenario as MockScenario)) {
    return NextResponse.json({ data: null, error: 'Invalid scenario' }, { status: 400 });
  }
  setMockScenario(scenario as MockScenario);
  return NextResponse.json({ data: { scenario } });
}
