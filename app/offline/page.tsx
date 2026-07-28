import type { Metadata } from 'next';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'You’re offline',
  description: 'InsuranceTrustHub offline fallback — reconnect for live research tools.',
  path: '/offline',
  noIndex: true,
});

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/tools', label: 'Research Center' },
  { href: '/directory', label: 'Agent directory' },
  { href: '/tools/cost-estimator', label: 'Cost Planner' },
  { href: '/calculators/aca-subsidy', label: 'ACA Savings Planner' },
  { href: '/data/plan-complaint-index', label: 'Plan Complaint Index' },
] as const;

export default function OfflinePage() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        <WifiOff className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
        You&apos;re offline
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Some live research tools need a connection. When you&apos;re back online, CMS lookups,
        subsidy estimates, and license redirects will work again.
      </p>
      <ul className="mt-8 space-y-2 text-left">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex min-h-[44px] items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-teal-800 hover:border-teal-300"
            >
              {l.label}
              <span aria-hidden>→</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs text-slate-500">
        InsuranceTrustHub · Independent research · No lead selling
      </p>
    </div>
  );
}
