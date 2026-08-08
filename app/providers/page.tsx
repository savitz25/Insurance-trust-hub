import type { Metadata } from 'next';
import Link from 'next/link';
import { FALLBACK_PROVIDERS } from '@/lib/providers/fallback-data';
import { ProviderCard } from '@/components/provider-card';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Agencies Directory — Research Listings',
  description:
    'Browse insurance agency listings for research. Re-check state licenses on official DOI tools. Seed inventory is labeled honestly — not verified research.',
  path: '/providers',
  noIndex: true,
});

export default function ProvidersDirectoryPage() {
  const providers = [...FALLBACK_PROVIDERS].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold">Insurance agencies directory</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          {providers.length} research listings (seed catalog). These rows are{' '}
          <strong className="text-foreground font-medium">not</strong> independently verified
          public-record research — use state DOI / NIPR tools before contacting anyone. For
          metro-specific research, visit our{' '}
          <Link href="/hubs" className="text-primary hover:underline">
            market hubs
          </Link>
          .
        </p>

        <div className="mt-10 grid md:grid-cols-2 gap-5">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      </div>
      <DisclaimerBanner />
    </>
  );
}
