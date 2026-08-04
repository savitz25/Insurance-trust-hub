'use client';

import { useEffect, useRef } from 'react';
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
import type { MyInsuranceDashboardData } from '@/lib/my-insurance/types';
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
  removeDrugBasketItemAction,
  signOutAction,
} from '@/actions/my-insurance';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { GuestInsuranceHq } from '@/components/my-insurance/guest-insurance-hq';

type Props = {
  initial: MyInsuranceDashboardData | null;
};

function calcLabel(id: string): string {
  return CALCULATOR_LABELS[id as CalculatorToolId] || id;
}

function sourcePathForCalc(id: string, snapshotPath?: string): string {
  if (snapshotPath) return snapshotPath;
  if (id === 'aca_subsidy') return ACA_SUBSIDY_PATH;
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
        <div className="flex flex-col gap-3 rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
        <Card className="border-teal-200 bg-teal-50/40 shadow-none">
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Sign in (optional)</p>
              <p className="mt-1 text-sm text-slate-600">
                Research workspace only — tools still work without signing in. Sign in to sync
                shortlists across devices; guest plans stay on this device either way.
              </p>
            </div>
            <Button
              className="gap-2 bg-teal-600 hover:bg-teal-700"
              onClick={() => openAuth({ redirectPath: '/my-insurance' })}
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Core research passport — same for guest and signed-in */}
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
          <GitCompare className="h-5 w-5 text-teal-700" />
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
          <MessageSquare className="h-5 w-5 text-teal-700" />
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
  basket,
  onRefresh,
}: {
  basket: MyInsuranceDashboardData['drugBasket'];
  onRefresh: () => void;
}) {
  const items = basket?.items ?? [];
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Pill className="h-5 w-5 text-teal-700" />
          Prescription drug basket
        </h2>
        <span className="text-sm text-slate-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <Button asChild size="sm" variant="outline">
          <Link href={DRUG_BASKET_PATH}>Build drug basket</Link>
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={DRUG_BASKET_PATH}>Edit list</Link>
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
                const res = await deleteDrugBasketAction();
                if (res.ok) {
                  toast.success('Basket removed');
                  onRefresh();
                } else toast.error(res.error);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete basket
            </Button>
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
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    const res = await removeDrugBasketItemAction(item.id);
                    if (res.ok) {
                      toast.success('Removed');
                      onRefresh();
                    } else toast.error(res.error);
                  }}
                >
                  Remove
                </Button>
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
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Calculator className="h-5 w-5 text-teal-700" />
          Saved calculator results
        </h2>
        <span className="text-sm text-slate-500">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={ACA_SUBSIDY_PATH}>ACA planner</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={COST_ESTIMATOR_PATH}>Cost planner</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border bg-white shadow-sm">
          {rows.map((row) => {
            const summary = (row.snapshot?.summaryText as string | undefined) || row.title;
            const path = sourcePathForCalc(
              row.calculator_id,
              row.snapshot?.sourcePath as string | undefined
            );
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    {calcLabel(row.calculator_id)}
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-900">{row.title}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-slate-600">{summary}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={path}>Re-run tool</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const res = await deleteCalculatorResultAction(row.id);
                      if (res.ok) {
                        toast.success('Removed');
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
