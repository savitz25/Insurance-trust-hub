import type { Metadata } from 'next';
import Link from 'next/link';
import { CostEstimatorTool } from '@/components/tools/cost-estimator-tool';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Quote Comparison Tool (Estimates Only)',
  description:
    'Compare ballpark insurance premium ranges by state and coverage type. Educational estimates — contact a licensed agent for binding quotes.',
  path: '/tools/quote-comparison',
});

export default function QuoteComparisonPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-2xl">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/tools">Tools</Link> / Quote comparison
      </nav>
      <h1 className="section-heading">Insurance quote comparison</h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">
        Compare estimated premium ranges across coverage types. For personalized quotes, connect with
        a{' '}
        <Link href="/hubs" className="text-primary hover:underline">verified local agent</Link>.
      </p>
      <div className="mt-8">
        <CostEstimatorTool />
      </div>
    </div>
  );
}