import type { Metadata } from 'next';
import Link from 'next/link';
import { FALLBACK_PROVIDERS } from '@/lib/providers/fallback-data';
import { ProviderCard } from '@/components/provider-card';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Providers Directory — Verified Agencies',
  description:
    'Browse verified insurance agencies and brokerages nationwide. Compare ratings, licensing, and specialties before requesting a quote.',
  path: '/providers',
});

export default function ProvidersDirectoryPage() {
  const providers = [...FALLBACK_PROVIDERS].sort((a, b) => b.rating - a.rating);

  return (
    <>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold">Insurance Providers Directory</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          {providers.length} verified agencies with state licensing data and attributed reviews.
          For metro-specific health specialists, visit our{' '}
          <Link href="/hubs" className="text-primary hover:underline">market hubs</Link>.
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