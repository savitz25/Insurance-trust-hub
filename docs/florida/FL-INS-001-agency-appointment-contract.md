# FL-INS-001 — Florida agency appointment contract

Task: expand the canonical **agency** appointment graph from the Florida DFS **All Active Appointments — Business** file only.

Status: **COMPLETE**. New relationships are **INTERNAL** graph evidence. No new public module, route, sitemap, or indexability.

## Identity

| Rule | Contract |
| --- | --- |
| Agency key | Exact NPN only (`^\d{5,10}$` after strip). One `national_entities` agency per NPN. |
| CONFIRMED | Exactly one canonical agency for the row NPN → eligible `appointed_by`. |
| REVIEW_REQUIRED | Two or more agencies share the NPN → hold, no write. Production collisions: **0**. |
| UNRESOLVED | Missing/invalid NPN or NPN not in the agency graph → hold. **Do not create agencies.** |
| Forbidden | Name match, fuzzy match, license-only agency create, person→agency inheritance, `ASSOCIATED_WITH` inheritance. |

Canonical agency identity remains NPN. DFS business license number is a **source grain** for the appointment observation, not a second national identity.

## Appointer identity

| Rule | Contract |
| --- | --- |
| Target | `carrier:fl-dfs:{Appointing Entity Number}` |
| Scheme | Florida DFS eAppoint number. **Not NAIC.** **Not** Florida Company Code. |
| New numbers | May mint `carrier:fl-dfs:{n}` with `identity_kind=provisional`, `notClaimedAsNaic=true`. |
| Legal insurer | `AGENCY → appointed_by → legal insurer` is **forbidden** unless `APPOINTER_RESOLVES_TO = CONFIRMED`. Florida CONFIRMED crosswalk remains **0**. |
| Names | Appointing entity name is a label on the DFS appointer, never a merge key. |

## Relationship

```
AGENCY  --appointed_by-->  carrier:fl-dfs:{number}
source_dataset     = florida_dfs_appointments
source_record_id   = dfs_appointments.id when the staging triple matches,
                     else fl-dfs-biz:{license}|{number}|{type}
status             = CURRENT | HISTORICAL from source status + expiration
effective_date     = Appointment Issue Date
termination_date   = Appointment Expiration Date (preserved; not invented)
```

Graph uniqueness: `(from_entity_id, to_entity_id, relationship_type, source_dataset, source_record_id)`.

## Dedup (defined before execution)

Multiple Business CSV rows **may** legitimately represent different appointment classes (TYCL Desc), different dates, different license types, and different current appointments.

They may **also** repeat the same agency/appointer pair administratively (observed: 26 keys, 3,576 extra rows, mostly travel-location appointments with identical issue/expiration and empty county).

**Declared grain:** `license_number + appointing_entity_number + appointment_type (TYCL Desc)`.

**Not** `agency_id + appointer_id` only (that would collapse distinct types).

On administrative repeats: keep latest expiration, then latest issue, then last file order.

Same NPN with two DFS licenses keeps two source observations (different `source_record_id`). That is source-faithful, not a 5-tuple duplicate.

## Currentness

The file is **All Active Appointments — Business**. Every row has `Appointment Status = ACTIVE`. Store that faithfully. Preserve issue and expiration. A past expiration with ACTIVE status is `HISTORICAL` currency, not a deleted row.

Absence from the current All Active file is **not** treated as a proven termination. Two INS-NAT-007 rows no longer in the 2026-08-28 file are **retained**.

## Credential status

All 59,189 Florida agency graph credentials have `regulatory_status = unknown`. **unknown ≠ inactive.** Credential status is not used to suppress an official active appointment. Source clocks stay separate.

## Non-inheritance

1. `PERSON → APPOINTED_TO → appointer` does not create an agency appointment, even if `PERSON → ASSOCIATED_WITH → AGENCY`.
2. Agency appointments do not create person appointments.
3. County appointments are a separate future family (not ingested here).

## Publication

INTERNAL only. Existing Trust Report may show appointment **presence** under its current limitation:

> Appointment is not employment, quality, or service territory.

Permitted public wording if a later task renders copy: **“Appointment record found in Florida DFS data.”**

Forbidden: “Authorized carrier partner”, “Works with”, “Represents”, “Preferred carrier”, “Certified by”, “Approved by”, and any legal-insurer brand claim from an unresolved appointer.

No new pages. No new indexability. `PUBLIC_PERSON_PROFILES_ENABLED = false`. Legal insurers remain `INTERNAL_ONLY`.

## County appointments

`All Active County Appointments` (~235 MB) is **not** ingested. It must never power county service coverage, local ranking, or “authorized to write in X county.”

## Contacts

The Business appointment CSV contains phone, email, physical/mailing address, AIC name, and AIC license. They are **not** written in this task (non-blocking). Do not overwrite existing `contact_observations`.

## Code

`lib/national/fl-agency-appointments.ts`  
`scripts/national/fl-ins-001.py`
