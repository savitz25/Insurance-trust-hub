# MA-INS-000 — data dictionary

Source: `Henry_August 2026.csv` / canonical `ma-doi-regulatory-2026-08.csv`. 9,151 data rows. 17 named columns.

| Source column | Sample | Meaning | Type | Nulls | Distinct (approx) | Normalization | Target | Publish |
|---------------|--------|---------|------|------:|-------------------|---------------|--------|---------|
| LAST_NAME_OR_BUSINESS_NAME | Travel Insurance Master, LLC | Legal/display name | string | 0 | ~9,148 | trim, collapse space | entity.legal_name (candidate) | name not identity |
| NPN | 17608458 | National Producer Number | string digits | ~0 | **9,148** | `normalizeNpn` 5–10 digits | entity.npn | CONFIRMED join only |
| PHONE1 | 6178792644 | Business phone | string | some | < rows | E.164 observation | contact_observations.phone | observation |
| BUSINESS_EMAIL | alexn@… | Business email | string | some | < rows | lowercase email | contact_observations.email | observation |
| DOMICILE_STATE | Arizona | Domicile / HQ state name | string | 1 blank | 50+ | map to USPS 2-letter | domicile evidence | not MA location |
| LICENSE_NO | 3003158965 or =NPN | MA license number | string | 0 | **9,149** | trim, keep as string | license_credentials | yes (graph) |
| LICENSE_STATUS | Active | Official status | string | 0 | 1 (`Active`) | `mapSourceStatus`; never from expiration | regulatory_status + status_raw | yes |
| LICENSE_CLASS | Insurance Producer | Credential class | string | 0 | 1 | CREDENTIAL_CLASS, not LOA | license_class / namespace producer | yes |
| LICENSE_FIRST_ACTIVE_DATE | 6/6/2019 | First active | date | 0 | many | MDY → ISO | effective_date | yes |
| LICENSE_EXPIRATION_DATE | 6/6/2027 | Expiration | date | 0 | many | MDY → ISO | expiration_date | yes |
| LOA_NAME | Casualty, Life, … | Packed official LOAs | string | 0 | 9 labels | split comma; preserve labels | loa_observations | yes |
| BUS_ADDRESS1 | 241 WASHINGTON ST | Street | string | some | many | trim | contact physical_address raw | “reported to MA regulator” |
| BUS_ADDRESS2 | | Street 2 | string | high | | trim | address | |
| BUS_ADDRESS3 | | Street 3 | string | high | | trim | address | |
| BUSINESS_CITY | BROOKLINE | City | string | some | many | trim | address | |
| BUSINESS_STATE_ABBR | MA | Address state | string(2) | 0 | many | upper | address; **not** license state | |
| BUSINESS_ZIP_EXCEL | 02445-6831 / `\\t02903` | ZIP (Excel-risk) | string | 0 | many | digits, ZIP5 | address | |

No email2, phone2, website, license type besides Insurance Producer, resident flag, or entity-type column.

## Semantic separations

- NPN = identity key (existing graph) or net-new candidate
- LICENSE_NO = Massachusetts credential
- LICENSE_CLASS = producer class, **not** LOA
- LOA_NAME = official lines of authority
- DOMICILE_STATE = domicile, **not** Massachusetts authorization
- BUSINESS_* address = address reported to MA DOI, **not** assumed headquarters
- PHONE/EMAIL = contact observations, **not** identity
