'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Building2,
  MapPin,
  Plus,
  Shield,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import {
  PROTECT_FOCUS_OPTIONS,
  PROVIDER_STATUS_OPTIONS,
  type CoveragePlan,
  type ProtectFocus,
  type ProviderResearchStatus,
  type SavedProvider,
} from '@/lib/my-insurance/plan-types';
import {
  ensureActivePlan,
  getActivePlan,
  getLastSaveError,
  getProvidersForPlan,
  loadMyInsuranceStore,
  removeProviderFromPlan,
  updatePlan,
  updateSavedProviderStatus,
} from '@/lib/my-insurance/storage';
import { toast } from 'sonner';
import { TrustMark } from '@/components/network/trust-mark';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Phase A guest-first Insurance HQ — durable plan + shortlist in localStorage.
 * Research only; no lead-gen.
 */
export function GuestInsuranceHq() {
  const [plan, setPlan] = useState<CoveragePlan | null>(null);
  const [providers, setProviders] = useState<SavedProvider[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [label, setLabel] = useState('');
  const [zip, setZip] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [notes, setNotes] = useState('');
  const [focus, setFocus] = useState<ProtectFocus[]>([]);

  const refresh = useCallback(() => {
    const store = loadMyInsuranceStore();
    const active = getActivePlan(store);
    setPlan(active);
    if (active) {
      setProviders(getProvidersForPlan(active.id, store));
      setLabel(active.label);
      setZip(active.location?.zip ?? '');
      setStateCode(active.location?.state ?? '');
      setNotes(active.notes ?? '');
      setFocus(active.protectFocus ?? []);
    } else {
      setProviders([]);
    }
  }, []);

  useEffect(() => {
    ensureActivePlan({ label: 'My coverage research' });
    refresh();
    setHydrated(true);
    const onStore = () => refresh();
    window.addEventListener('ith-my-insurance-store', onStore);
    window.addEventListener('storage', onStore);
    return () => {
      window.removeEventListener('ith-my-insurance-store', onStore);
      window.removeEventListener('storage', onStore);
    };
  }, [refresh]);

  const locationLabel = useMemo(() => {
    const parts = [zip, stateCode].filter(Boolean);
    return parts.join(' · ') || undefined;
  }, [zip, stateCode]);

  function persistPlanFields() {
    const active = ensureActivePlan();
    updatePlan(active.id, {
      label: label.trim() || 'My coverage research',
      protectFocus: focus,
      notes: notes.trim() || undefined,
      location: {
        zip: zip.trim() || undefined,
        state: stateCode.trim().toUpperCase().slice(0, 2) || undefined,
        label: locationLabel,
      },
    });
    const err = getLastSaveError();
    if (err) {
      toast.error(err);
    }
    refresh();
  }

  function toggleFocus(id: ProtectFocus) {
    setFocus((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (!hydrated) {
    return (
      <div className="animate-pulse rounded-2xl border bg-slate-50 p-10 text-center text-sm text-slate-500">
        Loading Insurance HQ…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-100 shadow-sm">
        <CardHeader className="pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            Active plan
          </p>
          <CardTitle className="text-xl text-slate-900">Coverage research plan</CardTitle>
          <p className="text-sm leading-relaxed text-slate-600">
            Guest-saved on this device. Edit details below or start from the directory. Research
            only — not a quote marketplace.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="plan-label">Plan label</Label>
              <Input
                id="plan-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={persistPlanFields}
                placeholder="e.g. Home + auto — Austin TX"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="plan-zip">ZIP (optional)</Label>
              <Input
                id="plan-zip"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                onBlur={persistPlanFields}
                placeholder="78701"
                className="mt-1"
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor="plan-state">State (optional)</Label>
              <Input
                id="plan-state"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value.toUpperCase().slice(0, 2))}
                onBlur={persistPlanFields}
                placeholder="TX"
                className="mt-1"
                maxLength={2}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-800">What are you trying to protect?</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {PROTECT_FOCUS_OPTIONS.map((opt) => {
                const on = focus.includes(opt.id);
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => {
                        toggleFocus(opt.id);
                      }}
                      onBlur={persistPlanFields}
                      className={cn(
                        'inline-flex min-h-10 items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                        on
                          ? 'border-teal-600 bg-teal-50 text-teal-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
                      )}
                      aria-pressed={on}
                    >
                      {opt.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <Label htmlFor="plan-notes">Notes (optional)</Label>
            <textarea
              id="plan-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={persistPlanFields}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g. Need flood context; Medicare-age parent on household plan"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={persistPlanFields}>
              Save plan on this device
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/directory">
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Browse directory
              </Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/tools">Research tools</Link>
            </Button>
          </div>

          {plan ? (
            <p className="text-xs text-slate-500">
              Plan id {plan.id.slice(0, 8)}… · Updated{' '}
              {new Date(plan.updatedAt).toLocaleString()} · Status {plan.status}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bookmark className="h-5 w-5 text-teal-700" aria-hidden />
            Saved providers
            <span className="text-sm font-normal text-slate-500">({providers.length})</span>
          </CardTitle>
          <p className="text-sm text-slate-600">
            Shortlist from agency profiles. Status is for your research tracking only.
          </p>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-8 text-center">
              <Building2 className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
              <p className="mt-2 font-medium text-slate-800">No saved providers yet</p>
              <p className="mt-1 text-sm text-slate-600">
                Save agencies from the directory or a profile to build your shortlist.
              </p>
              <Button asChild className="mt-4 bg-teal-600 hover:bg-teal-700">
                <Link href="/directory">Find licensed agencies</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {providers.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={p.profilePath || `/providers/${p.providerSlug}`}
                      className="font-semibold text-slate-900 hover:text-teal-800 hover:underline"
                    >
                      {p.providerName}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      {p.city || p.state ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden />
                          {[p.city, p.state].filter(Boolean).join(', ')}
                        </span>
                      ) : null}
                      <span className="font-mono">{p.providerSlug}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`status-${p.id}`}>
                      Status for {p.providerName}
                    </label>
                    <select
                      id={`status-${p.id}`}
                      value={p.status}
                      onChange={(e) => {
                        updateSavedProviderStatus(p.id, e.target.value as ProviderResearchStatus);
                        refresh();
                      }}
                      className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"
                    >
                      {PROVIDER_STATUS_OPTIONS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={p.profilePath || `/providers/${p.providerSlug}`}>
                        Profile <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-700 hover:bg-red-50 hover:text-red-800"
                      onClick={() => {
                        removeProviderFromPlan(p.providerSlug, plan?.id);
                        refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-muted/20 px-4 py-4 text-sm text-slate-600">
        <p className="flex items-start gap-2">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden />
          <span>
            Research only · Not an endorsement · Common ownership network · No paid placements.
            Verify licenses on state DOI / NAIC before you enroll.
          </span>
        </p>
        <div className="mt-2">
          <TrustMark />
        </div>
      </div>
    </div>
  );
}
