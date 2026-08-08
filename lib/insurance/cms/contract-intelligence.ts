/**
 * Phase 12 — MA/PD contract intelligence from CMS complaint + county extracts.
 * Fail closed: no invented stars, rates, or enrollment.
 */

import {
  CMS_COMPLAINT_DATASET_META,
  getComplaintContractMeta,
  getComplaintRankings,
} from '@/lib/insurance/cms/complaint-rankings';
import {
  COUNTY_SUMMARIES_META,
  getAllCountySummaries,
} from '@/lib/insurance/cms/county-summaries';
import type { CountyContractHighlight, CountyMedicareSummary } from '@/lib/insurance/cms/types';
import { isMedicareCountyIndexable } from '@/lib/insurance/cms/medicare-routes';

export type ContractCountyPresence = {
  slug: string;
  displayName: string;
  stateCode: string;
  publishedEnrollment: number;
  bucket?: string | null;
  path: string;
};

export type ContractIntelligence = {
  ok: boolean;
  contractId: string;
  carrierName: string | null;
  planType: string | null;
  complaintRatePerThousand: number | null;
  complaintMeasureStar: number | null;
  complaintMeasure: string | null;
  nationalRank: number | null;
  floridaRank: number | null;
  texasRank: number | null;
  materialStates: string[];
  countyPresence: ContractCountyPresence[];
  indexable: boolean;
  dataVintage: string;
  complaintSyncedAt: string;
  enrollmentSource: string;
  limitations: string[];
  unavailableReason?: string;
};

function rankIn(
  contractId: string,
  scope: 'US' | 'FL' | 'TX'
): number | null {
  const list = getComplaintRankings(scope);
  const hit = list.find(
    (r) => (r.contractId || '').toUpperCase() === contractId.toUpperCase()
  );
  return hit?.rank ?? null;
}

function countyPathFor(s: CountyMedicareSummary): string {
  // Prefer canonical /medicare/ paths
  const map: Record<string, string> = {
    'miami-dade-fl': '/medicare/fl/miami-dade',
    'broward-fl': '/medicare/fl/broward',
    'palm-beach-fl': '/medicare/fl/palm-beach',
  };
  return map[s.slug] || `/data/counties/${s.slug}`;
}

/**
 * Build contract research payload from CMS extracts only.
 */
export function loadContractIntelligence(contractIdRaw: string): ContractIntelligence {
  const contractId = (contractIdRaw || '').trim().toUpperCase();
  const limitations = [
    'Educational research only — not Medicare enrollment and not an official CMS tool.',
    'Complaint stars are measure stars for C28/D02 when reported, not always overall Part C/D summary stars.',
    'County enrollment is a lower bound (CMS suppresses small cells). Confirm current options on Medicare.gov.',
    'No paid placements. You decide.',
  ];

  const base: ContractIntelligence = {
    ok: false,
    contractId,
    carrierName: null,
    planType: null,
    complaintRatePerThousand: null,
    complaintMeasureStar: null,
    complaintMeasure: null,
    nationalRank: null,
    floridaRank: null,
    texasRank: null,
    materialStates: [],
    countyPresence: [],
    indexable: false,
    dataVintage: CMS_COMPLAINT_DATASET_META.dataVintage,
    complaintSyncedAt: CMS_COMPLAINT_DATASET_META.syncedAt,
    enrollmentSource: COUNTY_SUMMARIES_META.enrollmentSource,
    limitations,
  };

  if (!contractId || !/^[A-Z0-9]{4,10}$/i.test(contractId)) {
    return {
      ...base,
      unavailableReason: 'Invalid or missing CMS contract id.',
    };
  }

  const meta = getComplaintContractMeta(contractId);
  const counties = getAllCountySummaries().filter(isMedicareCountyIndexable);
  const presence: ContractCountyPresence[] = [];

  for (const county of counties) {
    const hit =
      county.topContractsByEnrollment.find(
        (c) => c.contractId.toUpperCase() === contractId
      ) ||
      county.lowestComplaintAmongMaterial.find(
        (c) => c.contractId.toUpperCase() === contractId
      );
    if (hit) {
      presence.push({
        slug: county.slug,
        displayName: county.displayName,
        stateCode: county.stateCode,
        publishedEnrollment: hit.publishedEnrollment,
        bucket: hit.bucket,
        path: countyPathFor(county),
      });
    }
  }

  if (!meta && !presence.length) {
    return {
      ...base,
      unavailableReason:
        'No CMS complaint-rate row or curated county presence for this contract in loaded extracts.',
    };
  }

  // Prefer carrier name from complaint index; fall back to county highlight
  let carrierName = meta?.carrierName ?? null;
  let measureStar = meta?.starRating ?? null;
  if (!carrierName && presence.length) {
    for (const county of counties) {
      const hit = [
        ...county.topContractsByEnrollment,
        ...county.lowestComplaintAmongMaterial,
      ].find((c) => c.contractId.toUpperCase() === contractId) as
        | CountyContractHighlight
        | undefined;
      if (hit?.carrierName) {
        carrierName = hit.carrierName;
        if (measureStar == null && hit.complaintMeasureStar != null) {
          measureStar = hit.complaintMeasureStar;
        }
        break;
      }
    }
  }

  const indexable = Boolean(
    meta &&
      meta.rate != null &&
      Number.isFinite(meta.rate) &&
      (carrierName || meta.carrierName)
  );

  return {
    ok: true,
    contractId,
    carrierName: carrierName || meta?.carrierName || null,
    planType: meta?.planType ?? null,
    complaintRatePerThousand: meta?.rate ?? null,
    complaintMeasureStar: measureStar,
    complaintMeasure: meta?.measure ?? null,
    nationalRank: rankIn(contractId, 'US'),
    floridaRank: rankIn(contractId, 'FL'),
    texasRank: rankIn(contractId, 'TX'),
    materialStates: meta?.materialStates ?? [],
    countyPresence: presence.sort(
      (a, b) => b.publishedEnrollment - a.publishedEnrollment
    ),
    indexable,
    dataVintage: CMS_COMPLAINT_DATASET_META.dataVintage,
    complaintSyncedAt: CMS_COMPLAINT_DATASET_META.syncedAt,
    enrollmentSource: COUNTY_SUMMARIES_META.enrollmentSource,
    limitations,
  };
}

/** All contract IDs that appear in curated county top lists or FL/TX rankings (sitemap quality set). */
export function listIndexableContractIds(limit = 80): string[] {
  const ids = new Set<string>();
  for (const c of getAllCountySummaries().filter(isMedicareCountyIndexable)) {
    for (const row of c.topContractsByEnrollment.slice(0, 12)) {
      if (row.contractId) ids.add(row.contractId.toUpperCase());
    }
  }
  // Prefer contracts with complaint meta for index quality
  return [...ids]
    .filter((id) => {
      const m = getComplaintContractMeta(id);
      return m && m.rate != null && Number.isFinite(m.rate);
    })
    .slice(0, limit);
}
