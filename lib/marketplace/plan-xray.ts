/**
 * Phase 10 — Plan X-Ray data loader (CMS-backed, fail closed).
 */

import {
  isMarketplaceApiConfigured,
  searchMarketplacePlans,
} from '@/lib/marketplace/client';
import { cacheGet, cacheSet, cacheKey } from '@/lib/marketplace/cache';
import type {
  MarketplacePlanCard,
  MetalLevel,
  PlanTypeCode,
} from '@/lib/marketplace/types';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';

const API_BASE =
  process.env.MARKETPLACE_API_BASE?.trim() ||
  'https://marketplace.api.healthcare.gov/api/v1';

function apiKey(): string | null {
  return process.env.MARKETPLACE_API_KEY?.trim() || null;
}

function withKey(path: string): string {
  const key = apiKey();
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}apikey=${encodeURIComponent(key || '')}`;
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function normalizeMetal(raw: unknown): MetalLevel {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('catastrophic')) return 'Catastrophic';
  if (s.includes('bronze')) return 'Bronze';
  if (s.includes('silver')) return 'Silver';
  if (s.includes('gold')) return 'Gold';
  if (s.includes('platinum')) return 'Platinum';
  return 'Unknown';
}

function normalizePlanType(raw: unknown): PlanTypeCode {
  const s = String(raw ?? '').toUpperCase();
  if (s.includes('HMO')) return 'HMO';
  if (s.includes('PPO')) return 'PPO';
  if (s.includes('EPO')) return 'EPO';
  if (s.includes('POS')) return 'POS';
  if (s.includes('INDEMNITY')) return 'Indemnity';
  if (!s) return 'Unknown';
  return 'Other';
}

export type PlanBenefitLine = {
  name: string;
  /** Cost-sharing text only when CMS/issuer field present — never invented */
  costSharing: string | null;
};

export type PlanXRayResult = {
  ok: boolean;
  plan: MarketplacePlanCard | null;
  benefits: PlanBenefitLine[];
  /** Durable identity + useful attributes present */
  indexable: boolean;
  planYear: number;
  retrievedAt: string;
  sourceSystem: 'cms_marketplace_api' | 'unavailable';
  apiConfigured: boolean;
  marketZip: string | null;
  locationLabel: string | null;
  countyFips: string | null;
  state: string | null;
  errorMessage?: string;
  limitations: string[];
};

function mapBenefits(row: Record<string, unknown>): PlanBenefitLine[] {
  const raw =
    (row.benefits as unknown) ??
    (row.benefits_list as unknown) ??
    (row.covered_benefits as unknown);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b) => {
      if (!b || typeof b !== 'object') return null;
      const o = b as Record<string, unknown>;
      const name = String(o.name ?? o.benefit_name ?? o.type ?? '').trim();
      if (!name) return null;
      const costSharing =
        o.cost_sharing != null
          ? String(o.cost_sharing)
          : o.costSharing != null
            ? String(o.costSharing)
            : o.copay != null
              ? String(o.copay)
              : o.coinsurance != null
                ? String(o.coinsurance)
                : typeof o.description === 'string'
                  ? o.description
                  : null;
      return { name, costSharing: costSharing?.trim() || null };
    })
    .filter(Boolean)
    .slice(0, 40) as PlanBenefitLine[];
}

function mapStaticPlan(row: Record<string, unknown>): MarketplacePlanCard | null {
  const id = String(row.id ?? row.plan_id ?? row.hios_id ?? '').trim();
  const name = String(row.name ?? row.plan_name ?? row.marketing_name ?? '').trim();
  if (!id && !name) return null;

  const issuer =
    (row.issuer as Record<string, unknown> | undefined) ??
    (row.issuer_name ? { name: row.issuer_name } : {});
  const issuerName = String(
    issuer.name ?? row.issuer_name ?? row.issuerName ?? 'Issuer not listed'
  );

  const premium = num(row.premium) ?? num(row.premium_w_credit);
  const ded =
    num(row.deductible) ??
    num((row.deductibles as Record<string, unknown> | undefined)?.individual);
  const moop =
    num(row.moop) ??
    num(row.oop_max) ??
    num((row.moops as Record<string, unknown> | undefined)?.individual);
  const hsaRaw = row.hsa_eligible ?? row.hsaEligible;
  const quality =
    num(row.quality_rating) ??
    num((row.quality as Record<string, unknown> | undefined)?.global_rating);

  return {
    id: id || name,
    name: name || id,
    issuerName,
    metalLevel: normalizeMetal(row.metal_level ?? row.metalLevel ?? row.level),
    planType: normalizePlanType(row.type ?? row.plan_type),
    premiumMonthly: premium,
    estimatedPremiumAfterCreditMonthly: num(row.premium_w_credit) ?? premium,
    deductibleIndividual: ded,
    deductibleFamily: num((row.deductibles as Record<string, unknown> | undefined)?.family),
    moopIndividual: moop,
    moopFamily: num((row.moops as Record<string, unknown> | undefined)?.family),
    hsaEligible:
      hsaRaw == null ? null : Boolean(hsaRaw === true || hsaRaw === 'Yes' || hsaRaw === 'true'),
    qualityRating: quality,
    benefitsSummary:
      typeof row.benefits_summary === 'string' ? row.benefits_summary : null,
    networkName:
      typeof row.network === 'string'
        ? row.network
        : typeof (row.network as { name?: string } | undefined)?.name === 'string'
          ? (row.network as { name: string }).name
          : null,
    marketingUrl:
      typeof row.marketing_url === 'string'
        ? row.marketing_url
        : typeof row.brochure_url === 'string'
          ? row.brochure_url
          : null,
    premiumIsEstimate: false,
    afterCreditIsEstimate: num(row.premium_w_credit) == null && premium != null,
    cmsOopc: null,
    cmsTotalCosts: null,
    utilizationApplied: null,
  };
}

function isIndexablePlan(plan: MarketplacePlanCard | null): boolean {
  if (!plan) return false;
  if (!plan.id || !plan.name || plan.name.length < 3) return false;
  if (!plan.issuerName || plan.issuerName === 'Issuer not listed') return false;
  if (plan.metalLevel === 'Unknown') return false;
  // At least one durable cost or network attribute
  return (
    plan.premiumMonthly != null ||
    plan.deductibleIndividual != null ||
    plan.moopIndividual != null ||
    Boolean(plan.networkName)
  );
}

/**
 * Load plan research payload. Optional ZIP enriches with household-priced fields
 * from plans/search when the plan appears in that market.
 */
export async function loadPlanXRay(params: {
  planId: string;
  year?: number;
  zip?: string | null;
}): Promise<PlanXRayResult> {
  const retrievedAt = new Date().toISOString();
  const year = params.year || MARKETPLACE_PLAN_YEAR_DEFAULT;
  const planId = decodeURIComponent(params.planId || '').trim();
  const zip = (params.zip || '').replace(/\D/g, '').slice(0, 5);
  const limitations = [
    'Research only — not enrollment or a guarantee of provider availability or final cost.',
    'Confirm premiums, networks, and benefits on HealthCare.gov or issuer materials.',
    'No paid placements. You decide.',
  ];

  const base: PlanXRayResult = {
    ok: false,
    plan: null,
    benefits: [],
    indexable: false,
    planYear: year,
    retrievedAt,
    sourceSystem: 'unavailable',
    apiConfigured: isMarketplaceApiConfigured(),
    marketZip: zip.length === 5 ? zip : null,
    locationLabel: null,
    countyFips: null,
    state: null,
    limitations,
  };

  if (!planId) {
    return { ...base, errorMessage: 'Missing plan id.' };
  }

  if (!isMarketplaceApiConfigured()) {
    return {
      ...base,
      errorMessage:
        'Marketplace API key is not configured. Plan X-Ray requires live CMS data — we do not invent plan facts.',
    };
  }

  const ck = cacheKey({ t: 'plan_xray', planId, year, zip: zip || null });
  const cached = cacheGet<PlanXRayResult>(ck);
  if (cached) return cached;

  // 1) Static plan identity from GET /plans/{id}
  let benefits: PlanBenefitLine[] = [];
  let staticPlan: MarketplacePlanCard | null = null;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 28_000);
  try {
    const res = await fetch(
      `${API_BASE}${withKey(`/plans/${encodeURIComponent(planId)}?year=${year}`)}`,
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'X-API-KEY': apiKey()!,
          'User-Agent': 'InsuranceTrustHub-PlanXRay/1.0 (research-only)',
        },
      }
    );
    const text = await res.text();
    if (res.ok) {
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        const row = (json.plan ?? json.data ?? json) as Record<string, unknown>;
        staticPlan = mapStaticPlan(row);
        benefits = mapBenefits(row);
      } catch {
        // continue to search fallback
      }
    }
  } catch {
    // search fallback below
  } finally {
    clearTimeout(t);
  }

  // 2) Market-priced enrichment when ZIP provided
  let marketPlan: MarketplacePlanCard | null = null;
  let locationLabel: string | null = null;
  let countyFips: string | null = null;
  let state: string | null = null;

  if (zip.length === 5) {
    const search = await searchMarketplacePlans({
      zip,
      year,
      people: [{ age: 35 }],
      utilization: 'Medium',
    });
    locationLabel = search.locationLabel;
    countyFips = search.provenance.countyFips ?? null;
    state = search.provenance.state ?? null;
    if (search.ok) {
      marketPlan =
        search.plans.find((p) => p.id === planId || p.id.startsWith(planId)) ?? null;
    }
  }

  const plan = marketPlan
    ? {
        ...staticPlan,
        ...marketPlan,
        // Keep richer static text if search omitted it
        benefitsSummary: marketPlan.benefitsSummary || staticPlan?.benefitsSummary || null,
        networkName: marketPlan.networkName || staticPlan?.networkName || null,
        marketingUrl: marketPlan.marketingUrl || staticPlan?.marketingUrl || null,
      }
    : staticPlan;

  if (!plan) {
    const fail: PlanXRayResult = {
      ...base,
      sourceSystem: 'cms_marketplace_api',
      locationLabel,
      countyFips,
      state,
      errorMessage:
        'CMS Marketplace did not return this plan for the requested year (or market). No plan facts invented.',
    };
    cacheSet(ck, fail, 5 * 60 * 1000);
    return fail;
  }

  const result: PlanXRayResult = {
    ok: true,
    plan,
    benefits,
    indexable: isIndexablePlan(plan),
    planYear: year,
    retrievedAt,
    sourceSystem: 'cms_marketplace_api',
    apiConfigured: true,
    marketZip: zip.length === 5 ? zip : null,
    locationLabel,
    countyFips,
    state,
    limitations,
  };
  cacheSet(ck, result);
  return result;
}
