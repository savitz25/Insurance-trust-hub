import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { CostEstimatorTool } from '@/components/tools/cost-estimator-tool';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Premium Estimator (2026)',
  description: 'Estimate auto, health, homeowners, and Medicare premium ranges by state. Estimates only.',
  path: '/calculators/premium-estimator',
});

export default function PremiumEstimatorPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/calculators">Calculators</Link> / Premium Estimator
      </nav>
      <h1 className="text-3xl font-bold">Premium Estimator</h1>
      <p className="mt-2 text-muted-foreground text-sm">
        Seeded average premium ranges by location and coverage type. Not a quote — verify with licensed
        agents.
      </p>
      <div className="mt-8">
        <CostEstimatorTool />
      </div>
    </div>
  );
}