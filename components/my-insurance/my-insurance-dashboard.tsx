'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Calculator,
  GitCompare,
  LogIn,
  LogOut,
  Mail,
  MessageSquare,
  Pill,
  Star,
  Trash2,
} from 'lucide-react';
import type {
  DrugBasketWithItems,
  MyInsuranceDashboardData,
} from '@/lib/my-insurance/types';
import { CALCULATOR_LABELS, type CalculatorToolId } from '@/lib/my-insurance/types';
import {
  ACA_SUBSIDY_PATH,
  COMPARE_PATH,
  COST_ESTIMATOR_PATH,
  DRUG_BASKET_PATH,
} from '@/lib/my-insurance/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMyInsurance } from '@/components/my-insurance/my-insurance-provider';
import {
  deleteCalculatorResultAction,
  deleteComparisonAction,
  deleteDrugBasketAction,
  deleteMyReviewAction,
  emailDrugBasketAction,
  getDrugBasketAction,
  removeDrugBasketItemAction,
  signOutAction,
} from '@/actions/my-insurance';
import {
  clearLocalAccountDrugBasket,
  loadLocalAccountDrugBasket,
} from '@/lib/my-insurance/drug-basket-local';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { GuestInsuranceHq } from '@/components/my-insurance/guest-insurance-hq';
import { ResearchWalletPanel } from '@/components/my-insurance/research-wallet-panel';
import { extractMarketplaceResearch } from '@/lib/marketplace/research-snapshot';

type Props = {
  initial: MyInsuranceDashboardData | null;
};

function calcLabel(id: string): string {
  return CALCULATOR_LABELS[id as CalculatorToolId] || id;
}

function sourcePathForCalc(id: string, snapshotPath?: string): string {
  if (snapshotPath) return snapshotPath;
  if (id === 'aca_subsidy') return ACA_SUBSIDY_PATH;
  if (id === 'aca_plan_explorer') return '/tools/aca-plan-explorer';
  if (id === 'cost_estimator') return COST_ESTIMATOR_PATH;
  return '/tools';
}

/**
 * Single HQ surface for guest + signed-in:
 * GuestInsuranceHq always owns plan/shortlist/compare chips (local store).
 * Signed-in adds identity + optional cloud extras (never replaces local with empty).
 */
export function MyInsuranceDashboard({ initial }: Props) {
  const { user, loading, openAuth, syncAuthContinuity } = useMyInsurance();
  const router = useRouter();
  const data = initial;

  // Once per signed-in user on this mount: merge so SSR empty cloud cannot hide local.
  const syncedUserId = useRef<string | null>(null);
  useEffect(() => {
    if (loading || !user) return;
    if (syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;
    void syncAuthContinuity({ announce: false }).then(() => router.refresh());
  }, [loading, user, syncAuthContinuity, router]);

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border bg-slate-50 p-10 text-center text-sm text-slate-500">
        Loading Insurance HQ...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Account strip */}
      {user ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E0F2FE] bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-600">
              Signed in as <span className="font-medium text-slate-900">{user.email}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Research workspace only — tools still work without signing in. Guest saves on this
              device stay when you sign out.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={async () => {
              await signOutAction();
              toast.message('Signed out — your research stays on this device');
              router.refresh();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      ) : (
        <Card className="border-[#0284C7]/30 bg-[#E0F2FE]/40 shadow-none">
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Sign in (optional)</p>
              <p className="mt-1 text-sm text-slate-600">
                Research workspace only — tools still work without signing in. Magic link is for
                restoring your research wallet on another device; contents are not sold as leads.
              </p>
            </div>
            <Button
              className="gap-2 bg-[#0284C7] hover:bg-[#1E3A8A]"
              onClick={() => openAuth({ redirectPath: '/my-insurance' })}
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phase 11 — Marketplace research wallet (guest local + optional cloud) */}
      <ResearchWalletPanel />

      {/* Core agency shortlist passport — same for guest and signed-in */}
      <GuestInsuranceHq />

      {/* Cloud extras (signed-in only) — additive, never a replacement for empty shortlist */}
      {user ? (
        <div className="space-y-10 border-t border-slate-200 pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Signed-in extras (optional cloud)
          </p>

          {/* Saved comparisons */}
          <CloudComparisons comparisons={data?.comparisons ?? []} onRefresh={() => router.refresh()} />

          {/* Reviews */}
          <CloudReviews reviews={data?.myReviews ?? []} onRefresh={() => router.refresh()} />

          {/* Drug basket */}
          <CloudDrugBasket
            basket={data?.drugBasket ?? null}
            onRefresh={() => router.refresh()}
          />

          {/* Calculator results */}
          <CloudCalculators
            rows={data?.calculatorResults ?? []}
            onRefresh={() => router.refresh()}
          />
        </div>
      ) : null}
    </div>
  );
}

function CloudComparisons({
  comparisons,
  onRefresh,
}: {
  comparisons: NonNullable<MyInsuranceDashboardData['comparisons']>;
  onRefresh: () => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <GitCompare className="h-5 w-5 text-[#0284C7]" />
          Saved comparisons
        </h2>
        <span className="text-sm text-slate-500">{comparisons.length}</span>
      </div>
      {comparisons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-slate-600">
              Save a side-by-side comparison from Compare when signed in.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={COMPARE_PATH}>Open compare</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-2xl border bg-white shadow-sm">
          {comparisons.map((c) => {
            const slugs = c.items.map((i) => i.provider_slug);
            const href = `${COMPARE_PATH}?${slugs.map((s) => `add=${encodeURIComponent(s)}`).join('&')}&id=${c.id}`;
            return (
              <li
                key={c.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">{c.title}</p>
                  <p className="text-sm text-slate-600">
                    {c.items.map((i) => i.provider_name).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={href}>Open</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const res = await deleteComparisonAction(c.id);
                      if (res.ok) {
                        toast.success('Comparison removed');
                        onRefresh();
                      } else toast.error(res.error);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CloudReviews({
  reviews,
  onRefresh,
}: {
  reviews: NonNullable<MyInsuranceDashboardData['myReviews']>;
  onRefresh: () => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <MessageSquare className="h-5 w-5 text-[#0284C7]" />
          My reviews
        </h2>
        <span className="text-sm text-slate-500">{reviews.length}</span>
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-slate-500">No reviews yet. Leave one from an agency profile.</p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-white shadow-sm">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {r.rating}
                </span>
                <p className="mt-1 font-semibold text-slate-900">
                  {r.provider_name || 'Agency'}
                  {r.title ? ` - ${r.title}` : ''}
                </p>
                <p className="mt-1 line-clamp-3 text-sm text-slate-600">{r.content}</p>
              </div>
              <div className="flex gap-2">
                {r.provider_slug ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/providers/${r.provider_slug}`}>Profile</Link>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    const res = await deleteMyReviewAction(r.id);
                    if (res.ok) {
                      toast.success('Review removed');
                      onRefresh();
                    } else toast.error(res.error);
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CloudDrugBasket({
  basket: initialBasket,
  onRefresh,
}: {
  basket: MyInsuranceDashboardData['drugBasket'];
  onRefresh: () => void;
}) {
  const { user } = useMyInsurance();
  const [basket, setBasket] = useState<DrugBasketWithItems | null>(initialBasket);
  const [loadingBasket, setLoadingBasket] = useState(false);

  // Re-fetch from server so stale RSC `initial` cannot hide a just-saved basket.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setBasket(null);
        return;
      }
      setLoadingBasket(true);
      try {
        const res = await getDrugBasketAction();
        if (cancelled) return;
        if (res.ok && res.basket?.items?.length) {
          setBasket(res.basket);
          return;
        }
        // Fall back to device mirror of last successful account save
        const local = loadLocalAccountDrugBasket(user.id);
        if (local?.items?.length) {
          setBasket({
            id: local.basketId || 'local-mirror',
            user_id: user.id,
            name: local.basketName,
            created_at: local.updatedAt,
            updated_at: local.updatedAt,
            items: local.items.map((item, i) => ({
              id: `local-${i}-${item.name}`,
              basket_id: local.basketId || 'local-mirror',
              name: item.name,
              strength: item.strength,
              form: item.form || 'Tablet',
              dosage: item.dosage,
              quantity: item.quantity ?? null,
              notes: item.notes ?? null,
              sort_order: item.sort_order ?? i,
              created_at: local.updatedAt,
            })),
          });
          return;
        }
        if (res.ok) setBasket(res.basket);
        else if (initialBasket) setBasket(initialBasket);
      } finally {
        if (!cancelled) setLoadingBasket(false);
      }
    }

    void load();
    const onMirror = () => {
      void load();
    };
    window.addEventListener('ith-my-insurance-drug-basket', onMirror);
    return () => {
      cancelled = true;
      window.removeEventListener('ith-my-insurance-drug-basket', onMirror);
    };
  }, [user, initialBasket]);

  const items = basket?.items ?? [];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Pill className="h-5 w-5 text-[#0284C7]" />
          Prescription drug basket
        </h2>
        <span className="text-sm text-slate-500">
          {loadingBasket && items.length === 0 ? '…' : items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <Pill className="h-8 w-8 text-slate-300" />
            <p className="font-medium text-slate-800">No medications saved yet</p>
            <p className="text-sm text-slate-600">
              Build a list on the prescription tool, then use Save to My Insurance.
            </p>
            <Button asChild size="sm" className="bg-[#0284C7] hover:bg-[#1E3A8A]">
              <Link href={`${DRUG_BASKET_PATH}?from=hq`}>Build drug basket</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E0F2FE] bg-[#E0F2FE]/50 px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">
                {basket?.name || 'My prescriptions'}
              </p>
              <p className="text-xs text-slate-500">
                {items.length} medication{items.length === 1 ? '' : 's'}
                {basket?.updated_at
                  ? ` · Updated ${new Date(basket.updated_at).toLocaleString()}`
                  : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`${DRUG_BASKET_PATH}?load=account`}>Edit list</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={async () => {
                  const res = await emailDrugBasketAction();
                  if (res.ok) toast.success('Basket emailed to you');
                  else toast.error(res.error);
                }}
              >
                <Mail className="h-3.5 w-3.5" />
                Email me
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-rose-700"
                onClick={async () => {
                  if (
                    !window.confirm(
                      'Delete your account prescription basket? This cannot be undone.'
                    )
                  ) {
                    return;
                  }
                  const res = await deleteDrugBasketAction();
                  if (res.ok) {
                    clearLocalAccountDrugBasket();
                    setBasket(null);
                    toast.success('Basket removed');
                    onRefresh();
                  } else toast.error(res.error);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete basket
              </Button>
            </div>
          </div>
          <ul className="divide-y rounded-2xl border bg-white shadow-sm">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.name}{' '}
                    <span className="font-normal text-slate-600">{item.strength}</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    {item.form} · {item.dosage}
                  </p>
                  {item.quantity ? (
                    <p className="text-xs text-slate-500">Qty / supply: {item.quantity}</p>
                  ) : null}
                  {item.notes ? (
                    <p className="text-xs italic text-slate-500">Note: {item.notes}</p>
                  ) : null}
                </div>
                {!String(item.id).startsWith('local-') ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const res = await removeDrugBasketItemAction(item.id);
                      if (res.ok) {
                        toast.success('Removed');
                        const next = await getDrugBasketAction();
                        if (next.ok) setBasket(next.basket);
                        onRefresh();
                      } else toast.error(res.error);
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CloudCalculators({
  rows,
  onRefresh,
}: {
  rows: NonNullable<MyInsuranceDashboardData['calculatorResults']>;
  onRefresh: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Calculator className="h-5 w-5 text-[#0284C7]" />
          Saved plan research
        </h2>
        <span className="text-sm text-slate-500">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-slate-600">No saved research yet</p>
            <p className="text-xs text-slate-500">
              Run a planner, then use &ldquo;Save to My Insurance&rdquo; on the results.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={COST_ESTIMATOR_PATH}>Cost planner</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={ACA_SUBSIDY_PATH}>ACA subsidy planner</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-2xl border bg-white shadow-sm">
          {rows.map((row) => {
            const research = extractMarketplaceResearch(row.snapshot);
            const summary =
              research?.costSummary ||
              research?.assistanceSummary ||
              (row.snapshot?.summaryText as string | undefined) ||
              row.title;
            const path = sourcePathForCalc(
              row.calculator_id,
              row.snapshot?.sourcePath as string | undefined
            );
            const market =
              research?.marketLabel ||
              (row.zip
                ? [row.county, row.state, row.zip].filter(Boolean).join(' · ')
                : null) ||
              (typeof row.snapshot?.inputs?.displayLabel === 'string'
                ? row.snapshot.inputs.displayLabel
                : null);
            const planCount =
              research?.marketSnapshot?.planCount ??
              (typeof row.snapshot?.outputs?.marketSnapshot === 'object' &&
              row.snapshot.outputs.marketSnapshot &&
              typeof (row.snapshot.outputs.marketSnapshot as { planCount?: number })
                .planCount === 'number'
                ? (row.snapshot.outputs.marketSnapshot as { planCount: number }).planCount
                : null);
            const issuerCount = research?.marketSnapshot?.issuerCount ?? null;
            const usedLive =
              research?.usedLiveMarketplace ?? row.used_live_marketplace ?? null;
            const expanded = openId === row.id;
            const dateLabel = new Date(row.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <li key={row.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{dateLabel}</p>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-[#0284C7]">
                      {calcLabel(row.calculator_id)}
                    </p>
                    <p className="mt-0.5 font-semibold text-slate-900">{row.title}</p>
                    {market ? (
                      <p className="mt-1 text-sm text-slate-600">{market}</p>
                    ) : null}
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{summary}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      {usedLive === true ? (
                        <span className="rounded-full bg-[#E0F2FE] px-2 py-0.5 font-medium text-[#0A2540]">
                          Live Marketplace landscape
                          {planCount != null ? ` · ${planCount} plans` : ''}
                          {issuerCount != null ? ` · ${issuerCount} issuers` : ''}
                        </span>
                      ) : usedLive === false ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                          Educational baseline
                        </span>
                      ) : null}
                      {research?.planYear || row.plan_year ? (
                        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600">
                          Plan year {research?.planYear ?? row.plan_year}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => setOpenId(expanded ? null : row.id)}
                    >
                      {expanded ? 'Hide details' : 'View details'}
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={path}>Re-run tool</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      className="text-slate-600"
                      onClick={async () => {
                        const res = await deleteCalculatorResultAction(row.id);
                        if (res.ok) {
                          toast.success('Deleted');
                          onRefresh();
                        } else toast.error(res.error);
                      }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Delete
                    </Button>
                  </div>
                </div>
                {expanded ? (
                  <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm text-slate-700">
                    {research?.assistanceSummary ? (
                      <p>{research.assistanceSummary}</p>
                    ) : null}
                    {research?.researchPaths && research.researchPaths.length > 0 ? (
                      <ul className="space-y-2">
                        {research.researchPaths.map((p) => (
                          <li
                            key={p.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          >
                            <p className="font-semibold text-slate-900">{p.label}</p>
                            {p.metal ? (
                              <p className="text-[#0284C7]">{p.metal}-style</p>
                            ) : null}
                            {p.premiumMonthly != null ? (
                              <p className="mt-0.5">
                                ~${Math.round(p.premiumMonthly).toLocaleString()}/mo
                                {p.issuerName ? ` · ${p.issuerName}` : ''}
                              </p>
                            ) : null}
                            {p.planName ? (
                              <p className="text-slate-500">{p.planName}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      Educational research only — verify final prices and enroll on{' '}
                      <a
                        href="https://www.healthcare.gov"
                        className="font-medium text-[#0284C7] hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        HealthCare.gov
                      </a>
                      .
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
