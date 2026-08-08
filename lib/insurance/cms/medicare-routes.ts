/**
 * Phase 12 — Medicare intelligence route helpers (quality-gated, curated).
 * Canonical pattern: /medicare/[state]/[county] and /medicare/contracts/[contractId]
 */

import {
  getAllCountySummaries,
  getCountySummary,
} from '@/lib/insurance/cms/county-summaries';
import type { CountyMedicareSummary } from '@/lib/insurance/cms/types';

/** Map legacy dashboard slug → canonical path segments */
const LEGACY_SLUG_TO_PATH: Record<string, { state: string; county: string }> = {
  'miami-dade-fl': { state: 'fl', county: 'miami-dade' },
  'broward-fl': { state: 'fl', county: 'broward' },
  'palm-beach-fl': { state: 'fl', county: 'palm-beach' },
};

export function legacyCountySlugToPath(
  slug: string
): { state: string; county: string } | null {
  return LEGACY_SLUG_TO_PATH[slug] ?? null;
}

export function countyPathFromSummary(s: CountyMedicareSummary): string {
  const legacy = LEGACY_SLUG_TO_PATH[s.slug];
  if (legacy) return `/medicare/${legacy.state}/${legacy.county}`;
  // Fallback: state code + slug without -st
  const state = s.stateCode.toLowerCase();
  const county = s.countyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `/medicare/${state}/${county}`;
}

export function getCountyByStateCounty(
  state: string,
  county: string
): CountyMedicareSummary | null {
  const s = state.toLowerCase();
  const c = county.toLowerCase();
  // Match via legacy map reverse
  for (const [slug, path] of Object.entries(LEGACY_SLUG_TO_PATH)) {
    if (path.state === s && path.county === c) {
      return getCountySummary(slug);
    }
  }
  // Direct match on county name + state
  return (
    getAllCountySummaries().find(
      (row) =>
        row.stateCode.toLowerCase() === s &&
        row.countyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === c
    ) ?? null
  );
}

/** Index only when CMS-derived and material contracts present */
export function isMedicareCountyIndexable(s: CountyMedicareSummary | null): boolean {
  if (!s) return false;
  if (s.metrics.materialConsumerContracts < 2) return false;
  if (s.metrics.publishedEnrollment < 100) return false;
  if (!s.topContractsByEnrollment?.length) return false;
  return true;
}

export function contractIntelligencePath(contractId: string): string {
  return `/medicare/contracts/${encodeURIComponent(contractId.toUpperCase())}`;
}

export function allCanonicalMedicareCountyPaths(): {
  state: string;
  county: string;
  slug: string;
}[] {
  return getAllCountySummaries()
    .filter((s) => isMedicareCountyIndexable(s))
    .map((s) => {
      const path = legacyCountySlugToPath(s.slug);
      if (path) return { ...path, slug: s.slug };
      return {
        state: s.stateCode.toLowerCase(),
        county: s.countyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        slug: s.slug,
      };
    });
}
