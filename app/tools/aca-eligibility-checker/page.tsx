import type { Metadata } from 'next';
import Link from 'next/link';
import { AcaSubsidyCalculator } from '@/components/calculators/aca-subsidy-calculator';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'ACA Eligibility Checker — Subsidy & Marketplace Estimator',
  description:
    'Check ACA marketplace subsidy eligibility with our educational income estimator. Official enrollment at HealthCare.gov or your state exchange.',
  path: '/tools/aca-eligibility-checker',
});

export default function AcaEligibilityCheckerPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-2xl">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/tools">Tools</Link> / ACA eligibility checker
      </nav>
      <h1 className="section-heading">ACA eligibility checker</h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">
        Rough subsidy estimate by household income and size. For enrollment help, browse{' '}
        <Link href="/hubs/aca" className="text-primary hover:underline">ACA marketplace agents</Link>.
      </p>
      <div className="mt-8">
        <AcaSubsidyCalculator />
      </div>
    </div>
  );
}