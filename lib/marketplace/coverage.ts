/**
 * Phase 8 — CMS Marketplace provider network + formulary coverage lookups.
 * Fail closed. Never invent in-network or covered status.
 */

import { cacheGet, cacheSet, cacheKey } from '@/lib/marketplace/cache';
import { isMarketplaceApiConfigured } from '@/lib/marketplace/client';
import type {
  CoverageMatchResult,
  CoverageMatchStatus,
  DrugSearchHit,
  ItemPlanCoverage,
  PlanCoverageSummary,
  ProviderSearchHit,
  SessionDoctor,
  SessionPrescription,
} from '@/lib/marketplace/types';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';

const API_BASE =
  process.env.MARKETPLACE_API_BASE?.trim() ||
  'https://marketplace.api.healthcare.gov/api/v1';

const PLAN_BATCH = 25;
const ITEM_BATCH = 20;

function apiKey(): string | null {
  return process.env.MARKETPLACE_API_KEY?.trim() || null;
}

function withKey(path: string): string {
  const key = apiKey();
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}apikey=${encodeURIComponent(key || '')}`;
}

async function marketplaceGet(
  path: string
): Promise<{ ok: true; json: unknown } | { ok: false; status: number; body: string }> {
  const key = apiKey();
  if (!key) return { ok: false, status: 0, body: 'missing_api_key' };

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 28_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'InsuranceTrustHub-CoverageChecker/1.0 (research-only)',
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function mapCmsCoverage(raw: unknown): CoverageMatchStatus {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  if (s === 'covered') return 'reported';
  if (s === 'genericcovered') return 'generic_reported';
  if (s === 'notcovered') return 'not_reported';
  if (s === 'datanotprovided' || s === '') return 'unknown';
  return 'unknown';
}

function extractList(json: unknown, keys: string[]): unknown[] {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== 'object') return [];
  const o = json as Record<string, unknown>;
  for (const k of keys) {
    if (Array.isArray(o[k])) return o[k] as unknown[];
  }
  // CMS sometimes uses awkward keys
  for (const [k, v] of Object.entries(o)) {
    if (Array.isArray(v) && /provider|drug|coverage/i.test(k)) return v;
  }
  return [];
}

export async function searchMarketplaceProviders(input: {
  q: string;
  zip: string;
  year?: number;
  type?: 'Individual' | 'Facility' | 'Group' | 'Individual,Facility';
  specialty?: string | null;
}): Promise<{
  ok: boolean;
  hits: ProviderSearchHit[];
  errorCode?: string;
  errorMessage?: string;
  retrievedAt: string;
}> {
  const retrievedAt = new Date().toISOString();
  const q = (input.q || '').trim();
  const zip = (input.zip || '').replace(/\D/g, '').slice(0, 5);
  const year = input.year || MARKETPLACE_PLAN_YEAR_DEFAULT;
  const type = input.type || 'Individual,Facility';

  if (!isMarketplaceApiConfigured()) {
    return {
      ok: false,
      hits: [],
      errorCode: 'missing_api_key',
      errorMessage:
        'Marketplace API key is not configured. Provider search requires live CMS data — we do not invent doctor lists.',
      retrievedAt,
    };
  }
  if (q.length < 2) {
    return {
      ok: false,
      hits: [],
      errorCode: 'invalid_query',
      errorMessage: 'Enter at least 2 characters to search providers.',
      retrievedAt,
    };
  }
  if (zip.length !== 5) {
    return {
      ok: false,
      hits: [],
      errorCode: 'invalid_zip',
      errorMessage: 'Provider search needs the active explorer ZIP (5 digits).',
      retrievedAt,
    };
  }

  const ck = cacheKey({ t: 'prov_search', q, zip, year, type, sp: input.specialty || '' });
  const cached = cacheGet<{ ok: boolean; hits: ProviderSearchHit[] }>(ck);
  if (cached) return { ...cached, retrievedAt };

  const params = new URLSearchParams({
    q,
    zipcode: zip,
    type,
    year: String(year),
  });
  if (input.specialty?.trim()) params.set('specialty', input.specialty.trim());

  const res = await marketplaceGet(withKey(`/providers/search?${params.toString()}`));
  if (!res.ok) {
    // Fallback: autocomplete (no specialty)
    const auto = await marketplaceGet(
      withKey(
        `/providers/autocomplete?q=${encodeURIComponent(q)}&zipcode=${zip}&type=${encodeURIComponent(type)}`
      )
    );
    if (!auto.ok) {
      return {
        ok: false,
        hits: [],
        errorCode: res.body === 'timeout' ? 'upstream_timeout' : 'api_error',
        errorMessage: `CMS provider search failed (${res.status || 'network'}). No providers invented.`,
        retrievedAt,
      };
    }
    const list = extractList(auto.json, ['providers', 'data', 'results']);
    const hits = list
      .map((row) => mapProviderRow(row))
      .filter((h): h is ProviderSearchHit => h != null)
      .slice(0, 25);
    const payload = { ok: true as const, hits };
    cacheSet(ck, payload, 10 * 60 * 1000);
    return { ...payload, retrievedAt };
  }

  const list = extractList(res.json, ['providers', 'data', 'results']);
  const hits = list
    .map((row) => {
      // NearbyProvider: { provider, distance } or flat Provider
      const o = row as Record<string, unknown>;
      const nested = o.provider as Record<string, unknown> | undefined;
      const mapped = mapProviderRow(nested ?? o);
      if (!mapped) return null;
      const dist =
        typeof o.distance === 'number'
          ? o.distance
          : mapped.distanceMiles;
      return { ...mapped, distanceMiles: dist };
    })
    .filter((h): h is ProviderSearchHit => h != null)
    .slice(0, 25);

  const payload = { ok: true as const, hits };
  cacheSet(ck, payload, 10 * 60 * 1000);
  return { ...payload, retrievedAt };
}

function mapProviderRow(row: unknown): ProviderSearchHit | null {
  if (!row || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;
  const npi = String(o.npi ?? o.NPI ?? '').replace(/\D/g, '');
  const name = String(o.name ?? o.provider_name ?? '').trim();
  if (npi.length !== 10 || !name) return null;
  const specs = Array.isArray(o.specialties)
    ? (o.specialties as unknown[]).map(String).filter(Boolean)
    : typeof o.specialty === 'string'
      ? [o.specialty]
      : [];
  return {
    npi,
    name,
    specialties: specs,
    providerType: o.type != null ? String(o.type) : null,
    distanceMiles: typeof o.distance === 'number' ? o.distance : null,
    accepting: o.accepting != null ? String(o.accepting) : null,
  };
}

export async function searchMarketplaceDrugs(input: {
  q: string;
  year?: number;
}): Promise<{
  ok: boolean;
  hits: DrugSearchHit[];
  errorCode?: string;
  errorMessage?: string;
  retrievedAt: string;
}> {
  const retrievedAt = new Date().toISOString();
  const q = (input.q || '').trim();
  const year = input.year || MARKETPLACE_PLAN_YEAR_DEFAULT;

  if (!isMarketplaceApiConfigured()) {
    return {
      ok: false,
      hits: [],
      errorCode: 'missing_api_key',
      errorMessage:
        'Marketplace API key is not configured. Drug search requires live CMS data — we do not invent formularies.',
      retrievedAt,
    };
  }
  if (q.length < 2) {
    return {
      ok: false,
      hits: [],
      errorCode: 'invalid_query',
      errorMessage: 'Enter at least 2 characters to search medications.',
      retrievedAt,
    };
  }

  const ck = cacheKey({ t: 'drug_search', q, year });
  const cached = cacheGet<{ ok: boolean; hits: DrugSearchHit[] }>(ck);
  if (cached) return { ...cached, retrievedAt };

  let res = await marketplaceGet(
    withKey(`/drugs/autocomplete?q=${encodeURIComponent(q)}&year=${year}`)
  );
  if (!res.ok) {
    res = await marketplaceGet(
      withKey(`/drugs/search?q=${encodeURIComponent(q)}&year=${year}`)
    );
  }
  if (!res.ok) {
    return {
      ok: false,
      hits: [],
      errorCode: res.body === 'timeout' ? 'upstream_timeout' : 'api_error',
      errorMessage: `CMS drug search failed (${res.status || 'network'}). No drugs invented.`,
      retrievedAt,
    };
  }

  const list = extractList(res.json, ['drugs', 'data', 'results']);
  const hits = list
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const rxcui = String(o.rxcui ?? o.id ?? '').replace(/\D/g, '');
      const name = String(o.name ?? o.full_name ?? '').trim();
      if (!rxcui || !name) return null;
      return {
        rxcui,
        name,
        strength: o.strength != null ? String(o.strength) : null,
        route: o.route != null ? String(o.route) : null,
        fullName: o.full_name != null ? String(o.full_name) : null,
      } satisfies DrugSearchHit;
    })
    .filter((h): h is DrugSearchHit => h != null)
    .slice(0, 30);

  const payload = { ok: true as const, hits };
  cacheSet(ck, payload, 10 * 60 * 1000);
  return { ...payload, retrievedAt };
}

function emptyDoctorItems(
  doctors: SessionDoctor[],
  status: CoverageMatchStatus,
  note?: string
): ItemPlanCoverage[] {
  return doctors.map((d) => ({
    itemSessionId: d.sessionId,
    itemKey: d.npi,
    label: d.name,
    status,
    cmsCoverage: null,
    notes: note || null,
  }));
}

function emptyDrugItems(
  drugs: SessionPrescription[],
  status: CoverageMatchStatus,
  note?: string
): ItemPlanCoverage[] {
  return drugs.map((d) => ({
    itemSessionId: d.sessionId,
    itemKey: d.rxcui,
    label: d.name,
    status,
    cmsCoverage: null,
    notes: note || null,
  }));
}

function tally(
  items: ItemPlanCoverage[]
): Pick<PlanCoverageSummary['doctors'], 'reported' | 'notReported' | 'unknown' | 'total'> {
  let reported = 0;
  let notReported = 0;
  let unknown = 0;
  for (const it of items) {
    if (it.status === 'reported' || it.status === 'generic_reported') reported += 1;
    else if (it.status === 'not_reported') notReported += 1;
    else unknown += 1;
  }
  return { reported, notReported, unknown, total: items.length };
}

function explainable(
  doctors: ReturnType<typeof tally>,
  rx: ReturnType<typeof tally>
): { ratio: number | null; label: string | null } {
  const reported = doctors.reported + rx.reported;
  const notReported = doctors.notReported + rx.notReported;
  const known = reported + notReported;
  if (known === 0) return { ratio: null, label: null };
  const ratio = reported / known;
  const label = `${reported}/${known} reported matches (unknown excluded)`;
  return { ratio, label };
}

/**
 * Match session doctors + prescriptions against candidate plan IDs via CMS.
 * Batches requests. Fail closed → unknown, never fabricated Covered.
 */
export async function matchCoverageForPlans(input: {
  year: number;
  planIds: string[];
  doctors: SessionDoctor[];
  prescriptions: SessionPrescription[];
}): Promise<CoverageMatchResult> {
  const retrievedAt = new Date().toISOString();
  const year = input.year || MARKETPLACE_PLAN_YEAR_DEFAULT;
  const planIds = [...new Set(input.planIds.map((id) => String(id).trim()).filter(Boolean))].slice(
    0,
    80
  );
  const doctors = input.doctors
    .filter((d) => d.npi?.replace(/\D/g, '').length === 10)
    .slice(0, 12);
  const prescriptions = input.prescriptions
    .filter((d) => d.rxcui?.replace(/\D/g, '').length > 0)
    .slice(0, 12);

  const limitations = [
    'Research tool based on Marketplace-reported network and formulary data only.',
    'Not medical, eligibility, or coverage advice. Not a guarantee at time of care.',
    'Provider participation and formularies change — confirm with issuer / HealthCare.gov before decisions.',
    'Unknown / data-not-provided is a first-class state, never treated as “no.”',
  ];

  const base: CoverageMatchResult = {
    ok: false,
    year,
    retrievedAt,
    sourceSystem: 'unavailable',
    apiConfigured: isMarketplaceApiConfigured(),
    byPlan: {},
    limitations,
  };

  if (!planIds.length) {
    return {
      ...base,
      ok: true,
      errorMessage: 'No plan IDs to match.',
    };
  }

  if (!doctors.length && !prescriptions.length) {
    return {
      ...base,
      ok: true,
      sourceSystem: 'cms_marketplace_api',
      byPlan: Object.fromEntries(
        planIds.map((id) => [
          id,
          {
            planId: id,
            doctors: { reported: 0, notReported: 0, unknown: 0, total: 0, items: [] },
            prescriptions: { reported: 0, notReported: 0, unknown: 0, total: 0, items: [] },
            explainableMatchRatio: null,
            explainableMatchLabel: null,
          } satisfies PlanCoverageSummary,
        ])
      ),
    };
  }

  if (!isMarketplaceApiConfigured()) {
    const failItemsDoc = emptyDoctorItems(
      doctors,
      'insufficient_data',
      'API key not configured'
    );
    const failItemsRx = emptyDrugItems(
      prescriptions,
      'insufficient_data',
      'API key not configured'
    );
    return {
      ...base,
      errorCode: 'missing_api_key',
      errorMessage:
        'Marketplace API key missing. Coverage match unavailable — no invented network or formulary claims.',
      byPlan: Object.fromEntries(
        planIds.map((id) => {
          const d = tally(failItemsDoc);
          const r = tally(failItemsRx);
          const ex = explainable(d, r);
          return [
            id,
            {
              planId: id,
              doctors: { ...d, items: failItemsDoc },
              prescriptions: { ...r, items: failItemsRx },
              explainableMatchRatio: ex.ratio,
              explainableMatchLabel: ex.label,
            } satisfies PlanCoverageSummary,
          ];
        })
      ),
    };
  }

  // provider: planId -> npi -> coverage row
  const providerMap = new Map<string, Map<string, { coverage: string; accepting?: string }>>();
  // drug: planId -> rxcui -> coverage
  const drugMap = new Map<
    string,
    Map<string, { coverage: string; generic_rxcui?: string }>
  >();

  let anyProviderOk = !doctors.length;
  let anyDrugOk = !prescriptions.length;
  let lastError = '';

  if (doctors.length) {
    const npis = doctors.map((d) => d.npi.replace(/\D/g, ''));
    for (const planChunk of chunk(planIds, PLAN_BATCH)) {
      for (const npiChunk of chunk(npis, ITEM_BATCH)) {
        const ck = cacheKey({ t: 'prov_cov', year, p: planChunk, n: npiChunk });
        const cached = cacheGet<
          { plan_id: string; npi: string; coverage: string; accepting?: string }[]
        >(ck);
        let rows = cached;
        if (!rows) {
          const qs = new URLSearchParams({
            year: String(year),
            providerids: npiChunk.join(','),
            planids: planChunk.join(','),
          });
          const res = await marketplaceGet(withKey(`/providers/covered?${qs.toString()}`));
          if (!res.ok) {
            lastError = res.body;
            continue;
          }
          anyProviderOk = true;
          const list = extractList(res.json, [
            'providers',
            'coverage',
            'data',
            'Provider & Drug Coverage',
          ]);
          rows = list
            .map((row) => {
              if (!row || typeof row !== 'object') return null;
              const o = row as Record<string, unknown>;
              const plan_id = String(o.plan_id ?? o.planId ?? o.planid ?? '');
              const npi = String(o.npi ?? o.providerid ?? o.provider_id ?? '').replace(/\D/g, '');
              const coverage = String(o.coverage ?? o.status ?? '');
              if (!plan_id || !npi) return null;
              return {
                plan_id,
                npi,
                coverage,
                accepting: o.accepting != null ? String(o.accepting) : undefined,
              };
            })
            .filter(Boolean) as {
            plan_id: string;
            npi: string;
            coverage: string;
            accepting?: string;
          }[];
          cacheSet(ck, rows, 10 * 60 * 1000);
        } else {
          anyProviderOk = true;
        }
        for (const r of rows) {
          if (!providerMap.has(r.plan_id)) providerMap.set(r.plan_id, new Map());
          providerMap.get(r.plan_id)!.set(r.npi, {
            coverage: r.coverage,
            accepting: r.accepting,
          });
        }
      }
    }
  }

  if (prescriptions.length) {
    const rxcuis = prescriptions.map((d) => d.rxcui.replace(/\D/g, ''));
    for (const planChunk of chunk(planIds, PLAN_BATCH)) {
      for (const rxChunk of chunk(rxcuis, ITEM_BATCH)) {
        const ck = cacheKey({ t: 'drug_cov', year, p: planChunk, d: rxChunk });
        const cached = cacheGet<
          { plan_id: string; rxcui: string; coverage: string; generic_rxcui?: string }[]
        >(ck);
        let rows = cached;
        if (!rows) {
          const qs = new URLSearchParams({
            year: String(year),
            drugs: rxChunk.join(','),
            planids: planChunk.join(','),
          });
          const res = await marketplaceGet(withKey(`/drugs/covered?${qs.toString()}`));
          if (!res.ok) {
            lastError = res.body;
            continue;
          }
          anyDrugOk = true;
          const list = extractList(res.json, [
            'drugs',
            'coverage',
            'data',
            'Provider & Drug Coverage',
          ]);
          rows = list
            .map((row) => {
              if (!row || typeof row !== 'object') return null;
              const o = row as Record<string, unknown>;
              const plan_id = String(o.plan_id ?? o.planId ?? o.planid ?? '');
              const rxcui = String(o.rxcui ?? o.drug ?? o.id ?? '').replace(/\D/g, '');
              const coverage = String(o.coverage ?? o.status ?? '');
              if (!plan_id || !rxcui) return null;
              return {
                plan_id,
                rxcui,
                coverage,
                generic_rxcui:
                  o.generic_rxcui != null ? String(o.generic_rxcui) : undefined,
              };
            })
            .filter(Boolean) as {
            plan_id: string;
            rxcui: string;
            coverage: string;
            generic_rxcui?: string;
          }[];
          cacheSet(ck, rows, 10 * 60 * 1000);
        } else {
          anyDrugOk = true;
        }
        for (const r of rows) {
          if (!drugMap.has(r.plan_id)) drugMap.set(r.plan_id, new Map());
          drugMap.get(r.plan_id)!.set(r.rxcui, {
            coverage: r.coverage,
            generic_rxcui: r.generic_rxcui,
          });
        }
      }
    }
  }

  const byPlan: Record<string, PlanCoverageSummary> = {};

  for (const planId of planIds) {
    const pMap = providerMap.get(planId);
    const dMap = drugMap.get(planId);

    const doctorItems: ItemPlanCoverage[] = doctors.map((doc) => {
      const npi = doc.npi.replace(/\D/g, '');
      const hit = pMap?.get(npi);
      if (!hit) {
        // No row for this pair: unknown if API partially failed, or data not provided
        const status: CoverageMatchStatus =
          anyProviderOk ? 'unknown' : 'insufficient_data';
        return {
          itemSessionId: doc.sessionId,
          itemKey: npi,
          label: doc.name,
          status,
          cmsCoverage: null,
          notes: anyProviderOk
            ? 'No CMS coverage row for this plan/provider pair'
            : lastError
              ? `CMS provider coverage lookup failed (${lastError.slice(0, 80)})`
              : 'CMS provider coverage unavailable',
        };
      }
      const status = mapCmsCoverage(hit.coverage);
      return {
        itemSessionId: doc.sessionId,
        itemKey: npi,
        label: doc.name,
        status,
        cmsCoverage: hit.coverage || null,
        accepting: hit.accepting || null,
        notes:
          status === 'reported'
            ? 'Reported in-network in Marketplace provider data'
            : status === 'not_reported'
              ? 'Not reported as covered for this plan'
              : 'CMS data not provided / unknown',
      };
    });

    const drugItems: ItemPlanCoverage[] = prescriptions.map((rx) => {
      const rxcui = rx.rxcui.replace(/\D/g, '');
      const hit = dMap?.get(rxcui);
      if (!hit) {
        const status: CoverageMatchStatus = anyDrugOk ? 'unknown' : 'insufficient_data';
        return {
          itemSessionId: rx.sessionId,
          itemKey: rxcui,
          label: rx.name,
          status,
          cmsCoverage: null,
          notes: anyDrugOk
            ? 'No CMS formulary row for this plan/drug pair'
            : lastError
              ? `CMS drug coverage lookup failed (${lastError.slice(0, 80)})`
              : 'CMS drug coverage unavailable',
        };
      }
      const status = mapCmsCoverage(hit.coverage);
      let notes =
        status === 'reported'
          ? 'Reported covered on Marketplace formulary data'
          : status === 'generic_reported'
            ? 'Generic equivalent reported covered (not brand-specific guarantee)'
            : status === 'not_reported'
              ? 'Not reported as covered for this plan'
              : 'CMS data not provided / unknown';
      if (hit.generic_rxcui && status === 'generic_reported') {
        notes += ` · generic RxCUI ${hit.generic_rxcui}`;
      }
      return {
        itemSessionId: rx.sessionId,
        itemKey: rxcui,
        label: rx.name,
        status,
        cmsCoverage: hit.coverage || null,
        notes,
      };
    });

    const d = tally(doctorItems);
    const r = tally(drugItems);
    const ex = explainable(d, r);
    byPlan[planId] = {
      planId,
      doctors: { ...d, items: doctorItems },
      prescriptions: { ...r, items: drugItems },
      explainableMatchRatio: ex.ratio,
      explainableMatchLabel: ex.label,
    };
  }

  const partial =
    (doctors.length > 0 && !anyProviderOk) || (prescriptions.length > 0 && !anyDrugOk);

  return {
    ok: !partial || Object.keys(byPlan).length > 0,
    year,
    retrievedAt,
    sourceSystem: 'cms_marketplace_api',
    apiConfigured: true,
    byPlan,
    errorCode: partial ? 'partial_failure' : undefined,
    errorMessage: partial
      ? `Some CMS coverage endpoints failed (${lastError.slice(0, 120) || 'upstream'}). Affected items show insufficient data — nothing invented.`
      : undefined,
    limitations,
  };
}
