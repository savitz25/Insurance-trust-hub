import type { Metadata } from 'next';
import Link from 'next/link';
import { AcaPlanExplorer } from '@/components/marketplace/aca-plan-explorer';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd } from '@/lib/seo/json-ld';
import { RESEARCH_META, buildResearchPageGraph } from '@/lib/seo/research-seo';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';
import { isMarketplaceApiConfigured } from '@/lib/marketplace/client';

const META = RESEARCH_META.acaExplorer;

export const metadata: Metadata = buildMetadata({
  title: META.title,
  description: META.description,
  path: '/tools/aca-plan-explorer',
});

export default function AcaPlanExplorerPage() {
  const apiReady = isMarketplaceApiConfigured();
  const jsonLd = buildResearchPageGraph({
    path: '/tools/aca-plan-explorer',
    name: META.h1,
    description: META.description,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Research tools', path: '/tools' },
      { name: 'ACA Plan Explorer', path: '/tools/aca-plan-explorer' },
    ],
    includeToolSchema: true,
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <ContextNav
            pathname="/tools/aca-plan-explorer"
            currentLabel="ACA Plan Explorer"
            className="mb-4"
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
            Coverage Intelligence · Plan year {MARKETPLACE_PLAN_YEAR_DEFAULT}
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-[#0A2540]">
            {META.h1}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
            Research ACA Marketplace plans for your ZIP and household. Compare premiums and
            estimated yearly cost under a care-usage scenario (CMS expected out-of-pocket when
            available — never invented as $0). Optionally add doctors and prescriptions for
            network/formulary signals. Educational research only — not enrollment. Confirm on
            HealthCare.gov. No lead form required.
          </p>
          <p className="mt-3 text-sm">
            <a href="#yearly-cost" className="text-primary hover:underline">
              Yearly cost scenarios
            </a>
            {' · '}
            <a href="#doctors" className="text-primary hover:underline">
              Doctor network checker
            </a>
            {' · '}
            <a href="#prescriptions" className="text-primary hover:underline">
              Prescription coverage checker
            </a>
            {' · '}
            <Link href="/marketplace" className="text-primary hover:underline">
              County ACA intelligence
            </Link>
            {' · '}
            <Link href="/carriers" className="text-primary hover:underline">
              Carriers
            </Link>
            {' · '}
            <Link href="/methodology" className="text-primary hover:underline">
              Methodology
            </Link>
            {' · '}
            <Link href="/tools" className="text-primary hover:underline">
              All research tools
            </Link>
          </p>
          {!apiReady ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 max-w-2xl">
              <strong>Server note:</strong> <code className="text-xs">MARKETPLACE_API_KEY</code> is
              not set. The tool will show an honest empty state until a CMS Marketplace API key is
              configured. We will not invent plan premiums.
            </p>
          ) : null}
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <AcaPlanExplorer />
      </div>

      <DisclaimerBanner />
    </>
  );
}
