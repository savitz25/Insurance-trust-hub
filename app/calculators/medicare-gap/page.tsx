import type { Metadata } from 'next';
import Link from 'next/link';
import { MedicareGapCalculator } from '@/components/calculators/medicare-gap-calculator';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Medicare Coverage Gap Analyzer',
  description: 'Identify Medicare and health insurance gaps when moving, retiring, or losing employer coverage.',
  path: '/calculators/medicare-gap',
});

export default function MedicareGapPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/calculators">Calculators</Link> / Medicare Gap
      </nav>
      <h1 className="text-3xl font-bold">Medicare Coverage Gap Analyzer</h1>
      <p className="mt-2 text-muted-foreground text-sm">
        Educational guidance for common transition scenarios. Not medical or legal advice.
      </p>
      <div className="mt-8">
        <MedicareGapCalculator />
      </div>
    </div>
  );
}