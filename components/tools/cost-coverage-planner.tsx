'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Info,
  Loader2,
  MapPin,
  Shield,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { resolveZip, type ZipLocation } from '@/lib/tools/zip-resolve';
import {
  ACA_PLANNER_META,
  HOUSEHOLD_SHAPES,
  PRIORITIES,
  SITUATIONS,
  UTILIZATION_LEVELS,
  buildPlannerResult,
  defaultHouseholdSize,
  formatMoneyRange,
  isMedicareSituation,
  type HouseholdShape,
  type PersonInput,
  type PlannerResult,
  type PriorityId,
  type SituationId,
  type UtilizationLevel,
} from '@/lib/tools/aca-cost-planner';
import {
  applyLandscapeToCostPlanner,
  type MarketplaceDataSource,
} from '@/lib/tools/apply-marketplace-landscape';
import type { LocalMarketplaceLandscape } from '@/lib/marketplace/plans-search';
import { MarketplaceHonestyBanner } from '@/components/marketplace/marketplace-honesty-banner';
import { SaveCalculatorButton } from '@/components/my-insurance/save-calculator-button';

const STEPS = [
  { id: 1, label: 'Situation' },
  { id: 2, label: 'Household' },
  { id: 3, label: 'Income' },
  { id: 4, label: 'Care use' },
  { id: 5, label: 'Priorities' },
  { id: 6, label: 'Results' },
] as const;

function defaultAges(shape: HouseholdShape): number[] {
  switch (shape) {
    case 'just-me':
      return [40];
    case 'me-spouse':
      return [42, 40];
    case 'me-children':
      return [38, 10, 8];
    case 'family':
      return [42, 40, 12, 8];
  }
}

function ageLabels(shape: HouseholdShape, count: number): string[] {
  if (shape === 'just-me') return ['Your age'];
  if (shape === 'me-spouse') return ['Your age', 'Spouse/partner age'];
  if (shape === 'me-children') {
    return ['Your age', ...Array.from({ length: count - 1 }, (_, i) => `Child ${i + 1} age`)];
  }
  return [
    'Your age',
    'Spouse/partner age',
    ...Array.from({ length: Math.max(0, count - 2) }, (_, i) => `Child ${i + 1} age`),
  ];
}

export function CostCoveragePlanner() {
  const [step, setStep] = useState(1);
  const [situation, setSituation] = useState<SituationId | ''>('');
  const [zip, setZip] = useState('');
  const [location, setLocation] = useState<ZipLocation | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

  const [householdShape, setHouseholdShape] = useState<HouseholdShape>('just-me');
  const [ages, setAges] = useState<number[]>([40]);
  const [householdSize, setHouseholdSize] = useState(1);
  const [tobacco, setTobacco] = useState(false);

  const [income, setIncome] = useState('');
  const [skipIncome, setSkipIncome] = useState(false);

  const [utilization, setUtilization] = useState<UtilizationLevel>('moderate');
  const [prescriptions, setPrescriptions] = useState(false);
  const [majorCare, setMajorCare] = useState(false);

  const [priority, setPriority] = useState<PriorityId>('balanced');
  const [showMath, setShowMath] = useState(false);
  const [landscape, setLandscape] = useState<LocalMarketplaceLandscape | null>(null);
  const [landscapeLoading, setLandscapeLoading] = useState(false);

  const medicare = situation !== '' && isMedicareSituation(situation);

  const baseResult: PlannerResult | null = useMemo(() => {
    if (step !== 6 || !location || !situation) return null;
    const people: PersonInput[] = ages.map((age) => ({
      age,
      tobacco: tobacco && age >= 18,
    }));
    const annualIncome =
      skipIncome || income.trim() === '' ? null : Math.max(0, Number(income.replace(/,/g, '')));
    return buildPlannerResult({
      situation,
      location,
      householdShape,
      people,
      householdSize: Math.max(householdSize, people.length),
      annualIncome: annualIncome != null && !Number.isNaN(annualIncome) ? annualIncome : null,
      utilization,
      prescriptions,
      majorCare,
      priority,
    });
  }, [
    step,
    location,
    situation,
    ages,
    tobacco,
    householdShape,
    householdSize,
    income,
    skipIncome,
    utilization,
    prescriptions,
    majorCare,
    priority,
  ]);

  useEffect(() => {
    if (step !== 6 || !location || medicare) {
      setLandscape(null);
      return;
    }
    let cancelled = false;
    const annualIncome =
      skipIncome || income.trim() === '' ? null : Math.max(0, Number(income.replace(/,/g, '')));
    setLandscapeLoading(true);
    fetch('/api/marketplace/landscape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zip: location.zip,
        year: ACA_PLANNER_META.planYear,
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
  }, [
    step,
    location,
    medicare,
    ages,
    tobacco,
    householdSize,
    income,
    skipIncome,
  ]);

  const result = useMemo(() => {
    if (!baseResult) return null;
    return applyLandscapeToCostPlanner(baseResult, landscape);
  }, [baseResult, landscape]);

  function onZipBlur() {
    const loc = resolveZip(zip);
    if (!loc) {
      setLocation(null);
      if (zip.replace(/\D/g, '').length === 5) {
        setZipError('We could not map that ZIP. Try another 5-digit U.S. ZIP.');
      } else {
        setZipError(null);
      }
      return;
    }
    setZipError(null);
    setLocation(loc);
  }

  function applyShape(shape: HouseholdShape) {
    setHouseholdShape(shape);
    const nextAges = defaultAges(shape);
    setAges(nextAges);
    setHouseholdSize(defaultHouseholdSize(shape));
  }

  function canNext(): boolean {
    if (step === 1) {
      return Boolean(situation && location);
    }
    if (step === 2) {
      return ages.length > 0 && ages.every((a) => a >= 0 && a <= 64);
    }
    if (step === 3) {
      if (skipIncome) return true;
      if (income.trim() === '') return false;
      const n = Number(income.replace(/,/g, ''));
      return !Number.isNaN(n) && n >= 0;
    }
    if (step === 4 || step === 5) return true;
    return false;
  }

  function goNext() {
    if (step === 1 && situation && isMedicareSituation(situation)) {
      // Allow continuing for dual research, but step 1 already shows Medicare panel
    }
    if (step < 6 && canNext()) setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  function goToResults() {
    if (canNext() || step === 5) setStep(6);
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">
            Step {step} of {STEPS.length}
          </p>
          <p className="text-xs text-slate-500">{STEPS[step - 1]?.label}</p>
        </div>
        <div className="mt-3 flex gap-1.5" role="list" aria-label="Progress">
          {STEPS.map((s) => (
            <div
              key={s.id}
              role="listitem"
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                s.id < step && 'bg-[#0284C7]',
                s.id === step && 'bg-[#E0F2FE]0',
                s.id > step && 'bg-slate-200'
              )}
              aria-current={s.id === step ? 'step' : undefined}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Situation &amp; location</h2>
              <p className="mt-1 text-sm text-slate-500">
                We use your ZIP to set state (and county when we know it). No data is stored.
              </p>
            </div>

            <div>
              <Label htmlFor="situation">What&apos;s your situation?</Label>
              <Select
                id="situation"
                className="mt-1.5 h-11"
                value={situation}
                onChange={(e) => setSituation(e.target.value as SituationId)}
              >
                <option value="" disabled>
                  Select…
                </option>
                {SITUATIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="zip">ZIP code</Label>
              <div className="relative mt-1.5">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="zip"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="e.g. 33401"
                  className="h-11 pl-10"
                  value={zip}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setZip(v);
                    if (v.length === 5) {
                      const loc = resolveZip(v);
                      setLocation(loc);
                      setZipError(loc ? null : 'We could not map that ZIP.');
                    } else {
                      setLocation(null);
                      setZipError(null);
                    }
                  }}
                  onBlur={onZipBlur}
                />
              </div>
              {location && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[#0284C7]">
                  <Check className="h-4 w-4" aria-hidden />
                  {location.displayLabel}
                  {location.resolution === 'state' && (
                    <span className="font-normal text-slate-500">
                      — county not resolved; using state-level averages
                    </span>
                  )}
                </p>
              )}
              {zipError && <p className="mt-2 text-sm text-rose-600">{zipError}</p>}
            </div>

            {medicare && (
              <div className="rounded-xl border border-[#0284C7]/30 bg-[#E0F2FE]/70 p-4">
                <p className="text-sm font-semibold text-[#0A2540]">Medicare path available</p>
                <p className="mt-1 text-sm text-[#1E293B]">
                  For Medicare, our dedicated tools are usually more useful than ACA marketplace
                  math. You can open them now or continue this planner for household health cost
                  context.
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <Link href="/tools/medicare-plan-finder" className="font-medium text-[#0284C7] hover:underline">
                      Medicare research guide
                    </Link>
                  </li>
                  <li>
                    <Link href="/tools/medicare-provider-lookup" className="font-medium text-[#0284C7] hover:underline">
                      Does my doctor accept Medicare?
                    </Link>
                  </li>
                  <li>
                    <Link href="/data/counties" className="font-medium text-[#0284C7] hover:underline">
                      County Medicare dashboards
                    </Link>
                  </li>
                  <li>
                    <Link href="/data/plan-complaint-index" className="font-medium text-[#0284C7] hover:underline">
                      Plan Complaint Index
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Household</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ages affect marketplace premiums (ACA age rating). Pre-existing conditions do not.
              </p>
            </div>

            <div>
              <Label>Who needs coverage?</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {HOUSEHOLD_SHAPES.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => applyShape(h.id)}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors',
                      householdShape === h.id
                        ? 'border-[#0284C7] bg-[#E0F2FE] text-[#0A2540]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    )}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {ages.map((age, i) => (
                <div key={i}>
                  <Label htmlFor={`age-${i}`}>{ageLabels(householdShape, ages.length)[i]}</Label>
                  <Input
                    id={`age-${i}`}
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

            {(householdShape === 'me-children' || householdShape === 'family') && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={ages.length >= 6}
                  onClick={() => setAges((a) => [...a, 8])}
                >
                  Add person
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={ages.length <= 2}
                  onClick={() => setAges((a) => a.slice(0, -1))}
                >
                  Remove last
                </Button>
              </div>
            )}

            <div>
              <Label htmlFor="hh-size">Tax household size (for subsidy context)</Label>
              <Input
                id="hh-size"
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
              <span>
                At least one adult uses tobacco (where rating applies). Some states limit tobacco
                rating.
              </span>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Income (subsidy context)</h2>
              <p className="mt-1 text-sm text-slate-500">
                Estimated household income for the coverage year. Used only for educational premium
                tax credit context — not stored, not a determination.
              </p>
            </div>

            <div>
              <Label htmlFor="income">Estimated annual household income ($)</Label>
              <Input
                id="income"
                inputMode="numeric"
                className="mt-1.5 h-11 max-w-xs"
                placeholder="e.g. 55000"
                value={income}
                disabled={skipIncome}
                onChange={(e) => setIncome(e.target.value.replace(/[^\d,]/g, ''))}
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={skipIncome}
                onChange={(e) => setSkipIncome(e.target.checked)}
              />
              <span>Skip for now — show unsubsidized premium ranges</span>
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-800">How we use income</p>
              <p className="mt-1 leading-relaxed">
                We compare income to federal poverty guidelines to estimate whether premium tax
                credits or Silver cost-sharing reductions may apply. Official amounts come only from
                the marketplace application.
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Expected healthcare use</h2>
              <p className="mt-1 text-sm text-slate-500">
                This shapes <strong className="font-medium text-slate-700">out-of-pocket</strong>{' '}
                estimates only. Under the ACA, pre-existing conditions do not raise your premium.
              </p>
            </div>

            <div className="grid gap-2">
              {UTILIZATION_LEVELS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUtilization(u.id)}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-left transition-colors',
                    utilization === u.id
                      ? 'border-[#0284C7] bg-[#E0F2FE]'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <span className="font-medium text-slate-900">{u.label}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{u.detail}</span>
                </button>
              ))}
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={prescriptions}
                onChange={(e) => setPrescriptions(e.target.checked)}
              />
              <span>Regular prescription medications</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={majorCare}
                onChange={(e) => setMajorCare(e.target.checked)}
              />
              <span>Upcoming major care (surgery, pregnancy, hospital stay, etc.)</span>
            </label>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">What matters most?</h2>
              <p className="mt-1 text-sm text-slate-500">
                We highlight one of three cost paths. Network and formulary matching come in a later
                phase — we won&apos;t pretend we have them yet.
              </p>
            </div>
            <div className="grid gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors',
                    priority === p.id
                      ? 'border-[#0284C7] bg-[#E0F2FE] text-[#0A2540]'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 6 && landscapeLoading && !result && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-[#0284C7]" aria-hidden />
            Loading local Marketplace landscape…
          </div>
        )}

        {step === 6 && result && (
          <ResultsPanel
            result={result}
            marketplace={result.marketplace}
            landscapeLoading={landscapeLoading}
            utilization={utilization}
            showMath={showMath}
            onToggleMath={() => setShowMath((v) => !v)}
            onEditAssumptions={() => setStep(4)}
          />
        )}

        {step < 6 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <Button type="button" variant="ghost" onClick={goBack} disabled={step === 1} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {step < 5 ? (
              <Button type="button" onClick={goNext} disabled={!canNext()} className="gap-1 min-h-[44px]">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={goToResults} className="gap-1 min-h-[44px]">
                See cost picture
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Start over
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep(5)}>
              Change priorities
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsPanel({
  result,
  marketplace,
  landscapeLoading,
  utilization,
  showMath,
  onToggleMath,
  onEditAssumptions,
}: {
  result: PlannerResult;
  marketplace: MarketplaceDataSource;
  landscapeLoading: boolean;
  utilization: UtilizationLevel;
  showMath: boolean;
  onToggleMath: () => void;
  onEditAssumptions: () => void;
}) {
  const monthlyNet = formatMoneyRange(result.summaryMonthlyNet, 'mo');
  const annualTotal = formatMoneyRange(result.summaryTotalAnnual, 'yr');
  const saveTitle = `Cost estimate · ${result.location.displayLabel}`;
  const summaryText = [
    result.subsidy.summary,
    `Est. monthly net premium: ${monthlyNet}`,
    `Est. total annual cost: ${annualTotal}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-8">
      <MarketplaceHonestyBanner marketplace={marketplace} />
      {landscapeLoading ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Refreshing local Marketplace landscape…
        </p>
      ) : null}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0284C7]">
          Your estimated annual cost picture
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900 md:text-2xl">
          Total cost scenarios for {result.location.displayLabel}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Highlighted path based on your priorities and care use. Figures are educational ranges —
          not plan quotes.
        </p>
        <div className="mt-4">
          <SaveCalculatorButton
            calculatorId="cost_estimator"
            title={saveTitle}
            snapshot={{
              sourcePath: '/tools/cost-estimator',
              summaryText,
              inputs: {
                zip: result.location.zip,
                displayLabel: result.location.displayLabel,
                utilization,
              },
              outputs: {
                summaryMonthlyNet: result.summaryMonthlyNet,
                summaryTotalAnnual: result.summaryTotalAnnual,
                recommendedPathId: result.recommendedPathId,
                subsidy: result.subsidy,
              },
              result: {
                paths: result.paths.map((p) => ({
                  id: p.id,
                  label: p.label,
                  totalAnnualCost: p.totalAnnualCost,
                })),
              },
            }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Est. monthly premium (net)"
          value={formatMoneyRange(result.summaryMonthlyNet, 'mo')}
        />
        <StatCard
          label="Est. annual premium (net)"
          value={formatMoneyRange(
            {
              low: result.summaryMonthlyNet.low * 12,
              high: result.summaryMonthlyNet.high * 12,
            },
            'yr'
          )}
        />
        <StatCard
          label="Est. total annual cost"
          value={formatMoneyRange(result.summaryTotalAnnual, 'yr')}
          emphasize
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
        <p>{result.subsidy.summary}</p>
        {result.subsidy.estimatedAnnualPtc != null && result.subsidy.estimatedAnnualPtc > 0 && (
          <p className="mt-2 font-medium text-slate-800">
            Educational PTC estimate (benchmark-based): ~
            {formatMoneyRange(
              {
                low: Math.round(result.subsidy.estimatedAnnualPtc * 0.9),
                high: Math.round(result.subsidy.estimatedAnnualPtc * 1.1),
              },
              'yr'
            )}
          </p>
        )}
        {result.subsidy.fplRatio != null && (
          <p className="mt-1 text-xs text-slate-500">
            FPL reference ({ACA_PLANNER_META.fplGuidelineYear}): $
            {result.subsidy.fplAmount.toLocaleString()} for household · you ≈{' '}
            {result.subsidy.fplRatio.toFixed(2)}× FPL
          </p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900">Three paths (not a plan list)</h3>
        <p className="mt-1 text-sm text-slate-500">
          We show metal-tier style scenarios — not named carriers or exact SKUs.
        </p>
        <div className="mt-4 space-y-3">
          {result.paths.map((path) => {
            const isRec = path.id === result.recommendedPathId;
            return (
              <div
                key={path.id}
                className={cn(
                  'rounded-xl border p-4 md:p-5',
                  isRec ? 'border-[#0284C7]/50 bg-[#E0F2FE]/50 ring-1 ring-[#E0F2FE]' : 'border-slate-200 bg-white'
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{path.label}</p>
                    <p className="text-xs font-medium uppercase tracking-wide text-[#0284C7]">
                      {path.tagline}
                      {path.csrApplied ? ' · CSR-sensitive Silver view' : ''}
                    </p>
                  </div>
                  {isRec && (
                    <span className="rounded-full bg-[#0284C7] px-2.5 py-0.5 text-xs font-semibold text-white">
                      Aligned with your inputs
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-600">{path.fits}</p>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Monthly premium (after est. credit)</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatMoneyRange(path.monthlyPremiumNet, 'mo')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Expected care OOP</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatMoneyRange(path.expectedOop, 'yr')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Deductible band (household-scaled)</dt>
                    <dd className="font-medium text-slate-800">
                      {formatMoneyRange(path.deductibleRange)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Total annual cost (premium + care)</dt>
                    <dd className="font-semibold text-[#0A2540]">
                      {formatMoneyRange(path.totalAnnualCost, 'yr')}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={onEditAssumptions}
          className="font-medium text-[#0284C7] hover:underline"
        >
          Edit care-use assumptions
        </button>
        <span className="text-slate-300">·</span>
        <span className="text-slate-600">
          We assumed <strong className="font-medium text-slate-800">{utilization}</strong> healthcare
          use.
        </span>
      </div>

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
          <div className="space-y-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-600">
            <ul className="list-disc space-y-1.5 pl-5">
              {result.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p>
              <strong className="text-slate-800">Premium basis:</strong> {result.meta.premiumBasis}
            </p>
            <p>
              <strong className="text-slate-800">Age curve:</strong> {result.meta.ageCurveNote}
            </p>
            <p>
              <strong className="text-slate-800">FPL:</strong> {result.meta.fplSource}
            </p>
            <p>
              <strong className="text-slate-800">Last reviewed:</strong> {result.meta.lastReviewed} ·
              Plan year context {result.meta.planYear}
            </p>
            <p className="text-xs text-slate-500">{result.meta.disclaimer}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        <p className="flex gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Estimates only — verify on{' '}
            <a
              href="https://www.healthcare.gov"
              className="font-medium underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              HealthCare.gov
            </a>{' '}
            (or your state marketplace) before enrolling. We do not sell plans or leads.
          </span>
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-slate-900">Next research steps</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          <NextLink
            href={
              result.location.hasCountyDashboard && result.location.countyDashboardSlug
                ? `/data/counties/${result.location.countyDashboardSlug}`
                : '/data/counties'
            }
            icon={MapPin}
            title="County Medicare / market context"
            desc="Local enrollment and quality dashboards where available"
          />
          <NextLink
            href="/tools/medicare-provider-lookup"
            icon={Stethoscope}
            title="Provider participation lookup"
            desc="Check CMS Medicare FFS / opt-out signals for a doctor"
          />
          <NextLink
            href="/data/plan-complaint-index"
            icon={BarChart3}
            title="Plan Complaint Index"
            desc="CMS complaint rates for MA / Part D contracts"
          />
          <NextLink
            href="/hubs/south-florida"
            icon={Users}
            title="Verified local agents"
            desc="Browse directories — no lead form gate"
          />
          <NextLink
            href="/hubs/aca"
            icon={Shield}
            title="ACA marketplace agents"
            desc="Specialists familiar with subsidies and metal tiers"
          />
          <NextLink
            href="/tools/medicare-plan-finder"
            icon={BarChart3}
            title="Medicare research guide"
            desc="If you are also comparing Medicare paths"
          />
        </ul>
      </div>

    </div>
  );
}

function StatCard({
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
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900 md:text-xl">{value}</p>
    </div>
  );
}

function NextLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: typeof MapPin;
  title: string;
  desc: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/30"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#0284C7]">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 group-hover:text-[#0A2540]">{title}</p>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </Link>
    </li>
  );
}
