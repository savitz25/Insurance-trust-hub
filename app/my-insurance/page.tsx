import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { getMyInsuranceDashboardData } from '@/actions/my-insurance';
import { MyInsuranceDashboard } from '@/components/my-insurance/my-insurance-dashboard';
import { HandoffStatusBanner } from '@/components/my-insurance/handoff-status-banner';
import { TrustMark } from '@/components/network/trust-mark';

export const metadata: Metadata = buildMetadata({
  title: 'My Insurance — Insurance HQ',
  description:
    'Private coverage research wallet on Insurance Trust Hub. Works without signing in. Research only — not a public directory page.',
  path: '/my-insurance',
  noIndex: true,
});

export default async function MyInsurancePage() {
  const data = await getMyInsuranceDashboardData();

  return (
    <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/30">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
          Insurance Trust Hub
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          My Insurance
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Research wallet for coverage decisions — shortlisted plans, doctors, prescriptions, and
          market context. Works on this device without signing in; magic link restores across
          devices. Contents are private research, not leads.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Research only · Not an endorsement · Not a claims portal · Part of the Ask Trust Hub
          network
        </p>
        <div className="mt-2">
          <TrustMark />
        </div>
        <Suspense fallback={null}>
          <div className="mt-4">
            <HandoffStatusBanner />
          </div>
        </Suspense>
        <p className="mt-3 text-sm text-slate-500">
          <Link href="/directory" className="font-medium text-[#0284C7] hover:underline">
            Directory
          </Link>
          {' · '}
          <Link href="/hubs" className="font-medium text-[#0284C7] hover:underline">
            Health hubs
          </Link>
          {' · '}
          <Link href="/calculators" className="font-medium text-[#0284C7] hover:underline">
            Calculators
          </Link>
          {' · '}
          <Link href="/tools" className="font-medium text-[#0284C7] hover:underline">
            Tools
          </Link>
          {' · '}
          <Link
            href="/tools/aca-plan-explorer"
            className="font-medium text-[#0284C7] hover:underline"
          >
            Plan Explorer
          </Link>
        </p>

        <div className="mt-8">
          <MyInsuranceDashboard initial={data} />
        </div>
      </div>
    </div>
  );
}
