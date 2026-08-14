# Multi-state inventory (Phase 16)

Live official-regulator agency/firm inventory. Quality and honesty over new states.

| State | Regulator | Public inventory |
|-------|-----------|------------------|
| Florida | Florida Department of Financial Services (DFS) | Mature launch counties |
| Texas | Texas Department of Insurance (TDI) | Dense metros |
| Ohio | Ohio Department of Insurance (ODI) | Wave 1 live |
| Nevada | Nevada Division of Insurance (NV DOI) | NV-licensed firms (resident + non-resident); hubs stay NV-address |
| Vermont | Vermont Department of Financial Regulation (VT DFR) | Local firms only (small) |
| Massachusetts | Massachusetts Division of Insurance (MA DOI) | Pipeline live; Wave-1 empty until official agency lists are imported |
| Mississippi | Mississippi Insurance Department (MID) | Wave-1 Insurance Producer Entity agencies (MS address) |

North Carolina DOI pipeline exists but is not promoted until a paid SBS export is purchased.

The Mass.gov **licensed companies** CSV is carriers/reinsurers, not agencies — it is parsed and fail-closed. See `docs/MASSACHUSETTS-DOI-INVENTORY.md`.

## Display helpers

`lib/regulators/labels.ts`

- `getRegulatorLabel(state)`
- `getVerificationExplanation(state)`
- `getMedicareNonClaim(state)`
- `getLoaSourcePhrase(state)`
- `getDirectoryStateIntro(state)`

Stored `license_source` strings on provider rows are unchanged (trust gates). These helpers are consumer display only.

## Product rules

- Directory / homepage chips appear only when verified count > 0.
- Hubs use live counts. Empty markets stay empty and noindex.
- Profiles are research dossiers: How verified, license #, as-of date when present.
- Phone / website only when present. NV and VT do not show lead forms.
- Medicare-certified is never inferred from state DOI/DFS/DFR data alone.
- No seed jargon, no hardcoded “12 verified”, no inflated statewide agent totals.

## QA

```bash
npm run check:phase16-hardening
npm run check:phase11-directory
npm run check:phase1-trust
npm run check:phase15-vt
```

Manual after deploy:

- `/hubs/nevada/las-vegas`
- `/hubs/vermont/burlington`
- `/directory?state=NV&verified=true`
- `/directory?state=VT&verified=true`
- One FL, TX, OH, NV, and VT profile
- Homepage chips match live counts

## Refresh (existing pipelines)

See state-specific docs (`FLORIDA-DFS-INVENTORY.md`, `VERMONT-DFR-INVENTORY.md`, etc.). Phase 16 does not change import/promote commands.
