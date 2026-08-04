'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Mail, Printer } from 'lucide-react';
import {
  PROTECT_FOCUS_OPTIONS,
  type CoveragePlan,
  type SavedProvider,
  type ToolSnapshot,
} from '@/lib/my-insurance/plan-types';
import {
  getActivePlan,
  getProvidersForPlan,
  getShortlisted,
  getToolSnapshots,
  loadState,
} from '@/lib/my-insurance/storage';
import { INSURANCE_CALL_QUESTIONS } from '@/lib/research/soft-next-steps';
import { TrustMark } from '@/components/network/trust-mark';
import { Button } from '@/components/ui/button';
import { NAIC_CONSUMER_URL, DOI_PATHWAY_HREF } from '@/components/research/empty-coverage-panel';

function buildPlainText(params: {
  plan: CoveragePlan | null;
  shortlist: SavedProvider[];
  snapshots: ToolSnapshot[];
}): string {
  const { plan, shortlist, snapshots } = params;
  const lines: string[] = [
    'Your coverage research summary',
    'Research only · Not an endorsement · Insurance Trust Hub',
    '',
  ];
  if (plan) {
    lines.push(
      `Plan: ${plan.label}`,
      `Focus: ${
        plan.protectFocus
          .map((id) => PROTECT_FOCUS_OPTIONS.find((o) => o.id === id)?.label ?? id)
          .join(', ') || '—'
      }`,
      `Location: ${plan.location?.label || [plan.location?.zip, plan.location?.state].filter(Boolean).join(' ') || '—'}`,
      plan.notes ? `Notes: ${plan.notes}` : '',
      `Updated: ${new Date(plan.updatedAt).toLocaleString()}`,
      ''
    );
  }
  lines.push('Shortlist:');
  if (shortlist.length === 0) {
    lines.push('  (none yet)');
  } else {
    for (const p of shortlist) {
      lines.push(
        `  • ${p.providerName} [${p.status}]`,
        `    ${typeof window !== 'undefined' ? window.location.origin : 'https://www.insurancetrusthub.com'}${p.profilePath}`,
        p.licenseSummary ? `    ${p.licenseSummary}` : ''
      );
    }
  }
  lines.push('', 'Questions before you reach out:');
  INSURANCE_CALL_QUESTIONS.forEach((q, i) => lines.push(`  ${i + 1}. ${q}`));
  if (snapshots.length) {
    lines.push('', 'Tool snapshots:');
    for (const s of snapshots) {
      lines.push(`  • ${s.title}`, `    ${s.summary}`, `    ${s.href}`);
    }
  }
  lines.push(
    '',
    'Primary sources: state DOI / NAIC consumer tools',
    'Standard: https://www.asktrusthub.com/methodology'
  );
  return lines.filter((l) => l !== undefined).join('\n');
}

/**
 * Report-ready takeaway — copy / print / mailto.
 */
export function CoverageReport() {
  const [plan, setPlan] = useState<CoveragePlan | null>(null);
  const [providers, setProviders] = useState<SavedProvider[]>([]);
  const [snapshots, setSnapshots] = useState<ToolSnapshot[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => {
    const state = loadState();
    const active = getActivePlan(state);
    setPlan(active);
    setProviders(active ? getProvidersForPlan(active.id, state) : []);
    setSnapshots(active ? getToolSnapshots(active.id) : []);
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);
    const onStore = () => refresh();
    window.addEventListener('ith-my-insurance-store', onStore);
    return () => window.removeEventListener('ith-my-insurance-store', onStore);
  }, [refresh]);

  const shortlist = useMemo(() => getShortlisted(providers), [providers]);
  const hasContent = Boolean(plan || shortlist.length || snapshots.length);

  const plainText = useMemo(
    () => buildPlainText({ plan, shortlist, snapshots }),
    [plan, shortlist, snapshots]
  );

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent(
      plan?.label ? `Coverage research: ${plan.label}` : 'My Insurance coverage research summary'
    );
    const body = encodeURIComponent(plainText);
    return `mailto:?subject=${subject}&body=${body}`;
  }, [plainText, plan?.label]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (!hydrated) {
    return (
      <div className="animate-pulse rounded-2xl border bg-slate-50 p-10 text-center text-sm text-slate-500">
        Loading report…
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="rounded-2xl border border-dashed bg-slate-50 px-5 py-10 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Nothing on your report yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Complete guided setup, shortlist agencies, or save a tool result — then return here for a
          takeaway summary.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild className="bg-teal-600 hover:bg-teal-700">
            <Link href="/my-insurance/setup">Guided setup</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/directory">Directory</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/tools/cost-estimator">Cost estimator</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 print:space-y-4">
      <header className="print:break-inside-avoid">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Your coverage research summary
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Research only · Not an endorsement · Guest-saved on this device
        </p>
        <div className="mt-2">
          <TrustMark />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <Button type="button" variant="outline" className="gap-1.5" onClick={onCopy}>
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy summary'}
          </Button>
          <Button type="button" variant="outline" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden />
            Print
          </Button>
          <Button type="button" variant="outline" className="gap-1.5" asChild>
            <a href={mailtoHref}>
              <Mail className="h-4 w-4" aria-hidden />
              Email me
            </a>
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/my-insurance">Back to HQ</Link>
          </Button>
        </div>
      </header>

      {plan ? (
        <section className="rounded-xl border bg-white p-5 print:border-slate-300">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Plan</h2>
          <p className="mt-1 text-lg font-semibold text-slate-900">{plan.label}</p>
          <p className="mt-2 text-sm text-slate-600">
            Focus:{' '}
            {plan.protectFocus
              .map((id) => PROTECT_FOCUS_OPTIONS.find((o) => o.id === id)?.label ?? id)
              .join(' · ') || '—'}
          </p>
          <p className="text-sm text-slate-600">
            Location:{' '}
            {plan.location?.label ||
              [plan.location?.zip, plan.location?.state].filter(Boolean).join(' ') ||
              '—'}
          </p>
          {plan.notes ? <p className="mt-2 text-sm text-slate-700">{plan.notes}</p> : null}
          <p className="mt-2 text-xs text-slate-500">
            Updated {new Date(plan.updatedAt).toLocaleString()}
          </p>
        </section>
      ) : null}

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Shortlist ({shortlist.length}/3)
        </h2>
        {shortlist.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            No shortlisted agencies yet.{' '}
            <Link href="/directory" className="font-medium text-teal-700 underline">
              Browse directory
            </Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {shortlist.map((p) => (
              <li key={p.id} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3">
                <p className="font-semibold text-slate-900">{p.providerName}</p>
                <p className="text-xs text-slate-500">
                  {[p.city, p.state].filter(Boolean).join(', ')}
                  {p.licenseSummary ? ` · ${p.licenseSummary}` : ''}
                </p>
                <Link
                  href={p.profilePath}
                  className="mt-1 inline-block text-sm font-medium text-teal-700 underline"
                >
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}${p.profilePath}`
                    : p.profilePath}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Questions before you reach out
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-800">
          {INSURANCE_CALL_QUESTIONS.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </section>

      {snapshots.length > 0 ? (
        <section className="rounded-xl border bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Tool snapshots
          </h2>
          <ul className="mt-3 space-y-3">
            {snapshots.map((s) => (
              <li key={s.id} className="rounded-lg border border-slate-100 px-3 py-3">
                <p className="font-semibold text-slate-900">{s.title}</p>
                <p className="mt-1 text-sm text-slate-600">{s.summary}</p>
                <Link href={s.href} className="mt-1 inline-block text-sm font-medium text-teal-700 underline">
                  Open tool
                </Link>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(s.capturedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Primary sources
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <Link href={DOI_PATHWAY_HREF} className="font-medium text-teal-700 underline">
              License verification guide (DOI pathways)
            </Link>
          </li>
          <li>
            <a
              href={NAIC_CONSUMER_URL}
              className="font-medium text-teal-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              NAIC consumer tools
            </a>
          </li>
        </ul>
        {plan?.protectFocus.includes('relocating') ? (
          <p className="mt-3 text-sm text-slate-600">
            Next in your journey:{' '}
            <a
              href="https://www.movetrusthub.com/verify-dot"
              className="font-semibold text-teal-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Research movers on Move Trust Hub
            </a>
          </p>
        ) : null}
        {plan?.protectFocus.includes('home') ? (
          <p className="mt-2 text-sm text-slate-600">
            Home purchase research:{' '}
            <a
              href="https://www.lendertrusthub.com/local-lenders"
              className="font-semibold text-teal-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Lender Trust Hub local lenders
            </a>
          </p>
        ) : null}
      </section>
    </div>
  );
}
