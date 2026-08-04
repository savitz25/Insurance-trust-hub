'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Car,
  Check,
  ClipboardCheck,
  Clock,
  Coins,
  Compass,
  Heart,
  Home,
  Key,
  Laptop,
  Layers,
  Scale,
  Shield,
  ShieldCheck,
  Stethoscope,
  Sunrise,
  Truck,
  User,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import {
  COMPASS_STEPS,
  computeAssessment,
  getStepInsight,
  type AssessmentResult,
} from '@/lib/tools/needs-assessment';
import { INSURANCE_TYPES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { SaveToolSnapshotButton } from '@/components/my-insurance/save-tool-snapshot-button';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  truck: Truck,
  home: Home,
  building: Building2,
  briefcase: Briefcase,
  heart: Heart,
  laptop: Laptop,
  compass: Compass,
  user: User,
  users: Users,
  'users-round': UsersRound,
  stethoscope: Stethoscope,
  wallet: Wallet,
  shield: Shield,
  car: Car,
  layers: Layers,
  key: Key,
  sunrise: Sunrise,
  calendar: Calendar,
  clock: Clock,
  coins: Coins,
  'shield-check': ShieldCheck,
  'badge-check': BadgeCheck,
  scale: Scale,
};

function OptionIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name] ?? Compass;
  return <Icon className="h-5 w-5" aria-hidden />;
}

const STEP_COUNT = COMPASS_STEPS.length;

export function NeedsAssessmentTool() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [entered, setEntered] = useState(true);

  const question = COMPASS_STEPS[step];
  const progress = result ? 100 : Math.round(((step + 1) / (STEP_COUNT + 1)) * 100);

  useEffect(() => {
    setEntered(false);
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, [step, result]);

  function choose(value: string) {
    setSelected(value);
    const nextAnswers = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);
    const tip = getStepInsight(question.id, value);
    setInsight(tip);

    // Brief moment to show selection + insight, then advance
    window.setTimeout(() => {
      if (step >= STEP_COUNT - 1) {
        setResult(computeAssessment(nextAnswers));
        setInsight(null);
        setSelected(null);
      } else {
        setStep((s) => s + 1);
        setSelected(null);
        setInsight(null);
      }
    }, tip ? 900 : 320);
  }

  function goBack() {
    if (result) {
      setResult(null);
      setStep(STEP_COUNT - 1);
      return;
    }
    if (step > 0) {
      setStep((s) => s - 1);
      setSelected(answers[COMPASS_STEPS[step - 1]?.id] ?? null);
      setInsight(null);
    }
  }

  function reset() {
    setStep(0);
    setAnswers({});
    setSelected(null);
    setInsight(null);
    setResult(null);
  }

  if (result) {
    return (
      <div
        className={cn(
          'space-y-6 transition-all duration-300',
          entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        )}
      >
        <ProgressChrome progress={100} label="Results" />

        <div className="overflow-hidden rounded-2xl border border-teal-200/80 bg-gradient-to-b from-teal-50/80 via-white to-white shadow-sm">
          <div className="border-b border-teal-100/80 px-5 py-5 md:px-7 md:py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              Your Coverage Compass
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              {result.headline ?? 'Here’s the smartest research path for your situation'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
              {result.summary}
            </p>
            {result.insight ? (
              <p className="mt-3 rounded-xl border border-teal-100 bg-white/80 px-3 py-2 text-sm text-teal-900">
                {result.insight}
              </p>
            ) : null}
          </div>

          <div className="space-y-8 px-5 py-6 md:px-7 md:py-8">
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Recommended coverage focus
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {(result.focusAreas ?? []).map((area, i) => (
                  <li
                    key={area.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{area.label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{area.reason}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.insuranceTypes.map((t) => {
                  const label = INSURANCE_TYPES.find((it) => it.value === t)?.label ?? t;
                  return (
                    <span
                      key={t}
                      className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Best next research steps
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Do these in order — real tools on InsuranceTrustHub, not a sales funnel.
              </p>
              <ol className="mt-4 space-y-2">
                {(result.researchSteps ?? []).map((stepItem, index) => (
                  <li key={stepItem.href}>
                    <Link
                      href={stepItem.href}
                      className="group flex gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 group-hover:bg-teal-50 group-hover:text-teal-800">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 group-hover:text-teal-900">
                          {stepItem.title}
                          <ArrowRight className="ml-1 inline h-4 w-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                        </p>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                          {stepItem.description}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <SaveToolSnapshotButton
                toolId="needs-assessment"
                title={result.headline ?? 'Coverage Compass result'}
                summary={
                  [
                    result.summary,
                    result.focusAreas?.slice(0, 3).map((a) => a.label).join(', '),
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Coverage Compass research path'
                }
                href="/tools/needs-assessment"
                payload={{
                  focusAreaIds: result.focusAreas?.map((a) => a.id),
                  insuranceTypes: result.insuranceTypes,
                }}
              />
              <Button type="button" variant="outline" onClick={reset} className="min-h-[44px]">
                Start over
              </Button>
              <Button type="button" variant="ghost" onClick={goBack} className="min-h-[44px]">
                Change last answer
              </Button>
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              Educational guidance only — not insurance advice, not a quote, and not a product
              recommendation. Verify details with licensed professionals and official sources.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProgressChrome
        progress={progress}
        label={`Step ${step + 1} of ${STEP_COUNT}`}
      />

      <div
        className={cn(
          'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 md:p-7',
          entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
          {question.eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
          {question.question}
        </h2>
        {question.help ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{question.help}</p>
        ) : null}

        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {question.options.map((opt) => {
            const isOn = selected === opt.value || answers[question.id] === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => choose(opt.value)}
                className={cn(
                  'group flex min-h-[72px] items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all',
                  'hover:border-teal-300 hover:bg-teal-50/40 hover:shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2',
                  isOn
                    ? 'border-teal-500 bg-teal-50/70 shadow-sm ring-1 ring-teal-200'
                    : 'border-slate-200 bg-white'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                    isOn
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-800'
                  )}
                >
                  {isOn ? <Check className="h-5 w-5" aria-hidden /> : <OptionIcon name={opt.icon} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{opt.title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-slate-500">
                    {opt.detail}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {insight ? (
          <div
            role="status"
            className="mt-5 flex gap-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 animate-in fade-in"
          >
            <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
            <p className="leading-relaxed">{insight}</p>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={step === 0}
            className="gap-1 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <p className="text-xs text-slate-400">Tap a card to continue</p>
        </div>
      </div>
    </div>
  );
}

function ProgressChrome({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Compass className="h-4.5 w-4.5 h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Coverage Compass</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
        <p className="text-sm font-semibold tabular-nums text-teal-800">{progress}%</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-600 to-cyan-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between gap-1">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              progress === 100 || i < Math.floor((progress / 100) * STEP_COUNT)
                ? 'bg-teal-500'
                : 'bg-slate-200'
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Alias for clearer imports */
export { NeedsAssessmentTool as CoverageCompass };
