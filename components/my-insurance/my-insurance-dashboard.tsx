'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Building2,
  Calculator,
  GitCompare,
  LogOut,
  Mail,
  MessageSquare,
  Pill,
  Shield,
  Sparkles,
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
import { addToCompareTray, clearCompareTray } from '@/lib/my-insurance/compare-storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMyInsurance } from '@/components/my-insurance/my-insurance-provider';
import { CompareProviderButton } from '@/components/my-insurance/compare-provider-button';
import {
  deleteCalculatorResultAction,
  deleteComparisonAction,
  deleteDrugBasketAction,
  deleteMyReviewAction,
  emailDrugBasketAction,
  removeDrugBasketItemAction,
  removeProviderAction,
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

export function MyInsuranceDashboard({ initial }: Props) {
  const { user, loading, openAuth, unmarkProviderSaved } = useMyInsurance();
  const router = useRouter();
  const data = initial;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border bg-slate-50 p-10 text-center text-sm text-slate-500">
        Loading Insurance HQ…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <GuestInsuranceHq />
        <Card className="border-slate-200 bg-slate-50/80 shadow-none">
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Optional: sign in later to sync shortlists across devices. Guest plans stay on this
              device.
            </p>
            <Button
              variant="outline"
              onClick={() => openAuth({ redirectPath: '/my-insurance' })}
            >
              Sign in (optional)
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const providers = data?.savedProviders ?? [];
  const basket = data?.drugBasket;
  const basketItems = basket?.items ?? [];
  const calcResults = data?.calculatorResults ?? [];
  const comparisons = data?.comparisons ?? [];
  const myReviews = data?.myReviews ?? [];

  function toggleSelect(slug: string, name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    void name;
  }

  function compareSelected() {
    const chosen = providers.filter((p) => selected.has(p.provider_slug));
    if (chosen.length < 2) {
      toast.error('Select at least 2 shortlisted agencies');
      return;
    }
    clearCompareTray();
    for (const p of chosen.slice(0, 4)) {
      addToCompareTray({ slug: p.provider_slug, name: p.provider_name });
    }
    const qs = chosen
      .slice(0, 4)
      .map((p) => `add=${encodeURIComponent(p.provider_slug)}`)
      .join('&');
    router.push(`${COMPARE_PATH}?${qs}`);
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-600">
            Signed in as <span className="font-medium text-slate-900">{user.email}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Research workspace only â€” tools still work without signing in.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={async () => {
            await signOutAction();
            toast.message('Signed out');
            router.refresh();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700">
          <Link href="/directory">Browse agents</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={COMPARE_PATH}>Open compare</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={DRUG_BASKET_PATH}>Drug basket</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={ACA_SUBSIDY_PATH}>ACA planner</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={COST_ESTIMATOR_PATH}>Cost planner</Link>
        </Button>
      </div>

      {/* Shortlist */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Bookmark className="h-5 w-5 text-teal-700" />
            Shortlist (saved agents)
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{providers.length}</span>
            {selected.size >= 2 && (
              <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700" onClick={compareSelected}>
                <GitCompare className="h-3.5 w-3.5" />
                Compare selected ({selected.size})
              </Button>
            )}
          </div>
        </div>

        {providers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-start gap-3 py-10">
              <Building2 className="h-8 w-8 text-slate-300" />
              <p className="font-medium text-slate-800">No shortlisted agents yet</p>
              <p className="max-w-md text-sm text-slate-600">
                Save agencies from the directory, then compare 2â€“4 side by side.
              </p>
              <Button asChild className="bg-teal-600 hover:bg-teal-700">
                <Link href="/directory">Browse agents</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y rounded-2xl border bg-white shadow-sm">
            {providers.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600"
                    checked={selected.has(p.provider_slug)}
                    onChange={() => toggleSelect(p.provider_slug, p.provider_name)}
                    aria-label={`Select ${p.provider_name} for compare`}
                  />
                  <div>
                    <Link
                      href={`/providers/${p.provider_slug}`}
                      className="font-semibold text-slate-900 hover:text-teal-800 hover:underline"
                    >
                      {p.provider_name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      Saved {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CompareProviderButton
                    providerSlug={p.provider_slug}
                    providerName={p.provider_name}
                  />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/providers/${p.provider_slug}`}>Open</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const res = await removeProviderAction(p.provider_slug);
                      if (res.ok) {
                        unmarkProviderSaved(p.provider_slug);
                        toast.success('Removed');
                        router.refresh();
                      } else toast.error(res.error);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Comparisons */}
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
            <CardContent className="flex flex-col items-start gap-3 py-8">
              <p className="font-medium text-slate-800">No saved comparisons</p>
              <p className="text-sm text-slate-600">
                Select agencies with <strong>Add to compare</strong>, then save the comparison.
              </p>
              <Button asChild variant="outline">
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
                      {c.items.map((i) => i.provider_name).join(' Â· ')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(c.updated_at || c.created_at).toLocaleString()}
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
                          router.refresh();
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

      {/* My reviews */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MessageSquare className="h-5 w-5 text-teal-700" />
            My reviews
          </h2>
          <span className="text-sm text-slate-500">{myReviews.length}</span>
        </div>
        {myReviews.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-start gap-3 py-8">
              <p className="font-medium text-slate-800">No reviews yet</p>
              <p className="text-sm text-slate-600">
                Leave a moderated review from any agency profile after sign-in.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y rounded-2xl border bg-white shadow-sm">
            {myReviews.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {r.rating}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-slate-900">
                    {r.provider_name || 'Agency'}
                    {r.title ? ` â€” ${r.title}` : ''}
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm text-slate-600">{r.content}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(r.created_at).toLocaleDateString()}
                    {r.coverage_type ? ` Â· ${r.coverage_type}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.provider_slug && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/providers/${r.provider_slug}`}>Profile</Link>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const res = await deleteMyReviewAction(r.id);
                      if (res.ok) {
                        toast.success('Review removed');
                        router.refresh();
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

      {/* Drug basket */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Pill className="h-5 w-5 text-teal-700" />
            Prescription drug basket
          </h2>
          <span className="text-sm text-slate-500">{basketItems.length}</span>
        </div>

        {basketItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-start gap-3 py-10">
              <Pill className="h-8 w-8 text-slate-300" />
              <p className="font-medium text-slate-800">No medications saved yet</p>
              <Button asChild className="bg-teal-600 hover:bg-teal-700">
                <Link href={DRUG_BASKET_PATH}>Build drug basket</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3">
              <div>
                <p className="font-medium text-slate-900">{basket?.name || 'My prescriptions'}</p>
                <p className="text-xs text-slate-500">
                  Updated{' '}
                  {basket?.updated_at
                    ? new Date(basket.updated_at).toLocaleString()
                    : 'â€”'}
                </p>
              </div>
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
                  className="gap-1.5 text-rose-700 hover:text-rose-800"
                  onClick={async () => {
                    const res = await deleteDrugBasketAction();
                    if (res.ok) {
                      toast.success('Basket removed');
                      router.refresh();
                    } else toast.error(res.error);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete basket
                </Button>
              </div>
            </div>
            <ul className="divide-y rounded-2xl border bg-white shadow-sm">
              {basketItems.map((item) => (
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
                      {item.form} Â· {item.dosage}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const res = await removeDrugBasketItemAction(item.id);
                      if (res.ok) {
                        toast.success('Removed');
                        router.refresh();
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

      {/* Calculator results */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Calculator className="h-5 w-5 text-teal-700" />
            Saved calculator results
          </h2>
          <span className="text-sm text-slate-500">{calcResults.length}</span>
        </div>

        {calcResults.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-start gap-3 py-10">
              <Calculator className="h-8 w-8 text-slate-300" />
              <p className="font-medium text-slate-800">No calculator results saved</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="bg-teal-600 hover:bg-teal-700">
                  <Link href={ACA_SUBSIDY_PATH}>ACA Savings Planner</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={COST_ESTIMATOR_PATH}>Cost Planner</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y rounded-2xl border bg-white shadow-sm">
            {calcResults.map((row) => {
              const summary =
                (row.snapshot?.summaryText as string | undefined) || row.title;
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
                    <p className="mt-1 text-xs text-slate-500">
                      Saved {new Date(row.created_at).toLocaleString()}
                    </p>
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
                          router.refresh();
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

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="font-semibold text-slate-900">Trust framing</h2>
        <p className="mt-2 text-sm text-slate-600">
          Independent research workspace. No paid placements. No lead selling. Comparisons and
          reviews are for personal research only and do not imply DOI/CMS endorsement.
        </p>
      </section>
    </div>
  );
}
