import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { CostEstimatorTool } from '@/components/tools/cost-estimator-tool';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Premium Cost Estimator (Estimates Only)',
  description:
    'Estimate auto, home, renters, and other insurance premium ranges by U.S. state. Educational tool — not a binding quote.',
  path: '/tools/cost-estimator',
});

export default function CostEstimatorPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-2xl">
      <div className="mb-8">
        <h1 className="section-heading">Premium cost estimator</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Ballpark annual premium ranges based on state averages. Your actual rate depends on age,
          driving record, credit, coverage limits, and carrier underwriting.
        </p>
      </div>
      <CostEstimatorTool />
    </div>
  );
}