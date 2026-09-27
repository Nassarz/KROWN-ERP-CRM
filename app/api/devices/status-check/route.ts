import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/neon-server';

export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await request.json();
    if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 128) {
      return NextResponse.json({ data: { active: false, reason: 'invalid' } });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId)) {
      return NextResponse.json({ data: { active: false, reason: 'not_found' } });
    }
    const sql = getSql();
    const rows = await sql`SELECT id, status, trust_status FROM devices WHERE id = ${deviceId} LIMIT 1`;
    if (!rows.length) return NextResponse.json({ data: { active: false, reason: 'not_found' } });
    const device = rows[0] as any;
    const active = device.status === 'active' && device.trust_status !== 'revoked';
    return NextResponse.json({ data: { active, status: device.status, trustStatus: device.trust_status } });
  } catch {
    return NextResponse.json({ data: { active: false, reason: 'error' } });
  }
}
