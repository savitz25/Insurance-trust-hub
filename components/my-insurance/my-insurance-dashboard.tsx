'use client';

import Link from 'next/link';
import {
  Bookmark,
  Building2,
  Calculator,
  LogOut,
  Mail,
  Pill,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { MyInsuranceDashboardData } from '@/lib/my-insurance/types';
import { CALCULATOR_LABELS, type CalculatorToolId } from '@/lib/my-insurance/types';
import {
  ACA_SUBSIDY_PATH,
  COST_ESTIMATOR_PATH,
  DRUG_BASKET_PATH,
} from '@/lib/my-insurance/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMyInsurance } from '@/components/my-insurance/my-insurance-provider';
import {
  deleteCalculatorResultAction,
  deleteDrugBasketAction,
  emailDrugBasketAction,
  removeDrugBasketItemAction,
  removeProviderAction,
  signOutAction,
} from '@/actions/my-insurance';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border bg-slate-50 p-10 text-center text-sm text-slate-500">
        Loading Insurance HQ…
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="border-teal-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign in to Insurance HQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Every tool on Insurance Trust Hub works without an account. Sign in when you want to save
            agents, prescription lists, calculator results, and sync across devices.
          </p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-teal-600" /> Save agents &amp; agencies
            </li>
            <li className="flex gap-2">
              <Pill className="mt-0.5 h-4 w-4 text-teal-600" /> Prescription drug baskets
            </li>
            <li className="flex gap-2">
              <Calculator className="mt-0.5 h-4 w-4 text-teal-600" /> Saved calculator results
            </li>
            <li className="flex gap-2">
              <Shield className="mt-0.5 h-4 w-4 text-teal-600" /> No paid placements · no lead selling
            </li>
          </ul>
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => openAuth({ redirectPath: '/my-insurance' })}
          >
            Sign in to My Insurance
          </Button>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/directory" className="font-medium text-teal-700 hover:underline">
              Browse agents
            </Link>
            <Link href={DRUG_BASKET_PATH} className="font-medium text-teal-700 hover:underline">
              Build drug list
            </Link>
            <Link href="/tools" className="font-medium text-teal-700 hover:underline">
              Insurance tools
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const providers = data?.savedProviders ?? [];
  const basket = data?.drugBasket;
  const basketItems = basket?.items ?? [];
  const calcResults = data?.calculatorResults ?? [];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-600">
            Signed in as <span className="font-medium text-slate-900">{user.email}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Research workspace only — tools still work without signing in.
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

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700">
          <Link href={DRUG_BASKET_PATH}>Build drug basket</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={ACA_SUBSIDY_PATH}>ACA Savings Planner</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={COST_ESTIMATOR_PATH}>Cost Planner</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/directory">Browse agents</Link>
        </Button>
      </div>

      {/* Agents */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Bookmark className="h-5 w-5 text-teal-700" />
            Saved agents &amp; agencies
          </h2>
          <span className="text-sm text-slate-500">{providers.length}</span>
        </div>

        {providers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-start gap-3 py-10">
              <Building2 className="h-8 w-8 text-slate-300" />
              <p className="font-medium text-slate-800">No saved agents yet</p>
              <p className="max-w-md text-sm text-slate-600">
                Browse the directory and tap <strong>Save to My Insurance</strong> on any agency
                profile.
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
                <div className="flex gap-2">
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
              <p className="max-w-md text-sm text-slate-600">
                Build a free-text prescription list, then save it here for email and cross-device
                access.
              </p>
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
                    : '—'}
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
                      {item.form} · {item.dosage}
                    </p>
                    {item.quantity && (
                      <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-slate-500">Notes: {item.notes}</p>
                    )}
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
              <p className="max-w-md text-sm text-slate-600">
                Run a planner and tap <strong>Save to My Insurance</strong> on the results screen.
              </p>
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
        <h2 className="font-semibold text-slate-900">Coming later</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Agent comparisons &amp; reviews</li>
          <li>Multiple named drug baskets</li>
          <li>Formulary price lookups (optional)</li>
        </ul>
      </section>
    </div>
  );
}
