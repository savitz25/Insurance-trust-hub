'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Building2,
  ExternalLink,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  getStateLicenseDepartments,
  getLicenseDepartment,
} from '@/lib/tools/license-verification';
import { US_STATES } from '@/lib/constants';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  ExternalRedirectConsent,
  type ExternalRedirectTarget,
} from '@/components/external-redirect-consent';

export function LicenseVerificationTool() {
  const router = useRouter();
  const [state, setState] = useState('FL');
  const [agentName, setAgentName] = useState('');
  const [dirQuery, setDirQuery] = useState('');
  const [dirState, setDirState] = useState('');
  const [consentOpen, setConsentOpen] = useState(false);
  const [pending, setPending] = useState<ExternalRedirectTarget | null>(null);

  const dept = getLicenseDepartment(state);
  const allDepts = useMemo(() => getStateLicenseDepartments(), []);

  function requestExternal(url: string, destinationLabel: string, stateName?: string) {
    setPending({ url, destinationLabel, stateName });
    setConsentOpen(true);
  }

  function openPrimaryLookup() {
    if (!dept) return;
    requestExternal(dept.lookupUrl, dept.department, dept.name);
  }

  function searchDirectory(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (dirQuery.trim()) params.set('q', dirQuery.trim());
    if (dirState) params.set('state', dirState);
    const qs = params.toString();
    router.push(qs ? `/directory?${qs}` : '/directory');
  }

  return (
    <div className="space-y-8">
      {/* Path A — Official state */}
      <section className="rounded-2xl border border-teal-200/80 bg-gradient-to-b from-teal-50/50 via-white to-white p-5 shadow-sm md:p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
              Path A · Primary
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Verify on the official state site
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              State insurance departments (and NIPR-linked tools in some markets) are the authority
              for producer and agency license status. We route you there — we do not invent statuses.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="lic-state">State where they sell</Label>
            <Select
              id="lic-state"
              className="mt-1.5 h-11"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="lic-name">Agent or agency name (optional)</Label>
            <Input
              id="lic-name"
              className="mt-1.5 h-11"
              placeholder="e.g. Summit Insurance Group"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-slate-500">
              For your notes only — most state sites will ask you to re-enter the name.
            </p>
          </div>
        </div>

        {dept && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{dept.department}</p>
            <p className="mt-1 text-sm text-slate-600">
              {dept.notes ??
                'Search by name, license number, or agency. Confirm the license is active for the lines of authority you care about.'}
            </p>
            {agentName.trim() && (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Reminder for the state search: <strong className="text-slate-800">{agentName.trim()}</strong>
              </p>
            )}
            <Button type="button" onClick={openPrimaryLookup} className="mt-4 min-h-[44px] gap-2">
              Continue to official state lookup
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Button>
            <p className="mt-2 text-xs text-slate-500">
              Opens a consent step first. You can cancel and stay on InsuranceTrustHub.
            </p>
          </div>
        )}
      </section>

      {/* Path B — Directory */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Users className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Path B · On InsuranceTrustHub
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Search agents already listed here
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Browse our directory first if you want reviewed, listed agencies — then still verify
              their license on the official state site (Path A).
            </p>
          </div>
        </div>

        <form onSubmit={searchDirectory} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="dir-q">Name or keyword</Label>
              <Input
                id="dir-q"
                className="mt-1.5 h-11"
                placeholder="Agency or agent name"
                value={dirQuery}
                onChange={(e) => setDirQuery(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dir-state">State (optional)</Label>
              <Select
                id="dir-state"
                className="mt-1.5 h-11"
                value={dirState}
                onChange={(e) => setDirState(e.target.value)}
              >
                <option value="">All states</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <Button type="submit" variant="outline" className="min-h-[44px] gap-2">
            <Search className="h-4 w-4" aria-hidden />
            Search InsuranceTrustHub directory
          </Button>
        </form>
      </section>

      {/* Path C — NPN / education */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
          <div className="space-y-2 text-sm text-slate-600">
            <h2 className="text-base font-semibold text-slate-900">Have an NPN?</h2>
            <p>
              A <strong className="font-medium text-slate-800">National Producer Number (NPN)</strong>{' '}
              is a unique ID used in multi-state licensing systems. Marketplace agent registration is
              related but separate from a state producer license. State DOI lookups remain the place
              to confirm the license is active for the product they sell.
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/tools/medicare-provider-lookup" className="font-medium text-teal-700 hover:underline">
                Medicare provider lookup
              </Link>
              <Link href="/calculators/aca-subsidy" className="font-medium text-teal-700 hover:underline">
                ACA Coverage &amp; Savings Planner
              </Link>
              <Link href="/tools/needs-assessment" className="font-medium text-teal-700 hover:underline">
                Coverage Compass
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* All states — consent on each link */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-slate-600" aria-hidden />
          <h2 className="text-base font-semibold text-slate-900">All state lookup links</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Each link opens the consent step first, then the official (or NAIC consumer) resource.
        </p>
        <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {allDepts.map((d) => (
            <button
              key={d.code}
              type="button"
              onClick={() => requestExternal(d.lookupUrl, d.department, d.name)}
              className={cn(
                'flex min-h-[44px] items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm',
                'transition-colors hover:border-teal-300 hover:bg-teal-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600'
              )}
            >
              <span>
                <span className="font-semibold text-slate-900">{d.code}</span>
                <span className="text-slate-500"> — {d.name}</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            </button>
          ))}
        </div>
      </section>

      <ExternalRedirectConsent
        open={consentOpen}
        target={pending}
        onClose={() => {
          setConsentOpen(false);
          setPending(null);
        }}
      />
    </div>
  );
}
