'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUp, Minus, Star } from 'lucide-react';
import {
  formatComplaintRate,
  getComplaintIndexScopes,
  getComplaintRankings,
  type ComplaintIndexScope,
} from '@/lib/insurance/cms/complaint-rankings';
import type { CmsComplaintDatasetMeta, ComplaintTrend } from '@/lib/insurance/cms/types';
import { cn } from '@/lib/utils';

function TrendCell({ trend }: { trend: ComplaintTrend }) {
  if (trend === 'improving') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0284C7]">
        <ArrowDown className="h-3.5 w-3.5" aria-hidden />
        Improving
      </span>
    );
  }
  if (trend === 'worsening') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700">
        <ArrowUp className="h-3.5 w-3.5" aria-hidden />
        Worsening
      </span>
    );
  }
  if (trend === 'stable') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
        <Minus className="h-3.5 w-3.5" aria-hidden />
        Stable
      </span>
    );
  }
  return <span className="text-xs text-slate-500">—</span>;
}

type Props = {
  meta: CmsComplaintDatasetMeta;
};

export function PlanComplaintIndexClient({ meta }: Props) {
  const scopes = getComplaintIndexScopes();
  const [scope, setScope] = useState<ComplaintIndexScope>('FL');

  const rows = useMemo(() => getComplaintRankings(scope), [scope]);

  const syncedLabel = new Date(meta.syncedAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {meta.usingPlaceholderData && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <strong className="font-semibold">Illustrative structure:</strong> Rankings below are
          clearly marked placeholders so the index UX and methodology ship before the first
          scheduled CMS complaint-rate file import. Do not use these numbers for enrollment
          decisions. Real CMS contract data will replace them without changing the page layout.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
          role="tablist"
          aria-label="Complaint index geography"
        >
          {scopes.map((s) => {
            const active = scope === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setScope(s.id)}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          Complaint data: <span className="font-medium text-slate-700">{meta.dataVintage}</span>
          {' · '}
          Last synced <span className="font-medium text-slate-700">{syncedLabel}</span>
        </p>
      </div>

      <p className="text-sm text-slate-600">
        {scopes.find((s) => s.id === scope)?.description}
      </p>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 font-semibold">Carrier / contract</th>
              <th className="px-4 py-3 font-semibold">Complaint rate</th>
              <th className="px-4 py-3 font-semibold">Trend</th>
              <th className="px-4 py-3 font-semibold">Star context</th>
              <th className="px-4 py-3 font-semibold">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 tabular-nums font-semibold text-slate-900">
                  #{row.rank}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{row.carrierName}</p>
                  <p className="text-xs text-slate-500">
                    {row.contractId ? `Contract ${row.contractId}` : 'Contract ID pending'}
                    {row.isPlaceholder ? ' · placeholder' : ''}
                    {row.stateCode !== 'US' ? ` · ${row.stateName}` : ''}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="tabular-nums font-semibold text-slate-900">
                    {formatComplaintRate(row.complaintRatePerThousand)}
                  </span>
                  <span className="text-xs text-slate-500"> / 1,000</span>
                </td>
                <td className="px-4 py-3">
                  <TrendCell trend={row.trend} />
                </td>
                <td className="px-4 py-3">
                  {row.starRating != null ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-800">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                      {row.starRating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Not available</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{row.planType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0284C7]">
                  Rank #{row.rank}
                </p>
                <p className="mt-0.5 font-semibold text-slate-900">{row.carrierName}</p>
                <p className="text-xs text-slate-500">
                  {row.contractId ?? 'Contract pending'}
                  {row.isPlaceholder ? ' · placeholder' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold tabular-nums text-slate-900">
                  {formatComplaintRate(row.complaintRatePerThousand)}
                </p>
                <p className="text-[10px] text-slate-500">per 1,000</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs">
              <TrendCell trend={row.trend} />
              {row.starRating != null && (
                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                  {row.starRating.toFixed(1)} stars
                </span>
              )}
              <span className="text-slate-500">{row.planType}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/hubs/medicare?from=%2Fdata%2Fplan-complaint-index"
          className="inline-flex items-center gap-1 font-medium text-[#0284C7] hover:underline"
        >
          Medicare specialist hubs
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link
          href="/hubs/south-florida?from=%2Fdata%2Fplan-complaint-index"
          className="inline-flex items-center gap-1 font-medium text-[#0284C7] hover:underline"
        >
          South Florida agents
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link
          href="/tools/medicare-plan-finder?from=%2Fdata%2Fplan-complaint-index"
          className="inline-flex items-center gap-1 font-medium text-[#0284C7] hover:underline"
        >
          Medicare research guide
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
