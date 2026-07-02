import Link from 'next/link';
import type { Metadata } from 'next';
import { Calculator, ClipboardCheck, ShieldCheck, Wrench } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Tools — Calculators & Verification Helpers',
  description:
    'Free educational tools: premium cost estimator, coverage needs assessment, and state license verification links.',
  path: '/tools',
});

const TOOLS = [
  {
    href: '/tools/cost-estimator',
    icon: Calculator,
    title: 'Premium cost estimator',
    description:
      'Get ballpark annual premium ranges by state and coverage type. Estimates only — not a quote.',
  },
  {
    href: '/tools/needs-assessment',
    icon: ClipboardCheck,
    title: 'Coverage needs assessment',
    description:
      'Answer a few questions to see which insurance types and agent specialties may fit your situation.',
  },
  {
    href: '/tools/license-verification',
    icon: ShieldCheck,
    title: 'License verification',
    description:
      'Links to every state insurance department lookup. Verify agents and agencies before you buy.',
  },
  {
    href: '/tools/quote-comparison',
    icon: Calculator,
    title: 'Quote comparison',
    description: 'Compare ballpark premium ranges by state and coverage type before contacting an agent.',
  },
  {
    href: '/tools/medicare-plan-finder',
    icon: ClipboardCheck,
    title: 'Medicare plan finder',
    description: 'Estimate Medicare supplement gaps and compare plan types with educational tools.',
  },
  {
    href: '/tools/aca-eligibility-checker',
    icon: ShieldCheck,
    title: 'ACA eligibility checker',
    description: 'Rough marketplace subsidy estimate by income and household size.',
  },
] as const;

export default function ToolsPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="max-w-3xl mb-12">
        <h1 className="section-heading flex items-center gap-3">
          <Wrench className="h-8 w-8 text-primary" />
          Insurance tools
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Educational calculators and checklists to support your research. These tools do not
          replace advice from a licensed insurance professional.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="h-full hover:shadow-trust-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <tool.icon className="h-5 w-5" />
                </div>
                <h2 className="font-semibold text-lg">{tool.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {tool.description}
                </p>
                <p className="mt-4 text-sm font-medium text-primary">Open tool →</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}