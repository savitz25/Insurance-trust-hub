# SEO — Coverage Intelligence surfaces (Phases 7–13)

**Last updated:** 2026-08-09  
**Policy:** Quality over page count. Research-only. No seed agency SEO. No doorway spam.

## 1. Indexation map

| Template | Path | Index? | Rule |
|----------|------|--------|------|
| Home | `/` | **Yes** | Primary hub |
| Tools hub | `/tools` | **Yes** | Research Center entry |
| ACA Plan Explorer | `/tools/aca-plan-explorer` | **Yes** | Tool landing only — **no** query-param variants |
| Marketplace hub | `/marketplace` | **Yes** | ACA research hub |
| County ACA | `/marketplace/{st}/{county}` | **Conditional** | planCount≥5 & issuerCount≥2 |
| Plan X-Ray | `/marketplace/plans/{year}/{id}` | **Conditional** | Durable identity + useful fields; **not** mass sitemap |
| Medicare hub | `/medicare` | **Yes** | Medicare research hub |
| Medicare county | `/medicare/{st}/{county}` | **Conditional** | Material contracts + enrollment + top list |
| Medicare contract | `/medicare/contracts/{id}` | **Conditional** | Complaint rate + identity in extracts |
| Carriers hub | `/carriers` | **Yes** | Curated index |
| Carrier profile | `/carriers/{slug}` | **Conditional** | Medicare evidence or ≥3 ACA sample plans |
| Complaint Index | `/data/plan-complaint-index` | **Yes** | CMS rankings |
| Legacy county | `/data/counties/*` | **Conditional** | Prefer `/medicare` canonical |
| Methodology / About / Legal | trust pages | **Yes** | YMYL support |
| My Insurance | `/my-insurance/*` | **No** | Personal workspace |
| Admin / API / Auth | `/admin/*`, `/api/*`, `/auth/*` | **No** | Ops / private |
| Seed providers | listing class `seed` | **No** | Phase 6A hard rule |

Code map: `lib/seo/research-seo.ts` → `COVERAGE_INTELLIGENCE_INDEXATION`.

## 2. Metadata / H1 systems

Implemented in `lib/seo/research-seo.ts` (`RESEARCH_META`, `metaAcaCounty`, `metaMedicareCounty`, `metaCarrier`, `metaPlanXray`).

Tone: research identity + market/plan/carrier + year/vintage. Never “best quotes near me.”

Brand: layout template `%s | InsuranceTrustHub`.

## 3. Canonical / robots / sitemap

- **Canonicals:** `buildMetadata` sets self-canonical via `alternates.canonical`
- **Robots:** allow research; disallow `/admin/`, `/api/`, `/auth/`, wallet paths
- **Sitemap:** hubs + quality-gated counties/contracts/carriers; **excludes** Plan X-Ray mass IDs, My Insurance, seed providers
- Explorer filtered URLs never listed

## 4. Schema

- Homepage: Organization + WebSite graph (existing)
- Research pages: WebPage + BreadcrumbList via `buildResearchPageGraph`
- Plan Explorer: + WebApplication (free educational tool)
- **No** AggregateRating / fake InsuranceAgency completeness on seed

## 5. Internal linking

- Footer Research column → Explorer, Marketplace, Medicare, Carriers, Methodology
- Tools hub flagships already link product surfaces
- County / contract / carrier / X-Ray cross-links from Phases 10–13
- Methodology mentions Coverage Intelligence track

## 6. Query → template

See `QUERY_TEMPLATE_MAP` in `research-seo.ts`.

## 7. GSC sample URLs (inspect after deploy)

1. `https://www.insurancetrusthub.com/tools`
2. `https://www.insurancetrusthub.com/tools/aca-plan-explorer`
3. `https://www.insurancetrusthub.com/marketplace`
4. `https://www.insurancetrusthub.com/marketplace/fl/miami-dade`
5. `https://www.insurancetrusthub.com/medicare`
6. `https://www.insurancetrusthub.com/medicare/fl/miami-dade`
7. `https://www.insurancetrusthub.com/medicare/contracts/H1036` (if live)
8. `https://www.insurancetrusthub.com/carriers`
9. `https://www.insurancetrusthub.com/carriers/humana`
10. `https://www.insurancetrusthub.com/methodology`
11. `https://www.insurancetrusthub.com/my-insurance` (expect **Excluded** / noindex)

## 8. Risks / follow-ups

- Plan X-Ray indexation is opportunistic (link-discovered only) — intentional
- ACA county indexation depends on live API quality at request time
- Submit `sitemap.xml` in GSC after deploy
- Monitor soft-404 risk on thin carrier pages (noindex when no evidence)
