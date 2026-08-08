/**
 * Curated ACA Marketplace county research targets (Phase 10).
 * Quality over volume — not every US county. No mass doorway pages.
 */

import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';

export type CuratedAcaMarket = {
  /** URL segment: /marketplace/{state}/{county} */
  stateSlug: string;
  countySlug: string;
  stateCode: string;
  stateName: string;
  countyName: string;
  /** Representative ZIP for CMS plan search / Explorer prefill */
  sampleZip: string;
  /** Optional CMS county FIPS when known */
  countyFips?: string;
  /** Related Medicare dashboard slug if any */
  medicareDashboardSlug?: string;
};

/**
 * High-value markets with known ZIP resolution + research demand.
 * Expand only when we can show differentiated CMS plan sets.
 */
export const CURATED_ACA_MARKETS: CuratedAcaMarket[] = [
  {
    stateSlug: 'fl',
    countySlug: 'miami-dade',
    stateCode: 'FL',
    stateName: 'Florida',
    countyName: 'Miami-Dade',
    sampleZip: '33101',
    countyFips: '12086',
    medicareDashboardSlug: 'miami-dade-fl',
  },
  {
    stateSlug: 'fl',
    countySlug: 'broward',
    stateCode: 'FL',
    stateName: 'Florida',
    countyName: 'Broward',
    sampleZip: '33301',
    countyFips: '12011',
    medicareDashboardSlug: 'broward-fl',
  },
  {
    stateSlug: 'fl',
    countySlug: 'palm-beach',
    stateCode: 'FL',
    stateName: 'Florida',
    countyName: 'Palm Beach',
    sampleZip: '33401',
    countyFips: '12099',
    medicareDashboardSlug: 'palm-beach-fl',
  },
  {
    stateSlug: 'tx',
    countySlug: 'harris',
    stateCode: 'TX',
    stateName: 'Texas',
    countyName: 'Harris',
    sampleZip: '77002',
    countyFips: '48201',
  },
  {
    stateSlug: 'tx',
    countySlug: 'dallas',
    stateCode: 'TX',
    stateName: 'Texas',
    countyName: 'Dallas',
    sampleZip: '75201',
    countyFips: '48113',
  },
  {
    stateSlug: 'ca',
    countySlug: 'los-angeles',
    stateCode: 'CA',
    stateName: 'California',
    countyName: 'Los Angeles',
    sampleZip: '90012',
    countyFips: '06037',
  },
  {
    stateSlug: 'ny',
    countySlug: 'kings',
    stateCode: 'NY',
    stateName: 'New York',
    countyName: 'Kings',
    sampleZip: '11201',
    countyFips: '36047',
  },
  {
    stateSlug: 'az',
    countySlug: 'maricopa',
    stateCode: 'AZ',
    stateName: 'Arizona',
    countyName: 'Maricopa',
    sampleZip: '85004',
    countyFips: '04013',
  },
];

export const ACA_MARKET_PLAN_YEAR = MARKETPLACE_PLAN_YEAR_DEFAULT;

/** Minimum plans + issuers for an indexable county snapshot. */
export const COUNTY_INDEX_GATES = {
  minPlans: 5,
  minIssuers: 2,
} as const;

export function getCuratedMarket(
  stateSlug: string,
  countySlug: string
): CuratedAcaMarket | null {
  const s = stateSlug.toLowerCase();
  const c = countySlug.toLowerCase();
  return (
    CURATED_ACA_MARKETS.find((m) => m.stateSlug === s && m.countySlug === c) ?? null
  );
}

export function marketPath(m: CuratedAcaMarket): string {
  return `/marketplace/${m.stateSlug}/${m.countySlug}`;
}

export function planXrayPath(year: number, planId: string, zip?: string | null): string {
  const base = `/marketplace/plans/${year}/${encodeURIComponent(planId)}`;
  if (zip && /^\d{5}$/.test(zip)) return `${base}?zip=${zip}`;
  return base;
}
