/**
 * Phase 0 — honest hub SEO from live verified inventory only.
 * Registry metaTitle/metaDescription may still hold legacy marketing copy;
 * public pages must use these helpers so empty markets never promise counts.
 */

import type { Metadata } from 'next';
import type { InsuranceHub } from '@/types/agent';
import { getHubStats } from '@/lib/hubs/agents';
import { SITE_URL } from '@/lib/constants';
import { EMPTY_MARKET_COPY } from '@/lib/trust/listing-state';

export type HubPublicSeo = {
  title: string;
  description: string;
  verifiedCount: number;
  healthCount: number;
  isEmpty: boolean;
  path: string;
};

export function resolveHubPublicSeo(
  hub: InsuranceHub,
  canonicalPath?: string
): HubPublicSeo {
  const stats = getHubStats(hub);
  const path = canonicalPath ?? `/hubs/${hub.stateSlug}/${hub.slug}`;
  const verifiedCount = stats.totalAgents;
  const healthCount = stats.healthSpecialists;
  const isEmpty = verifiedCount <= 0;

  if (isEmpty) {
    return {
      title: `Insurance research in ${hub.shortName} | Insurance Trust Hub`,
      description: `We’re still verifying independent insurance agencies in ${hub.shortName} (${hub.msaName}). No verified listings are shown yet. Use state DOI tools and our free research calculators — no paid placements.`,
      verifiedCount: 0,
      healthCount: 0,
      isEmpty: true,
      path,
    };
  }

  return {
    title: `Insurance agencies in ${hub.shortName} — ${verifiedCount} verified research listings`,
    description: `Research ${verifiedCount} verified independent insurance agency listing${
      verifiedCount === 1 ? '' : 's'
    } in ${hub.msaName}${
      healthCount > 0 ? ` (${healthCount} health-focused)` : ''
    }. Re-check licenses with state DOI. Independent research — no paid placements.`,
    verifiedCount,
    healthCount,
    isEmpty: false,
    path,
  };
}

export function buildHubMetadata(
  hub: InsuranceHub,
  canonicalPath?: string
): Metadata {
  const seo = resolveHubPublicSeo(hub, canonicalPath);
  const url = `${SITE_URL}${seo.path}`;

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: url },
    robots: seo.isEmpty
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url,
    },
  };
}

/** Curated hub blurb: never show hardcoded “12 verified…” when inventory is empty. */
export function honestCuratedSummary(
  hubName: string,
  verifiedCount: number,
  configuredSummary: string
): string {
  if (verifiedCount <= 0) {
    return EMPTY_MARKET_COPY.section;
  }
  // Legacy curated copy often hardcodes a count that no longer matches
  if (/\b\d+\s+verified\b/i.test(configuredSummary)) {
    const claimed = configuredSummary.match(/\b(\d+)\s+verified\b/i)?.[1];
    if (claimed && Number(claimed) !== verifiedCount) {
      return `${verifiedCount} verified research listing${
        verifiedCount === 1 ? '' : 's'
      } serving ${hubName}. Independent research only — re-check state DOI before you enroll.`;
    }
  }
  return configuredSummary;
}
