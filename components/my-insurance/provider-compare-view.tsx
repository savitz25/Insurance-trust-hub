'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { BookmarkPlus, Mail, Shield } from 'lucide-react';
import type { Provider } from '@/types/provider';
import { Button } from '@/components/ui/button';
import { saveComparisonAction } from '@/actions/my-insurance';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { COMPARE_PATH } from '@/lib/my-insurance/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Props = {
  providers: Provider[];
  comparisonId?: string | null;
};

function display(value: string | number | null | undefined, empty = '—'): string {
  if (value == null || value === '') return empty;
  return String(value);
}

export function ProviderCompareView({ providers, comparisonId }: Props) {
  const mi = useMyInsuranceOptional();
  const [pending, startTransition] = useTransition();
  const [savedId, setSavedId] = useState<string | null>(comparisonId ?? null);

  const rows = useMemo(
    () => [
      {
        label: 'Location',
        values: providers.map((p) => `${p.city}, ${p.state}`),
      },
      {
        label: 'Verified listing',
        values: providers.map((p) => (p.is_verified ? 'Yes' : 'Not marked')),
      },
      {
        label: 'License #',
        values: providers.map((p) => display(p.license_number)),
      },
      {
        label: 'Years in business',
        values: providers.map((p) => display(p.years_in_business)),
      },
      {
        label: 'Trust score',
        values: providers.map((p) =>
          p.trust_score != null ? `${p.trust_score}/100` : '—'
        ),
      },
      {
        label: 'Google rating',
        values: providers.map((p) =>
          p.google_rating != null
            ? `${p.google_rating.toFixed(1)} (${p.google_review_count ?? 0})`
            : p.rating
              ? `${p.rating.toFixed(1)} (${p.review_count})`
              : '—'
        ),
      },
      {
        label: 'BBB',
        values: providers.map((p) => {
          const parts: string[] = [];
          if (p.bbb_rating) parts.push(p.bbb_rating);
          if (p.bbb_accredited) parts.push('Accredited');
          return parts.length ? parts.join(' Â· ') : '—';
        }),
      },
      {
        label: 'Coverage focus',
        values: providers.map((p) =>
          p.insurance_types?.length ? p.insurance_types.join(', ') : '—'
        ),
      },
      {
        label: 'Specialties',
        values: providers.map((p) =>
          p.specialties?.length ? p.specialties.slice(0, 6).join(', ') : '—'
        ),
      },
      {
        label: 'Phone',
        values: providers.map((p) => display(p.phone)),
      },
    ],
    [providers]
  );

  function saveComparison() {
    if (!mi?.user) {
      mi?.openAuth({ redirectPath: COMPARE_PATH });
      toast.message('Sign in to save this comparison');
      return;
    }
    startTransition(async () => {
      const res = await saveComparisonAction({
        providers: providers.map((p) => ({ slug: p.slug, name: p.name })),
        sendEmail: true,
      });
      if (res.ok) {
        setSavedId(res.id);
        toast.success('Comparison saved to Insurance HQ');
      } else toast.error(res.error);
    });
  }

  if (providers.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center">
        <p className="font-medium text-slate-900">Select 2â€“4 agencies to compare</p>
        <p className="mt-2 text-sm text-slate-600">
          Use <strong>Add to compare</strong> on provider profiles or your shortlist.
        </p>
        <Button asChild className="mt-4 bg-teal-600 hover:bg-teal-700">
          <Link href="/directory">Browse directory</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Side-by-side research snapshot. Missing fields show as — (never invented).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="gap-2 bg-teal-600 hover:bg-teal-700"
            onClick={saveComparison}
            disabled={pending || Boolean(savedId)}
          >
            <BookmarkPlus className="h-4 w-4" />
            {savedId ? 'Saved to HQ' : pending ? 'Savingâ€¦' : 'Save comparison'}
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/my-insurance">
              <Mail className="h-4 w-4" />
              Insurance HQ
            </Link>
          </Button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border bg-white shadow-sm md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-semibold text-slate-700">
                Field
              </th>
              {providers.map((p) => (
                <th key={p.slug} className="px-4 py-3 font-semibold text-slate-900">
                  <Link
                    href={`/providers/${p.slug}`}
                    className="text-teal-800 hover:underline"
                  >
                    {p.name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b last:border-0">
                <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-600">
                  {row.label}
                </th>
                {row.values.map((v, i) => (
                  <td key={`${row.label}-${i}`} className="px-4 py-3 text-slate-800">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="grid gap-4 md:hidden">
        {providers.map((p, idx) => (
          <div key={p.slug} className="rounded-2xl border bg-white p-4 shadow-sm">
            <Link
              href={`/providers/${p.slug}`}
              className="text-base font-semibold text-teal-800 hover:underline"
            >
              {p.name}
            </Link>
            <dl className="mt-3 space-y-2 text-sm">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">{row.label}</dt>
                  <dd className="text-right font-medium text-slate-800">{row.values[idx]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <p
        className={cn(
          'flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'
        )}
      >
        <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden />
        Independent directory comparison for research only. Not a quote, ranking, or official
        endorsement from DOI/CMS or any carrier.
      </p>
    </div>
  );
}

