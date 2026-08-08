'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookmarkPlus,
  Check,
  ExternalLink,
  Filter,
  Info,
  Loader2,
  Pill,
  Search,
  Stethoscope,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SaveCalculatorButton } from '@/components/my-insurance/save-calculator-button';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';
import {
  buildCostEstimatesForPlans,
  CARE_SCENARIO_META,
  DEFAULT_CUSTOM_CARE,
  findLowestPremiumPlanId,
  findLowestYearlyCostPlanId,
  mapCustomToCmsUtilization,
  scenarioToCmsUtilization,
} from '@/lib/marketplace/annual-cost';
import type {
  CareScenarioId,
  CoverageMatchResult,
  CoverageMatchStatus,
  CustomCareInputs,
  DrugSearchHit,
  MarketplacePlanCard,
  MarketplaceSearchResult,
  MetalLevel,
  PlanAnnualCostEstimate,
  PlanCoverageSummary,
  PlanSortKey,
  PlanTypeCode,
  ProviderSearchHit,
  SessionDoctor,
  SessionPrescription,
} from '@/lib/marketplace/types';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';
import { cn } from '@/lib/utils';

type PersonRow = { age: string; tobacco: boolean };

const METALS: MetalLevel[] = ['Catastrophic', 'Bronze', 'Silver', 'Gold', 'Platinum'];
const TYPES: PlanTypeCode[] = ['HMO', 'PPO', 'EPO', 'POS', 'Other', 'Unknown'];

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}

function sid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function statusLabel(status: CoverageMatchStatus, kind: 'doctor' | 'rx'): string {
  switch (status) {
    case 'reported':
      return kind === 'doctor' ? 'Reported in-network' : 'Reported covered';
    case 'generic_reported':
      return 'Generic reported covered';
    case 'not_reported':
      return kind === 'doctor' ? 'Not reported in-network' : 'Not reported covered';
    case 'insufficient_data':
      return 'Insufficient data';
    default:
      return 'Unknown / not provided';
  }
}

function statusClass(status: CoverageMatchStatus): string {
  switch (status) {
    case 'reported':
    case 'generic_reported':
      return 'bg-emerald-50 text-emerald-900 border-emerald-200';
    case 'not_reported':
      return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'insufficient_data':
      return 'bg-amber-50 text-amber-950 border-amber-200';
    default:
      return 'bg-sky-50 text-sky-950 border-sky-200';
  }
}

export function AcaPlanExplorer() {
  const [zip, setZip] = useState('');
  const [year, setYear] = useState(String(MARKETPLACE_PLAN_YEAR_DEFAULT));
  const [income, setIncome] = useState('');
  const [people, setPeople] = useState<PersonRow[]>([{ age: '35', tobacco: false }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketplaceSearchResult | null>(null);
  const [sort, setSort] = useState<PlanSortKey>('estimated_premium');
  const [metals, setMetals] = useState<MetalLevel[]>([]);
  const [planTypes, setPlanTypes] = useState<PlanTypeCode[]>([]);
  const [hsaOnly, setHsaOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<MarketplacePlanCard | null>(null);

  // Phase 8 session lists
  const [doctors, setDoctors] = useState<SessionDoctor[]>([]);
  const [prescriptions, setPrescriptions] = useState<SessionPrescription[]>([]);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [doctorNpiManual, setDoctorNpiManual] = useState('');
  const [doctorHits, setDoctorHits] = useState<ProviderSearchHit[]>([]);
  const [doctorSearchLoading, setDoctorSearchLoading] = useState(false);
  const [doctorSearchError, setDoctorSearchError] = useState<string | null>(null);

  const [rxQuery, setRxQuery] = useState('');
  const [rxHits, setRxHits] = useState<DrugSearchHit[]>([]);
  const [rxSearchLoading, setRxSearchLoading] = useState(false);
  const [rxSearchError, setRxSearchError] = useState<string | null>(null);

  const [coverage, setCoverage] = useState<CoverageMatchResult | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const matchGen = useRef(0);

  // Phase 9 — care usage scenario for CMS OOPC / yearly cost
  const [scenario, setScenario] = useState<CareScenarioId>('none');
  const [customCare, setCustomCare] = useState<CustomCareInputs>(DEFAULT_CUSTOM_CARE);

  const runSearch = useCallback(
    async (opts?: { scenario?: CareScenarioId; custom?: CustomCareInputs }) => {
      const sc = opts?.scenario ?? scenario;
      const custom = opts?.custom ?? customCare;
      const utilization = scenarioToCmsUtilization(sc, custom);
      setLoading(true);
      setDetail(null);
      setCoverage(null);
      try {
        const res = await fetch('/api/marketplace/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zip,
            year: Number(year) || MARKETPLACE_PLAN_YEAR_DEFAULT,
            householdIncome: income ? Number(income) : null,
            people: people.map((p) => ({
              age: Number(p.age) || 0,
              usesTobacco: p.tobacco,
            })),
            utilization,
          }),
        });
        const data = (await res.json()) as MarketplaceSearchResult;
        setResult(data);
      } catch {
        setResult({
          ok: false,
          plans: [],
          provenance: {
            sourceSystem: 'unavailable',
            planYear: Number(year) || MARKETPLACE_PLAN_YEAR_DEFAULT,
            retrievedAt: new Date().toISOString(),
            apiConfigured: false,
          },
          locationLabel: null,
          errorCode: 'api_error',
          errorMessage: 'Network error reaching plan search. Try again.',
        });
      } finally {
        setLoading(false);
      }
    },
    [zip, year, income, people, scenario, customCare]
  );

  const runCoverageMatch = useCallback(
    async (planIds: string[], docs: SessionDoctor[], rxs: SessionPrescription[]) => {
      if (!planIds.length || (!docs.length && !rxs.length)) {
        setCoverage(null);
        return;
      }
      const gen = ++matchGen.current;
      setCoverageLoading(true);
      try {
        const res = await fetch('/api/marketplace/coverage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: Number(year) || MARKETPLACE_PLAN_YEAR_DEFAULT,
            planIds,
            doctors: docs,
            prescriptions: rxs,
          }),
        });
        const data = (await res.json()) as CoverageMatchResult;
        if (gen !== matchGen.current) return;
        setCoverage(data);
        if (docs.length) trackMarketplaceEvent('doctor_match_run', { count: docs.length });
        if (rxs.length) trackMarketplaceEvent('prescription_match_run', { count: rxs.length });
      } catch {
        if (gen !== matchGen.current) return;
        setCoverage({
          ok: false,
          year: Number(year) || MARKETPLACE_PLAN_YEAR_DEFAULT,
          retrievedAt: new Date().toISOString(),
          sourceSystem: 'unavailable',
          apiConfigured: false,
          byPlan: {},
          errorCode: 'api_error',
          errorMessage: 'Coverage match request failed. No invented matches.',
          limitations: [
            'Network or server error — match states unavailable. Confirm on HealthCare.gov.',
          ],
        });
      } finally {
        if (gen === matchGen.current) setCoverageLoading(false);
      }
    },
    [year]
  );

  // Re-run coverage when plans or session lists change
  useEffect(() => {
    if (!result?.ok || !result.plans.length) return;
    if (!doctors.length && !prescriptions.length) {
      setCoverage(null);
      return;
    }
    const planIds = result.plans.map((p) => p.id);
    const t = setTimeout(() => {
      void runCoverageMatch(planIds, doctors, prescriptions);
    }, 350);
    return () => clearTimeout(t);
  }, [result, doctors, prescriptions, runCoverageMatch]);

  const searchDoctors = useCallback(async () => {
    setDoctorSearchLoading(true);
    setDoctorSearchError(null);
    setDoctorHits([]);
    try {
      const res = await fetch('/api/marketplace/providers/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: doctorQuery,
          zip: zip || result?.provenance?.zip,
          year: Number(year) || MARKETPLACE_PLAN_YEAR_DEFAULT,
          specialty: doctorSpecialty || null,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        hits: ProviderSearchHit[];
        errorMessage?: string;
      };
      if (!data.ok) {
        setDoctorSearchError(data.errorMessage || 'Provider search failed');
        return;
      }
      setDoctorHits(data.hits || []);
      if (!(data.hits || []).length) {
        setDoctorSearchError(
          'No CMS Marketplace providers matched. Try another spelling, specialty, or enter NPI directly.'
        );
      }
    } catch {
      setDoctorSearchError('Network error searching providers. No invented results.');
    } finally {
      setDoctorSearchLoading(false);
    }
  }, [doctorQuery, doctorSpecialty, zip, year, result?.provenance?.zip]);

  const searchDrugs = useCallback(async () => {
    setRxSearchLoading(true);
    setRxSearchError(null);
    setRxHits([]);
    try {
      const res = await fetch('/api/marketplace/drugs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: rxQuery,
          year: Number(year) || MARKETPLACE_PLAN_YEAR_DEFAULT,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        hits: DrugSearchHit[];
        errorMessage?: string;
      };
      if (!data.ok) {
        setRxSearchError(data.errorMessage || 'Drug search failed');
        return;
      }
      setRxHits(data.hits || []);
      if (!(data.hits || []).length) {
        setRxSearchError('No CMS drug matches. Try a shorter name or alternate spelling.');
      }
    } catch {
      setRxSearchError('Network error searching drugs. No invented results.');
    } finally {
      setRxSearchLoading(false);
    }
  }, [rxQuery, year]);

  function addDoctor(hit: ProviderSearchHit) {
    if (doctors.some((d) => d.npi === hit.npi)) return;
    if (doctors.length >= 8) return;
    const next: SessionDoctor = {
      sessionId: sid('doc'),
      npi: hit.npi,
      name: hit.name,
      specialty: hit.specialties[0] || null,
      providerType:
        hit.providerType === 'Individual' ||
        hit.providerType === 'Facility' ||
        hit.providerType === 'Group'
          ? hit.providerType
          : null,
      distanceMiles: hit.distanceMiles,
    };
    setDoctors((prev) => [...prev, next]);
    trackMarketplaceEvent('doctor_added', { npi: hit.npi });
    setDoctorHits([]);
    setDoctorQuery('');
  }

  function addDoctorByNpi() {
    const npi = doctorNpiManual.replace(/\D/g, '');
    if (npi.length !== 10) return;
    if (doctors.some((d) => d.npi === npi)) return;
    if (doctors.length >= 8) return;
    setDoctors((prev) => [
      ...prev,
      {
        sessionId: sid('doc'),
        npi,
        name: doctorQuery.trim() || `Provider NPI ${npi}`,
        specialty: doctorSpecialty || null,
      },
    ]);
    trackMarketplaceEvent('doctor_added', { npi, manual: true });
    setDoctorNpiManual('');
  }

  function addDrug(hit: DrugSearchHit) {
    if (prescriptions.some((d) => d.rxcui === hit.rxcui)) return;
    if (prescriptions.length >= 10) return;
    setPrescriptions((prev) => [
      ...prev,
      {
        sessionId: sid('rx'),
        rxcui: hit.rxcui,
        name: hit.fullName || hit.name,
        strength: hit.strength,
        route: hit.route,
        fullName: hit.fullName,
      },
    ]);
    trackMarketplaceEvent('prescription_added', { rxcui: hit.rxcui });
    setRxHits([]);
    setRxQuery('');
  }

  const costByPlan = useMemo(() => {
    if (!result?.plans?.length) return {} as Record<string, PlanAnnualCostEstimate>;
    return buildCostEstimatesForPlans({
      plans: result.plans,
      scenario,
      custom: customCare,
      planYear: result.provenance.planYear,
      retrievedAt: result.provenance.retrievedAt,
    });
  }, [result, scenario, customCare]);

  const filtered = useMemo(() => {
    if (!result?.plans?.length) return [];
    let list = [...result.plans];
    if (metals.length) list = list.filter((p) => metals.includes(p.metalLevel));
    if (planTypes.length) list = list.filter((p) => planTypes.includes(p.planType));
    if (hsaOnly) list = list.filter((p) => p.hsaEligible === true);

    const covRatio = (p: MarketplacePlanCard): number => {
      const s = coverage?.byPlan?.[p.id];
      if (!s || s.explainableMatchRatio == null) return -1;
      return s.explainableMatchRatio;
    };

    const yearly = (p: MarketplacePlanCard): number => {
      const e = costByPlan[p.id];
      if (!e?.available || e.estimatedTotalAnnual == null) return 1e12;
      return e.estimatedTotalAnnual;
    };

    const val = (p: MarketplacePlanCard): number => {
      if (
        sort === 'name' ||
        sort === 'metal' ||
        sort === 'coverage_match' ||
        sort === 'yearly_cost'
      )
        return 0;
      if (sort === 'estimated_premium')
        return p.estimatedPremiumAfterCreditMonthly ?? p.premiumMonthly ?? 1e12;
      if (sort === 'full_premium') return p.premiumMonthly ?? 1e12;
      if (sort === 'deductible') return p.deductibleIndividual ?? 1e12;
      if (sort === 'moop') return p.moopIndividual ?? 1e12;
      return 0;
    };

    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'metal') return a.metalLevel.localeCompare(b.metalLevel);
      if (sort === 'coverage_match') {
        return covRatio(b) - covRatio(a);
      }
      if (sort === 'yearly_cost') {
        return yearly(a) - yearly(b);
      }
      return val(a) - val(b);
    });
    return list;
  }, [result, metals, planTypes, hsaOnly, sort, coverage, costByPlan]);

  const lowestPremiumId = useMemo(() => findLowestPremiumPlanId(filtered), [filtered]);
  const lowestYearlyId = useMemo(() => {
    const subset: Record<string, PlanAnnualCostEstimate> = {};
    for (const p of filtered) {
      if (costByPlan[p.id]) subset[p.id] = costByPlan[p.id]!;
    }
    return findLowestYearlyCostPlanId(subset);
  }, [filtered, costByPlan]);

  function toggleMetal(m: MetalLevel) {
    setMetals((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  function toggleType(t: PlanTypeCode) {
    setPlanTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      const next = [...prev, id];
      if (scenario !== 'none' && next.length >= 2) {
        trackMarketplaceEvent('compare_with_yearly_cost', {
          count: next.length,
          scenario,
        });
      }
      return next;
    });
  }

  function openDetail(plan: MarketplacePlanCard) {
    setDetail(plan);
    if (doctors.length || prescriptions.length) {
      trackMarketplaceEvent('plan_detail_with_match', { planId: plan.id });
    }
    if (scenario !== 'none' && costByPlan[plan.id]) {
      trackMarketplaceEvent('plan_detail_with_cost', {
        planId: plan.id,
        scenario,
        available: costByPlan[plan.id]?.available ?? false,
      });
    }
  }

  function applyScenario(next: CareScenarioId) {
    setScenario(next);
    trackMarketplaceEvent('scenario_selected', { scenario: next });
    if (next === 'custom') {
      trackMarketplaceEvent('custom_scenario_used', {
        ...mapCustomToCmsUtilization(customCare),
      });
    }
    if (next === 'none') {
      if (sort === 'yearly_cost') setSort('estimated_premium');
      return;
    }
    // Re-search with CMS utilization so plan oopc is calculated
    if (zip.length === 5) {
      void runSearch({ scenario: next, custom: customCare });
    }
  }

  function onSortChange(next: PlanSortKey) {
    setSort(next);
    if (next === 'yearly_cost') {
      trackMarketplaceEvent('sort_by_yearly_cost', { scenario });
      if (scenario === 'none') {
        applyScenario('moderate');
      }
    }
  }

  const comparePlans = filtered.filter((p) => compareIds.includes(p.id));
  const hasSessionLists = doctors.length > 0 || prescriptions.length > 0;
  const activeZip = zip.length === 5 ? zip : result?.provenance?.zip || '';

  function planSignals(planId: string): PlanCoverageSummary | null {
    return coverage?.byPlan?.[planId] ?? null;
  }

  return (
    <div className="space-y-8">
      {/* Trust framing */}
      <div className="rounded-xl border border-[#0284C7]/25 bg-[#E0F2FE]/40 px-4 py-3 text-sm text-[#0A2540]">
        <p className="font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" aria-hidden />
          Research only — not enrollment, not a quote marketplace
        </p>
        <p className="mt-1 text-[#1E293B] leading-relaxed">
          No lead form required. Plan facts, doctor/drug match signals, and CMS expected out-of-pocket
          (when a care scenario is selected) come from Marketplace data when configured. Unknown and
          unavailable stay honest — never treated as $0. Estimated premiums after credit are
          educational. The cheapest premium is often not the cheapest plan. Confirm on HealthCare.gov
          before enrolling. No paid placements in ranking.
        </p>
      </div>

      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Household &amp; location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="zip">ZIP code *</Label>
              <Input
                id="zip"
                className="mt-1.5"
                inputMode="numeric"
                maxLength={5}
                placeholder="33101"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              />
            </div>
            <div>
              <Label htmlFor="year">Coverage year</Label>
              <Select
                id="year"
                className="mt-1.5"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="income">Household income (MAGI estimate)</Label>
              <Input
                id="income"
                className="mt-1.5"
                inputMode="numeric"
                placeholder="Optional — for credit context"
                value={income}
                onChange={(e) => setIncome(e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>People on the plan (ages)</Label>
            {people.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3">
                <Input
                  className="w-24"
                  inputMode="numeric"
                  aria-label={`Person ${i + 1} age`}
                  value={p.age}
                  onChange={(e) => {
                    const next = [...people];
                    next[i] = { ...p, age: e.target.value.replace(/\D/g, '').slice(0, 3) };
                    setPeople(next);
                  }}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`tob-${i}`}
                    checked={p.tobacco}
                    onCheckedChange={(c) => {
                      const next = [...people];
                      next[i] = { ...p, tobacco: c === true };
                      setPeople(next);
                    }}
                  />
                  <Label htmlFor={`tob-${i}`} className="text-xs font-normal cursor-pointer">
                    Tobacco (if used by marketplace rating)
                  </Label>
                </div>
                {people.length > 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPeople(people.filter((_, j) => j !== i))}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            ))}
            {people.length < 6 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPeople([...people, { age: '10', tobacco: false }])}
              >
                Add person
              </Button>
            ) : null}
          </div>

          <Button
            type="button"
            className="gap-2 min-h-11"
            disabled={loading || zip.length !== 5}
            onClick={() => void runSearch()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Research Marketplace plans
          </Button>
        </CardContent>
      </Card>

      {/* Phase 9: care-usage scenario */}
      <Card id="yearly-cost">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Care-usage scenario (yearly cost)</CardTitle>
          <p className="text-xs text-muted-foreground font-normal leading-relaxed">
            This estimate helps compare plans under a scenario. It is not a promise of your real
            annual cost. When selected, we request CMS expected out-of-pocket (OOPC) using
            utilization Low / Medium / High — we do not invent care dollars when CMS omits them.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['none', 'Off'],
                ['low', 'Low use'],
                ['moderate', 'Moderate use'],
                ['higher', 'Higher use'],
                ['custom', 'Custom'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => applyScenario(id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium min-h-9',
                  scenario === id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted'
                )}
              >
                {label}
              </button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-9"
              disabled={loading || zip.length !== 5}
              onClick={() => {
                if (scenario === 'none') applyScenario('moderate');
                else onSortChange('yearly_cost');
              }}
            >
              Compare by estimated yearly cost
            </Button>
          </div>
          {scenario !== 'none' && scenario !== 'custom' ? (
            <p className="text-xs text-muted-foreground">
              {CARE_SCENARIO_META[scenario].blurb}
            </p>
          ) : null}
          {scenario === 'custom' ? (
            <div className="grid sm:grid-cols-3 gap-3 rounded-lg border p-3">
              {(
                [
                  ['primaryCareVisits', 'Primary care visits / yr'],
                  ['specialistVisits', 'Specialist visits / yr'],
                  ['erVisits', 'ER visits / yr'],
                  ['genericRxMonths', 'Generic Rx months / yr'],
                  ['brandRxMonths', 'Brand Rx months / yr'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    className="mt-1 h-9"
                    inputMode="numeric"
                    value={String(customCare[key])}
                    onChange={(e) => {
                      const n = Math.max(0, Math.min(36, Number(e.target.value.replace(/\D/g, '')) || 0));
                      setCustomCare((c) => ({ ...c, [key]: n }));
                    }}
                  />
                </div>
              ))}
              <div className="flex items-end gap-2 sm:col-span-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="imaging"
                    checked={customCare.imagingOrProcedure}
                    onCheckedChange={(c) =>
                      setCustomCare((prev) => ({
                        ...prev,
                        imagingOrProcedure: c === true,
                      }))
                    }
                  />
                  <Label htmlFor="imaging" className="text-xs font-normal cursor-pointer">
                    Imaging / procedure likely this year
                  </Label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto"
                  disabled={loading || zip.length !== 5}
                  onClick={() => {
                    trackMarketplaceEvent('custom_scenario_used', {
                      ...mapCustomToCmsUtilization(customCare),
                    });
                    void runSearch({ scenario: 'custom', custom: customCare });
                  }}
                >
                  Apply custom → refresh CMS OOPC
                </Button>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-3">
                {mapCustomToCmsUtilization(customCare).note}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Phase 8: doctors + prescriptions (usable after ZIP known; signals need plan results) */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card id="doctors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-[#0284C7]" aria-hidden />
              Your doctors / facilities
            </CardTitle>
            <p className="text-xs text-muted-foreground font-normal leading-relaxed">
              Marketplace-reported network signals only. Not a guarantee of acceptance or coverage
              at time of care.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Doctor or facility name"
                value={doctorQuery}
                onChange={(e) => setDoctorQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void searchDoctors();
                  }
                }}
              />
              <Input
                placeholder="Optional specialty"
                value={doctorSpecialty}
                onChange={(e) => setDoctorSpecialty(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={
                    doctorSearchLoading ||
                    doctorQuery.trim().length < 2 ||
                    activeZip.length !== 5
                  }
                  onClick={() => void searchDoctors()}
                >
                  {doctorSearchLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  Search CMS providers
                </Button>
              </div>
              {activeZip.length !== 5 ? (
                <p className="text-xs text-amber-800">
                  Enter a ZIP above first — provider search uses your market context.
                </p>
              ) : null}
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[8rem]">
                  <Label className="text-xs">Or add by NPI</Label>
                  <Input
                    className="mt-1"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit NPI"
                    value={doctorNpiManual}
                    onChange={(e) =>
                      setDoctorNpiManual(e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={doctorNpiManual.replace(/\D/g, '').length !== 10}
                  onClick={addDoctorByNpi}
                >
                  Add NPI
                </Button>
              </div>
            </div>
            {doctorSearchError ? (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                {doctorSearchError}
              </p>
            ) : null}
            {doctorHits.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto border rounded-md divide-y text-sm">
                {doctorHits.map((h) => (
                  <li key={h.npi}>
                    <button
                      type="button"
                      className="w-full text-left px-2 py-2 hover:bg-muted/60"
                      onClick={() => addDoctor(h)}
                    >
                      <span className="font-medium">{h.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        NPI {h.npi}
                        {h.specialties[0] ? ` · ${h.specialties[0]}` : ''}
                        {h.distanceMiles != null
                          ? ` · ~${h.distanceMiles.toFixed(1)} mi`
                          : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {doctors.length > 0 ? (
              <ul className="space-y-1.5">
                {doctors.map((d) => (
                  <li
                    key={d.sessionId}
                    className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
                  >
                    <div>
                      <p className="font-medium leading-snug">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        NPI {d.npi}
                        {d.specialty ? ` · ${d.specialty}` : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${d.name}`}
                      onClick={() =>
                        setDoctors((prev) => prev.filter((x) => x.sessionId !== d.sessionId))
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Optional — explorer works with zero doctors. Add some to update plan cards.
              </p>
            )}
          </CardContent>
        </Card>

        <Card id="prescriptions">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-[#0284C7]" aria-hidden />
              Your prescriptions
            </CardTitle>
            <p className="text-xs text-muted-foreground font-normal leading-relaxed">
              Formulary signals from CMS only. Confirm on plan formulary / issuer materials before
              relying on a result. Tier / PA only if CMS provides them (often not).
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Medication name"
                value={rxQuery}
                onChange={(e) => setRxQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void searchDrugs();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1 w-fit"
                disabled={rxSearchLoading || rxQuery.trim().length < 2}
                onClick={() => void searchDrugs()}
              >
                {rxSearchLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                Search CMS drugs
              </Button>
            </div>
            {rxSearchError ? (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                {rxSearchError}
              </p>
            ) : null}
            {rxHits.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto border rounded-md divide-y text-sm">
                {rxHits.map((h) => (
                  <li key={h.rxcui}>
                    <button
                      type="button"
                      className="w-full text-left px-2 py-2 hover:bg-muted/60"
                      onClick={() => addDrug(h)}
                    >
                      <span className="font-medium">{h.fullName || h.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        RxCUI {h.rxcui}
                        {h.strength ? ` · ${h.strength}` : ''}
                        {h.route ? ` · ${h.route}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {prescriptions.length > 0 ? (
              <ul className="space-y-1.5">
                {prescriptions.map((d) => (
                  <li
                    key={d.sessionId}
                    className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
                  >
                    <div>
                      <p className="font-medium leading-snug">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        RxCUI {d.rxcui}
                        {d.strength ? ` · ${d.strength}` : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${d.name}`}
                      onClick={() =>
                        setPrescriptions((prev) =>
                          prev.filter((x) => x.sessionId !== d.sessionId)
                        )
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Optional — explorer works with zero meds. Add some to update plan cards.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {hasSessionLists && coverageLoading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Matching doctors and prescriptions against candidate plans (CMS)…
        </p>
      ) : null}
      {coverage?.errorMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
          {coverage.errorMessage}
        </div>
      ) : null}

      {/* Results */}
      {result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                {result.ok
                  ? `${filtered.length} plan${filtered.length === 1 ? '' : 's'}`
                  : 'No plan list available'}
              </h2>
              {result.locationLabel ? (
                <p className="text-sm text-muted-foreground mt-0.5">{result.locationLabel}</p>
              ) : null}
              {result.provenance ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Source:{' '}
                  {result.provenance.sourceSystem === 'cms_marketplace_api'
                    ? 'CMS Marketplace API'
                    : 'unavailable'}{' '}
                  · Plan year {result.provenance.planYear}
                  {result.provenance.retrievedAt
                    ? ` · Retrieved ${new Date(result.provenance.retrievedAt).toLocaleString()}`
                    : ''}
                  {coverage?.retrievedAt
                    ? ` · Coverage match ${new Date(coverage.retrievedAt).toLocaleString()}`
                    : ''}
                </p>
              ) : null}
            </div>
            {result.ok && filtered.length > 0 ? (
              <SaveCalculatorButton
                calculatorId="aca_plan_explorer"
                title="ACA Plan Explorer snapshot"
                size="sm"
                onSaved={() => {
                  if (hasSessionLists) {
                    trackMarketplaceEvent('save_doctors_drugs_workspace', {
                      doctors: doctors.length,
                      prescriptions: prescriptions.length,
                    });
                  }
                }}
                snapshot={{
                  summaryText: `${filtered.length} plans · ${result.locationLabel || zip} · year ${result.provenance.planYear}${
                    hasSessionLists
                      ? ` · ${doctors.length} doctors · ${prescriptions.length} meds`
                      : ''
                  }`,
                  sourcePath: '/tools/aca-plan-explorer',
                  inputs: {
                    zip,
                    year,
                    income,
                    people,
                    doctors: doctors.map((d) => ({
                      npi: d.npi,
                      name: d.name,
                      specialty: d.specialty,
                    })),
                    prescriptions: prescriptions.map((d) => ({
                      rxcui: d.rxcui,
                      name: d.name,
                      strength: d.strength,
                    })),
                  },
                  outputs: {
                    planCount: filtered.length,
                    provenance: result.provenance,
                    planIds: filtered.slice(0, 20).map((p) => p.id),
                    coverageRetrievedAt: coverage?.retrievedAt ?? null,
                  },
                }}
              />
            ) : null}
          </div>

          {result.creditContext ? (
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {result.creditContext.note}
              {result.creditContext.estimatedMonthlyCredit != null ? (
                <span className="block mt-1 font-medium text-foreground">
                  Educational monthly credit context ≈ $
                  {result.creditContext.estimatedMonthlyCredit.toLocaleString()}
                </span>
              ) : null}
            </div>
          ) : null}

          {!result.ok ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950 flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">{result.errorMessage || 'Unable to load plans'}</p>
                <p className="mt-2">
                  <a
                    href="https://www.healthcare.gov/see-plans/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[#0284C7] hover:underline"
                    onClick={() =>
                      trackMarketplaceEvent('confirm_official_source_click', {
                        target: 'healthcare_gov',
                      })
                    }
                  >
                    Open HealthCare.gov Window Shopping
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
                <div>
                  <Label className="text-xs">Sort</Label>
                  <Select
                    className="mt-0.5 h-9"
                    value={sort}
                    onChange={(e) => onSortChange(e.target.value as PlanSortKey)}
                  >
                    <option value="estimated_premium">Est. premium after credit</option>
                    <option value="yearly_cost">Estimated yearly cost</option>
                    <option value="full_premium">Full premium</option>
                    <option value="deductible">Deductible</option>
                    <option value="moop">Max out-of-pocket</option>
                    <option value="coverage_match">
                      Coverage match (reported only; unknown excluded)
                    </option>
                    <option value="name">Plan name</option>
                    <option value="metal">Metal level</option>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-muted-foreground w-full sm:w-auto">Metal:</span>
                  {METALS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMetal(m)}
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                        metals.includes(m)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-muted-foreground w-full sm:w-auto">Type:</span>
                  {TYPES.filter((t) => t !== 'Unknown').map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleType(t)}
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                        planTypes.includes(t)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hsa"
                    checked={hsaOnly}
                    onCheckedChange={(c) => setHsaOnly(c === true)}
                  />
                  <Label htmlFor="hsa" className="text-xs font-normal cursor-pointer">
                    HSA eligible only
                  </Label>
                </div>
              </div>

              {hasSessionLists ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Plan cards show <strong className="text-foreground">reported</strong> CMS matches
                  only. Unknown / data-not-provided stays visible and is excluded from the optional
                  match ratio sort.
                </p>
              ) : null}

              {comparePlans.length > 0 ? (
                <div className="rounded-xl border p-3 overflow-x-auto">
                  <p className="text-sm font-semibold mb-2">
                    Compare ({comparePlans.length}/3)
                    {scenario !== 'none' ? (
                      <span className="font-normal text-muted-foreground">
                        {' '}
                        · scenario: {costByPlan[comparePlans[0]?.id ?? '']?.scenarioName ?? scenario}
                      </span>
                    ) : null}
                  </p>
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1 pr-2">Field</th>
                        {comparePlans.map((p) => (
                          <th key={p.id} className="py-1 px-2 font-medium">
                            {p.name.slice(0, 28)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ['Issuer', (p: MarketplacePlanCard) => p.issuerName],
                          ['Metal', (p: MarketplacePlanCard) => p.metalLevel],
                          ['Type', (p: MarketplacePlanCard) => p.planType],
                          [
                            'Full premium/mo',
                            (p: MarketplacePlanCard) => money(p.premiumMonthly),
                          ],
                          [
                            'Est. after credit/mo',
                            (p: MarketplacePlanCard) =>
                              money(p.estimatedPremiumAfterCreditMonthly),
                          ],
                          [
                            'Est. yearly cost',
                            (p: MarketplacePlanCard) => {
                              const e = costByPlan[p.id];
                              if (scenario === 'none') return '— (pick scenario)';
                              if (!e?.available) return 'Unavailable';
                              return money(e.estimatedTotalAnnual);
                            },
                          ],
                          [
                            'Deductible',
                            (p: MarketplacePlanCard) => money(p.deductibleIndividual),
                          ],
                          ['MOOP', (p: MarketplacePlanCard) => money(p.moopIndividual)],
                          [
                            'HSA',
                            (p: MarketplacePlanCard) =>
                              p.hsaEligible == null ? '—' : p.hsaEligible ? 'Yes' : 'No',
                          ],
                          [
                            'Doctors reported',
                            (p: MarketplacePlanCard) => {
                              const s = planSignals(p.id);
                              if (!s || !s.doctors.total) return '—';
                              return `${s.doctors.reported}/${s.doctors.total} (unk ${s.doctors.unknown})`;
                            },
                          ],
                          [
                            'Rx reported',
                            (p: MarketplacePlanCard) => {
                              const s = planSignals(p.id);
                              if (!s || !s.prescriptions.total) return '—';
                              return `${s.prescriptions.reported}/${s.prescriptions.total} (unk ${s.prescriptions.unknown})`;
                            },
                          ],
                        ] as [string, (p: MarketplacePlanCard) => string][]
                      ).map(([label, fn]) => (
                        <tr key={label} className="border-b border-border/50">
                          <td className="py-1 pr-2 text-muted-foreground">{label}</td>
                          {comparePlans.map((p) => (
                            <td key={p.id} className="py-1 px-2">
                              {fn(p)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <ul className="space-y-3">
                {filtered.map((plan) => {
                  const sig = planSignals(plan.id);
                  const cost = costByPlan[plan.id];
                  return (
                    <li key={plan.id}>
                      <Card className="hover:border-primary/30 transition-colors">
                        <CardContent className="pt-5 pb-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap gap-1.5 mb-1.5">
                                <Badge variant="secondary">{plan.metalLevel}</Badge>
                                <Badge variant="outline">{plan.planType}</Badge>
                                {plan.hsaEligible ? (
                                  <Badge variant="outline">HSA</Badge>
                                ) : null}
                                {plan.qualityRating != null ? (
                                  <Badge variant="outline">
                                    Quality {plan.qualityRating}
                                  </Badge>
                                ) : null}
                                {lowestPremiumId === plan.id ? (
                                  <Badge variant="outline" className="border-amber-300 text-amber-950">
                                    Lowest premium
                                  </Badge>
                                ) : null}
                                {scenario !== 'none' &&
                                lowestYearlyId === plan.id &&
                                cost?.available ? (
                                  <Badge className="bg-emerald-700 hover:bg-emerald-700">
                                    Lowest est. yearly cost
                                  </Badge>
                                ) : null}
                              </div>
                              <h3 className="font-semibold text-base leading-snug">
                                {plan.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">{plan.issuerName}</p>
                              {sig && (sig.doctors.total > 0 || sig.prescriptions.total > 0) ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {sig.doctors.total > 0 ? (
                                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium bg-background">
                                      Doctors: {sig.doctors.reported}/{sig.doctors.total}{' '}
                                      reported
                                      {sig.doctors.unknown > 0
                                        ? ` · ${sig.doctors.unknown} unknown`
                                        : ''}
                                    </span>
                                  ) : null}
                                  {sig.prescriptions.total > 0 ? (
                                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium bg-background">
                                      Rx: {sig.prescriptions.reported}/{sig.prescriptions.total}{' '}
                                      reported
                                      {sig.prescriptions.unknown > 0
                                        ? ` · ${sig.prescriptions.unknown} unknown`
                                        : ''}
                                    </span>
                                  ) : null}
                                  {sig.explainableMatchLabel ? (
                                    <span className="inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-[11px] text-muted-foreground">
                                      {sig.explainableMatchLabel}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                              {scenario !== 'none' ? (
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Est. yearly cost
                                  </p>
                                  <p className="text-xl font-bold tabular-nums text-[#0A2540]">
                                    {cost?.available
                                      ? money(cost.estimatedTotalAnnual)
                                      : 'Unavailable'}
                                  </p>
                                  {!cost?.available && cost?.unavailableReason ? (
                                    <p className="text-[10px] text-muted-foreground max-w-[11rem] ml-auto leading-snug">
                                      Estimate unavailable (not $0)
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {plan.afterCreditIsEstimate
                                    ? 'Est. after credit / mo'
                                    : 'Premium after credit / mo'}
                                </p>
                                <p
                                  className={cn(
                                    'tabular-nums text-[#0A2540]',
                                    scenario !== 'none'
                                      ? 'text-base font-semibold'
                                      : 'text-xl font-bold'
                                  )}
                                >
                                  {money(
                                    plan.estimatedPremiumAfterCreditMonthly ?? plan.premiumMonthly
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Full: {money(plan.premiumMonthly)}
                                  {plan.premiumIsEstimate ? ' (est.)' : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <span>
                              Deductible:{' '}
                              <strong className="text-foreground">
                                {money(plan.deductibleIndividual)}
                              </strong>
                            </span>
                            <span>
                              Max OOP:{' '}
                              <strong className="text-foreground">
                                {money(plan.moopIndividual)}
                              </strong>
                            </span>
                            <span className="col-span-2 sm:col-span-1">
                              {scenario !== 'none' && cost?.available
                                ? `Scenario: ${cost.scenarioName}`
                                : 'Issuer-reported CMS fields when available'}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="trust"
                              onClick={() => openDetail(plan)}
                            >
                              Plan detail
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => toggleCompare(plan.id)}
                            >
                              {compareIds.includes(plan.id) ? (
                                <>
                                  <Check className="h-3.5 w-3.5" /> In compare
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="h-3.5 w-3.5" /> Compare
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No plans match your filters. Clear filters or adjust household inputs.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {/* Detail drawer */}
      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-detail-title"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-background shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-background px-4 py-3">
              <h2 id="plan-detail-title" className="font-semibold pr-2 leading-snug">
                {detail.name}
              </h2>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Close"
                onClick={() => setDetail(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="px-4 py-4 space-y-3 text-sm">
              <p className="text-muted-foreground">{detail.issuerName}</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge>{detail.metalLevel}</Badge>
                <Badge variant="outline">{detail.planType}</Badge>
              </div>
              <dl className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Full premium / mo</dt>
                  <dd className="font-semibold">{money(detail.premiumMonthly)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Est. after credit / mo</dt>
                  <dd className="font-semibold">
                    {money(detail.estimatedPremiumAfterCreditMonthly)}
                    {detail.afterCreditIsEstimate ? (
                      <span className="block text-xs font-normal text-muted-foreground">
                        Educational estimate
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Deductible (indiv.)</dt>
                  <dd className="font-semibold">{money(detail.deductibleIndividual)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Max OOP (indiv.)</dt>
                  <dd className="font-semibold">{money(detail.moopIndividual)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">HSA eligible</dt>
                  <dd className="font-semibold">
                    {detail.hsaEligible == null
                      ? 'Not listed'
                      : detail.hsaEligible
                        ? 'Yes'
                        : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">CMS quality signal</dt>
                  <dd className="font-semibold">
                    {detail.qualityRating != null ? detail.qualityRating : 'Not listed'}
                  </dd>
                </div>
              </dl>
              {detail.networkName ? (
                <p>
                  <span className="text-muted-foreground">Network: </span>
                  {detail.networkName}
                </p>
              ) : null}
              {detail.benefitsSummary ? (
                <p className="text-muted-foreground leading-relaxed">{detail.benefitsSummary}</p>
              ) : null}

              {/* Phase 9 yearly cost breakdown */}
              {(() => {
                const cost = costByPlan[detail.id];
                if (scenario === 'none' || !cost) {
                  return (
                    <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                      Select a care-usage scenario above to load CMS expected out-of-pocket and
                      estimated yearly cost for this plan.
                    </div>
                  );
                }
                return (
                  <div className="space-y-2 border-t pt-3">
                    <h3 className="font-semibold text-sm">Estimated yearly cost breakdown</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This estimate helps compare plans under a scenario. It is not a promise of
                      your real annual cost.
                    </p>
                    {cost.available ? (
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">Annual premium</dt>
                          <dd className="font-semibold">{money(cost.annualPremium)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">CMS expected care (OOPC)</dt>
                          <dd className="font-semibold">{money(cost.expectedCareCost)}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-xs text-muted-foreground">Estimated total annual</dt>
                          <dd className="text-lg font-bold tabular-nums">
                            {money(cost.estimatedTotalAnnual)}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm font-medium text-amber-950 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                        Estimate unavailable
                        {cost.unavailableReason ? ` — ${cost.unavailableReason}` : ''}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Method: {cost.methodLabel}
                      {cost.cmsUtilization ? ` · CMS utilization ${cost.cmsUtilization}` : ''}
                      {cost.planYear ? ` · Plan year ${cost.planYear}` : ''}
                      {cost.retrievedAt
                        ? ` · Retrieved ${new Date(cost.retrievedAt).toLocaleString()}`
                        : ''}
                      {cost.sourceSystem ? ` · Source ${cost.sourceSystem}` : ''}
                    </p>
                    <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                      {cost.assumptions.slice(0, 4).map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                      {cost.limitations.slice(0, 3).map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* Phase 8 detail sections */}
              {(() => {
                const sig = planSignals(detail.id);
                if (!sig || (!sig.doctors.total && !sig.prescriptions.total)) {
                  return hasSessionLists ? (
                    <p className="text-xs text-muted-foreground">
                      Coverage match not loaded for this plan yet
                      {coverageLoading ? ' (in progress)…' : '.'}
                    </p>
                  ) : null;
                }
                return (
                  <div className="space-y-3 border-t pt-3">
                    {sig.doctors.total > 0 ? (
                      <div>
                        <h3 className="font-semibold text-sm mb-1.5">Your doctors</h3>
                        <ul className="space-y-1.5">
                          {sig.doctors.items.map((it) => (
                            <li
                              key={it.itemSessionId}
                              className={cn(
                                'rounded-md border px-2 py-1.5 text-xs',
                                statusClass(it.status)
                              )}
                            >
                              <p className="font-medium">{it.label}</p>
                              <p>{statusLabel(it.status, 'doctor')}</p>
                              {it.accepting ? (
                                <p className="opacity-80">Accepting: {it.accepting}</p>
                              ) : null}
                              {it.notes ? <p className="opacity-80 mt-0.5">{it.notes}</p> : null}
                              {it.cmsCoverage ? (
                                <p className="opacity-70 mt-0.5">CMS: {it.cmsCoverage}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Source: CMS Marketplace provider coverage · Plan year{' '}
                          {coverage?.year ?? result?.provenance.planYear}
                          {coverage?.retrievedAt
                            ? ` · as of ${new Date(coverage.retrievedAt).toLocaleString()}`
                            : ''}
                        </p>
                      </div>
                    ) : null}
                    {sig.prescriptions.total > 0 ? (
                      <div>
                        <h3 className="font-semibold text-sm mb-1.5">Your prescriptions</h3>
                        <ul className="space-y-1.5">
                          {sig.prescriptions.items.map((it) => (
                            <li
                              key={it.itemSessionId}
                              className={cn(
                                'rounded-md border px-2 py-1.5 text-xs',
                                statusClass(it.status)
                              )}
                            >
                              <p className="font-medium">{it.label}</p>
                              <p>{statusLabel(it.status, 'rx')}</p>
                              {it.notes ? <p className="opacity-80 mt-0.5">{it.notes}</p> : null}
                              {it.cmsCoverage ? (
                                <p className="opacity-70 mt-0.5">CMS: {it.cmsCoverage}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Source: CMS Marketplace formulary coverage · Plan year{' '}
                          {coverage?.year ?? result?.provenance.planYear}
                          {coverage?.retrievedAt
                            ? ` · as of ${new Date(coverage.retrievedAt).toLocaleString()}`
                            : ''}
                        </p>
                      </div>
                    ) : null}
                    <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                      <p className="font-semibold text-foreground mb-1">What this does not mean</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>Not a guarantee of coverage or acceptance at time of care</li>
                        <li>Networks and formularies change</li>
                        <li>Always re-check issuer / Marketplace sources before decisions</li>
                        <li>Not medical, eligibility, or coverage advice</li>
                      </ul>
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                Research tool based on Marketplace-reported network and formulary data. Not an
                enrollment tool, tax advice, or guarantee of subsidy amounts.
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {detail.marketingUrl ? (
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <a
                      href={detail.marketingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        trackMarketplaceEvent('confirm_official_source_click', {
                          target: 'issuer_materials',
                        })
                      }
                    >
                      Issuer materials
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="trust" className="gap-1">
                  <a
                    href="https://www.healthcare.gov/see-plans/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackMarketplaceEvent('confirm_official_source_click', {
                        target: 'healthcare_gov',
                      })
                    }
                  >
                    Confirm on HealthCare.gov
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setDetail(null)}>
                  Back to results
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Limitations footer */}
      <div className="text-xs text-muted-foreground leading-relaxed border-t pt-4 space-y-1">
        <p>
          <strong className="text-foreground">You decide.</strong> Insurance Trust Hub does not sell
          policies, rank “best plans,” or require lead forms to research coverage.
        </p>
        <p>
          Doctor network and prescription signals are CMS Marketplace-reported only. Unknown and
          data-not-provided are first-class. Premium tax credit math is educational. Official
          eligibility is determined only by the Marketplace.
        </p>
        {coverage?.limitations?.length ? (
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            {coverage.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
