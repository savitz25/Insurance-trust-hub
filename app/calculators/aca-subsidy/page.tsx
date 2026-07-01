import type { Metadata } from 'next';
import Link from 'next/link';
import { AcaSubsidyCalculator } from '@/components/calculators/aca-subsidy-calculator';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'ACA Subsidy Estimator (2026)',
  description: 'Estimate marketplace premium tax credits by income and household size. Educational tool only.',
  path: '/calculators/aca-subsidy',
});

export default function AcaSubsidyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/calculators">Calculators</Link> / ACA Subsidy
      </nav>
      <h1 className="text-3xl font-bold">ACA Subsidy Estimator</h1>
      <p className="mt-2 text-muted-foreground text-sm">
        Rough 2026 estimate only. Official subsidies are calculated at HealthCare.gov or your state
        marketplace.
      </p>
      <div className="mt-8">
        <AcaSubsidyCalculator />
      </div>
    </div>
  );
}