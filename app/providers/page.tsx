import type { Metadata } from 'next';
import Link from 'next/link';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { buildMetadata } from '@/lib/seo/metadata';
import { searchProviders } from '@/lib/providers/queries';
import { ProviderCard } from '@/components/provider-card';
import {
  EmptyCoveragePanel,
  NAIC_CONSUMER_URL,
  DOI_PATHWAY_HREF,
} from '@/components/research/empty-coverage-panel';
import { NetworkResearchStandard } from '@/components/network/network-research-standard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Agencies Directory — Verified Research Listings',
  description:
    'Browse independently verified insurance agency research listings. Empty markets are shown honestly — no invented inventory.',
  path: '/providers',
});

export default async function ProvidersDirectoryPage() {
  const { providers } = await searchProviders({ limit: 48 });

  return (
    <>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold">Insurance agencies directory</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Public listings include only agencies that meet our research standard. We do not invent
          inventory for empty markets. Re-check state DOI / NIPR tools before contacting anyone.
        </p>
        <div className="mt-6 max-w-2xl">
          <NetworkResearchStandard />
        </div>

        {providers.length === 0 ? (
          <div className="mt-10">
            <EmptyCoveragePanel
              variant="unmapped"
              title="We’re still verifying this market"
              description="No agencies currently meet our public research standard for this directory. Prefer honesty over coverage — no invented inventory."
              primarySources={[
                { href: DOI_PATHWAY_HREF, label: 'License verification guide' },
                {
                  href: NAIC_CONSUMER_URL,
                  label: 'NAIC consumer tools',
                  external: true,
                },
              ]}
              widenLinks={[
                { href: '/directory', label: 'Search directory' },
                { href: '/tools/license-verification', label: 'Verify a license' },
                { href: '/tools/coverage-compass', label: 'Coverage Compass' },
                { href: '/methodology', label: 'Methodology' },
              ]}
            />
            <p className="mt-6 text-sm text-muted-foreground">
              Looking for metro research tools? Visit our{' '}
              <Link href="/hubs" className="text-primary hover:underline">
                market hubs
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-10 grid md:grid-cols-2 gap-5">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}
      </div>
      <DisclaimerBanner />
    </>
  );
}
