/**
 * Phase 13 — Carrier rollups from Medicare extracts + optional ACA market searches.
 * Evidence only; provenance on every section.
 */

import {
  CARRIER_REGISTRY,
  getCarrierBySlug,
  type CarrierRegistryEntry,
} from '@/lib/carriers/registry';
import {
  CMS_COMPLAINT_DATASET_META,
  getComplaintContractMeta,
  getComplaintRankings,
} from '@/lib/insurance/cms/complaint-rankings';
import {
  COUNTY_SUMMARIES_META,
  getAllCountySummaries,
} from '@/lib/insurance/cms/county-summaries';
import {
  contractIntelligencePath,
  countyPathFromSummary,
  isMedicareCountyIndexable,
} from '@/lib/insurance/cms/medicare-routes';
import { CURATED_ACA_MARKETS, marketPath } from '@/lib/marketplace/curated-markets';
import { loadCountyIntelligence } from '@/lib/marketplace/county-intelligence';
import type { MetalLevel, PlanTypeCode } from '@/lib/marketplace/types';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';
import { isMarketplaceApiConfigured } from '@/lib/marketplace/client';

export type CarrierMedicareContract = {
  contractId: string;
  reportedCarrierName: string;
  planType: string | null;
  complaintRatePerThousand: number | null;
  complaintMeasureStar: number | null;
  nationalRank: number | null;
  path: string;
};

export type CarrierMedicareCounty = {
  slug: string;
  displayName: string;
  stateCode: string;
  publishedEnrollment: number;
  path: string;
  reportedCarrierName: string;
  contractId: string;
};

export type CarrierMedicareRollup = {
  available: boolean;
  contracts: CarrierMedicareContract[];
  counties: CarrierMedicareCounty[];
  totalPublishedEnrollmentInCuratedCounties: number;
  complaintVintage: string;
  enrollmentSource: string;
  notes: string[];
};

export type CarrierAcaMarket = {
  marketPath: string;
  label: string;
  stateCode: string;
  planCount: number;
  sampleIssuerNames: string[];
};

export type CarrierAcaRollup = {
  available: boolean;
  apiConfigured: boolean;
  planYear: number;
  markets: CarrierAcaMarket[];
  planCount: number;
  metalMix: Partial<Record<MetalLevel, number>>;
  planTypeMix: Partial<Record<PlanTypeCode, number>>;
  premiumRange: { min: number; max: number; count: number } | null;
  deductibleRange: { min: number; max: number; count: number } | null;
  notes: string[];
};

export type CarrierIntelligence = {
  slug: string;
  displayName: string;
  aliases: string[];
  identityNote: string | null;
  retrievedAt: string;
  medicare: CarrierMedicareRollup;
  aca: CarrierAcaRollup;
  indexable: boolean;
  limitations: string[];
};

function matchesAny(name: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(name));
}

function rangeOf(values: number[]): { min: number; max: number; count: number } | null {
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values), count: values.length };
}

function nationalRank(contractId: string): number | null {
  const hit = getComplaintRankings('US').find(
    (r) => (r.contractId || '').toUpperCase() === contractId.toUpperCase()
  );
  return hit?.rank ?? null;
}

export function buildMedicareRollup(entry: CarrierRegistryEntry): CarrierMedicareRollup {
  const notes: string[] = [];
  const contractMap = new Map<string, CarrierMedicareContract>();
  const countyRows: CarrierMedicareCounty[] = [];

  // From complaint index (national list — only keep matching carrier names)
  for (const row of getComplaintRankings('US')) {
    const name = row.carrierName || '';
    if (!matchesAny(name, entry.medicareNameMatchers)) continue;
    const id = (row.contractId || '').toUpperCase();
    if (!id) continue;
    const meta = getComplaintContractMeta(id);
    contractMap.set(id, {
      contractId: id,
      reportedCarrierName: name,
      planType: row.planType || meta?.planType || null,
      complaintRatePerThousand: row.complaintRatePerThousand,
      complaintMeasureStar: row.starRating ?? meta?.starRating ?? null,
      nationalRank: row.rank,
      path: contractIntelligencePath(id),
    });
  }

  // County presence (curated quality counties only)
  let totalEnroll = 0;
  for (const county of getAllCountySummaries().filter(isMedicareCountyIndexable)) {
    const hits = [
      ...county.topContractsByEnrollment,
      ...county.lowestComplaintAmongMaterial,
    ];
    const seen = new Set<string>();
    for (const h of hits) {
      if (!matchesAny(h.carrierName || '', entry.medicareNameMatchers)) continue;
      const id = h.contractId.toUpperCase();
      if (seen.has(id)) continue;
      seen.add(id);
      countyRows.push({
        slug: county.slug,
        displayName: county.displayName,
        stateCode: county.stateCode,
        publishedEnrollment: h.publishedEnrollment,
        path: countyPathFromSummary(county),
        reportedCarrierName: h.carrierName,
        contractId: id,
      });
      totalEnroll += h.publishedEnrollment;

      if (!contractMap.has(id)) {
        const meta = getComplaintContractMeta(id);
        contractMap.set(id, {
          contractId: id,
          reportedCarrierName: h.carrierName,
          planType: meta?.planType ?? h.bucket?.toUpperCase() ?? null,
          complaintRatePerThousand:
            h.complaintRatePerThousand ?? meta?.rate ?? null,
          complaintMeasureStar: h.complaintMeasureStar ?? meta?.starRating ?? null,
          nationalRank: nationalRank(id),
          path: contractIntelligencePath(id),
        });
      }
    }
  }

  const contracts = [...contractMap.values()].sort((a, b) => {
    const ra = a.complaintRatePerThousand ?? 999;
    const rb = b.complaintRatePerThousand ?? 999;
    return ra - rb;
  });

  if (!contracts.length && !countyRows.length) {
    notes.push(
      'No Medicare contract or curated county enrollment rows matched this carrier’s explicit name matchers in loaded CMS extracts.'
    );
  } else {
    notes.push(
      'Medicare names are shown as reported by CMS extracts; legal entities under the same brand may be incomplete.'
    );
  }

  return {
    available: contracts.length > 0 || countyRows.length > 0,
    contracts: contracts.slice(0, 40),
    counties: countyRows
      .sort((a, b) => b.publishedEnrollment - a.publishedEnrollment)
      .slice(0, 30),
    totalPublishedEnrollmentInCuratedCounties: totalEnroll,
    complaintVintage: CMS_COMPLAINT_DATASET_META.dataVintage,
    enrollmentSource: COUNTY_SUMMARIES_META.enrollmentSource,
    notes,
  };
}

/**
 * ACA rollup: scan curated county market plan sets for issuer name matches.
 * Live CMS search — fail closed when API missing or empty.
 */
export async function buildAcaRollup(
  entry: CarrierRegistryEntry
): Promise<CarrierAcaRollup> {
  const planYear = MARKETPLACE_PLAN_YEAR_DEFAULT;
  const notes: string[] = [];
  const apiConfigured = isMarketplaceApiConfigured();

  if (!apiConfigured) {
    return {
      available: false,
      apiConfigured: false,
      planYear,
      markets: [],
      planCount: 0,
      metalMix: {},
      planTypeMix: {},
      premiumRange: null,
      deductibleRange: null,
      notes: [
        'Marketplace API key is not configured on this server. ACA issuer rollups require live CMS Marketplace plan search — not invented.',
      ],
    };
  }

  const markets: CarrierAcaMarket[] = [];
  const metalMix: Partial<Record<MetalLevel, number>> = {};
  const planTypeMix: Partial<Record<PlanTypeCode, number>> = {};
  const premiums: number[] = [];
  const deductibles: number[] = [];
  let planCount = 0;

  // Limit concurrent markets for latency — FL + TX first (federal FFM)
  const marketsToScan = CURATED_ACA_MARKETS.filter((m) =>
    ['FL', 'TX', 'AZ'].includes(m.stateCode)
  );

  for (const m of marketsToScan) {
    const intel = await loadCountyIntelligence(m.stateSlug, m.countySlug, planYear);
    if (!intel?.ok || !intel.issuers.length) continue;

    const matchedIssuers = intel.issuers.filter((name) =>
      matchesAny(name, entry.acaIssuerMatchers)
    );
    if (!matchedIssuers.length) continue;

    // We only have aggregate issuer list from county intelligence, not full plan rows per issuer.
    // Re-search would be heavy; use loadCountyIntelligence already ran full plan set — re-fetch via search is cached.
    // Pull plan-level detail by reusing search through a lightweight import
    const { searchMarketplacePlans } = await import('@/lib/marketplace/client');
    const search = await searchMarketplacePlans({
      zip: m.sampleZip,
      year: planYear,
      people: [{ age: 35 }],
      utilization: null,
    });
    if (!search.ok) continue;

    const plans = search.plans.filter((p) =>
      matchesAny(p.issuerName || '', entry.acaIssuerMatchers)
    );
    if (!plans.length) continue;

    planCount += plans.length;
    for (const p of plans) {
      metalMix[p.metalLevel] = (metalMix[p.metalLevel] || 0) + 1;
      planTypeMix[p.planType] = (planTypeMix[p.planType] || 0) + 1;
      const prem = p.premiumMonthly;
      if (prem != null) premiums.push(prem);
      if (p.deductibleIndividual != null) deductibles.push(p.deductibleIndividual);
    }

    markets.push({
      marketPath: marketPath(m),
      label: `${m.countyName} County, ${m.stateCode}`,
      stateCode: m.stateCode,
      planCount: plans.length,
      sampleIssuerNames: [
        ...new Set(plans.map((p) => p.issuerName).filter(Boolean)),
      ].slice(0, 5),
    });
  }

  if (!planCount) {
    notes.push(
      'No Marketplace plans in curated federal sample markets matched this carrier’s issuer name matchers. State-based exchanges or other ZIPs may still offer products — confirm on HealthCare.gov.'
    );
  } else {
    notes.push(
      'ACA counts come from CMS Marketplace plan search for representative ZIPs in curated markets only — not a complete national inventory.'
    );
  }

  return {
    available: planCount > 0,
    apiConfigured: true,
    planYear,
    markets,
    planCount,
    metalMix,
    planTypeMix,
    premiumRange: rangeOf(premiums),
    deductibleRange: rangeOf(deductibles),
    notes,
  };
}

export function isCarrierIndexable(
  medicare: CarrierMedicareRollup,
  aca: CarrierAcaRollup
): boolean {
  const medOk =
    medicare.contracts.some(
      (c) => c.complaintRatePerThousand != null || c.complaintMeasureStar != null
    ) || medicare.counties.length >= 1;
  const acaOk = aca.planCount >= 3 && aca.markets.length >= 1;
  return medOk || acaOk;
}

export async function loadCarrierIntelligence(
  slug: string
): Promise<CarrierIntelligence | null> {
  const entry = getCarrierBySlug(slug);
  if (!entry) return null;

  const medicare = buildMedicareRollup(entry);
  const aca = await buildAcaRollup(entry);
  const indexable = isCarrierIndexable(medicare, aca);

  return {
    slug: entry.slug,
    displayName: entry.displayName,
    aliases: entry.aliases,
    identityNote: entry.identityNote ?? null,
    retrievedAt: new Date().toISOString(),
    medicare,
    aca,
    indexable,
    limitations: [
      'Carrier research from public CMS / Marketplace extracts — not a sales ranking and not an official CMS page.',
      'Not a complete national product inventory. Networks, formularies, and offerings change.',
      'Confirm on HealthCare.gov, Medicare.gov, and issuer materials. No paid placements. You decide.',
      'ACA and Medicare are separate programs; signals are labeled separately on purpose.',
    ],
  };
}

/** Carriers with static Medicare evidence (safe for sitemap without live API). */
export function listMedicareEvidencedCarrierSlugs(): string[] {
  return CARRIER_REGISTRY.filter((e) => buildMedicareRollup(e).available).map(
    (e) => e.slug
  );
}

export function listAllCuratedCarrierSlugs(): string[] {
  return CARRIER_REGISTRY.map((c) => c.slug);
}
