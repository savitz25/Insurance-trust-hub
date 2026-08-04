import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { getMyInsuranceDashboardData } from '@/actions/my-insurance';
import { MyInsuranceDashboard } from '@/components/my-insurance/my-insurance-dashboard';
import { TrustMark } from '@/components/network/trust-mark';

export const metadata: Metadata = buildMetadata({
  title: 'My Insurance — Insurance HQ',
  description:
    'Guest-first coverage research plan and saved providers on Insurance Trust Hub. Works without signing in. Research only — no paid placements, no quote marketplace.',
  path: '/my-insurance',
});

export default async function MyInsurancePage() {
  const data = await getMyInsuranceDashboardData();

  return (
    <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-teal-50/30">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Insurance Trust Hub
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          My Insurance
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Research passport for coverage — guest-saved on this device. Shortlist agencies, track
          status, then verify licenses on DOI / NAIC pathways.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Research only · Not an endorsement · Part of the Ask Trust Hub network
        </p>
        <div className="mt-2">
          <TrustMark />
        </div>
        <p className="mt-3 text-sm text-slate-500">
          <Link href="/directory" className="font-medium text-teal-700 hover:underline">
            Directory
          </Link>
          {' · '}
          <Link href="/hubs" className="font-medium text-teal-700 hover:underline">
            Health hubs
          </Link>
          {' · '}
          <Link href="/calculators" className="font-medium text-teal-700 hover:underline">
            Calculators
          </Link>
          {' · '}
          <Link href="/tools" className="font-medium text-teal-700 hover:underline">
            Tools
          </Link>
        </p>

        <div className="mt-8">
          <MyInsuranceDashboard initial={data} />
        </div>
      </div>
    </div>
  );
}
