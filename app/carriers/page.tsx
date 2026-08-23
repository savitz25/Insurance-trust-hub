import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd } from '@/lib/seo/json-ld';
import { RESEARCH_META, buildResearchPageGraph } from '@/lib/seo/research-seo';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { Card, CardContent } from '@/components/ui/card';
import { CARRIER_REGISTRY, carrierPath } from '@/lib/carriers/registry';
import {
  buildMedicareRollup,
  listMedicareEvidencedCarrierSlugs,
} from '@/lib/carriers/rollup';
import { parseInsuranceAskSearchContext } from '@/lib/ask-handoff';
import { EmptyCoveragePanel, NAIC_CONSUMER_URL } from '@/components/research/empty-coverage-panel';

const META = RESEARCH_META.carriersHub;

export const metadata: Metadata = buildMetadata({
  title: META.title,
  description: META.description,
  path: '/carriers',
});

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CarriersIndexPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const askCtx = parseInsuranceAskSearchContext(params);
  const askWantsGeo = Boolean(askCtx?.state || askCtx?.city || askCtx?.zip);
  // Carrier registry has no safe authoritative geography — Ask geo filters → honest zero.
  const askGeoEmpty = Boolean(askCtx && askCtx.entityType === 'insurance_carrier' && askWantsGeo);

  const evidenced = new Set(listMedicareEvidencedCarrierSlugs());
  const jsonLd = buildResearchPageGraph({
    path: '/carriers',
    name: META.h1,
    description: META.description,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Carrier research', path: '/carriers' },
    ],
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="border-b bg-muted/20">
        <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
          <ContextNav pathname="/carriers" currentLabel="Carriers" className="mb-4" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
            Carrier intelligence
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-[#0A2540]">
            {META.h1}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
            Organization-level rollups of CMS Marketplace and Medicare signals already on Insurance
            Trust Hub. Curated where we have evidence — not every brand in America. Confirm on
            official sites. No paid placements.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-10 space-y-6">
        {askCtx ? (
          <p className="rounded-lg border border-[#0284C7]/25 bg-[#0284C7]/5 px-3 py-2 text-sm text-[#0A2540]">
            Preloaded from AskTrustHub — insurance carrier research
            {askCtx.state ? ` · state context ${askCtx.state}` : ''}.
          </p>
        ) : null}
        {askGeoEmpty ? (
          <EmptyCoveragePanel
            variant="unmapped"
            title={`No verified carriers matched ${askCtx?.state || 'that location'} yet`}
            description="The curated carrier registry does not publish safe state/city geography for Ask Universal Search. We will not infer carrier location from brand names. Browse organization-level carrier research below, or return to agency directory filters."
            placeLabel={askCtx?.state || undefined}
            primarySources={[
              { href: NAIC_CONSUMER_URL, label: 'NAIC consumer resources', external: true },
            ]}
            widenLinks={[
              { href: '/carriers', label: 'Clear Ask geo / all carriers' },
              { href: '/directory?verified=true', label: 'Browse verified agencies' },
            ]}
          />
        ) : null}
        <ul className="grid sm:grid-cols-2 gap-3">
          {(askGeoEmpty ? [] : CARRIER_REGISTRY).map((c) => {
            const med = buildMedicareRollup(c);
            return (
              <li key={c.slug}>
                <Link href={carrierPath(c.slug)}>
                  <Card className="h-full hover:border-primary/40 transition-colors">
                    <CardContent className="pt-5 pb-4 flex gap-3">
                      <Building2 className="h-5 w-5 text-[#0284C7] shrink-0 mt-0.5" aria-hidden />
                      <div>
                        <p className="font-semibold">{c.displayName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {evidenced.has(c.slug) || med.available
                            ? `${med.contracts.length} Medicare contract match(es) · curated research`
                            : 'Research profile · ACA evidence when Marketplace data matches'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground leading-relaxed border-t pt-4">
          ACA and Medicare are labeled separately on each page. Directory / agent listings are out of
          scope here. Related:{' '}
          <Link href="/medicare" className="text-primary hover:underline">
            Medicare hub
          </Link>
          {' · '}
          <Link href="/marketplace" className="text-primary hover:underline">
            ACA marketplace research
          </Link>
          {' · '}
          <Link href="/tools/aca-plan-explorer" className="text-primary hover:underline">
            Plan Explorer
          </Link>
          .
        </p>
      </div>
      <DisclaimerBanner />
    </>
  );
}
