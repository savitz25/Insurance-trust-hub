# Maine insurance population audit

Audit baseline: `origin/main` at `22bef18f02bd1605453105b99d949b2e8a13e72d`. No Maine insurer/agency/producer regulatory dataset or Maine state page was found in the baseline.

## Regulator and grains

The Maine Bureau of Insurance provides individual and business-entity lookup, with distinct regulator categories including producers, agencies, adjusting firms, adjusters, insurers, and surplus-lines. Its licensee listing says a complete active nonresident producer list is published quarterly (February, May, August, November); that stated clock must be retained. Appointments are a relationship between producer/business entity and insurer, not a licensee count. Keep enforcement/consent agreements as orders, separate from license status.

## Sources

- [Maine Bureau of Insurance licensee search](https://www11.maine.gov/pfr/insurance/node/3)
- [Maine Bureau of Insurance licensee classes](https://www1.maine.gov/pfr/insurance/licensees)
- [Maine Bureau of Insurance producer and appointment guidance](https://www.maine.gov/pfr/insurance/licensees/individual/producers)
- [Maine Bureau of Insurance administrative actions](https://www.maine.gov/pfr/insurance/legal/administrative-actions/licensee-discipline-consent-agreements)

## Acquisition state

Acquired the Bureau's active nonresident producer spreadsheet, source clock August 1, 2026, retrieved October 12, 2026. It has 225,804 distinct license-number rows and 225,570 distinct NPN identifiers. The row descriptions remain split between 222,983 `PRODUCER NON-RESIDENT` and 2,821 `PRODUCER LIMITED NON-RESIDENT`. The raw workbook and deterministic aggregate are under `data/maine-ins-001/`; the workbook includes contact fields, which are not emitted by the public summary. Maine-resident producer, agency, adjuster, surplus-lines, insurer, appointment, and enforcement snapshots remain NOT_ACQUIRED. No combined insurance denominator is asserted.
