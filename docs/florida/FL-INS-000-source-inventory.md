# FL-INS-000 — Florida official source inventory

No purchases. No Google Places. Clocks stay per-source.

| ID | Authority | Dataset | Entity | Identifier | Method | Bulk | Status | Clock |
|----|-----------|---------|--------|------------|--------|------|--------|-------|
| DFS-LIC-BIZ | DFS | All Valid Licenses – Business | Agency | License #, NPN | Bulk CSV | YES | AVAILABLE_NOW (in-repo pipeline) | Licensee Search bulk Last-Modified |
| DFS-LIC-IND | DFS | All Valid Licenses – Individual | Person | License #, NPN | Bulk CSV | YES | AVAILABLE_NOW | same portal |
| DFS-APT-IND | DFS | All Active Appointments – Individual A–Z | Person appointment | License #, NPN, Appointing Entity Number | Bulk CSV | YES | AVAILABLE_NOW (INS-NAT-013 ingested) | 2026-08-27T06:27:45Z |
| DFS-APT-BIZ | DFS | All Active Appointments – Business | Agency appointment | License #, Appointing Entity Number | Bulk CSV | YES | AVAILABLE_NOW (Phase 6A staging) | portal |
| DFS-APT-COUNTY | DFS | All Active County Appointments | County appointment | License # | Bulk CSV | YES | ACQUIRE_NOW | portal |
| DFS-CE | DFS | All Licenses Requiring CE | Person CE | License # | Bulk CSV | YES | DEFERRED | portal |
| DFS-EOB | DFS | Exchange of Business Registrations | Agency | License # | Bulk CSV | YES | DEFERRED | portal |
| DFS-PORTAL | DFS | Licensee Search | Person/agency | License # / name | Search | NO | MANUAL_ONLY | daily-ish FAQ |
| OIR-SEARCH | OIR | Active Company Search | Legal insurer | **Florida Company Code XOR NAIC** | Interactive | NO | ACQUIRE_NOW / MANUAL_ONLY | live |
| OIR-IRFS | OIR | IRFS Forms & Rates Search | Filings | File log, company name | Search | NO | ACQUIRE_NOW | 2001-present |
| OIR-CHOICES | OIR | CHOICES rate comparison | Sample rates | County + example | Interactive | NO | ACQUIRE_NOW | latest approved filing |
| OIR-MKT | OIR | Residential Market Share / Market Intelligence | Policy/premium | Company, county, ZIP (2025+) | Reports | PARTIAL | ACQUIRE_NOW | monthly 2025+ |
| OIR-EXAM | OIR | Examination reports | Legal insurer | NAIC / FL code | PDF/HTML | NO | ACQUIRE_NOW | publication date |
| OIR-RCVR | OIR | Companies in Receivership | Legal insurer | Name / case | List | NO | ACQUIRE_NOW | status |
| CIT-AGENT | Citizens | Agent lookup / appointed agents | Agency/person | Agency appointment | Portal | NO | ACQUIRE_NOW | live |
| CIT-ELIG | Citizens | Eligibility / takeout | Program | Policy rules | Portal | NO | ACQUIRE_NOW | live |
| FSLSO-ELIG | FSLSO / OIR | Eligible surplus lines insurer lists | Non-admitted insurer | NAIC | Portal lists | PARTIAL | ACQUIRE_NOW | OIR eligibility |
| FSLSO-PREM | FSLSO | Monthly premium reports | Market aggregate | Insurer | PDF | YES (PDF) | ACQUIRE_NOW | monthly |
| NFIP-REG | FEMA | Agency Registry / Flood Insurance Agencies | Agency | **NPN** + address | Public list + registry | PARTIAL | ACQUIRE_NOW | registry revalidate 6 months |
| CRN | DFS | Civil Remedy Notice system | Insurer notice | Insurer name; NAIC sometimes in body | Search | NO | ACQUIRE_NOW | 1993–present |
| DFS-DISC | DFS | Administrative/disciplinary | Person/agency | License # | Search/PDF | NO | ACQUIRE_NOW | order date |
| CMS | CMS | FFM observations | Person NPN | NPN | In graph | YES | AVAILABLE_NOW | plan year |
| NAIC-LOC | NAIC | Listing of Companies | Legal insurer | CoCode | Zip | YES | AVAILABLE_NOW | LOC-JUN-2026 |
| FHCF | SBA/FHCF | Cat fund | Insurer participation | Company | Reports | PARTIAL | DEFERRED | season |
| SUNBIZ | DOS | Corporate filings | Legal entity | Document # | Search | NO | MANUAL_ONLY (not NAIC) | live |

Portal: https://licenseesearch.fldfs.com/BulkDownload  
OIR search: https://companysearch.floir.gov/ (also floir.com/companysearch)  
IRFS: https://irfssearch.fldfs.com/  
CHOICES: https://www.floir.com/consumers/choices-rate-comparison-search  
CRN: https://apps.fldfs.com/civilremedy/  
FSLSO eligible: https://www.fslso.com/compliance/eligible-insurers  
NFIP agencies: https://www.floodsmart.gov/flood-insurance-agencies  
NFIP registry (NPN collected): https://agents.floodsmart.gov/agency-registry  
Citizens: https://www.citizensfla.com/

## Identifier doctrine

| ID | Maps CONFIRMED to | Never |
|----|-------------------|-------|
| NPN | person / agency | name |
| FL DFS license number | FL credential | national entity alone |
| DFS Appointing Entity Number | `carrier:fl-dfs:{n}` | NAIC |
| Florida Company Code | OIR company, pending official NAIC join | DFS appointing number |
| NAIC CoCode | `legal-insurer:naic:{cocode}` | brand |
| CRN insurer name | UNRESOLVED unless NAIC on same record | finding |
| NFIP NPN | exact NPN agency | “NFIP certified” |

Locked NFIP public wording: **Listed in FEMA/NFIP Agency Registry**. Do **not** say NFIP certified unless an official source proves training completion.
