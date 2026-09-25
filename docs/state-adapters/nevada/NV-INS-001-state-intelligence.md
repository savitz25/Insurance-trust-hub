# NV-INS-001 state sprint — Nevada Division of Insurance regulatory research

Gate: `npm run assert:nv-ins-001` (runs `scripts/nevada/build_snapshot.py --check` first).

## Sources (Nevada Division of Insurance, retrieved 2026-09-25)

| Source | Grain | Source clock | Records |
|---|---|---|---|
| 2025 Insurance Market Report for the 83rd Legislative Session | NDOI statement (quoted, never summed) | "Figures are as of October 2024." | 1,652 licensed domestic and foreign insurers; 147 captive insurers; 135 sponsored captive cells; 87 self-insured employers; 7 active self-insured groups; ~160 surplus-lines insurers; 250,551 individual licensees (24,176 resident / 226,375 non-resident); 16,810 agency licensees (2,147 / 14,663); FY2024: ~12,000 inquiries, 3,849 complaints investigated; 2022–2023: 15 financial and 44 non-traditional examinations |
| Consumer Complaint Reports (calendar-year workbooks) | complaint-reason row | opened 2022-01-01 to 2024-12-31 | 2022: 4,624 · 2023: 5,215 · 2024: 6,019 rows (aggregates only) |
| Enforcements & Orders | order listing | order listed 2026-06-26; page prints no list date | 1 current posting (Cause No. 26.0028, Consent Agreement and Order) |
| Publications — MHPAEA NQTL company reports | report listing | file names carry 11.10.25 | 17 company draft reports (not parsed) |
| Producer and Company Lists, License Lookup, Company Admissions, File a Complaint, Captive Insurance, SERFF, Public Records | capability statements | — | — |

Raw captures live in `data/nevada/nv-ins-001/raw/` (gitignored); their SHA-256 values and HTTP results are in
`sources.json`. `scripts/nevada/capture_ndoi.py` writes the raw captures, `scripts/nevada/extract_ndoi.py` writes the
committed extracts from them; CI only runs the snapshot build.

## Rules

- Insurer ≠ agency ≠ producer. NDOI's figures are quoted as NDOI statements with NDOI's clock and are never added
  together. The report's own "267,361 active licensees" equals individuals + agencies and leaves out the 147
  captives it lists, so it is not republished.
- Company, agency and producer bulk rosters: NOT_ACQUIRED. NDOI publishes producer and agency lists on its
  self-serve site (`di.nv.gov/nv/r/doi/reports-and-lookups/home`), but that site's F5 bot defense rejected curl and a
  Chrome session, and answered a plain HTTP client with a redirect loop. No bypass was attempted. The lists are
  public; a Founder manual download into `data/nv-raw/` (Phase 14 procedure) is the upgrade path.
- No downloadable company list was found. Company verification is the NDOI company lookup, which NDOI says does not
  show surplus-lines insurers. No NAIC crosswalk was run. The national graph holds no Nevada credentials.
- The existing Nevada agency directory (18,247 verified listings observed 2026-09-25 on `/api/inventory/health`)
  comes from the Phase 14 NDOI firm import. It is a directory layer on a different clock, not NDOI's census, and it
  is not compared with or added to NDOI's 16,810 agency figure. It was not touched.
- Authority instruments stay source-native (Certificate of Authority / Registration / Approval / License). A risk
  retention group registration is not a Certificate of Authority; surplus-lines eligibility is not admitted status;
  a captive is not a traditional insurer license. Company type is not a product offer. No workers' compensation
  authority lens was acquired.
- The one listed order prints no NAIC, NPN or Nevada license number: standalone, attached to nothing. Orders before
  the current posting: NOT_ACQUIRED (no archive index, no archived copies of the page).
- Complaint rows are complaint-reason rows, not complaints, and calendar-year rows do not match NDOI's fiscal-year
  figure. The respondent column is truncated at 30 characters, prints no NAIC/NPN/complaint id and names individual
  people, so no respondent name is committed or published and nothing is attached to a company. Only coverage type,
  reason category and disposition counts are kept. 2015–2021 files are published but were not read.
- SERFF: filing access only, 0 filings ingested. Public records: by request.
- No ranking, no Trust Score, no rating schema. Statewide only: no Las Vegas, Reno, Clark or Washoe routes.
- Pre-existing `/hubs/nevada/*` pages and `lib/hubs/data/las-vegas-agents.ts` (a curated catalog carrying
  `trustScore`, star ratings and "#1 top-rated" copy) are out of scope for this statewide sprint and unchanged;
  flagged for a separate review.

Rebuild: `python -X utf8 scripts/nevada/capture_ndoi.py`, `python -X utf8 scripts/nevada/extract_ndoi.py`
(needs `pdftotext`), then `python -X utf8 scripts/nevada/build_snapshot.py`.
