// ============================================================================
// KROWN ERP — EFRIS time synchronization service (T101)
// EFRIS depends on correct timestamps. We never depend solely on browser
// time: T101 gives the URA server time and we persist the offset for
// diagnostics.
// ============================================================================

import { getSql } from '@/lib/neon-server';
import { generateId } from '@/lib/id';
import type { EfrisAdapter } from '@/lib/efris/adapters/adapter';
import type { EnvelopeOptions } from '@/lib/efris/envelope';
import { EFRIS_MAX_CLOCK_SKEW_MS } from '@/lib/efris/constants';

export interface TimeSyncResult {
  ok: boolean;
  serverTime: Date;
  localTime: Date;
  offsetMs: number;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

/** Parse T101's dd/MM/yyyy HH:mm:ss into a Date (treated as UTC+3) */
export function parseEfrisTime(value: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(value?.trim() ?? '');
  if (!m) return null;
  const [, dd, mm, yyyy, hh, mi, ss] = m;
  // EFRIS times are UTC+3 — normalize to UTC for offset computation.
  const utc = Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh) - 3, Number(mi), Number(ss));
  return new Date(utc);
}

export async function synchronizeEfrisTime(input: {
  organizationId: string;
  adapter: EfrisAdapter;
  envelopeOptions: EnvelopeOptions;
}): Promise<TimeSyncResult> {
  const sql = getSql();
  const localTime = new Date();
  try {
    const result = await input.adapter.getServerTime(input.envelopeOptions);
    const content = (result.content ?? {}) as { currentTime?: string };
    const serverTime = parseEfrisTime(content.currentTime ?? '');
    if (!serverTime || !result.success) {
      return { ok: false, serverTime: localTime, localTime, offsetMs: 0, status: 'error', message: result.returnMessage || 'Invalid server time response' };
    }
    const offsetMs = serverTime.getTime() - localTime.getTime();
    const skewOk = Math.abs(offsetMs) <= EFRIS_MAX_CLOCK_SKEW_MS;
    const status = skewOk ? 'ok' : 'warning';
    await sql`
      INSERT INTO efris_time_sync (
        id, organization_id, server_time, local_time, offset_ms, status, created_at
      ) VALUES (
        ${generateId()}, ${input.organizationId}, ${serverTime.toISOString()},
        ${localTime.toISOString()}, ${offsetMs}, ${status}, NOW()
      )
    `;
    return {
      ok: skewOk,
      serverTime,
      localTime,
      offsetMs,
      status,
      message: skewOk
        ? 'Clock synchronized with EFRIS'
        : `Clock offset of ${Math.round(offsetMs / 1000)}s exceeds the ${EFRIS_MAX_CLOCK_SKEW_MS / 60000}-minute tolerance`,
    };
  } catch (e: any) {
    return { ok: false, serverTime: localTime, localTime, offsetMs: 0, status: 'error', message: 'Could not reach EFRIS time service' };
  }
}

export async function getLastTimeSync(organizationId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM efris_time_sync
    WHERE organization_id = ${organizationId}
    ORDER BY created_at DESC LIMIT 1
  `;
  if (!rows.length) return null;
  const r = rows[0] as any;
  return {
    id: r.id,
    serverTime: r.server_time,
    localTime: r.local_time,
    offsetMs: Number(r.offset_ms),
    status: r.status,
    createdAt: r.created_at,
  };
}
