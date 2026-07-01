import type { Metadata } from 'next';
import Link from 'next/link';
import { HubBrowser } from '@/components/hub-browser';
import { ZipSearch } from '@/components/zip-search';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { buildMetadata } from '@/lib/seo/metadata';
import { INSURANCE_HUBS } from '@/lib/hubs/registry';

export const metadata: Metadata = buildMetadata({
  title: 'Health Insurance Hubs — 50+ U.S. Markets',
  description:
    'Explore verified insurance agent hubs across 50+ U.S. metros. Health insurance specialists for ACA, Medicare, employer plans, and multi-line coverage. 100% data-driven.',
  path: '/hubs',
});

export default function HubsPage() {
  return (
    <>
      <section className="border-b bg-gradient-to-br from-primary/5 via-background to-trust/5 py-14 md:py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-trust uppercase mb-3">
            100% data-driven · No paid placements
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground">
            Health Insurance Hubs Across America
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            {INSURANCE_HUBS.length} verified market hubs featuring health insurance specialists in
            every high-volume MSA. Search by ZIP or browse by state.
          </p>
          <div className="mt-8 flex justify-center">
            <ZipSearch />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        <HubBrowser />
        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href="/hubs/browse" className="text-primary font-medium hover:underline">
            View all {INSURANCE_HUBS.length} hubs →
          </Link>
        </p>
      </section>

      <DisclaimerBanner />
    </>
  );
}