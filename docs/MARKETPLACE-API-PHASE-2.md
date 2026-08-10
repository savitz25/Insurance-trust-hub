# Marketplace API — Phase 2

**Base:** Phase 1 (`bd43ba6`)  
**Goal:** Clearer consumer research UI from live landscape payloads.

## What shipped

### 1. Market Snapshot (`MarketSnapshot`)

Reusable module showing:

- Plan count, issuer count  
- Premium range (low → high)  
- Deductible range when CMS provides values  
- Plan year + retrieval provenance  
- Metal chips (Bronze / Silver / Gold only if present — **never invents Gold**)

Used on:

- `/tools/cost-estimator` results  
- `/calculators/aca-subsidy` results  

### 2. Research path cards (`ResearchPathCards`)

Three deterministic paths from CMS plan search:

| Path | Heuristic |
|------|-----------|
| **Lowest premium** | Lowest full premium among **Bronze**; if no Bronze, lowest premium of any metal |
| **Balanced** | **Median-premium Silver** (or sole Silver); if no Silver, median overall premium plan |
| **Higher protection** | Lowest-premium **Gold**; if no Gold, **lowest Silver** (then Bronze) — never invents Gold |

Each card may show: metal, premium (full and/or after educational credit), deductible / MOOP when present, issuer + plan name example, heuristic note.

### 3. Results narrative (`LandscapeNarrative`)

Answers:

1. How many Marketplace plans around this ZIP?  
2. What does a lower-premium option look like locally?  
3. What does a more protective option look like locally?  
4. What does assistance likely change in this market?  

Language stays educational (estimated / landscape / verify on HealthCare.gov).

### 4. Planner integration

- Cost planner: snapshot + narrative + research path cards, then total-cost paths (premium + care OOP)  
- Subsidy planner: same, plus existing PTC / CSR / cliff education  

Phase 1 merge (`apply-marketplace-landscape`) and honesty banner remain.

## CMS fields used

From `/plans/search` plan rows (via `client.ts` mapping):

- `premium` / premium variants  
- `premium_w_credit` when present  
- `metal_level`  
- `deductible` / individual deductible  
- `moop` / individual MOOP  
- `name`, `issuer.name`  
- `id` / plan id  

County via `/counties/by/zip/{zip}`.

## Partial payload handling

| Missing | Behavior |
|---------|----------|
| Issuer / plan name | Still show premium / deductible landscape |
| Deductible / MOOP | Omit fields; path card still shows premium |
| Gold tier | Label “Gold not listed”; higher path falls back to Silver then Bronze |
| Entire API | Phase 1 educational fallback + honesty banner |

## Deferred

- Drug search UI (match quality not productized here)  
- Doctor / facility search UI  
- My Insurance save of landscape snapshots (Phase 3)  
- Enrollment / web-broker flows (never)  
- Network adequacy claims (never)

## Files

| Path | Role |
|------|------|
| `lib/marketplace/plans-search.ts` | `researchPaths`, `narrative`, `moopSpread`, heuristics |
| `components/marketplace/market-snapshot.tsx` | Snapshot UI |
| `components/marketplace/research-path-cards.tsx` | Path cards + narrative |
| `components/tools/cost-coverage-planner.tsx` | Wire-up |
| `components/calculators/aca-coverage-savings-planner.tsx` | Wire-up |
| `lib/marketplace/README.md` | Heuristics + ops |

## Phase 3 preview

- Save plan research / planner summaries to My Insurance  
- Optional Resend summary email  
- No enrollment
