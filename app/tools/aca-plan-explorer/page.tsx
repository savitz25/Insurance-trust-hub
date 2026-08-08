import type { Metadata } from 'next';
import Link from 'next/link';
import { AcaPlanExplorer } from '@/components/marketplace/aca-plan-explorer';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { buildMetadata } from '@/lib/seo/metadata';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';
import { isMarketplaceApiConfigured } from '@/lib/marketplace/client';

export const metadata: Metadata = buildMetadata({
  title: 'Live ACA Plan Explorer — Marketplace plan research',
  description:
    'Research ACA Marketplace plans by ZIP and household. Compare estimated yearly cost under care-use scenarios, plus doctor and Rx match signals. Educational research only — not enrollment.',
  path: '/tools/aca-plan-explorer',
});

export default function AcaPlanExplorerPage() {
  const apiReady = isMarketplaceApiConfigured();

  return (
    <>
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
            Live ACA Plan Explorer
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
            See Marketplace plans for your ZIP and household. Compare estimated yearly cost under a
            care-usage scenario (CMS expected out-of-pocket when available — not invented $0 fakes).
            Optionally add doctors and prescriptions for network and formulary signals. No lead form
            required.
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
            <Link href="/calculators/aca-subsidy" className="text-primary hover:underline">
              Subsidy / FPL education
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
