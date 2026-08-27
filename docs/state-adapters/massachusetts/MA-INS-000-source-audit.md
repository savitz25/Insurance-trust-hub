# MA-INS-000 — Massachusetts DOI regulatory extract — source audit

InsuranceTrustHub state-credential adapter. **Dry-run only. No production ingest. No `/massachusetts` launch. No person indexing.**

## File identity

| Field | Value |
|-------|--------|
| Operator filename | `Henry_August 2026.csv` |
| Operator path | `investor-trust-hub/data/raw/Henry_August 2026.csv` |
| Canonical copy | `data/ma-raw/ma-doi-regulatory-2026-08.csv` (gitignored) |
| Format | CSV, UTF-8, no BOM, single sheet |
| Size | 2,129,415 bytes |
| SHA-256 | `B5DBEB1DCA9B0AF88FBC041927AFF6FCD150508B9995B19BF418B25476BE48BD` |
| Local modified | 2026-08-27 18:00:57 UTC |
| Received (local) | 2026-08-27 |

Original operator file was not modified. Canonical copy hash-verified identical.

## Provenance

| Field | Status |
|-------|--------|
| Agency | **Likely** Massachusetts Division of Insurance (schema is an SBS-style producer extract: NPN, LICENSE_NO, LICENSE_CLASS `Insurance Producer`, LOA_NAME, DOMICILE_STATE). Not proven from filename alone. |
| Request / reference | **UNRESOLVED** (`Henry_August 2026` — no recovered request ID) |
| As-of date | **UNRESOLVED** (August 2026 in filename; no as-of column) |
| Completeness | **Not a complete census.** All 9,151 rows `LICENSE_STATUS=Active` and `LICENSE_CLASS=Insurance Producer`. Mixed domicile (2,044 MA / 7,103 non-MA). No adjusters, no licensed companies, no inactive/expired rows. |

Do **not** claim “all Massachusetts insurance agencies.”

## Raw file

- Data rows: **9,151**
- Columns: **17** named + trailing empty field from a CSV comma
- Blank rows: 0
- Malformed rows: 0
- Duplicate full rows: 0
- Sheets: n/a

Identifiers read as strings. `BUSINESS_ZIP_EXCEL` is an Excel-risk column (tabs/leading-zero ZIP). Adapter strips tabs and pads 5-digit ZIP.

## Row grain

**One row = one Massachusetts Insurance Producer license + a packed LOA set.**

- Distinct NPN: **9,148** (entity denominator)
- Distinct LICENSE_NO: **9,149**
- Unique NPN+license+class: **9,148**
- Split LOA observations: **25,918**

NPN ≈ license (essentially one MA producer license per NPN in this file). Three extra source rows vs NPN count are packed-LOA / repeat-license variants, not extra entities.

## Entity population

No official entity-type column. Name tokens are **never CONFIRMED**.

| Hint | Distinct NPN / rows |
|------|---------------------|
| Business-name candidate | 4,428 NPN |
| Person-like name candidate | 108 NPN |
| REVIEW_REQUIRED_ENTITY_TYPE rows | 9,111 |
| UNRESOLVED name | 40 rows |
| CONFIRMED_BUSINESS / CONFIRMED_PERSON from source | **0 / 0** |

National graph NPN join (authoritative for existing entities):

- Exact existing **agency** NPN: **7,059**
- Exact existing **person** NPN: **0**
- Exact existing **carrier** NPN: **0**
- Net-new NPN candidates: **2,089**

This extract behaves as a **business-entity / firm producer** file relative to the current graph. Person-like names are still REVIEW_REQUIRED; none matched a person NPN.

## Licenses

- Class: **Insurance Producer** (100%)
- Status: **Active** (100%) — source status, not inferred from expiration
- Unique active licenses: 9,148
- Inactive/expired in file: **0** (active-only extract)

## LOAs (official vocabulary, not collapsed)

| LOA | Row occurrences |
|-----|----------------:|
| Casualty | 6,075 |
| Property | 6,053 |
| Life | 5,746 |
| Accident & Health or Sickness | 5,500 |
| Personal Lines | 1,705 |
| Variable Life & Variable Annuity | 549 |
| Travel | 252 |
| Credit | 43 |
| Property & Casualty | 1 |

- Distinct LOA labels: **9**
- License–LOA relationships: **25,918**
- Licenses with multiple LOAs: **8,527**
- NPN with multiple LOAs: **8,526**

`LICENSE_CLASS` is credential class, not LOA. Packed `LOA_NAME` is split on comma.

## Domicile

Domicile ≠ Massachusetts authorization. Business address ≠ headquarters unless the source says so (it does not).

- MA domiciled unique licenses: **2,044**
- Non-MA: **7,103**
- Blank: **1**
- Licensed in MA, domiciled FL 733 / NY 703 / CA 631 / TX 450 / NJ 336

## Existing Massachusetts data

- `license_credentials` jurisdiction MA: **0**
- `ma_producers` Wave-1 staging: **0**
- Prior Mass.gov licensed-companies dump is carriers, fail-closed, not this file.

Absence from this active-only file does **not** mean terminated.

## Adapter vs Wave-1 MA directory

Phase 23 `lib/ma` imports Mass.gov **agency list / licensed-company** workbooks for public hubs. This extract is a **national-graph credential adapter** (`lib/national/ma-doi-regulatory.ts`). Do not merge the two pipelines. Do not promote this file onto Boston/Worcester/Springfield hubs in MA-INS-000.
