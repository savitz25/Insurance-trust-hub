'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Search,
  ShieldOff,
  Stethoscope,
} from 'lucide-react';
import { runMedicareProviderSearch } from '@/lib/insurance/actions/provider-search';
import type { ProviderSearchHit, ProviderSearchResult } from '@/lib/insurance/cms/provider-search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const STATES = [{ value: 'FL', label: 'Florida' }] as const;

function StatusIcon({ status }: { status: ProviderSearchHit['status'] }) {
  if (status === 'active') {
    return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />;
  }
  if (status === 'inactive') {
    return <ShieldOff className="h-5 w-5 shrink-0 text-rose-600" aria-hidden />;
  }
  if (status === 'not_found') {
    return <HelpCircle className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />;
  }
  return <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />;
}

function statusStyles(status: ProviderSearchHit['status']) {
  switch (status) {
    case 'active':
      return 'border-emerald-200 bg-emerald-50/80 text-emerald-950';
    case 'inactive':
      return 'border-rose-200 bg-rose-50/80 text-rose-950';
    case 'not_found':
      return 'border-slate-200 bg-slate-50 text-slate-800';
    default:
      return 'border-amber-200 bg-amber-50/80 text-amber-950';
  }
}

type Props = {
  searchableStates: string[];
  dataVintage: string;
  syncedLabel: string;
  optOutCount: number;
};

export function MedicareProviderLookupTool({
  searchableStates,
  dataVintage,
  syncedLabel,
  optOutCount,
}: Props) {
  const [npi, setNpi] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [state, setState] = useState(searchableStates[0] || 'FL');
  const [result, setResult] = useState<ProviderSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await runMedicareProviderSearch({
          npi,
          lastName,
          firstName,
          state,
          limit: 25,
        });
        setResult(res);
      } catch {
        setError('Search failed. Please try again.');
        setResult(null);
      }
    });
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Stethoscope className="h-4 w-4 text-teal-700" aria-hidden />
          Search Medicare FFS participation
        </div>
        <p className="text-xs text-slate-500">
          Enter an NPI and/or provider last name. Name search currently covers:{' '}
          <strong className="font-medium text-slate-700">{searchableStates.join(', ')}</strong>.
          City is not in the base PPEF extract — state + name/NPI only.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="npi">NPI (10 digits)</Label>
            <Input
              id="npi"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 1234567890"
              value={npi}
              onChange={(e) => setNpi(e.target.value)}
              maxLength={12}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Select id="state" value={state} onChange={(e) => setState(e.target.value)}>
              {STATES.filter((s) => searchableStates.includes(s.value)).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name or organization</Label>
            <Input
              id="lastName"
              autoComplete="off"
              placeholder="e.g. Garcia"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name (optional)</Label>
            <Input
              id="firstName"
              autoComplete="off"
              placeholder="e.g. Maria"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
        </div>

        <Button type="submit" disabled={pending} className="gap-2">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Search className="h-4 w-4" aria-hidden />
          )}
          {pending ? 'Searching…' : 'Search'}
        </Button>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </form>

      {result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Results
              {result.totalMatched > 0 ? (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {result.totalMatched}
                  {result.truncated ? '+' : ''} match
                  {result.totalMatched === 1 ? '' : 'es'}
                  {result.truncated ? ' (showing first 25)' : ''}
                </span>
              ) : null}
            </h2>
            <p className="text-xs text-slate-500">
              Data: {dataVintage} · Last synced {syncedLabel}
            </p>
          </div>

          {result.emptyReason && result.hits.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">No match found</p>
              <p className="mt-1 leading-relaxed">{result.emptyReason}</p>
              <p className="mt-3 text-xs text-slate-500">
                We never invent an NPI or participation status. Verify via{' '}
                <a
                  href="https://npiregistry.cms.hhs.gov/"
                  className="font-medium text-teal-700 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  CMS NPPES
                </a>
                .
              </p>
            </div>
          ) : null}

          <ul className="space-y-3">
            {result.hits.map((hit) => (
              <li
                key={`${hit.npi}-${hit.displayName}`}
                className={cn('rounded-2xl border p-4 md:p-5', statusStyles(hit.status))}
              >
                <div className="flex gap-3">
                  <StatusIcon status={hit.status} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{hit.displayName}</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      NPI {hit.npi}
                      {hit.state ? ` · ${hit.state}` : ''}
                      {hit.providerType ? ` · ${hit.providerType}` : ''}
                    </p>
                    <p className="mt-2 text-sm font-semibold">{hit.statusLabel}</p>
                    <p className="mt-1 text-sm leading-relaxed opacity-90">{hit.statusDetail}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 text-sm font-medium">
            <Link href="/data/counties" className="text-teal-700 hover:underline">
              County Medicare dashboards
            </Link>
            <Link href="/data/plan-complaint-index" className="text-teal-700 hover:underline">
              Plan Complaint Index
            </Link>
            <Link href="/hubs/south-florida" className="text-teal-700 hover:underline">
              South Florida agents
            </Link>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 md:p-6">
        <h2 className="font-semibold text-slate-900">Data sources &amp; limits</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed md:text-sm">
          <li>
            CMS Medicare Fee-For-Service Public Provider Enrollment (PPEF) extract — name search
            index for {searchableStates.join(', ')} ({dataVintage}).
          </li>
          <li>CMS Opt Out Affidavits cross-check ({optOutCount.toLocaleString()} NPIs loaded).</li>
          <li>
            Last synced <strong className="font-medium text-slate-800">{syncedLabel}</strong>.
          </li>
          <li>
            Active status means the NPI appears in the PPEF enrollment extract for Fee-For-Service
            billing — not a quality rating and not a guarantee of every Medicare Advantage network.
          </li>
          <li>Educational tool only — not medical advice and not a government endorsement.</li>
        </ul>
      </section>
    </div>
  );
}
