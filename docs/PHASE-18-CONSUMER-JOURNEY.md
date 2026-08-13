# Phase 18 — Consumer journey polish

One research product. Five jobs. No new inventory, no lead-gen.

## Journey map

| Job | Entry | Next |
|-----|--------|------|
| ACA / health where I live | Homepage job · Marketplace tool | Guide → live hub/directory if FL/TX |
| Turning 65 / Medicare | Homepage job · `/medicare` | Provider lookup · Complaint Index |
| Verify a license | Homepage job · license tool | Verified directory |
| Licensed agencies near me | Directory / live hubs | Research profile · continue tools |
| Cost / subsidy context | ACA Savings + Cost planners | Marketplace landscape · official .gov |

Recommended first-time path on `/tools`: Compass → Marketplace → ACA savings → license verification.

## Live hub deep-links

Shown on the homepage only when that state has verified count > 0:

South Florida · Jacksonville · Houston · Columbus · Las Vegas · Burlington

## Deliberate non-changes

- Phase 1 trust gates unchanged
- NV/VT remain lead-form free
- FL/TX/OH contact rules unchanged
- ACA Plan Explorer kept, demoted under Marketplace plan research
- No new states

## QA

```bash
npm run check:phase18-journey
npm run check:phase17-inventory
```
