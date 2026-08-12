# Phase 6A — Agency Appointments Enrichment

Regulatory enrichment for **already-verified** Florida DFS business/agency providers.
Not endorsement, not lead-gen, not a quality ranking, not Medicare certification.

## Source

- Portal: https://licenseesearch.fldfs.com/BulkDownload  
- Business file (example URL; prefer portal if links change):  
  https://www.myfloridacfo.com/downloads/AAS/LicenseeSearch/AllActiveAppointmentsBusiness.csv  

Store locally (gitignored):

```text
data/dfs-raw/AllActiveAppointmentsBusiness.csv
```

## Schema

Migration: `supabase/migrations/20260812120000_phase6a_appointments.sql`

| Table / field | Role |
|---------------|------|
| `dfs_appointments` | Staging: matched appointment rows → `dfs_producers` |
| `providers.contact.appointment_snapshot` | Public denormalized snapshot (RLS: verified providers only) |

Staging tables remain service_role only (RLS enabled, no public policies).

## Match rules

1. Import business appointment CSV only (no bulk individuals).  
2. Match `License Number` → `dfs_producers.license_number` where `entity_type = business`.  
3. Optional `--launch-counties-only` uses Business County → wave 1+2 launch counties.  
4. Unmatched appointments are **skipped** (counted), never create providers.  
5. Attach only to rows with `dfs_provider_promotions` + `providers.verified = true`.

## Commands

Apply migration first (Supabase SQL Editor — paste `20260812120000_phase6a_appointments.sql`).

```powershell
# Preflight
npm run dfs:env

# Download file into data/dfs-raw/ (do not commit)

# Import appointments matched to staged business producers
npm run dfs:import-appointments -- --file data/dfs-raw/AllActiveAppointmentsBusiness.csv --launch-counties-only --dry-run --limit 50
npm run dfs:import-appointments -- --file data/dfs-raw/AllActiveAppointmentsBusiness.csv --launch-counties-only

# Attach snapshots to promoted providers
npm run dfs:attach-appointments -- --dry-run --limit 20
npm run dfs:attach-appointments
# Or wave filter:
npm run dfs:attach-appointments -- --wave 2
```

## Consumer UI

Agency profile section **Active appointments (regulatory snapshot)** when `appointment_snapshot.totalCount > 0`:

- Appointing entity names (alphabetical cap)  
- Type when present  
- Honesty lines: DFS source · not endorsement · re-check official tools  

No section when empty. No card ranking by appointment count.

## Honesty (required)

- “Regulatory snapshot from Florida DFS”  
- “Not an endorsement”  
- “Appointment status can change; verify on official sources”  

## Out of scope

- Bulk individual appointments  
- Inventing appointments  
- Preferred-carrier / top-carrier ranking  
- Medicare-certified from appointments alone  
