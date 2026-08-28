# FL-INS-005 — Florida market intelligence contract

Libraries: `lib/national/market-intelligence.ts`, `lib/national/fl-market-intelligence.ts`  
Runner: `scripts/national/fl-ins-005.py`

## Doctrine

MARKET SHARE ≠ QUALITY. PREMIUM ≠ QUOTE. SAMPLE RATE ≠ ACTUAL PRICE.  
RATE FILING ≠ APPROVAL. APPROVED FILING ≠ GOOD RATE.  
CITIZENS PARTICIPATION ≠ GENERAL FL LICENSURE. CITIZENS AUTHORIZATION ≠ DFS LICENSE.  
SURPLUS-LINES ELIGIBILITY ≠ ADMITTED. NFIP REGISTRY LISTING ≠ CERTIFICATION.  
COUNTY APPOINTMENT ≠ SERVICE TERRITORY. LOCATION ≠ AUTHORIZATION.  
MISSING MARKET DATA ≠ ZERO ACTIVITY.

No rankings. No Trust Scores. No “best insurer.” No Google Places. DFS county appointments stay out of this layer.

## Identity

Insurers: exact NAIC CoCode on the locked spine, or Florida Company Code already stored as `fl_oir_company_code`.  
Agencies/people: exact NPN.  
Name-only market facts never attach. They may be stored as **aggregate** observations (`entity_id` NULL) when the grain is statewide/county/ZIP.

## Source clocks

Independent: MIR · CHOICES · IRFS · Citizens · FSLSO · NFIP · OIR company · DFS licensing.

## Model

One national table `market_intelligence_observations` (SQL Editor). Not Florida-only. Not `regulatory_evidence`. Not CMS. Not contacts.

## Production writes this task

**Blocked** until the SQL Editor table exists. Census and files are complete. Name-only MIR Excel and NFIP public cards remain unattached even after the table exists.

## Future `/florida` modules (data contracts only)

Florida Insurance Market Overview · Homeowners · Auto · Citizens / Residual · Rate Filing Activity · Sample Rate Comparisons · Surplus Lines · Flood / NFIP · Health / ACA · Medigap · Life / Annuity · Regulatory & Enforcement History · Source Clock / Methodology.

No UI in this task.
