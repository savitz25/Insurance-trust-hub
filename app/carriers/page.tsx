import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { Card, CardContent } from '@/components/ui/card';
import { CARRIER_REGISTRY, carrierPath } from '@/lib/carriers/registry';
import {
  buildMedicareRollup,
  listMedicareEvidencedCarrierSlugs,
} from '@/lib/carriers/rollup';

export const metadata: Metadata = buildMetadata({
  title: 'Carrier research — public-data intelligence profiles',
  description:
    'Carrier research from CMS Marketplace and Medicare extracts — not sales rankings. Educational only; confirm on HealthCare.gov and Medicare.gov.',
  path: '/carriers',
});

export default function CarriersIndexPage() {
  const evidenced = new Set(listMedicareEvidencedCarrierSlugs());

  return (
    <>
      <div className="border-b bg-muted/20">
        <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
          <ContextNav pathname="/carriers" currentLabel="Carriers" className="mb-4" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
            Carrier intelligence
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-[#0A2540]">
            Carrier research from public data — not a sales ranking
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
            Organization-level rollups of CMS Marketplace and Medicare signals already on Insurance
            Trust Hub. Curated where we have evidence — not every brand in America. Confirm on
            official sites. No paid placements.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-10 space-y-6">
        <ul className="grid sm:grid-cols-2 gap-3">
          {CARRIER_REGISTRY.map((c) => {
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
