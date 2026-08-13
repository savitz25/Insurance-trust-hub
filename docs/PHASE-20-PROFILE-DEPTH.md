# Phase 20 — Research profile depth

Verified agency profiles are research dossiers. No lead-form expansion. NV/VT stay form-free.

## Dossier order

1. Header — name, location, verified badge, freshness badge when a date exists
2. How verified — regulator, license #, as-of date, freshness, official lookup
3. Specialties / LOAs — plain language; unmapped tags labeled “regulator tag”
4. Location / contact only when address or phone/website exist
5. Appointment snapshot only when present (regulatory, not a rank)
6. Third-party signals only when present
7. Continue this research — cluster strip
8. Methodology / CMS / reviews only when they have content

## Freshness rules

Display-only. Does not change Phase 1’s 365-day promotion window.

| Date on file | Badge |
|---|---|
| None / invalid | No badge. Copy tells the user to re-check officially. |
| ≤ 90 days | “Checked within 90 days” |
| > 90 days | “License data older than 90 days — re-check on official state tool” |

Dates are never invented.

## LOA approach

Mapped tags (Health, Life, P&C, Personal Lines, Agency, Title, Public Adjuster, Variable) get consumer blurbs. Anything else is shown as reported. Medicare Advantage / network status is never inferred from state LOA.

## Sample URLs (live inventory)

- FL / South Florida: `/providers/1-key-life-solutions-llc-…` (directory `?state=FL`)
- Jacksonville: listings on `/hubs/florida/jacksonville`
- Houston: `/hubs/texas/houston`
- Las Vegas: `/hubs/nevada/las-vegas`
- Burlington: `/providers/cheeseman-insurance-inc-1000069`

## QA

```bash
npm run check:phase20-profiles
npm run check:phase17-inventory
```
