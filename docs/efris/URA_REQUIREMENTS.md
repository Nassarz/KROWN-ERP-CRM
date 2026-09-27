# URA EFRIS — Requirements & open items

Authoritative local extracts (do not invent endpoints):

- `/tmp/opencode/efris-docs/interface-design.txt` — Interface Design for EFRIS v24
- `/tmp/opencode/efris-docs/s2s-api.txt` — How to use the System to System API V3
- `/tmp/opencode/efris-docs/offline-guide.txt` — Offline Mode Enabler Installation Guide v1
- `/tmp/opencode/efris-docs/business-req.txt` — Business Requirements v1

## Implemented from docs

- Envelope: `data{content,signature,dataDescription}`, `globalInfo` (appId **AP04**, requestTime UTC+3, requestCode TP, responseCode TA, deviceNo, tin, brn, interfaceCode), `returnStateInfo{returnCode,returnMessage}`.
- Online: AES content encryption + RSA signature of encrypted content; offline: empty signature, BASE64 content only.
- Offline enabler default `127.0.0.1:9880` / `/efristcs`, updater port 9980 (configurable per tenant).
- Tax categories: A standard 18%, B zero, C exempt, D deemed 18%, E excise.
- Interfaces: T101 time, T102 init, T103 login, T104 symmetric key, T106–T108 query, **T109 upload**, T110–T114 credit notes, T117 reconciliation, T119 TIN, T122/T123 commodity, T127/T130 goods, T129 batch, T138 branches.
- Receipt fields: FD no (≤20), antifake (≤20), QR, verification code, device no, issued datetime, seller/buyer, line items.

## Blocking UAT items (awaiting URA)

| Item | Status |
|------|--------|
| UAT base URL + certificate bundle | **[AWAITING URA CONFIGURATION]** |
| Test TIN / BRN / taxpayer name | **[AWAITING URA CONFIGURATION]** |
| Test device number + serial | **[AWAITING URA CONFIGURATION]** |
| Client private key + server public key (T102/T104) | **[AWAITING URA CONFIGURATION]** |
| Confirmation of invoiceType dictionary codes | **[CONFIRM-AT-UAT]** |
| Exact QR payload format (URL vs raw) | **[CONFIRM-AT-UAT]** |

Until the above exist, **sandbox uses the Mock adapter** (`environment: sandbox`),
producing clearly marked `SIM-*` document numbers.

## Production go-live checklist

1. Switch `environment` to `uat`, complete T102/T103/T104 handshake.
2. Map all products (`efris_products.tax_category`).
3. Enable feature flag + `efris_configurations.enabled`.
4. Happy-path E2E: pay → fiscalized FDN → receipt shows FDN + antifake + QR.
5. Failure drills: reject, timeout-before-submit, timeout-after-submit + reconcile.
6. Credit note path for a full refund.
7. Only then flip to `production`.
