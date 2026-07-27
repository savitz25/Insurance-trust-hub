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

type SearchMode = 'name' | 'npi';

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
  const [mode, setMode] = useState<SearchMode>('name');
  const [npi, setNpi] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [state, setState] = useState(searchableStates[0] || 'FL');
  const [result, setResult] = useState<ProviderSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function switchMode(next: SearchMode) {
    setMode(next);
    setError(null);
    setResult(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'name') {
      if (!lastName.trim()) {
        setError('Enter a last name or organization name to search.');
        return;
      }
    } else {
      const digits = npi.replace(/\D/g, '');
      if (digits.length !== 10) {
        setError('Enter a valid 10-digit NPI.');
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await runMedicareProviderSearch({
          npi: mode === 'npi' ? npi : '',
          lastName: mode === 'name' ? lastName : '',
          firstName: mode === 'name' ? firstName : '',
          state: mode === 'name' ? state : state,
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
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      >
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Stethoscope className="h-4 w-4 text-teal-700" aria-hidden />
            Search Medicare FFS participation
          </div>
          <p className="mt-1 text-sm text-slate-600">
            You don&apos;t need the NPI — most people search by name.
          </p>
        </div>

        {/* Mode tabs */}
        <div
          role="tablist"
          aria-label="Search method"
          className="flex rounded-xl border border-slate-200 bg-slate-50 p-1"
        >
          <button
            type="button"
            role="tab"
            id="tab-name"
            aria-selected={mode === 'name'}
            aria-controls="panel-name"
            onClick={() => switchMode('name')}
            className={cn(
              'min-h-[44px] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              mode === 'name'
                ? 'bg-white text-teal-900 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Search by doctor or organization name
          </button>
          <button
            type="button"
            role="tab"
            id="tab-npi"
            aria-selected={mode === 'npi'}
            aria-controls="panel-npi"
            onClick={() => switchMode('npi')}
            className={cn(
              'min-h-[44px] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              mode === 'npi'
                ? 'bg-white text-teal-900 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            I have the 10-digit NPI
          </button>
        </div>

        {mode === 'name' ? (
          <div
            role="tabpanel"
            id="panel-name"
            aria-labelledby="tab-name"
            className="space-y-4"
          >
            <p className="rounded-lg border border-teal-100 bg-teal-50/70 px-3 py-2 text-sm text-teal-900">
              Search by last name or clinic/organization name. First name is optional.
            </p>
            <p className="text-xs text-slate-500">
              Name search currently covers:{' '}
              <strong className="font-medium text-slate-700">
                {searchableStates.join(', ') || 'none'}
              </strong>
              {' '}
              only (Florida letter shards). City is not in the base PPEF extract — state + name
              only. We will not invent a match.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name or organization name</Label>
              <Input
                id="lastName"
                autoComplete="off"
                autoFocus
                placeholder="e.g. Garcia or Miami Cardiology"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name (optional)</Label>
                <Input
                  id="firstName"
                  autoComplete="off"
                  placeholder="e.g. Maria"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-11"
                >
                  {STATES.filter((s) => searchableStates.includes(s.value)).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div role="tabpanel" id="panel-npi" aria-labelledby="tab-npi" className="space-y-4">
            <p className="text-sm text-slate-600">
              Use this if you already have the provider&apos;s National Provider Identifier.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="npi">10-digit NPI</Label>
              <Input
                id="npi"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="e.g. 1234567890"
                value={npi}
                onChange={(e) => setNpi(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
                className="h-11 max-w-xs font-mono tracking-wide"
              />
            </div>
            <p className="text-xs text-slate-500">
              Exact NPI match against CMS PPEF enrollment and Opt Out Affidavits. No fuzzy
              guessing.
            </p>
          </div>
        )}

        <Button type="submit" disabled={pending} className="min-h-[44px] gap-2">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Search className="h-4 w-4" aria-hidden />
          )}
          {pending ? 'Searching…' : mode === 'name' ? 'Search by name' : 'Search by NPI'}
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
              <p className="font-semibold text-slate-900">No match found in our CMS index</p>
              <p className="mt-1 leading-relaxed">
                {result.emptyReason} That does not mean the doctor is “fake” — only that we did not
                find a row for this query in the current PPEF / Opt Out extracts we load.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>Try a different spelling, last name only, or organization name.</li>
                <li>Confirm the state — name search is limited to {searchableStates.join(', ')}.</li>
                <li>If you have the NPI, switch to “I have the 10-digit NPI” for an exact check.</li>
                <li>
                  Verify on{' '}
                  <a
                    href="https://npiregistry.cms.hhs.gov/"
                    className="font-medium text-teal-700 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    CMS NPPES
                  </a>{' '}
                  or ask the provider’s office.
                </li>
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                We never invent an NPI or participation status.
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
            Statuses shown: Active Medicare FFS (PPEF), Opted out, or No match found — never
            invented.
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
