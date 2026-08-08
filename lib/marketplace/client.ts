/**
 * CMS Marketplace API client — fail closed, never fabricate plan premiums.
 * Key: MARKETPLACE_API_KEY (60-day rotation from CMS).
 */

import { resolveZip } from '@/lib/tools/zip-resolve';
import { cacheGet, cacheSet, cacheKey } from '@/lib/marketplace/cache';
import {
  educationalCreditContext,
  applyCreditToPremium,
} from '@/lib/marketplace/ptc-context';
import type {
  MarketplacePlanCard,
  MarketplaceSearchInput,
  MarketplaceSearchResult,
  MetalLevel,
  PlanTypeCode,
} from '@/lib/marketplace/types';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';

const API_BASE =
  process.env.MARKETPLACE_API_BASE?.trim() ||
  'https://marketplace.api.healthcare.gov/api/v1';

export function isMarketplaceApiConfigured(): boolean {
  return Boolean(process.env.MARKETPLACE_API_KEY?.trim());
}

function apiKey(): string | null {
  return process.env.MARKETPLACE_API_KEY?.trim() || null;
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

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

async function marketplaceFetch(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; json: unknown } | { ok: false; status: number; body: string }> {
  const key = apiKey();
  if (!key) return { ok: false, status: 0, body: 'missing_api_key' };

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 28_000);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'InsuranceTrustHub-PlanExplorer/1.0 (research-only)',
        ...(init?.headers || {}),
        // CMS accepts apikey query or header depending on version — send both patterns safely
        'X-API-KEY': key,
      },
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, status: res.status, body: body.slice(0, 400) };
    try {
      return { ok: true, json: JSON.parse(body) };
    } catch {
      return { ok: false, status: res.status, body: 'invalid_json' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch_failed';
    return { ok: false, status: 0, body: msg.includes('abort') ? 'timeout' : msg };
  } finally {
    clearTimeout(t);
  }
}

function withKey(path: string): string {
  const key = apiKey();
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}apikey=${encodeURIComponent(key || '')}`;
}

type CountyHit = { fips: string; state: string; name: string };

async function countiesByZip(zip: string, year: number): Promise<CountyHit[] | null> {
  const ck = cacheKey({ t: 'county', zip, year });
  const cached = cacheGet<CountyHit[]>(ck);
  if (cached) return cached;

  const res = await marketplaceFetch(withKey(`/counties/by/zip/${zip}?year=${year}`));
  if (!res.ok) return null;

  const json = res.json as Record<string, unknown>;
  const list = (json.counties ?? json.data ?? json) as unknown;
  const arr = Array.isArray(list) ? list : [];
  const hits: CountyHit[] = arr
    .map((c) => {
      const row = c as Record<string, unknown>;
      const fips = String(row.fips ?? row.county_fips ?? row.countyfips ?? '');
      const state = String(row.state ?? row.state_code ?? '');
      const name = String(row.name ?? row.county_name ?? '');
      if (!fips) return null;
      return { fips, state, name };
    })
    .filter(Boolean) as CountyHit[];

  if (hits.length) cacheSet(ck, hits);
  return hits;
}

function mapPlanRow(
  row: Record<string, unknown>,
  monthlyCredit: number | null
): MarketplacePlanCard | null {
  const id = String(row.id ?? row.plan_id ?? row.hios_id ?? '');
  const name = String(row.name ?? row.plan_name ?? row.marketing_name ?? '').trim();
  if (!id && !name) return null;

  const issuer =
    (row.issuer as Record<string, unknown> | undefined) ??
    (row.issuer_name ? { name: row.issuer_name } : {});
  const issuerName = String(
    issuer.name ?? row.issuer_name ?? row.issuerName ?? 'Issuer not listed'
  );

  const premium =
    num(row.premium) ??
    num(row.premium_w_credit) ??
    num((row.premiums as Record<string, unknown> | undefined)?.individual) ??
    num(row.premium_adult) ??
    num(row.ehb_premium);

  const premiumAfter =
    num(row.premium_w_credit) ??
    num(row.premium_after_credit) ??
    applyCreditToPremium(premium, monthlyCredit);

  const ded =
    num(row.deductible) ??
    num((row.deductibles as Record<string, unknown> | undefined)?.individual) ??
    num(row.individual_medical_deductible);

  const moop =
    num(row.moop) ??
    num(row.oop_max) ??
    num((row.moops as Record<string, unknown> | undefined)?.individual) ??
    num(row.individual_medical_moop);

  const hsaRaw = row.hsa_eligible ?? row.hsaEligible ?? row.is_hsa;
  const hsaEligible =
    hsaRaw == null ? null : Boolean(hsaRaw === true || hsaRaw === 'Yes' || hsaRaw === 'true');

  const quality =
    num(row.quality_rating) ??
    num((row.quality as Record<string, unknown> | undefined)?.global_rating) ??
    num(row.stars);

  return {
    id: id || name,
    name: name || id,
    issuerName,
    metalLevel: normalizeMetal(row.metal_level ?? row.metalLevel ?? row.level),
    planType: normalizePlanType(row.type ?? row.plan_type ?? row.network_type),
    premiumMonthly: premium,
    estimatedPremiumAfterCreditMonthly: premiumAfter,
    deductibleIndividual: ded,
    deductibleFamily:
      num(row.family_deductible) ??
      num((row.deductibles as Record<string, unknown> | undefined)?.family),
    moopIndividual: moop,
    moopFamily:
      num(row.family_moop) ?? num((row.moops as Record<string, unknown> | undefined)?.family),
    hsaEligible,
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
    afterCreditIsEstimate: premiumAfter != null && num(row.premium_w_credit) == null,
  };
}

/**
 * Search Marketplace plans for a household. Fail closed — no fabricated plans.
 */
export async function searchMarketplacePlans(
  input: MarketplaceSearchInput
): Promise<MarketplaceSearchResult> {
  const retrievedAt = new Date().toISOString();
  const year = input.year || MARKETPLACE_PLAN_YEAR_DEFAULT;
  const zip = (input.zip || '').replace(/\D/g, '').slice(0, 5);

  const baseProvenance = {
    sourceSystem: 'unavailable' as const,
    planYear: year,
    retrievedAt,
    zip: zip || null,
    apiConfigured: isMarketplaceApiConfigured(),
  };

  if (zip.length !== 5) {
    return {
      ok: false,
      plans: [],
      provenance: baseProvenance,
      locationLabel: null,
      errorCode: 'invalid_zip',
      errorMessage: 'Enter a valid 5-digit U.S. ZIP code.',
    };
  }

  if (!isMarketplaceApiConfigured()) {
    const loc = resolveZip(zip);
    return {
      ok: false,
      plans: [],
      provenance: baseProvenance,
      locationLabel: loc?.displayLabel ?? zip,
      errorCode: 'missing_api_key',
      errorMessage:
        'Marketplace API key is not configured on this server. Plan lists require a live CMS Marketplace API key (MARKETPLACE_API_KEY). We do not invent premiums. Use HealthCare.gov Window Shopping or set the key and retry.',
      creditContext: educationalCreditContext({
        income: input.householdIncome,
        householdSize: input.householdSize ?? input.people.length,
      }),
    };
  }

  const loc = resolveZip(zip);
  const counties = await countiesByZip(zip, year);
  if (!counties?.length) {
    return {
      ok: false,
      plans: [],
      provenance: { ...baseProvenance, sourceSystem: 'cms_marketplace_api' },
      locationLabel: loc?.displayLabel ?? zip,
      errorCode: 'county_not_found',
      errorMessage:
        'CMS Marketplace API did not resolve a county for this ZIP (or the request failed). Try another ZIP or open HealthCare.gov.',
    };
  }

  const county = counties[0]!;
  const people = (input.people?.length ? input.people : [{ age: 35 }]).map((p) => ({
    age: Math.max(0, Math.min(120, Math.round(p.age))),
    aptc_eligible: true,
    gender: 'Female',
    uses_tobacco: Boolean(p.usesTobacco),
  }));

  const body = {
    market: 'Individual',
    place: {
      countyfips: county.fips,
      state: county.state || loc?.stateCode,
      zipcode: zip,
    },
    year,
    household: {
      income: input.householdIncome ?? undefined,
      people,
    },
  };

  const ck = cacheKey({ t: 'plans', body });
  const cached = cacheGet<MarketplaceSearchResult>(ck);
  if (cached) return cached;

  const res = await marketplaceFetch(withKey('/plans/search'), {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const code =
      res.body === 'timeout' ? 'upstream_timeout' : res.status === 0 ? 'api_error' : 'api_error';
    return {
      ok: false,
      plans: [],
      provenance: {
        ...baseProvenance,
        sourceSystem: 'cms_marketplace_api',
        countyFips: county.fips,
        state: county.state,
      },
      locationLabel: `${county.name || loc?.countyName || 'County'}, ${county.state || loc?.stateCode || ''} · ${zip}`,
      errorCode: code,
      errorMessage: `Marketplace API error (${res.status || 'network'}). ${res.body.slice(0, 180)}. No plans invented.`,
      creditContext: educationalCreditContext({
        income: input.householdIncome,
        householdSize: input.householdSize ?? people.length,
      }),
    };
  }

  const json = res.json as Record<string, unknown>;
  const rawPlans = (json.plans ?? json.data ?? json.results ?? []) as unknown[];
  const arr = Array.isArray(rawPlans) ? rawPlans : [];

  // Benchmark: median silver premium if present
  const silverPremiums = arr
    .map((p) => {
      const row = p as Record<string, unknown>;
      const metal = normalizeMetal(row.metal_level ?? row.metalLevel ?? row.level);
      const prem = num(row.premium) ?? num(row.premium_w_credit);
      return metal === 'Silver' && prem != null ? prem : null;
    })
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
  const bench =
    silverPremiums.length > 0
      ? silverPremiums[Math.floor(silverPremiums.length / 2)]
      : null;

  const creditContext = educationalCreditContext({
    income: input.householdIncome,
    householdSize: input.householdSize ?? people.length,
    benchmarkPremiumMonthly: bench,
  });

  const plans = arr
    .map((p) =>
      mapPlanRow(p as Record<string, unknown>, creditContext.estimatedMonthlyCredit)
    )
    .filter(Boolean) as MarketplacePlanCard[];

  if (!plans.length) {
    const empty: MarketplaceSearchResult = {
      ok: false,
      plans: [],
      provenance: {
        sourceSystem: 'cms_marketplace_api',
        planYear: year,
        retrievedAt,
        countyFips: county.fips,
        state: county.state,
        zip,
        apiConfigured: true,
      },
      locationLabel: `${county.name || 'County'}, ${county.state} · ${zip}`,
      errorCode: 'empty_market',
      errorMessage:
        'CMS returned no individual-market plans for this household and place. State-based marketplaces or limited areas may not appear here. Try HealthCare.gov or your state exchange.',
      creditContext,
    };
    cacheSet(ck, empty, 5 * 60 * 1000);
    return empty;
  }

  const result: MarketplaceSearchResult = {
    ok: true,
    plans,
    provenance: {
      sourceSystem: 'cms_marketplace_api',
      planYear: year,
      retrievedAt,
      countyFips: county.fips,
      state: county.state,
      zip,
      apiConfigured: true,
    },
    locationLabel: `${county.name || loc?.countyName || 'County'}, ${county.state || loc?.stateCode} · ${zip}`,
    creditContext,
  };
  cacheSet(ck, result);
  return result;
}
