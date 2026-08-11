/**
 * Phase 1 — honest hub SEO from live verified inventory only (shared trust-state).
 */

import type { Metadata } from 'next';
import type { InsuranceHub } from '@/types/agent';
import { getHubStats } from '@/lib/hubs/agents';
import { SITE_URL } from '@/lib/constants';
import {
  EMPTY_MARKET_COPY,
  buildMarketMetadata,
} from '@/lib/insurance/trust/provider-trust-state';

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
  // getHubStats.totalAgents is already verified-only inventory
  const meta = buildMarketMetadata({
    marketName: hub.shortName,
    regionLabel: hub.msaName,
    verifiedCount: stats.totalAgents,
    healthCount: stats.healthSpecialists,
    path,
  });

  return {
    title: meta.title,
    description: meta.description,
    verifiedCount: meta.verifiedCount,
    healthCount: stats.healthSpecialists,
    isEmpty: meta.isEmpty,
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
