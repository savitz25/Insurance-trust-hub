/**
 * County Medicare Intelligence summaries (Phase 2).
 * Pre-computed from CPSC enrollment + Star Ratings measure stars.
 */

import type { CountyMedicareSummary, CountySummariesMeta } from '@/lib/insurance/cms/types';
import raw from '@/lib/insurance/cms/data/county-summaries.json';

type Payload = {
  generatedAt: string;
  meta: CountySummariesMeta;
  counties: CountyMedicareSummary[];
};

const DATA = raw as Payload;

export const COUNTY_SUMMARIES_META: CountySummariesMeta & { generatedAt: string } = {
  ...DATA.meta,
  generatedAt: DATA.generatedAt,
};

export function getAllCountySummaries(): CountyMedicareSummary[] {
  return DATA.counties;
}

export function getCountySummary(slug: string): CountyMedicareSummary | null {
  return DATA.counties.find((c) => c.slug === slug) ?? null;
}

export function getCountySummarySlugs(): string[] {
  return DATA.counties.map((c) => c.slug);
}

export function formatEnrollment(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatComplaintRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—';
  if (rate > 0 && rate < 0.01) return rate.toFixed(3);
  return rate.toFixed(2);
}
