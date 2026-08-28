# FL-INS-001 — DFS credential contract

TYCL = license class. **Not LOA.** FL LOA observations remain **0**.

Library: `lib/national/fl-dfs-tycl.ts`

## Sources

| File | SHA-256 | Rows |
|------|---------|-----:|
| AllValidLicensesBusiness.csv | `2043c4ad7bf7306483ac88f462e8f6382c5f8ae1484102147e55db11d11ad070` | 104,374 |
| AllValidLicensesIndividual.csv | `49322f971ea71d9df4c7eeda58418a0882a600f931b1011ea51856273d15332a` | 1,231,538 |
| AllActiveAppointmentsBusiness.csv | `5aea3fadbc39ce13a89d7953a289af17f46cb46f1658eb85005c5429063df3eb` | 59,405 |
| Individual appointments A–Z | INS-NAT-013 (Last-Modified 2026-08-27) | 3,142,628 |
| County appointments | **EXCLUDED** | — |

Portal: https://licenseesearch.fldfs.com/BulkDownload

## Identity

Person and agency: exact NPN. Name never merges. A new class may attach to an existing NPN entity.

## Status

Source `License Status=VALID` → ACTIVE. Blank ≠ inactive.

## Residency

Canonical: `Residency Type` field (Resident / Nonresident). Class prefix NONRES is corroboration only.

## Publication

Fail-closed. No person pages, no mass agencies, no sitemap.
