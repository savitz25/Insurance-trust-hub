import type { Metadata } from 'next';
import Link from 'next/link';
import { MedicareGapCalculator } from '@/components/calculators/medicare-gap-calculator';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Medicare Plan Finder — Advantage vs Supplement Estimator',
  description:
    'Educational Medicare gap and supplement cost estimator. Compare plan types, then consult a licensed Medicare agent in your market.',
  path: '/tools/medicare-plan-finder',
});

export default function MedicarePlanFinderPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-2xl">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/tools">Tools</Link> / Medicare plan finder
      </nav>
      <h1 className="section-heading">Medicare plan finder</h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">
        Estimate Medicare supplement gap costs. For plan comparisons, see our{' '}
        <Link href="/hubs/medicare" className="text-primary hover:underline">Medicare specialists</Link>{' '}
        or{' '}
        <Link href="/hubs/florida/miami-dade" className="text-primary hover:underline">South Florida agents</Link>.
      </p>
      <div className="mt-8">
        <MedicareGapCalculator />
      </div>
    </div>
  );
}