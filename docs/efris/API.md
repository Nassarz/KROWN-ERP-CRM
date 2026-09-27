# EFRIS API contract (KROWN ERP)

All restaurant APIs require `Authorization: Bearer <jwt>` (or session cookie +
header as used by the app). Super admin APIs require `super_admin`.

## Restaurant Admin Control Center (`efris:*` RBAC)

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| GET | `/api/efris/status` | `efris:view` | Config health, feature flag, last sync |
| GET/POST/PUT | `/api/efris/config` | `efris:view` / `efris:configure` | Read-safe config / upsert (secrets write-only) |
| GET | `/api/efris/transactions` | `efris:view` | Explorer; `?orderId=` loads one + items + events |
| GET | `/api/efris/transactions/:id` | `efris:view` | Detail drawer |
| POST | `/api/efris/transactions/:id/retry\|cancel` | `efris:retry` | Queue actions |
| POST | `/api/efris/transactions/:id/credit-note` | `efris:adjust` | Credit note (T110) |
| GET/PUT | `/api/efris/products` | `efris:products` | Map tax category / unmap |
| GET | `/api/efris/queue` | `efris:view` | Retry queue |
| GET | `/api/efris/diagnostics` | `efris:configure` | Health checks, no secrets |
| POST | `/api/efris/test` | `efris:configure` | Connectivity / envelope smoke test |
| GET/POST | `/api/efris/dev/scenario` | `super_admin` + non-production | Mock adapter scenario switch |

## Payment hooks

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/orders/:id/pay` | Body: `{ paymentMethod, amountReceived?, … }`. Response: `{ data: order, efris: PosFiscalResult }` |
| POST | `/api/orders/:id/split` | Body: `{ splits: [...] }`. Response: `{ data: order, efris \| null }` (fiscalize only when fully paid) |

`PosFiscalResult`:
```ts
{
  applicable: boolean;
  transaction: EfrisTransactionRow | null;
  fiscalized: boolean;
  pending: boolean;
  needsAttention: boolean;
  needsReconciliation: boolean;
  status: FiscalStatus | null;
  fiscalDocumentNumber: string | null;
  cashierMessage: 'fiscalized' | 'pending' | 'attention' | 'not_applicable';
}
```

## Receipt reprint

| Method | Path | Permission | Response |
|--------|------|------------|----------|
| GET | `/api/orders/:id/fiscal` | `orders:view` | `{ data: { efris: ReceiptFiscalPayload \| null, orderId, fiscalStatus } }` |

`ReceiptFiscalPayload` includes only: status flags, `fiscalDocumentNumber`,
`invoiceNo`, `antifakeCode`, `verificationCode`, `qrCodeData`, `krownReference`,
`deviceNumber`, `taxpayerTin`, `environment`, `integrationMode`, `cashierMessage`.

## Platform (super admin)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/super-admin/restaurant-detail?organizationId=` | Includes `efris: { configured, enabled, environment, status, taxpayerTin, deviceNumber, countsByStatus, recent[] }` — **no secrets** |

## Error shapes

- `401` `{ error: 'Authentication required' | 'Missing tenant context' }`
- `403` `{ error: 'Insufficient permissions' }`
- `404` `{ error: 'Order not found' }`
- `500` `{ error: string }`

Payment must never return a fiscal failure as a payment failure; look at
top-level `efris` instead of HTTP status for fiscal outcome.
