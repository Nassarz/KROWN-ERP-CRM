// KROWN POS — Platform settings reader with a short-lived cache.
// Values live in `platform_settings` and are edited by the super-admin
// Platform Settings tab; hot paths (login, session creation) read them
// through this module so they stay fast and fail-safe.
import { getSql } from './neon-server';

export interface PlatformSettings {
  maintenanceMode: boolean;
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
}

const DEFAULTS: PlatformSettings = {
  maintenanceMode: false,
  maxLoginAttempts: 5,
  sessionTimeoutMinutes: 480,
};

const TTL_MS = 30_000;
let cache: { value: PlatformSettings; at: number } | null = null;

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const sql = getSql();
    const rows = await sql`SELECT key, value FROM platform_settings WHERE key IN ('maintenance_mode','max_login_attempts','session_timeout_minutes')`;
    const map = new Map<string, any>(rows.map((r: any) => [r.key, r.value]));
    const value: PlatformSettings = {
      maintenanceMode: Boolean(map.get('maintenance_mode')?.enabled),
      maxLoginAttempts: Math.max(1, Number(map.get('max_login_attempts')?.max) || DEFAULTS.maxLoginAttempts),
      sessionTimeoutMinutes: Math.max(1, Number(map.get('session_timeout_minutes')?.minutes) || DEFAULTS.sessionTimeoutMinutes),
    };
    cache = { value, at: Date.now() };
    return value;
  } catch {
    return cache?.value ?? DEFAULTS;
  }
}

export function invalidatePlatformSettingsCache(): void {
  cache = null;
}
