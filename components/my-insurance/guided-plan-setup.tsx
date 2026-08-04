'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import {
  PROTECT_FOCUS_OPTIONS,
  type ProtectFocus,
} from '@/lib/my-insurance/plan-types';
import {
  createPlan,
  ensureActivePlan,
  getActivePlan,
  getLastSaveError,
  getProvidersForPlan,
  upsertPlan,
} from '@/lib/my-insurance/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrustMark } from '@/components/network/trust-mark';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SITUATION_CHIPS = [
  { id: 'new_home', label: 'New home / purchase' },
  { id: 'shopping_rates', label: 'Shopping rates at renewal' },
  { id: 'aca_medicare', label: 'ACA / Medicare research' },
  { id: 'life_change', label: 'Life change (move, job, family)' },
] as const;

/**
 * Light guided plan setup — Phase C + D multi-plan create-as-new.
 */
export function GuidedPlanSetup() {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<ProtectFocus[]>([]);
  const [zip, setZip] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [situations, setSituations] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [createAsNew, setCreateAsNew] = useState(false);
  const [hasShortlist, setHasShortlist] = useState(false);
  const [activeLabel, setActiveLabel] = useState('My coverage research');
  const [savedLabel, setSavedLabel] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const active = ensureActivePlan({ label: 'My coverage research' });
    setActiveLabel(active.label);
    setCustomLabel(active.label);
    const providers = getProvidersForPlan(active.id);
    setHasShortlist(providers.length > 0);
    // If user already has shortlist, default to create-as-new so we don't wipe context
    setCreateAsNew(providers.length > 0);
  }, []);

  const locationLabel = useMemo(() => {
    const parts = [zip, stateCode].filter(Boolean);
    return parts.join(' · ') || undefined;
  }, [zip, stateCode]);

  const suggestedLabel = useMemo(() => {
    if (customLabel.trim()) return customLabel.trim().slice(0, 80);
    if (focus.length > 0) {
      return `Coverage plan · ${focus.slice(0, 3).join(', ')}${locationLabel ? ` · ${locationLabel}` : ''}`.slice(
        0,
        80
      );
    }
    if (locationLabel) return `Coverage research · ${locationLabel}`.slice(0, 80);
    return 'My coverage research';
  }, [customLabel, focus, locationLabel]);

  function toggleFocus(id: ProtectFocus) {
    setFocus((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSituation(id: string) {
    setSituations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function finish() {
    const situationNotes = situations
      .map((id) => SITUATION_CHIPS.find((c) => c.id === id)?.label)
      .filter(Boolean)
      .join('; ');
    const mergedNotes = [notes.trim(), situationNotes].filter(Boolean).join(' · ') || undefined;
    const label = suggestedLabel;

    if (createAsNew) {
      createPlan({
        label,
        protectFocus: focus,
        location: {
          zip: zip.trim() || undefined,
          state: stateCode.trim().toUpperCase().slice(0, 2) || undefined,
          label: locationLabel,
        },
        notes: mergedNotes,
        makeActive: true,
      });
    } else {
      const existing = getActivePlan() ?? ensureActivePlan();
      upsertPlan({
        id: existing.id,
        label,
        protectFocus: focus,
        location: {
          zip: zip.trim() || undefined,
          state: stateCode.trim().toUpperCase().slice(0, 2) || undefined,
          label: locationLabel,
        },
        notes: mergedNotes,
        status: 'active',
      });
    }

    const err = getLastSaveError();
    if (err) {
      toast.error(err);
      return;
    }
    setSavedLabel(label);
    setDone(true);
    toast.success(createAsNew ? 'New plan created on this device' : 'Coverage plan saved on this device');
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-6 text-center sm:p-8">
        <Check className="mx-auto h-10 w-10 text-teal-700" aria-hidden />
        <h2 className="mt-3 text-xl font-semibold text-slate-900">Plan ready</h2>
        <p className="mt-2 text-sm text-slate-600">
          Saved to <strong>{savedLabel}</strong>. Next: shortlist agencies, run educational tools, then
          open your research report.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild className="bg-teal-600 hover:bg-teal-700">
            <Link href="/my-insurance">Open My Insurance</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/my-insurance/plans">All plans</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/directory">Browse directory</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/my-insurance/report">View report</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
        {['Protect', 'Where', 'Situation', 'Review'].map((label, i) => (
          <span
            key={label}
            className={cn(
              'rounded-full px-3 py-1',
              i === step ? 'bg-teal-600 text-white' : i < step ? 'bg-teal-100 text-teal-900' : 'bg-slate-100'
            )}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 0 && (
        <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">What are you trying to protect?</h2>
          <p className="mt-1 text-sm text-slate-600">Select all that apply. Educational research plan only.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {PROTECT_FOCUS_OPTIONS.map((opt) => {
              const on = focus.includes(opt.id);
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => toggleFocus(opt.id)}
                    className={cn(
                      'inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold',
                      on
                        ? 'border-teal-600 bg-teal-50 text-teal-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    )}
                    aria-pressed={on}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {step === 1 && (
        <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Where are you researching?</h2>
          <p className="mt-1 text-sm text-slate-600">Optional ZIP and state — helps label your plan.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="setup-zip">ZIP</Label>
              <Input
                id="setup-zip"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="78701"
                className="mt-1"
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor="setup-state">State</Label>
              <Input
                id="setup-state"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="TX"
                className="mt-1"
                maxLength={2}
              />
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Situation (optional)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Educational context only — not underwriting and not a quote request.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {SITUATION_CHIPS.map((opt) => {
              const on = situations.includes(opt.id);
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => toggleSituation(opt.id)}
                    className={cn(
                      'inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold',
                      on
                        ? 'border-teal-600 bg-teal-50 text-teal-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    )}
                    aria-pressed={on}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <Label htmlFor="setup-notes">Notes</Label>
            <textarea
              id="setup-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Optional research notes"
            />
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Review</h2>
          <div className="mt-4">
            <Label htmlFor="setup-label">Plan label</Label>
            <Input
              id="setup-label"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value.slice(0, 80))}
              className="mt-1"
              placeholder={suggestedLabel}
            />
            <p className="mt-1 text-xs text-slate-500">Will save as: {suggestedLabel}</p>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-medium text-slate-500">Protect focus</dt>
              <dd className="text-slate-900">
                {focus.length
                  ? focus
                      .map((id) => PROTECT_FOCUS_OPTIONS.find((o) => o.id === id)?.label ?? id)
                      .join(' · ')
                  : 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Location</dt>
              <dd className="text-slate-900">{locationLabel || 'Not set'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Situation / notes</dt>
              <dd className="text-slate-900">
                {[
                  ...situations.map((id) => SITUATION_CHIPS.find((c) => c.id === id)?.label),
                  notes.trim() || null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'None'}
              </dd>
            </div>
          </dl>

          <fieldset className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">Save as</legend>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="save-mode"
                className="mt-1"
                checked={!createAsNew}
                onChange={() => setCreateAsNew(false)}
              />
              <span>
                <span className="font-medium text-slate-900">Update current plan</span>
                <span className="block text-slate-600">
                  {activeLabel}
                  {hasShortlist ? ' (keeps existing shortlist)' : ''}
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="save-mode"
                className="mt-1"
                checked={createAsNew}
                onChange={() => setCreateAsNew(true)}
              />
              <span>
                <span className="font-medium text-slate-900">Create as new plan</span>
                <span className="block text-slate-600">
                  Starts a fresh shortlist; previous plan stays in All plans
                  {hasShortlist ? ' (recommended — you already have saves)' : ''}
                </span>
              </span>
            </label>
          </fieldset>

          <p className="mt-4 text-xs text-slate-500">
            Research only · Not an endorsement · Guest-saved on this device
          </p>
          <div className="mt-2">
            <TrustMark />
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </Button>
        {step < 3 ? (
          <div className="flex flex-wrap gap-2">
            {step === 2 ? (
              <Button type="button" variant="outline" onClick={() => setStep(3)}>
                Skip
              </Button>
            ) : null}
            <Button
              type="button"
              className="gap-1 bg-teal-600 hover:bg-teal-700"
              onClick={() => setStep((s) => Math.min(3, s + 1))}
            >
              Continue <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ) : (
          <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={finish}>
            {createAsNew ? 'Create plan' : 'Save plan'}
          </Button>
        )}
      </div>
    </div>
  );
}
