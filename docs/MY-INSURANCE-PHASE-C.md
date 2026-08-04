# My Insurance Phase C — Guided setup, tool snapshots, report-ready

**Production:** Insurance-trust-hub only · Storage key still **`ith:my-insurance:v1`** (toolSnapshots optional on plan, default `[]`).

## Routes

| Path | Purpose |
|------|---------|
| `/my-insurance/setup` | Guided plan setup (Protect → Where → Situation → Review) |
| `/my-insurance/report` | Report-ready takeaway (copy / print / mailto) |
| `/my-insurance` | HQ with **View report**, guided setup, shortlist counts |

## Tools wired (guest snapshot)

| Tool | Route | Save control |
|------|-------|----------------|
| Cost & Coverage Planner | `/tools/cost-estimator` | Existing `SaveCalculatorButton` → plan `toolSnapshots` |
| Coverage Compass | `/tools/needs-assessment` | `SaveToolSnapshotButton` on results |

## Model

```ts
CoveragePlan.toolSnapshots?: ToolSnapshot[]
ToolSnapshot = { id, toolId, title, summary, href, capturedAt, payload? }
```

Helpers: `addToolSnapshot`, `removeToolSnapshot`, `getToolSnapshots`.

## Human tests

1. Signed out → `/my-insurance/setup` → finish → plan on HQ  
2. Shortlist 1–3 providers (Phase B)  
3. Cost estimator or Coverage Compass → Save to My Insurance  
4. `/my-insurance/report` → plan + shortlist + questions + snapshot  
5. Copy / print / mailto  
6. Hard refresh → data remains  

## Out of scope

Multi-plan library, cloud sync, PDF server, auto-email providers.
