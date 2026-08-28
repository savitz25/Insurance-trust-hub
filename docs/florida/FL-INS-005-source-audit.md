# FL-INS-005 — source audit

Observed 2026-08-28. SHA-256 values live in `data/reports/fl-ins-005-*.json`.

## MIR

- Portal: https://floir.gov/tools-and-data/residential-market-share-reports  
- Wizard: https://qsrng.floir.gov/  
- Statute: F.S. 624.424(10). Monthly ZIP/county from Jan 2025; quarterly county before.  
- Authoritative current bulk: published statewide Excel (company; company × policy type). Latest monthly file acquired: **June 2026**.  
- Not audited. Trade secret companies excluded.  
- Wizard can customize county/company/policy type; not treated as a complete ZIP dump in this task.

## CHOICES

- Hub: https://floir.gov/consumers/choices-rate-comparison-search  
- HO: https://choices.floir.gov/pandc/homeowners  
- Auto: https://choices.fldfs.com/pandc/auto  
- Medigap: https://choices.floir.gov/mcws/CWSSearch  
- Small group: https://choices.fldfs.com/landh/SmallGroup  
- Interactive ASP.NET; no bulk CSV. OIR: illustrative; contact an agent for a quote. Trade-secret companies omitted.

## IRFS

- Public: https://irfssearch.floir.gov/ (redirect from irfssearch.fldfs.com)  
- Industry submit: https://irfs.floir.gov/  
- Filings from 2001-01-05. Quick search cap **2,500**.  
- Fields include File Log Number, company name, FEIN, **NAIC Company Code**, dates, Final Action, requested/approved rate-change percentages.  
- Documents requested per filing (one PDF), not as extra filings. Rate % may be incomplete due to trade secret.

## Citizens

- https://www.citizensfla.com/ — residual market.  
- Official dated Detail-by-Product-Line PDFs exist under `/documents/`. This task does **not** reuse secondary 2026 board/press counts. Statewide PIF held until the current official dated PDF is captured.  
- 2026 takeout calendar is official. Offer ≠ assumption.

## FSLSO

- Eligible insurers index: https://www.fslso.com/compliance/eligible-insurers → **OIR** surplus-lines directories (same Active Company Search used in FL-INS-002).  
- Monthly premium PDF acquired (July 2026 snapshot). Statewide line/insurer snapshot, not county service territory.  
- FSLSO agent/agency download is **not** a current DFS licensee search (FSLSO disclaimer). DFS remains the license source.

## NFIP

- Registry program: https://agents.floodsmart.gov/agency-registry (Pivot signup). Collects principal **and** agency NPN.  
- Public list: https://www.floodsmart.gov/flood-insurance-agencies — **1,474** cards; name/address/phone; **NPN not shown**. Exact-NPN attach = 0.  
- Wording: “Listed in FEMA/NFIP Agency Registry.”

## Excluded

DFS county appointments. Google Places. Rankings. Trust Scores. `/florida` UI.
