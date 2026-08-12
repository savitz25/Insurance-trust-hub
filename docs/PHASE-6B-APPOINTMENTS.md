# Phase 6B — Appointments Data Hardening

Hardens Phase 6A appointment enrichment: schema durability, match/dedupe quality, snapshot shape, and a safe refresh cadence.

Product philosophy unchanged:

- Regulatory snapshot only  
- Not an endorsement  
- Not a quality rank  
- No providers created from appointments alone  
- No Medicare inference  

## Schema

| Migration | Purpose |
|-----------|---------|
| `20260812120000_phase6a_appointments.sql` | Extended columns + base indexes |
| `20260812130000_phase6b_appointments_hardening.sql` | `license_key`, stronger indexes, dedupe unique |

**Public path (unchanged):** `providers.contact.appointment_snapshot` on verified rows (RLS).

### Apply status (ops)

1. Open Supabase SQL Editor for inventory project (`gojyhmbo…`).  
2. Paste and run **both** migrations if not already applied.  
3. Probe:

```powershell
npm run dfs:ensure-appointments-schema
```

Import/attach **still work** on base columns if extended migration is pending; extended fields are used when present.

## Match & dedupe improvements (6B)

1. **License keys** — uppercase compact forms via `appointmentLicenseKeys()` (spaces stripped, alnum variant).  
2. **Carrier dedupe** — unique by normalized carrier name; prefer **active** status when choosing among duplicates.  
3. **Sort** — alphabetical by carrier name, then type label.  
4. **Display cap** — 48 carriers shown; `totalCount` remains full unique set; `displayCapped` flag when truncated.  
5. **Neutral type groups** — agent / MGA / broker / other from DFS type text (no value judgment).

## Snapshot shape (schemaVersion 2)

```json
{
  "source": "Florida DFS",
  "sourceUrl": "…",
  "lookupUrl": "…",
  "asOf": "ISO-8601",
  "totalCount": 12,
  "activeCount": 12,
  "carriers": [{ "name": "…", "type": "…", "typeGroup": "agent", "status": "ACTIVE" }],
  "displayCapped": false,
  "honesty": [ "Regulatory snapshot from Florida DFS", "…", "…" ],
  "schemaVersion": 2
}
```

## Refresh cadence (ops)

```powershell
# 0) Preflight
npm run dfs:env
npm run dfs:ensure-appointments-schema

# 1) Download latest business appointments CSV (do not commit)
#    https://licenseesearch.fldfs.com/BulkDownload
#    → data/dfs-raw/AllActiveAppointmentsBusiness.csv

# 2) Optional: wipe staging + full re-import
npm run dfs:import-appointments -- --file data/dfs-raw/AllActiveAppointmentsBusiness.csv --refresh --dry-run --limit 100
npm run dfs:import-appointments -- --file data/dfs-raw/AllActiveAppointmentsBusiness.csv --refresh

# 3) Or incremental append (no --refresh) if you accept possible duplicates without unique index

# 4) Rebuild / refresh public snapshots on promoted agencies
npm run dfs:attach-appointments -- --dry-run --limit 50
npm run dfs:attach-appointments -- --refresh

# Wave-scoped attach (optional)
npm run dfs:attach-appointments -- --wave 2 --refresh
```

`--refresh` on attach also **clears** `appointment_snapshot` when a promoted agency no longer has staged appointments (section stays hidden).

## Directory filter (research only)

`/directory?appointments=true` — “Has DFS appointment snapshot”

- Convenience filter only  
- Label notes: **not a quality rank or paid placement**  
- Agencies without snapshots remain section-free on profiles  

## Guards

```powershell
npm run check:phase6a-appointments
npm run check:phase6a
```

## Out of scope (still)

- Bulk individual appointments  
- Ranking by appointment count  
- Medicare-certified claims  
- Lead / quote CTAs  
