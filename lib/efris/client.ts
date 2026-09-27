// ============================================================================
// KROWN ERP — EFRIS client factory
// Resolves the correct adapter for an organization's configuration:
//   environment = sandbox → MockEfrisAdapter (visible simulation)
//   integration_mode = online → OnlineEfrisAdapter (URA)
//   integration_mode = offline → OfflineEfrisAdapter (local enabler)
// Tenant isolation: the resolved adapter carries NO tenant state; callers
// must pass explicit identity via envelope options.
// ============================================================================

import type { EfrisAdapter } from './adapters/adapter';
import { MockEfrisAdapter, type MockScenario } from './adapters/mock.adapter';
import { OnlineEfrisAdapter } from './adapters/online.adapter';
import { OfflineEfrisAdapter } from './adapters/offline.adapter';
import type { EfrisEnvironment, EfrisIntegrationMode } from './types';
import type { EnvelopeOptions } from './envelope';

// globalThis: Next.js bundles each route separately in dev — module-level
// state would NOT be shared between the scenario route and the payment route.
// We store only the scenario STRING (process-wide) and build a fresh adapter
// per call from it; the mock adapter is stateless besides scenario/latency.
const g = globalThis as { __krownMockEfrisScenario?: MockScenario };

/** Current mock scenario (process-wide, shared across route bundles). */
export function getMockScenario(): MockScenario {
  return g.__krownMockEfrisScenario ?? 'success';
}

/** Set the mock scenario (dev only). */
export function setMockScenario(scenario: MockScenario): void {
  g.__krownMockEfrisScenario = scenario;
}

/** Shared mock adapter (dev only). Scenario can be changed for testing. */
export function getMockAdapter(): MockEfrisAdapter {
  return new MockEfrisAdapter({ scenario: getMockScenario() });
}

export function resolveEfrisAdapter(opts: {
  environment: EfrisEnvironment;
  integrationMode: EfrisIntegrationMode;
  offlineEnablerHost?: string;
  offlineEnablerPort?: number;
  onlineBaseUrl?: string;
  timeoutMs?: number;
}): EfrisAdapter {
  if (opts.environment === 'sandbox') {
    return getMockAdapter();
  }
  if (opts.integrationMode === 'offline') {
    return new OfflineEfrisAdapter({
      host: opts.offlineEnablerHost ?? '127.0.0.1',
      port: opts.offlineEnablerPort ?? 9880,
      timeoutMs: opts.timeoutMs,
    });
  }
  return new OnlineEfrisAdapter({
    baseUrl: opts.onlineBaseUrl || 'https://api.ura.go.ug/efris/1.0/',
    timeoutMs: opts.timeoutMs,
  });
}

export function buildEnvelopeOptions(cfg: {
  tin: string;
  brn: string;
  deviceNo: string;
  userName?: string;
}): EnvelopeOptions {
  return {
    interfaceCode: 'T101',
    tin: cfg.tin,
    brn: cfg.brn || '',
    deviceNo: cfg.deviceNo,
    userName: cfg.userName || 'admin',
  };
}
