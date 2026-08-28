# FL-INS-001 — Florida DFS Business appointment source audit

Retrieved 2026-08-28. Graph ingest same day.

## Artifact

| Field | Value |
| --- | --- |
| Filename | `AllActiveAppointmentsBusiness.csv` |
| Authority | Florida Department of Financial Services — Agent & Agency Services |
| Portal | https://licenseesearch.fldfs.com/BulkDownload |
| Direct URL | https://www.myfloridacfo.com/downloads/AAS/LicenseeSearch/AllActiveAppointmentsBusiness.csv |
| Last-Modified | Fri, 28 Aug 2026 06:41:20 GMT |
| Bytes | 19,620,868 |
| SHA-256 | `a9b0d609d69b59b7264007d854e7c61beb75984225b60312122cc6e7a77cc12d` |
| Data rows | 59,405 |
| Status | ACTIVE on every row |
| Unique grain | 55,829 (`license + appointing entity number + TYCL Desc`) |
| Duplicate keys / extra rows | 26 / 3,576 (administrative; mostly travel location) |

TYCL codes arrive as Excel formulas (`="0253"`). Codes and appointing-entity numbers are cleaned with the same `="…"` strip used for other DFS files. Leading zeros on appointing-entity numbers are **kept**.

## Headers (source)

License Number, Full Name, NPN Number, Residency Type, Appointing Entity Number, Appointing Entity Name, Appointment TYCL, Appointment TYCL Desc, Appointment Status, Appointment Issue Date, Appointment Expiration Date, Email Address, AIC License Number - Bar Number, AIC Full Name, Business Phone, Business Address1, Business Address2, Business City, Business State, Business Zip, Business County, Mailing Address, Mailing Address2, Mailing City, Mailing State, Mailing Zip.

NPN blank: 25 rows. Appointing entity number blank: 0. Issue and expiration filled: 59,405.

## Independent clocks

| Clock | As-of |
| --- | --- |
| DFS Business appointments (this file) | Last-Modified 2026-08-28T06:41:20Z |
| National graph ingest | 2026-08-28 (FL-INS-001) |
| `dfs_appointments` staging | 2026-08-12 snapshot, 30,486 unique staging rows — **not** overwritten |
| Agency credentials `florida_dfs` | independent; 59,189 FL agency rows, status unknown |
| Person appointments | INS-NAT-013 / FL-INS-000: Last-Modified 2026-08-27 on Individual A–Z files |
| County appointments | portal file listed; **not ingested** |

One clock does not make another current.

## Staging vs live file

Phase 6A staging `dfs_appointments` remains 30,486 (unique producer + number + type from an older full-business import). The live All Active file is the source of the **expected graph set**. Staging UUIDs are reused as `source_record_id` when the triple still matches; otherwise `fl-dfs-biz:{license}|{number}|{type}`.

## Agency credential mismatch

| Population | Count |
| --- | --- |
| DFS business producers (staging) | 98,622 |
| Business producers with NPN | 98,572 |
| Appointment-bearing licenses in live CSV | 31,338 |
| Florida agency credential rows | 59,189 |
| Distinct FL-credentialed agencies | 56,939 |
| **A. NPN maps to exactly one canonical agency** (unique CSV observations) | **2,678 CONFIRMED** |
| Appointment-bearing businesses CONFIRMED | 2,086 |
| **B. No canonical agency — held** | **53,151 observations / 29,252 businesses** |
| REVIEW_REQUIRED | 0 |

The 98,622 businesses were **not** promoted into canonical agencies in order to ingest appointments.

## Appointment type ≠ LOA

`Appointment TYCL Desc` is stored on the relationship `raw.appointmentType`. `Appointment TYCL` is stored as `raw.appointmentTycl`. Neutral group (`agent` / `mga` / `broker` / `other`) is `raw.appointmentTypeGroup` only. `loa_observations` for `florida_dfs` remains **0**.

## County file (document only)

All Active County Appointments (~235 MB) is a **nonresident personal-solicitation** evidence family. Not a service map. Not ingested. Must not drive county coverage, ranking, or “authorized to write in X county.”

## Contacts (not blocking)

CSV contact fields exist (phone 59,048, email 58,817, physical 59,405, mailing 59,404, AIC name 11,548). Not written to `contact_observations` in this task.
