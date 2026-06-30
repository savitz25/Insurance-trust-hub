import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { LicenseVerificationTool } from '@/components/tools/license-verification-tool';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Agent License Verification — State Lookup Links',
  description:
    'Educational tool with links to official state insurance department license lookups for all 50 states.',
  path: '/tools/license-verification',
});

export default function LicenseVerificationPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
      <div className="mb-8">
        <h1 className="section-heading">License verification</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Every insurance agent and agency must hold an active license in each state where they sell
          policies. Use official state databases to confirm status before purchasing coverage.
        </p>
      </div>
      <LicenseVerificationTool />
    </div>
  );
}