'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Building2,
  FileText,
  FolderOpen,
  GitCompare,
  MapPin,
  Plus,
  Settings2,
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
  getHistory,
  getLastSaveError,
  getProvidersForPlan,
  getResearching,
  getShortlisted,
  listActivePlans,
  loadMyInsuranceStore,
  removeProviderFromPlan,
  setActivePlan,
  SHORTLIST_CAP,
  shortlistReplacing,
  shortlistWithDemoteOldest,
  updatePlan,
  updateSavedProviderStatus,
} from '@/lib/my-insurance/storage';
import {
  addToCompareTray,
  clearCompareTray,
  getCompareTray,
} from '@/lib/my-insurance/compare-storage';
import { COMPARE_PATH } from '@/lib/my-insurance/constants';
import { ShortlistFullPanel } from '@/components/my-insurance/shortlist-full-panel';
import { CompareProviderButton } from '@/components/my-insurance/compare-provider-button';
import { toast } from 'sonner';
import { TrustMark } from '@/components/network/trust-mark';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

/**
 * Phase A guest-first Insurance HQ — durable plan + shortlist in localStorage.
 * Research only; no lead-gen.
 */
export function GuestInsuranceHq() {
  const router = useRouter();
  const [plan, setPlan] = useState<CoveragePlan | null>(null);
  const [providers, setProviders] = useState<SavedProvider[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [compareCount, setCompareCount] = useState(0);
  const [compareHref, setCompareHref] = useState(COMPARE_PATH);
  const [label, setLabel] = useState('');
  const [zip, setZip] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [notes, setNotes] = useState('');
  const [focus, setFocus] = useState<ProtectFocus[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [openPlans, setOpenPlans] = useState<CoveragePlan[]>([]);
  const [fullPanel, setFullPanel] = useState<{
    shortlisted: SavedProvider[];
    pendingId: string;
    pendingName: string;
  } | null>(null);

  const refresh = useCallback(() => {
    const store = loadMyInsuranceStore();
    const active = getActivePlan(store);
    setPlan(active);
    setOpenPlans(listActivePlans(store));
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
    const tray = getCompareTray();
    setCompareCount(tray.length);
    setCompareHref(
      tray.length > 0
        ? `${COMPARE_PATH}?${tray.map((t) => `add=${encodeURIComponent(t.slug)}`).join('&')}`
        : COMPARE_PATH
    );
  }, []);

  useEffect(() => {
    ensureActivePlan({ label: 'My coverage research' });
    refresh();
    setHydrated(true);
    const onStore = () => refresh();
    window.addEventListener('ith-my-insurance-store', onStore);
    window.addEventListener('ith-compare-tray', onStore);
    window.addEventListener('storage', onStore);
    return () => {
      window.removeEventListener('ith-my-insurance-store', onStore);
      window.removeEventListener('ith-compare-tray', onStore);
      window.removeEventListener('storage', onStore);
    };
  }, [refresh]);

  const shortlisted = useMemo(() => getShortlisted(providers), [providers]);

  function loadShortlistIntoCompare() {
    const list = getShortlisted(providers).slice(0, 4);
    if (list.length < 2) {
      toast.error('Shortlist at least 2 agencies to compare');
      return;
    }
    clearCompareTray();
    for (const p of list) {
      addToCompareTray({ slug: p.providerSlug, name: p.providerName });
    }
    const qs = list.map((p) => `add=${encodeURIComponent(p.providerSlug)}`).join('&');
    router.push(`${COMPARE_PATH}?${qs}`);
  }

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
        Loading Insurance HQ...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Secondary rooms — Setup · Report · Compare (one HQ home, not second nav homes) */}
      <nav
        aria-label="My Insurance sections"
        className="order-1 flex flex-wrap gap-2"
      >
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/my-insurance/plans">
            <FolderOpen className="h-3.5 w-3.5" aria-hidden />
            All plans
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/my-insurance/setup">
            <Settings2 className="h-3.5 w-3.5" aria-hidden />
            Setup
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/my-insurance/report">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Report
          </Link>
        </Button>
        {compareCount >= 2 ? (
          <Button asChild size="sm" className="gap-1.5 bg-[#0284C7] hover:bg-[#1E3A8A]">
            <Link href={compareHref}>
              <GitCompare className="h-3.5 w-3.5" aria-hidden />
              Compare ({compareCount})
            </Link>
          </Button>
        ) : shortlisted.length >= 2 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={loadShortlistIntoCompare}
          >
            <GitCompare className="h-3.5 w-3.5" aria-hidden />
            Compare shortlist ({shortlisted.length})
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href={COMPARE_PATH}>
              <GitCompare className="h-3.5 w-3.5" aria-hidden />
              Compare{compareCount === 1 ? ' (add 1 more)' : ''}
            </Link>
          </Button>
        )}
      </nav>

      <details className="order-3 rounded-2xl border border-[#E0F2FE] bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-6 py-4 text-sm font-semibold text-slate-800">
          Plan settings (optional) · guest-saved on this device
        </summary>
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3 pt-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">
                Active plan
              </p>
              <CardTitle className="text-xl text-slate-900">
                {plan?.label || 'Coverage research plan'}
              </CardTitle>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Guest-saved on this device. Shortlist and report attach to this plan only. Research
                only - not a quote marketplace.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {openPlans.length > 1 ? (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="sr-only">Switch plan</span>
                  <select
                    className="h-9 max-w-[14rem] rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-800"
                    value={plan?.id ?? ''}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) return;
                      setActivePlan(id);
                      toast.message('Switched active plan');
                      refresh();
                    }}
                    aria-label="Switch active plan"
                  >
                    {openPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <Link href="/my-insurance/plans">All plans</Link>
              </Button>
            </div>
          </div>
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
                          ? 'border-[#0284C7] bg-[#E0F2FE] text-[#0A2540]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-[#0284C7]/40'
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
            <Button type="button" className="bg-[#0284C7] hover:bg-[#1E3A8A]" onClick={persistPlanFields}>
              Save plan on this device
            </Button>
            {(getShortlisted(providers).length > 0 ||
              (plan?.toolSnapshots?.length ?? 0) > 0) && (
              <Button type="button" variant="default" className="bg-slate-900 hover:bg-slate-800" asChild>
                <Link href="/my-insurance/report">View report</Link>
              </Button>
            )}
            <Button type="button" variant="outline" asChild>
              <Link href="/my-insurance/setup">Guided setup</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/directory?verified=true">
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
              Shortlist {getShortlisted(providers).length}/3 ·{' '}
              {plan.toolSnapshots?.length ?? 0} tool save
              {(plan.toolSnapshots?.length ?? 0) === 1 ? '' : 's'} · Updated{' '}
              {new Date(plan.updatedAt).toLocaleString()}
            </p>
          ) : null}
        </CardContent>
      </Card>
      </details>

      <div className="order-2 space-y-6">
      {providers.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-10 text-center">
            <Building2 className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
            <p className="mt-2 font-medium text-slate-800">No saved providers yet</p>
            <p className="mt-1 text-sm text-slate-600">
              Save agencies from the directory (Researching) or shortlist from a profile (max{' '}
              {SHORTLIST_CAP}).
            </p>
            <Button asChild className="mt-4 bg-[#0284C7] hover:bg-[#1E3A8A]">
              <Link href="/directory?verified=true">Browse verified directory</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <ProviderBucket
            title={`Your shortlist (${getShortlisted(providers).length}/${SHORTLIST_CAP})`}
            hint="Top candidates — max 3. Promote carefully."
            items={getShortlisted(providers)}
            planId={plan?.id}
            empty="No shortlisted agencies yet. Promote from Researching or shortlist on a profile."
            onStatus={(id, status, name) => {
              const res = updateSavedProviderStatus(id, status);
              if (res && 'ok' in res && res.ok === false && res.reason === 'shortlist_full') {
                setFullPanel({
                  shortlisted: res.shortlisted,
                  pendingId: id,
                  pendingName: name,
                });
              } else {
                refresh();
              }
            }}
            onRemove={(slug) => {
              removeProviderFromPlan(slug, plan?.id);
              refresh();
            }}
          />
          <ProviderBucket
            title={`Still researching (${getResearching(providers).length})`}
            hint="Directory saves land here by default."
            items={getResearching(providers)}
            planId={plan?.id}
            empty="Nothing in researching — save from the directory to explore more agencies."
            onStatus={(id, status, name) => {
              const res = updateSavedProviderStatus(id, status);
              if (res && 'ok' in res && res.ok === false && res.reason === 'shortlist_full') {
                setFullPanel({
                  shortlisted: res.shortlisted,
                  pendingId: id,
                  pendingName: name,
                });
              } else {
                refresh();
              }
            }}
            onRemove={(slug) => {
              removeProviderFromPlan(slug, plan?.id);
              refresh();
            }}
          />
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setHistoryOpen((v) => !v)}
                aria-expanded={historyOpen}
              >
                <CardTitle className="text-base">
                  Reached out / done ({getHistory(providers).length})
                </CardTitle>
                <span className="text-xs font-medium text-slate-500">
                  {historyOpen ? 'Hide' : 'Show'}
                </span>
              </button>
            </CardHeader>
            {historyOpen ? (
              <CardContent>
                {getHistory(providers).length === 0 ? (
                  <p className="text-sm text-slate-500">No history yet.</p>
                ) : (
                  <ProviderList
                    items={getHistory(providers)}
                    planId={plan?.id}
                    onStatus={(id, status, name) => {
                      const res = updateSavedProviderStatus(id, status);
                      if (res && 'ok' in res && res.ok === false && res.reason === 'shortlist_full') {
                        setFullPanel({
                          shortlisted: res.shortlisted,
                          pendingId: id,
                          pendingName: name,
                        });
                      } else {
                        refresh();
                      }
                    }}
                    onRemove={(slug) => {
                      removeProviderFromPlan(slug, plan?.id);
                      refresh();
                    }}
                  />
                )}
              </CardContent>
            ) : null}
          </Card>
        </>
      )}
      </div>

      <div className="order-4 space-y-6">
      {fullPanel ? (
        <ShortlistFullPanel
          shortlisted={fullPanel.shortlisted}
          incomingName={fullPanel.pendingName}
          onCancel={() => setFullPanel(null)}
          onDemoteOldest={() => {
            const p = providers.find((x) => x.id === fullPanel.pendingId);
            if (p) {
              shortlistWithDemoteOldest({
                providerSlug: p.providerSlug,
                providerName: p.providerName,
                profilePath: p.profilePath,
                status: 'shortlisted',
              });
            }
            setFullPanel(null);
            refresh();
          }}
          onReplace={(slug) => {
            const p = providers.find((x) => x.id === fullPanel.pendingId);
            if (p) {
              shortlistReplacing(
                {
                  providerSlug: p.providerSlug,
                  providerName: p.providerName,
                  profilePath: p.profilePath,
                  status: 'shortlisted',
                },
                slug
              );
            }
            setFullPanel(null);
            refresh();
          }}
          onSaveAsResearching={() => {
            const p = providers.find((x) => x.id === fullPanel.pendingId);
            if (p) {
              updateSavedProviderStatus(p.id, 'researching');
            }
            setFullPanel(null);
            refresh();
          }}
        />
      ) : null}

      <div className="rounded-xl border bg-muted/20 px-4 py-4 text-sm text-slate-600">
        <p className="flex items-start gap-2">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#0284C7]" aria-hidden />
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
    </div>
  );
}

function ProviderBucket({
  title,
  hint,
  items,
  planId,
  empty,
  onStatus,
  onRemove,
}: {
  title: string;
  hint: string;
  items: SavedProvider[];
  planId?: string;
  empty: string;
  onStatus: (id: string, status: ProviderResearchStatus, name: string) => void;
  onRemove: (slug: string) => void;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bookmark className="h-5 w-5 text-[#0284C7]" aria-hidden />
          {title}
        </CardTitle>
        <p className="text-sm text-slate-600">{hint}</p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{empty}</p>
        ) : (
          <ProviderList items={items} planId={planId} onStatus={onStatus} onRemove={onRemove} />
        )}
      </CardContent>
    </Card>
  );
}

function ProviderList({
  items,
  planId,
  onStatus,
  onRemove,
}: {
  items: SavedProvider[];
  planId?: string;
  onStatus: (id: string, status: ProviderResearchStatus, name: string) => void;
  onRemove: (slug: string) => void;
}) {
  return (
    <ul className="space-y-3">
      {items.map((p) => (
        <li
          key={p.id}
          className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <Link
              href={p.profilePath || `/providers/${p.providerSlug}`}
              className="font-semibold text-slate-900 hover:text-[#0284C7] hover:underline"
            >
              {p.providerName}
            </Link>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              {p.city || p.state ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {[p.city, p.state].filter(Boolean).join(', ')}
                </span>
              ) : null}
              {p.licenseSummary ? (
                <span className="inline-flex items-center rounded-full bg-[#E0F2FE] px-2 py-0.5 font-medium text-[#0A2540]">
                  {p.licenseSummary}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  Verified research listing
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`status-${p.id}`}>
              Status for {p.providerName}
            </label>
            <select
              id={`status-${p.id}`}
              value={p.status}
              onChange={(e) =>
                onStatus(p.id, e.target.value as ProviderResearchStatus, p.providerName)
              }
              className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"
            >
              {PROVIDER_STATUS_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <CompareProviderButton
              providerSlug={p.providerSlug}
              providerName={p.providerName}
              size="sm"
            />
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
              onClick={() => onRemove(p.providerSlug)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              <span className="sr-only">Remove</span>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
