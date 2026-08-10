'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Info,
  Loader2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { resolveZip, type ZipLocation } from '@/lib/tools/zip-resolve';
import {
  ACA_SAVINGS_META,
  buildSubsidyPlannerResult,
  formatMoneyRange,
  fplForHousehold,
  type IncomeConfidence,
  type PersonInput,
  type SubsidyPlannerResult,
} from '@/lib/tools/aca-subsidy-planner';
import {
  applyLandscapeToSubsidyPlanner,
  type MarketplaceDataSource,
} from '@/lib/tools/apply-marketplace-landscape';
import type { LocalMarketplaceLandscape } from '@/lib/marketplace/plans-search';
import { MarketplaceHonestyBanner } from '@/components/marketplace/marketplace-honesty-banner';
import { MarketSnapshot } from '@/components/marketplace/market-snapshot';
import {
  LandscapeNarrative,
  ResearchPathCards,
} from '@/components/marketplace/research-path-cards';
import { SaveCalculatorButton } from '@/components/my-insurance/save-calculator-button';
import {
  buildSubsidyPlannerResearchSnapshot,
  toCalculatorSnapshot,
} from '@/lib/marketplace/research-snapshot';

const STEPS = [
  { id: 1, label: 'Location' },
  { id: 2, label: 'Household' },
  { id: 3, label: 'Income' },
  { id: 4, label: 'Results' },
] as const;

export function AcaCoverageSavingsPlanner() {
  const [step, setStep] = useState(1);
  const [zip, setZip] = useState('');
  const [location, setLocation] = useState<ZipLocation | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

  const [ages, setAges] = useState<number[]>([40]);
  const [householdSize, setHouseholdSize] = useState(1);
  const [tobacco, setTobacco] = useState(false);

  const [income, setIncome] = useState('55000');
  const [confidence, setConfidence] = useState<IncomeConfidence>('somewhat');
  const [showMath, setShowMath] = useState(false);
  const [landscape, setLandscape] = useState<LocalMarketplaceLandscape | null>(null);
  const [landscapeLoading, setLandscapeLoading] = useState(false);

  const baseResult: SubsidyPlannerResult | null = useMemo(() => {
    if (step !== 4 || !location) return null;
    const people: PersonInput[] = ages.map((age) => ({
      age,
      tobacco: tobacco && age >= 18,
    }));
    const annualIncome = Math.max(0, Number(String(income).replace(/,/g, '')) || 0);
    return buildSubsidyPlannerResult({
      location,
      people,
      householdSize: Math.max(householdSize, people.length),
      annualIncome,
      incomeConfidence: confidence,
    });
  }, [step, location, ages, tobacco, householdSize, income, confidence]);

  useEffect(() => {
    if (step !== 4 || !location) {
      setLandscape(null);
      return;
    }
    let cancelled = false;
    const annualIncome = Math.max(0, Number(String(income).replace(/,/g, '')) || 0);
    setLandscapeLoading(true);
    fetch('/api/marketplace/landscape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zip: location.zip,
        year: ACA_SAVINGS_META.planYear,
        ages,
        tobacco,
        householdIncome: annualIncome,
        householdSize: Math.max(householdSize, ages.length),
      }),
    })
      .then(async (res) => {
        const data = (await res.json()) as LocalMarketplaceLandscape;
        if (!cancelled) setLandscape(data);
      })
      .catch(() => {
        if (!cancelled) setLandscape(null);
      })
      .finally(() => {
        if (!cancelled) setLandscapeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, location, ages, tobacco, householdSize, income]);

  const result = useMemo(() => {
    if (!baseResult) return null;
    return applyLandscapeToSubsidyPlanner(baseResult, landscape);
  }, [baseResult, landscape]);

  function onZipChange(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 5);
    setZip(digits);
    if (digits.length === 5) {
      const loc = resolveZip(digits);
      setLocation(loc);
      setZipError(loc ? null : 'We could not map that ZIP. Try another U.S. ZIP.');
    } else {
      setLocation(null);
      setZipError(null);
    }
  }

  function canNext(): boolean {
    if (step === 1) return Boolean(location);
    if (step === 2) return ages.length > 0 && ages.every((a) => a >= 0 && a <= 64);
    if (step === 3) {
      const n = Number(String(income).replace(/,/g, ''));
      return !Number.isNaN(n) && n >= 0;
    }
    return false;
  }

  function goNext() {
    if (step < 4 && canNext()) setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">
            Step {step} of {STEPS.length}
          </p>
          <p className="text-xs text-slate-500">{STEPS[step - 1]?.label}</p>
        </div>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                s.id < step && 'bg-[#0284C7]',
                s.id === step && 'bg-[#E0F2FE]0',
                s.id > step && 'bg-slate-200'
              )}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Where do you live?</h2>
              <p className="mt-1 text-sm text-slate-500">
                ZIP sets your state (and county when we know it). Marketplace prices are local —
                state-only averages are not enough.
              </p>
            </div>
            <div>
              <Label htmlFor="aca-zip">ZIP code</Label>
              <div className="relative mt-1.5 max-w-xs">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="aca-zip"
                  inputMode="numeric"
                  maxLength={5}
                  className="h-11 pl-10"
                  placeholder="e.g. 33401"
                  value={zip}
                  onChange={(e) => onZipChange(e.target.value)}
                />
              </div>
              {location && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[#0284C7]">
                  <Check className="h-4 w-4" aria-hidden />
                  {location.displayLabel}
                  {location.resolution === 'state' && (
                    <span className="font-normal text-slate-500">
                      — county not resolved; using state-level baselines
                    </span>
                  )}
                </p>
              )}
              {zipError && <p className="mt-2 text-sm text-rose-600">{zipError}</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Who needs coverage?</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ages drive Marketplace premiums (ACA age rating). Pre-existing conditions do not.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ages.map((age, i) => (
                <div key={i}>
                  <Label htmlFor={`aca-age-${i}`}>
                    {i === 0 ? 'Your age' : `Person ${i + 1} age`}
                  </Label>
                  <Input
                    id={`aca-age-${i}`}
                    type="number"
                    min={0}
                    max={64}
                    className="mt-1.5 h-11"
                    value={age}
                    onChange={(e) => {
                      const next = [...ages];
                      next[i] = Number(e.target.value);
                      setAges(next);
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={ages.length >= 6}
                onClick={() => {
                  setAges((a) => [...a, 10]);
                  setHouseholdSize((h) => Math.max(h, ages.length + 1));
                }}
              >
                Add person
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={ages.length <= 1}
                onClick={() => setAges((a) => a.slice(0, -1))}
              >
                Remove last
              </Button>
            </div>
            <div>
              <Label htmlFor="tax-hh">Tax household size (for FPL / subsidy)</Label>
              <Input
                id="tax-hh"
                type="number"
                min={1}
                max={12}
                className="mt-1.5 h-11 max-w-[8rem]"
                value={householdSize}
                onChange={(e) => setHouseholdSize(Number(e.target.value) || 1)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Often matches who you claim on taxes — may differ from who is on the plan.
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={tobacco}
                onChange={(e) => setTobacco(e.target.checked)}
              />
              <span>At least one adult uses tobacco (where rating applies)</span>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Expected household income</h2>
              <p className="mt-1 text-sm text-slate-500">
                Use a rough annual figure close to modified adjusted gross income (MAGI) for the
                coverage year — wages, self-employment profit, and most taxable income. This is not
                a tax form.
              </p>
            </div>
            <div>
              <Label htmlFor="aca-inc">Estimated annual household income ($)</Label>
              <Input
                id="aca-inc"
                inputMode="numeric"
                className="mt-1.5 h-11 max-w-xs"
                value={income}
                onChange={(e) => setIncome(e.target.value.replace(/[^\d,]/g, ''))}
              />
              {householdSize > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  FPL reference for {householdSize} person
                  {householdSize === 1 ? '' : 's'}: about $
                  {fplForHousehold(householdSize).toLocaleString()} (
                  {ACA_SAVINGS_META.fplGuidelineYear} HHS guidelines)
                </p>
              )}
            </div>
            <div>
              <Label>How confident are you in this income figure?</Label>
              <div className="mt-2 grid gap-2">
                {(
                  [
                    ['very', 'Very confident'],
                    ['somewhat', 'Somewhat confident'],
                    ['variable', 'Income may vary / self-employed'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setConfidence(id)}
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors',
                      confidence === id
                        ? 'border-[#0284C7] bg-[#E0F2FE] text-[#0A2540]'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && landscapeLoading && !result && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-[#0284C7]" aria-hidden />
            Loading local Marketplace landscape…
          </div>
        )}
        {step === 4 && result && (
          <Results
            result={result}
            marketplace={result.marketplace}
            landscape={landscape}
            landscapeLoading={landscapeLoading}
            ages={ages}
            householdSize={Math.max(householdSize, ages.length)}
            tobacco={tobacco}
            annualIncome={Math.max(0, Number(String(income).replace(/,/g, '')) || 0)}
            showMath={showMath}
            onToggleMath={() => setShowMath((v) => !v)}
          />
        )}

        {step < 4 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <Button type="button" variant="ghost" onClick={goBack} disabled={step === 1} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={goNext} disabled={!canNext()} className="min-h-[44px] gap-1">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={goNext} disabled={!canNext()} className="min-h-[44px] gap-1">
                See savings picture
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Start over
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep(3)}>
              Change income
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Results({
  result,
  marketplace,
  landscape,
  landscapeLoading,
  ages,
  householdSize,
  tobacco,
  annualIncome,
  showMath,
  onToggleMath,
}: {
  result: SubsidyPlannerResult & { marketplace?: MarketplaceDataSource };
  marketplace: MarketplaceDataSource;
  landscape: LocalMarketplaceLandscape | null;
  landscapeLoading: boolean;
  ages: number[];
  householdSize: number;
  tobacco: boolean;
  annualIncome: number;
  showMath: boolean;
  onToggleMath: () => void;
}) {
  const ptcLabel = result.estimatedPtcMonthly
    ? formatMoneyRange(result.estimatedPtcMonthly, 'mo')
    : '$0';
  const saveTitle = `ACA estimate · ${result.location.displayLabel}`;
  const summaryText = [
    result.assistanceSummary,
    `Est. monthly PTC: ${ptcLabel}`,
    `FPL position: ${result.fplPercentLabel}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const researchSnap = buildSubsidyPlannerResearchSnapshot({
    result: { ...result, marketplace },
    landscape,
    ages,
    householdSize,
    tobacco,
    annualIncome,
  });
  const saveSnapshot = toCalculatorSnapshot(researchSnap, '/calculators/aca-subsidy');

  return (
    <div className="space-y-8">
      <MarketplaceHonestyBanner marketplace={marketplace} />
      {landscapeLoading ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Refreshing local Marketplace landscape…
        </p>
      ) : null}
      <MarketSnapshot landscape={landscape} />
      <LandscapeNarrative landscape={landscape} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0284C7]">
          Assistance &amp; local cost picture
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900 md:text-2xl">
          Results for {result.location.displayLabel}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{result.assistanceSummary}</p>
        {result.incomeConfidenceNote && (
          <p className="mt-2 text-xs text-slate-500">{result.incomeConfidenceNote}</p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <SaveCalculatorButton
            calculatorId="aca_subsidy"
            title={saveTitle}
            snapshot={{
              ...saveSnapshot,
              summaryText: summaryText || saveSnapshot.summaryText,
              outputs: {
                ...saveSnapshot.outputs,
                estimatedPtcMonthly: result.estimatedPtcMonthly,
                estimatedPtcAnnual: result.estimatedPtcAnnual,
                fplPercentLabel: result.fplPercentLabel,
                qualifiesPtc: result.qualifiesPtc,
                qualifiesCsr: result.qualifiesCsr,
              },
            }}
            sendEmail
          />
          <p className="text-xs text-slate-500">
            Saves a research summary to My Insurance (sign-in for cloud + optional email).
          </p>
        </div>
      </div>

      {/* A. Assistance snapshot */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Est. monthly PTC"
          value={
            result.estimatedPtcMonthly
              ? formatMoneyRange(result.estimatedPtcMonthly, 'mo')
              : '$0'
          }
          emphasize={result.qualifiesPtc}
        />
        <Stat
          label="Est. annual PTC"
          value={
            result.estimatedPtcAnnual ? formatMoneyRange(result.estimatedPtcAnnual, 'yr') : '$0'
          }
        />
        <Stat label="Approx. FPL position" value={result.fplPercentLabel} />
      </div>

      {result.qualifiesPtc && result.applicablePct != null && (
        <p className="text-sm text-slate-600">
          Expected contribution toward benchmark Silver (educational): about{' '}
          {result.applicablePct.toFixed(1)}% of income
          {result.expectedContributionMonthly != null && (
            <>
              {' '}
              (≈${result.expectedContributionMonthly.toLocaleString()}/mo)
            </>
          )}
          .
        </p>
      )}

      {/* D. $0 premium */}
      {result.zeroPremiumPossible && (
        <div className="flex gap-3 rounded-xl border border-[#0284C7]/30 bg-[#E0F2FE]/80 px-4 py-3 text-sm text-[#0A2540]">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <strong className="font-semibold">Very low or $0 premium range possible.</strong> Your
            estimated assistance may cover a lower-premium baseline path depending on local plan
            availability. Confirm on the Marketplace.
          </p>
        </div>
      )}

      {/* C. CSR */}
      {result.qualifiesCsr && (
        <div className="rounded-xl border border-[#0284C7]/40 bg-[#E0F2FE]/70 p-4 md:p-5">
          <p className="text-sm font-semibold text-[#0A2540]">Cost-Sharing Reductions may apply</p>
          <p className="mt-2 text-sm leading-relaxed text-[#1E293B]">{result.csrSummary}</p>
        </div>
      )}
      {!result.qualifiesCsr && (
        <p className="text-sm leading-relaxed text-slate-600">{result.csrSummary}</p>
      )}

      {/* E. Cliff */}
      <div
        className={cn(
          'rounded-xl border px-4 py-3 text-sm',
          result.cliff.status === 'above' || result.cliff.status === 'near-above'
            ? 'border-amber-200 bg-amber-50/90 text-amber-950'
            : result.cliff.status === 'near-below'
              ? 'border-amber-200 bg-amber-50/60 text-amber-950'
              : 'border-slate-200 bg-slate-50 text-slate-700'
        )}
      >
        <p className="flex gap-2 font-semibold">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Subsidy cliff education (400% FPL)
        </p>
        <p className="mt-2 leading-relaxed">{result.cliff.message}</p>
        {result.cliff.reverseMessage && (
          <p className="mt-2 leading-relaxed">{result.cliff.reverseMessage}</p>
        )}
      </div>

      <ResearchPathCards
        landscape={landscape}
        highlightPathId={result.qualifiesCsr ? 'balanced' : null}
      />

      {/* B + F Local paths */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Cost paths after estimated assistance
        </h3>
        <p className="mt-1 text-sm text-slate-500">{result.localCostNarrative}</p>
        <div className="mt-4 space-y-3">
          {result.paths.map((path) => (
            <div
              key={path.id}
              className={cn(
                'rounded-xl border p-4',
                path.id === 'silver' && result.qualifiesCsr
                  ? 'border-[#0284C7]/40 bg-[#E0F2FE]/40'
                  : 'border-slate-200 bg-white'
              )}
            >
              <p className="font-semibold text-slate-900">{path.label}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-[#0284C7]">
                {path.tagline}
              </p>
              <p className="mt-1 text-sm text-slate-600">{path.fits}</p>
              {path.csrNote && (
                <p className="mt-2 text-sm font-medium text-[#0284C7]">{path.csrNote}</p>
              )}
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Est. monthly (after PTC)</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatMoneyRange(path.monthlyNet, 'mo')}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Est. annual premium (net)</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatMoneyRange(path.annualNet, 'yr')}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      {/* G. Math */}
      <div className="rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={onToggleMath}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-900"
          aria-expanded={showMath}
        >
          How we calculated this
          <ChevronDown className={cn('h-4 w-4 transition-transform', showMath && 'rotate-180')} />
        </button>
        {showMath && (
          <div className="space-y-2 border-t border-slate-200 px-4 py-4 text-sm text-slate-600">
            <ul className="list-disc space-y-1 pl-5">
              {result.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">{result.meta.disclaimer}</p>
            <p className="text-xs text-slate-500">Last reviewed {result.meta.lastReviewed}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        <p className="flex gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Educational estimates only. Official eligibility and enrollment are determined through{' '}
            <a
              href="https://www.healthcare.gov"
              className="font-medium underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              HealthCare.gov
            </a>{' '}
            or your state marketplace. We do not sell leads.
          </span>
        </p>
      </div>

      {/* H. Next actions */}
      <div>
        <h3 className="text-base font-semibold text-slate-900">Next research steps</h3>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <li>
            <Link href="/tools/cost-estimator" className="font-medium text-[#0284C7] hover:underline">
              Insurance Cost &amp; Coverage Planner
            </Link>
            <span className="block text-xs text-slate-500">Total annual cost scenarios</span>
          </li>
          <li>
            <Link
              href="/data/plan-complaint-index"
              className="font-medium text-[#0284C7] hover:underline"
            >
              Plan Complaint Index
            </Link>
            <span className="block text-xs text-slate-500">CMS complaint transparency</span>
          </li>
          <li>
            <Link href="/data/counties" className="font-medium text-[#0284C7] hover:underline">
              County Medicare dashboards
            </Link>
            <span className="block text-xs text-slate-500">Local market context</span>
          </li>
          <li>
            <Link href="/hubs/aca" className="font-medium text-[#0284C7] hover:underline">
              ACA marketplace agents
            </Link>
            <span className="block text-xs text-slate-500">Verified directory — no gate</span>
          </li>
          <li>
            <Link
              href="/tools/medicare-provider-lookup"
              className="font-medium text-[#0284C7] hover:underline"
            >
              Medicare provider lookup
            </Link>
            <span className="block text-xs text-slate-500">If also researching Medicare</span>
          </li>
          <li>
            <Link
              href="/tools/needs-assessment"
              className="font-medium text-[#0284C7] hover:underline"
            >
              Coverage Compass
            </Link>
            <span className="block text-xs text-slate-500">Broader research path</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3',
        emphasize ? 'border-[#0284C7]/40 bg-[#E0F2FE]/60' : 'border-slate-200 bg-slate-50/50'
      )}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

/** @deprecated name — use AcaCoverageSavingsPlanner */
export { AcaCoverageSavingsPlanner as AcaSubsidyCalculator };
