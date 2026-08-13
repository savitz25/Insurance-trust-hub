'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { LicenseFreshnessItem } from '@/lib/my-insurance/types';

export function FreshnessAttention({ items }: { items: LicenseFreshnessItem[] }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          License freshness
        </h2>
        <span className="text-sm text-slate-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-sm text-slate-600">
            No saved agencies need a license re-check right now. We only flag listings whose
            as-of date is older than 90 days — we never invent dates.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm">
          {items.map((item) => (
            <li
              key={item.providerSlug}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">{item.providerName}</p>
                <p className="text-xs text-slate-600">
                  License data older than 90 days
                  {item.days != null ? ` (${item.days} days)` : ''}. Re-check on the official
                  state tool before you enroll.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/providers/${item.providerSlug}`}>Open profile</Link>
                </Button>
                {item.regulatorLookupUrl ? (
                  <Button asChild size="sm" variant="ghost">
                    <a href={item.regulatorLookupUrl} target="_blank" rel="noopener noreferrer">
                      Official re-check
                    </a>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
