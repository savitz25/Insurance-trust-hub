import type { Metadata } from 'next';
import Link from 'next/link';
import { Calculator, Heart, Shield, PiggyBank } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Calculators — Premium, Medicare & ACA Tools',
  description:
    'Free insurance calculators: premium estimator, Medicare coverage gap tool, and ACA subsidy estimator. Estimates only — verify with licensed agents.',
  path: '/calculators',
});

const CALCULATORS = [
  {
    href: '/calculators/premium-estimator',
    icon: Calculator,
    title: 'Premium Estimator',
    description:
      'Estimate auto, homeowners, health, and Medicare premium ranges by state and profile. Clearly labeled estimates only.',
  },
  {
    href: '/calculators/medicare-gap',
    icon: Heart,
    title: 'Medicare Gap Analyzer',
    description:
      'Identify potential coverage gaps when moving states, aging into Medicare, or transitioning from employer plans.',
  },
  {
    href: '/calculators/aca-subsidy',
    icon: PiggyBank,
    title: 'ACA Subsidy Estimator',
    description:
      'Rough 2026 marketplace subsidy estimate based on household size, income, and ZIP. Not official CMS data.',
  },
  {
    href: '/tools/license-verification',
    icon: Shield,
    title: 'License Verification Guide',
    description: 'Step-by-step instructions to verify agent licensing with your state Department of Insurance.',
  },
];

export default function CalculatorsPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mb-12">
        <h1 className="text-3xl md:text-4xl font-bold">Insurance Calculators</h1>
        <p className="mt-3 text-muted-foreground text-lg">
          Educational tools to estimate costs and identify coverage gaps. All outputs are estimates
          only — consult a licensed agent and verify with official sources.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 max-w-4xl">
        {CALCULATORS.map((calc) => (
          <Card key={calc.href} className="flex flex-col">
            <CardHeader>
              <calc.icon className="h-8 w-8 text-primary mb-2" />
              <CardTitle>{calc.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground flex-1">{calc.description}</p>
              <Button variant="outline" className="mt-4 w-fit" asChild>
                <Link href={calc.href}>Open Calculator</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}