// ============================================================================
// KROWN ERP — EFRIS configuration service
// Tenant-isolated EFRIS configuration. Secrets are encrypted at rest and
// NEVER returned to browser clients. Every query is scoped by
// organization_id. ONE restaurant must NEVER use another restaurant's
// EFRIS identity.
// ============================================================================

import { getSql } from '@/lib/neon-server';
import { generateId } from '@/lib/id';
import { decryptSecret, encryptSecret } from '@/lib/efris/security';
import type {
  EfrisConfigStatus,
  EfrisConfigurationSafe,
  EfrisEnvironment,
  EfrisIntegrationMode,
} from '@/lib/efris/types';
import { logAuditEvent } from '@/lib/audit';

export interface EfrisConfigUpsertInput {
  organizationId: string;
  actor: { userId: string; role: string; userEmail?: string };
  branchId?: string | null;
  enabled?: boolean;
  integrationMode?: EfrisIntegrationMode;
  environment?: EfrisEnvironment;
  taxpayerTin?: string;
  taxpayerName?: string;
  businessRegistrationNumber?: string;
  deviceNumber?: string;
  deviceSerialNumber?: string;
  offlineEnablerHost?: string;
  offlineEnablerPort?: number;
  offlineUpdaterPort?: number;
  // Secrets — submitted once, encrypted at rest, never returned
  clientPrivateKeyPem?: string | null;
  serverPublicKeyPem?: string | null;
  keyTable?: string | null;
  status?: EfrisConfigStatus;
}

/** Internal representation incl. decrypted secrets (server-only) */
export interface EfrisConfigWithSecrets {
  id: string;
  organizationId: string;
  branchId: string | null;
  enabled: boolean;
  integrationMode: EfrisIntegrationMode;
  environment: EfrisEnvironment;
  status: EfrisConfigStatus;
  taxpayerTin: string | null;
  taxpayerName: string | null;
  businessRegistrationNumber: string | null;
  deviceNumber: string | null;
  deviceSerialNumber: string | null;
  offlineEnablerHost: string;
  offlineEnablerPort: number;
  offlineUpdaterPort: number;
  clientPrivateKeyPem: string | null;
  serverPublicKeyPem: string | null;
  keyTable: string | null;
  symmetricKey: string | null;
  symmetricKeySign: string | null;
  symmetricKeyRefreshedAt: string | null;
  lastSuccessfulCommunication: string | null;
  lastSynchronization: string | null;
  fiscalActivationAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToSafe(row: any): EfrisConfigurationSafe {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id ?? null,
    enabled: !!row.enabled,
    integrationMode: row.integration_mode,
    environment: row.environment,
    status: row.status,
    taxpayerTin: row.taxpayer_tin ?? null,
    taxpayerName: row.taxpayer_name ?? null,
    businessRegistrationNumber: row.business_registration_number ?? null,
    deviceNumber: row.device_number ?? null,
    deviceSerialNumber: row.device_serial_number ?? null,
    offlineEnablerHost: row.offline_enabler_host,
    offlineEnablerPort: row.offline_enabler_port,
    offlineUpdaterPort: row.offline_updater_port,
    symmetricKeyRefreshedAt: row.symmetric_key_refreshed_at ?? null,
    lastSuccessfulCommunication: row.last_successful_communication ?? null,
    lastSynchronization: row.last_synchronization ?? null,
    fiscalActivationAt: row.fiscal_activation_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToWithSecrets(row: any): EfrisConfigWithSecrets {
  return {
    ...rowToSafe(row),
    clientPrivateKeyPem: row.encrypted_client_private_key ? decryptSecret(row.encrypted_client_private_key) : null,
    serverPublicKeyPem: row.encrypted_server_public_key ? decryptSecret(row.encrypted_server_public_key) : null,
    keyTable: row.encrypted_key_table ? decryptSecret(row.encrypted_key_table) : null,
    symmetricKey: row.encrypted_symmetric_key ? decryptSecret(row.encrypted_symmetric_key) : null,
    symmetricKeySign: row.encrypted_symmetric_key_sign ? decryptSecret(row.encrypted_symmetric_key_sign) : null,
    symmetricKeyRefreshedAt: row.symmetric_key_refreshed_at ?? null,
  };
}

/** Safe config for API/UI — NO secrets ever leave the server */
export async function getEfrisConfigSafe(organizationId: string, branchId?: string | null): Promise<EfrisConfigurationSafe | null> {
  const sql = getSql();
  const rows = branchId
    ? await sql`SELECT * FROM efris_configurations WHERE organization_id = ${organizationId} AND branch_id = ${branchId} LIMIT 1`
    : await sql`SELECT * FROM efris_configurations WHERE organization_id = ${organizationId} ORDER BY (branch_id IS NOT NULL), created_at ASC LIMIT 1`;
  if (!rows.length) return null;
  return rowToSafe(rows[0]);
}

/** Server-only config incl. decrypted secrets. NEVER expose to the client. */
export async function getEfrisConfigWithSecrets(organizationId: string): Promise<EfrisConfigWithSecrets | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM efris_configurations WHERE organization_id = ${organizationId} ORDER BY (branch_id IS NOT NULL), created_at ASC LIMIT 1`;
  if (!rows.length) return null;
  return rowToWithSecrets(rows[0]);
}

export async function upsertEfrisConfig(input: EfrisConfigUpsertInput): Promise<EfrisConfigurationSafe> {
  const sql = getSql();
  const existingRows = await sql`SELECT * FROM efris_configurations WHERE organization_id = ${input.organizationId} ORDER BY (branch_id IS NOT NULL), created_at ASC LIMIT 1`;

  const secretFields: Record<string, string | null> = {};
  if (input.clientPrivateKeyPem !== undefined) {
    secretFields.encrypted_client_private_key = input.clientPrivateKeyPem ? encryptSecret(input.clientPrivateKeyPem) : null;
  }
  if (input.serverPublicKeyPem !== undefined) {
    secretFields.encrypted_server_public_key = input.serverPublicKeyPem ? encryptSecret(input.serverPublicKeyPem) : null;
  }
  if (input.keyTable !== undefined) {
    secretFields.encrypted_key_table = input.keyTable ? encryptSecret(input.keyTable) : null;
  }

  let row: any;
  if (existingRows.length) {
    const existing = existingRows[0] as any;
    const updated = await sql`
      UPDATE efris_configurations SET
        enabled = COALESCE(${input.enabled ?? null}::boolean, enabled),
        integration_mode = COALESCE(${input.integrationMode ?? null}, integration_mode),
        environment = COALESCE(${input.environment ?? null}, environment),
        taxpayer_tin = COALESCE(${input.taxpayerTin ?? null}, taxpayer_tin),
        taxpayer_name = COALESCE(${input.taxpayerName ?? null}, taxpayer_name),
        business_registration_number = COALESCE(${input.businessRegistrationNumber ?? null}, business_registration_number),
        device_number = COALESCE(${input.deviceNumber ?? null}, device_number),
        device_serial_number = COALESCE(${input.deviceSerialNumber ?? null}, device_serial_number),
        offline_enabler_host = COALESCE(${input.offlineEnablerHost ?? null}, offline_enabler_host),
        offline_enabler_port = COALESCE(${input.offlineEnablerPort ?? null}::int, offline_enabler_port),
        offline_updater_port = COALESCE(${input.offlineUpdaterPort ?? null}::int, offline_updater_port),
        status = COALESCE(${input.status ?? null}, status),
        encrypted_client_private_key = COALESCE(${secretFields.encrypted_client_private_key ?? null}, encrypted_client_private_key),
        encrypted_server_public_key = COALESCE(${secretFields.encrypted_server_public_key ?? null}, encrypted_server_public_key),
        encrypted_key_table = COALESCE(${secretFields.encrypted_key_table ?? null}, encrypted_key_table),
        fiscal_activation_at = CASE WHEN ${input.status ?? null} = 'active' THEN COALESCE(fiscal_activation_at, NOW()) ELSE fiscal_activation_at END,
        updated_at = NOW()
      WHERE id = ${existing.id}
      RETURNING *
    `;
    row = updated[0] ?? existing;
  } else {
    const id = generateId();
    const inserted = await sql`
      INSERT INTO efris_configurations (
        id, organization_id, branch_id, enabled, integration_mode, environment, status,
        taxpayer_tin, taxpayer_name, business_registration_number,
        device_number, device_serial_number,
        offline_enabler_host, offline_enabler_port, offline_updater_port,
        encrypted_client_private_key, encrypted_server_public_key, encrypted_key_table,
        fiscal_activation_at, created_at, updated_at
      ) VALUES (
        ${id}, ${input.organizationId}, ${input.branchId ?? null},
        ${input.enabled ?? false}, ${input.integrationMode ?? 'online'}, ${input.environment ?? 'sandbox'},
        ${input.status ?? 'not_configured'},
        ${input.taxpayerTin ?? null}, ${input.taxpayerName ?? null}, ${input.businessRegistrationNumber ?? null},
        ${input.deviceNumber ?? null}, ${input.deviceSerialNumber ?? null},
        ${input.offlineEnablerHost ?? '127.0.0.1'}, ${input.offlineEnablerPort ?? 9880}, ${input.offlineUpdaterPort ?? 9980},
        ${secretFields.encrypted_client_private_key ?? null},
        ${secretFields.encrypted_server_public_key ?? null},
        ${secretFields.encrypted_key_table ?? null},
        CASE WHEN ${input.status ?? ''} = 'active' THEN NOW() ELSE NULL END,
        NOW(), NOW()
      )
      RETURNING *
    `;
    row = inserted[0];
  }

  await logAuditEvent({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    userEmail: input.actor.userEmail ?? '',
    actorRole: input.actor.role,
    action: 'EFRIS_CONFIG_UPDATED',
    targetType: 'efris_config',
    targetId: row.id,
    details: {
      // NEVER include secret material
      changed: ['enabled', 'integration_mode', 'environment', 'status', 'taxpayer_tin', 'device_number']
        .filter(k => (input as any)[k] !== undefined),
    },
  }).catch(() => {});

  return rowToSafe(row);
}

export async function storeSymmetricKey(
  organizationId: string,
  symmetricKey: string,
  sign: string,
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE efris_configurations SET
      encrypted_symmetric_key = ${encryptSecret(symmetricKey)},
      encrypted_symmetric_key_sign = ${encryptSecret(sign)},
      symmetric_key_refreshed_at = NOW(),
      updated_at = NOW()
    WHERE organization_id = ${organizationId}
  `;
}

export async function touchCommunication(
  organizationId: string,
  opts: { successful?: boolean } = {},
): Promise<void> {
  const sql = getSql();
  if (opts.successful) {
    await sql`UPDATE efris_configurations SET last_successful_communication = NOW(), updated_at = NOW() WHERE organization_id = ${organizationId}`;
  } else {
    await sql`UPDATE efris_configurations SET last_synchronization = NOW(), updated_at = NOW() WHERE organization_id = ${organizationId}`;
  }
}

/** Whether EFRIS is active for this organization (feature-flagged path) */
export async function isEfrisActive(organizationId: string): Promise<boolean> {
  const config = await getEfrisConfigSafe(organizationId);
  return !!config && config.enabled && config.status === 'active';
}
