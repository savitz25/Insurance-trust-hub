'use client';

import Link from 'next/link';
import { Bookmark, Building2, LogOut, Shield, Sparkles } from 'lucide-react';
import type { MyInsuranceDashboardData } from '@/lib/my-insurance/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMyInsurance } from '@/components/my-insurance/my-insurance-provider';
import { removeProviderAction, signOutAction } from '@/actions/my-insurance';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type Props = {
  initial: MyInsuranceDashboardData | null;
};

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
            agents, sync across devices, and email your research.
          </p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-teal-600" /> Save agents &amp; agencies
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-teal-600" /> Coming soon: drug baskets &amp;
              calculator results
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
            <Link href="/tools" className="font-medium text-teal-700 hover:underline">
              Insurance tools
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const providers = data?.savedProviders ?? [];

  return (
    <div className="space-y-8">
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

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="font-semibold text-slate-900">Coming soon in Insurance HQ</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Prescription drug baskets (save &amp; email)</li>
          <li>Saved calculator results (ACA subsidy, cost estimator, needs assessment)</li>
          <li>Agent comparisons &amp; reviews</li>
        </ul>
      </section>
    </div>
  );
}
