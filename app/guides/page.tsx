import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import {
  ACA_MARKETPLACE_GUIDES,
  MARKETPLACE_FLAGSHIP_PATH,
  getAcaMarketplaceGuidesByState,
} from '@/lib/guides/aca-marketplace-guides';

export const metadata: Metadata = buildMetadata({
  title: 'ACA Marketplace Research Guides — State & Metro',
  description:
    'Educational ACA Marketplace research guides by state and metro. Part of Insurance Trust Hub local options research — then open live Marketplace plan tools. No lead selling. Official enrollment stays on HealthCare.gov or state Marketplaces (e.g. NY State of Health).',
  path: '/guides',
});

const STATES = [
  'Florida',
  'Texas',
  'Georgia',
  'North Carolina',
  'Pennsylvania',
  'New Jersey',
  'New York',
  'Connecticut',
] as const;

export default function GuidesIndexPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
        Local options · Research guides
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
        ACA Marketplace guides
      </h1>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Educational guides for what options exist where you live — then route into live Marketplace
        plan research. Not a quote funnel. Enrollment stays on official pathways (HealthCare.gov or
        state-based Marketplaces such as NY State of Health).
      </p>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link
          href={MARKETPLACE_FLAGSHIP_PATH}
          className="inline-flex items-center gap-1 font-medium text-[#0284C7] hover:underline"
        >
          Research Marketplace plans near you
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link href="/tools" className="font-medium text-slate-700 hover:text-[#0284C7] hover:underline">
          Research Center
        </Link>
        <Link
          href="/calculators/aca-subsidy"
          className="font-medium text-slate-700 hover:text-[#0284C7] hover:underline"
        >
          ACA Savings Planner
        </Link>
        <Link
          href="/data/plan-complaint-index"
          className="font-medium text-slate-700 hover:text-[#0284C7] hover:underline"
        >
          Plan Complaint Index
        </Link>
      </div>

      {STATES.map((state) => {
        const guides = getAcaMarketplaceGuidesByState(state);
        if (!guides.length) return null;
        return (
          <section key={state} className="mt-12">
            <h2 className="text-lg font-semibold text-slate-900">{state}</h2>
            <ul className="mt-4 space-y-4">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/15"
                  >
                    <p className="flex items-center gap-1.5 text-xs font-medium text-[#0284C7]">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {g.locationLabel}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{g.h1}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{g.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {ACA_MARKETPLACE_GUIDES.length === 0 ? null : (
        <p className="mt-10 text-xs text-slate-500">
          {ACA_MARKETPLACE_GUIDES.length} guides · more states coming
        </p>
      )}
    </div>
  );
}
