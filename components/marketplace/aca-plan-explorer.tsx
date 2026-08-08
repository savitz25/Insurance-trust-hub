'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookmarkPlus,
  Check,
  ExternalLink,
  Filter,
  Info,
  Loader2,
  Search,
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
import type {
  MarketplacePlanCard,
  MarketplaceSearchResult,
  MetalLevel,
  PlanSortKey,
  PlanTypeCode,
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

export function AcaPlanExplorer() {
  const [zip, setZip] = useState('');
  const [year, setYear] = useState(String(MARKETPLACE_PLAN_YEAR_DEFAULT));
  const [income, setIncome] = useState('');
  const [people, setPeople] = useState<PersonRow[]>([
    { age: '35', tobacco: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketplaceSearchResult | null>(null);
  const [sort, setSort] = useState<PlanSortKey>('estimated_premium');
  const [metals, setMetals] = useState<MetalLevel[]>([]);
  const [planTypes, setPlanTypes] = useState<PlanTypeCode[]>([]);
  const [hsaOnly, setHsaOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<MarketplacePlanCard | null>(null);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setDetail(null);
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
  }, [zip, year, income, people]);

  const filtered = useMemo(() => {
    if (!result?.plans?.length) return [];
    let list = [...result.plans];
    if (metals.length) list = list.filter((p) => metals.includes(p.metalLevel));
    if (planTypes.length) list = list.filter((p) => planTypes.includes(p.planType));
    if (hsaOnly) list = list.filter((p) => p.hsaEligible === true);

    const val = (p: MarketplacePlanCard): number => {
      if (sort === 'name' || sort === 'metal') return 0;
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
      return val(a) - val(b);
    });
    return list;
  }, [result, metals, planTypes, hsaOnly, sort]);

  function toggleMetal(m: MetalLevel) {
    setMetals((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  function toggleType(t: PlanTypeCode) {
    setPlanTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  const comparePlans = filtered.filter((p) => compareIds.includes(p.id));

  return (
    <div className="space-y-8">
      {/* Trust framing */}
      <div className="rounded-xl border border-[#0284C7]/25 bg-[#E0F2FE]/40 px-4 py-3 text-sm text-[#0A2540]">
        <p className="font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" aria-hidden />
          Research only — not enrollment, not a quote marketplace
        </p>
        <p className="mt-1 text-[#1E293B] leading-relaxed">
          No lead form required. Plan facts come from the CMS Marketplace API when configured;
          estimated premiums after credit are educational only. You decide — confirm on HealthCare.gov
          or your state marketplace before enrolling.
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
            onClick={runSearch}
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
                  Source: {result.provenance.sourceSystem === 'cms_marketplace_api'
                    ? 'CMS Marketplace API'
                    : 'unavailable'}{' '}
                  · Plan year {result.provenance.planYear}
                  {result.provenance.retrievedAt
                    ? ` · Retrieved ${new Date(result.provenance.retrievedAt).toLocaleString()}`
                    : ''}
                </p>
              ) : null}
            </div>
            {result.ok && filtered.length > 0 ? (
              <SaveCalculatorButton
                calculatorId="aca_plan_explorer"
                title="ACA Plan Explorer snapshot"
                size="sm"
                snapshot={{
                  summaryText: `${filtered.length} plans · ${result.locationLabel || zip} · year ${result.provenance.planYear}`,
                  sourcePath: '/tools/aca-plan-explorer',
                  inputs: { zip, year, income, people },
                  outputs: {
                    planCount: filtered.length,
                    provenance: result.provenance,
                    planIds: filtered.slice(0, 20).map((p) => p.id),
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
                  >
                    Open HealthCare.gov Window Shopping
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
                <div>
                  <Label className="text-xs">Sort</Label>
                  <Select
                    className="mt-0.5 h-9"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as PlanSortKey)}
                  >
                    <option value="estimated_premium">Est. premium after credit</option>
                    <option value="full_premium">Full premium</option>
                    <option value="deductible">Deductible</option>
                    <option value="moop">Max out-of-pocket</option>
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

              {comparePlans.length > 0 ? (
                <div className="rounded-xl border p-3 overflow-x-auto">
                  <p className="text-sm font-semibold mb-2">
                    Compare ({comparePlans.length}/3)
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
                      {[
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
                          'Deductible',
                          (p: MarketplacePlanCard) => money(p.deductibleIndividual),
                        ],
                        ['MOOP', (p: MarketplacePlanCard) => money(p.moopIndividual)],
                        [
                          'HSA',
                          (p: MarketplacePlanCard) =>
                            p.hsaEligible == null ? '—' : p.hsaEligible ? 'Yes' : 'No',
                        ],
                      ].map(([label, fn]) => (
                        <tr key={String(label)} className="border-b border-border/50">
                          <td className="py-1 pr-2 text-muted-foreground">{label as string}</td>
                          {comparePlans.map((p) => (
                            <td key={p.id} className="py-1 px-2">
                              {(fn as (p: MarketplacePlanCard) => string)(p)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <ul className="space-y-3">
                {filtered.map((plan) => (
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
                            </div>
                            <h3 className="font-semibold text-base leading-snug">{plan.name}</h3>
                            <p className="text-sm text-muted-foreground">{plan.issuerName}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">
                              {plan.afterCreditIsEstimate
                                ? 'Est. after credit / mo'
                                : 'Premium after credit / mo'}
                            </p>
                            <p className="text-xl font-bold tabular-nums text-[#0A2540]">
                              {money(plan.estimatedPremiumAfterCreditMonthly ?? plan.premiumMonthly)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Full: {money(plan.premiumMonthly)}
                              {plan.premiumIsEstimate ? ' (est.)' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <span>
                            Deductible: <strong className="text-foreground">{money(plan.deductibleIndividual)}</strong>
                          </span>
                          <span>
                            Max OOP: <strong className="text-foreground">{money(plan.moopIndividual)}</strong>
                          </span>
                          <span className="col-span-2 sm:col-span-1">
                            Issuer-reported CMS fields when available
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="trust"
                            onClick={() => setDetail(plan)}
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
                ))}
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
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                This panel does not claim doctor or drug coverage. It is not an enrollment tool, tax
                advice, or a guarantee of subsidy amounts. Issuer-reported fields via CMS Marketplace
                API when available.
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {detail.marketingUrl ? (
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <a href={detail.marketingUrl} target="_blank" rel="noopener noreferrer">
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
                  >
                    HealthCare.gov
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
          Premium tax credit math here is educational. Official eligibility and SLCSP awards are
          determined only by the Marketplace. API keys expire on a CMS schedule — empty results may
          mean configuration or upstream outage, not that no plans exist.
        </p>
      </div>
    </div>
  );
}
