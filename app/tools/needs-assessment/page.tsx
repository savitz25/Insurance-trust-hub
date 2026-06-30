import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { NeedsAssessmentTool } from '@/components/tools/needs-assessment-tool';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Needs Assessment Quiz',
  description:
    'Answer five questions to discover which insurance types and agent specialties may fit your situation.',
  path: '/tools/needs-assessment',
});

export default function NeedsAssessmentPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-xl">
      <div className="mb-8">
        <h1 className="section-heading">Coverage needs assessment</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          A quick educational quiz to suggest insurance types and directory filters. Not a
          substitute for personalized advice from a licensed agent.
        </p>
      </div>
      <NeedsAssessmentTool />
    </div>
  );
}