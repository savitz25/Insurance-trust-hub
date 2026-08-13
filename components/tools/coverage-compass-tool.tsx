'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Coins,
  Compass,
  Heart,
  Stethoscope,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  COMPASS_SITUATIONS,
  buildCompassResult,
  getCompassPrimaryStep,
  type CompassSituationId,
  type CoverageCompassResultPayload,
} from '@/lib/product/coverage-compass-paths';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SaveCalculatorButton } from '@/components/my-insurance/save-calculator-button';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  heart: Heart,
  stethoscope: Stethoscope,
  coins: Coins,
  truck: Truck,
  users: Users,
  'badge-check': BadgeCheck,
  compass: Compass,
};

const QUESTION_LABELS = {
  need: 'Coverage understanding',
  options: 'Local options',
  verify: 'Verification',
} as const;

type Phase = 'situation' | 'location' | 'result';

export function CoverageCompassTool() {
  const [phase, setPhase] = useState<Phase>('situation');
  const [situationId, setSituationId] = useState<CompassSituationId | null>(null);
  const [zip, setZip] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<CoverageCompassResultPayload | null>(null);
  const [entered, setEntered] = useState(true);

  useEffect(() => {
    setEntered(false);
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, [phase, result]);

  const progress = phase === 'situation' ? 33 : phase === 'location' ? 66 : 100;
  const progressLabel =
    phase === 'situation'
      ? 'Step 1 of 2 · Situation'
      : phase === 'location'
        ? 'Step 2 of 2 · Location (optional)'
        : 'Your research path';

  function chooseSituation(id: CompassSituationId) {
    setSelected(id);
    setSituationId(id);
    window.setTimeout(() => {
      setPhase('location');
      setSelected(null);
    }, 280);
  }

  function finishLocation(skipZip: boolean) {
    if (!situationId) return;
    const payload = buildCompassResult(situationId, skipZip ? null : zip);
    setResult(payload);
    setPhase('result');
  }

  function reset() {
    setPhase('situation');
    setSituationId(null);
    setZip('');
    setSelected(null);
    setResult(null);
  }

  const primary = useMemo(
    () => (result ? getCompassPrimaryStep(result) : null),
    [result]
  );

  if (result && phase === 'result' && primary) {
    const secondary = result.steps.filter((s) => s.id !== primary.id).slice(0, 4);
    const byQuestion = {
      need: result.steps.filter((s) => s.question === 'need'),
      options: result.steps.filter((s) => s.question === 'options'),
      verify: result.steps.filter((s) => s.question === 'verify'),
    };

    return (
      <div
        className={cn(
          'space-y-6 transition-all duration-300',
          entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        )}
      >
        <ProgressChrome progress={100} label={progressLabel} />

        <div className="overflow-hidden rounded-2xl border border-[#0284C7]/30 bg-gradient-to-b from-[#E0F2FE]/80 via-white to-white shadow-sm">
          <div className="border-b border-[#E0F2FE]/80 px-5 py-5 md:px-7 md:py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0284C7]">
              Your research path
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              {result.situationLabel}
              {result.zip ? (
                <span className="mt-1 block text-base font-medium text-slate-600">
                  ZIP {result.zip}
                </span>
              ) : null}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
              {result.summary}
            </p>
            {result.insight ? (
              <p className="mt-3 rounded-xl border border-[#E0F2FE] bg-white/80 px-3 py-2 text-sm text-[#0A2540]">
                {result.insight}
              </p>
            ) : null}
          </div>

          <div className="space-y-8 px-5 py-6 md:px-7 md:py-8">
            {/* Primary CTA */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Best next step
              </h3>
              <Link
                href={primary.href}
                className="mt-3 flex flex-col gap-3 rounded-2xl border border-[#0284C7]/40 bg-[#0284C7] p-5 text-white shadow-sm transition-colors hover:bg-[#1E3A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                    {QUESTION_LABELS[primary.question]}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{primary.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/90">
                    {primary.description}
                  </p>
                </div>
                <span className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-xl bg-white/15 px-4 text-sm font-semibold sm:self-center">
                  Open tool
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            </section>

            {/* Ordered steps */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Ordered research steps
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Up to five live tools — coverage understanding, local options, then verification.
              </p>
              <ol className="mt-4 space-y-2">
                {result.steps.map((stepItem, index) => (
                  <li key={stepItem.id + stepItem.href}>
                    <Link
                      href={stepItem.href}
                      className="group flex gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-[#0284C7]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 group-hover:bg-[#E0F2FE] group-hover:text-[#0284C7]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0284C7]">
                          {QUESTION_LABELS[stepItem.question]}
                        </p>
                        <p className="font-semibold text-slate-900">
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

            {/* Three-question grouping */}
            <section className="grid gap-3 sm:grid-cols-3">
              {(['need', 'options', 'verify'] as const).map((q) => (
                <div
                  key={q}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {QUESTION_LABELS[q]}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {(byQuestion[q].length ? byQuestion[q] : []).map((s) => (
                      <li key={s.id}>
                        <Link
                          href={s.href}
                          className="font-medium text-[#0284C7] hover:underline"
                        >
                          {s.title}
                        </Link>
                      </li>
                    ))}
                    {byQuestion[q].length === 0 ? (
                      <li className="text-slate-500">See ordered steps above</li>
                    ) : null}
                  </ul>
                </div>
              ))}
            </section>

            {/* Secondary CTAs */}
            {secondary.length > 0 ? (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Related tools
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {secondary.map((s) => (
                    <Link
                      key={s.id}
                      href={s.href}
                      className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/40"
                    >
                      {s.title}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <SaveCalculatorButton
                calculatorId="needs_assessment"
                title={`Coverage Compass · ${result.situationLabel}`}
                snapshot={{
                  summaryText: [
                    result.summary,
                    result.zip ? `ZIP ${result.zip}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                  sourcePath: '/tools/coverage-compass',
                  inputs: {
                    zip: result.zip,
                    situationKey: result.situationKey,
                    situationLabel: result.situationLabel,
                  },
                  outputs: {
                    recommendedPathIds: result.recommendedPathIds,
                    primaryPathId: result.primaryPathId,
                    educational: true,
                  },
                }}
                sendEmail
              />
              <Button type="button" variant="outline" onClick={reset} className="min-h-[44px]">
                Start over
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setResult(null);
                  setPhase('location');
                }}
                className="min-h-[44px]"
              >
                Change location
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs leading-relaxed text-slate-600">
              <p className="font-semibold text-slate-800">Honesty notes</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                <li>Educational research only — not insurance advice or a quote.</li>
                <li>No lead selling and no paid placements on these paths.</li>
                <li>
                  Official enrollment happens on HealthCare.gov, state Marketplaces, Medicare.gov,
                  or with a licensed professional you choose.
                </li>
                <li>
                  Verified agency listings appear only when real verified inventory exists — empty
                  markets stay empty.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'location' && situationId) {
    const sit = COMPASS_SITUATIONS.find((s) => s.id === situationId);
    const zipOk = /^\d{5}$/.test(zip.trim()) || zip.trim() === '';

    return (
      <div className="space-y-5">
        <ProgressChrome progress={progress} label={progressLabel} />
        <div
          className={cn(
            'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 md:p-7',
            entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0284C7]">
            Optional location
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
            Where are you researching?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            ZIP helps us deep-link Marketplace and cost tools. Skip if you prefer a national path.
            {sit ? (
              <span className="mt-1 block font-medium text-slate-700">
                Situation: {sit.title}
              </span>
            ) : null}
          </p>

          <div className="mt-6 max-w-xs">
            <Label htmlFor="compass-zip" className="text-sm font-semibold text-slate-800">
              ZIP code (optional)
            </Label>
            <Input
              id="compass-zip"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              placeholder="12345"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              className="mt-1.5 min-h-12"
              autoComplete="postal-code"
            />
            {zip.length > 0 && zip.length < 5 ? (
              <p className="mt-1.5 text-xs text-amber-800">Enter a 5-digit ZIP, or clear to skip.</p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPhase('situation');
                setSelected(situationId);
              }}
              className="gap-1 min-h-[44px] order-2 sm:order-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row order-1 sm:order-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={() => finishLocation(true)}
              >
                Skip ZIP
              </Button>
              <Button
                type="button"
                variant="trust"
                className="min-h-[44px] gap-2"
                disabled={zip.length > 0 && zip.length < 5}
                onClick={() => finishLocation(false)}
              >
                Show my path
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {!zipOk && zip.length >= 5 ? null : null}
        </div>
      </div>
    );
  }

  // Situation phase
  return (
    <div className="space-y-5">
      <ProgressChrome progress={progress} label={progressLabel} />
      <div
        className={cn(
          'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 md:p-7',
          entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0284C7]">
          Your situation
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
          What best describes where you are right now?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Pick one — we’ll route you to live research tools (not a quote funnel).
        </p>

        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {COMPASS_SITUATIONS.map((opt) => {
            const Icon = ICON_MAP[opt.icon] ?? Compass;
            const isOn = selected === opt.id || situationId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => chooseSituation(opt.id)}
                className={cn(
                  'group flex min-h-[72px] items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all',
                  'hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/40 hover:shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2',
                  isOn
                    ? 'border-[#0284C7] bg-[#E0F2FE]/70 shadow-sm ring-1 ring-[#E0F2FE]'
                    : 'border-slate-200 bg-white'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                    isOn
                      ? 'bg-[#0284C7] text-white'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-[#E0F2FE] group-hover:text-[#0284C7]'
                  )}
                >
                  {isOn ? <Check className="h-5 w-5" aria-hidden /> : <Icon className="h-5 w-5" />}
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

        <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
          Educational only · No lead selling · Official enrollment stays on official pathways
        </p>
      </div>
    </div>
  );
}

function ProgressChrome({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0284C7]">
            <Compass className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Coverage Compass</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
        <p className="text-sm font-semibold tabular-nums text-[#0284C7]">{progress}%</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0284C7] to-[#1E3A8A] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/** Back-compat alias */
export { CoverageCompassTool as NeedsAssessmentTool };
