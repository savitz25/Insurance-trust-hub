import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { Card, CardContent } from '@/components/ui/card';
import {
  CURATED_ACA_MARKETS,
  marketPath,
  ACA_MARKET_PLAN_YEAR,
} from '@/lib/marketplace/curated-markets';

export const metadata: Metadata = buildMetadata({
  title: 'Marketplace research — Plan X-Ray & county ACA intelligence',
  description:
    'Research ACA Marketplace plans and curated county market snapshots from CMS data. Educational only — not enrollment, no paid placements.',
  path: '/marketplace',
});

export default function MarketplaceHubPage() {
  return (
    <>
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          <ContextNav pathname="/marketplace" currentLabel="Marketplace research" className="mb-4" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
            Coverage Intelligence · Plan year {ACA_MARKET_PLAN_YEAR}
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-[#0A2540]">
            Marketplace research
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
            Durable plan X-Ray pages and curated county ACA snapshots built from CMS Marketplace
            data. Quality over volume — we do not mass-generate empty county doorways. Research
            only; confirm on HealthCare.gov.
          </p>
          <p className="mt-3 text-sm">
            <Link href="/tools/aca-plan-explorer" className="text-primary hover:underline">
              Live ACA Plan Explorer
            </Link>
            {' · '}
            <Link href="/tools" className="text-primary hover:underline">
              All tools
            </Link>
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Curated county intelligence</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Only markets we actively research. Thin or empty markets are not treated as full
            encyclopedia pages.
          </p>
          <ul className="grid sm:grid-cols-2 gap-3">
            {CURATED_ACA_MARKETS.map((m) => (
              <li key={`${m.stateSlug}-${m.countySlug}`}>
                <Link href={marketPath(m)}>
                  <Card className="hover:border-primary/40 transition-colors h-full">
                    <CardContent className="pt-5 pb-4 flex gap-3">
                      <MapPin className="h-5 w-5 text-[#0284C7] shrink-0 mt-0.5" aria-hidden />
                      <div>
                        <p className="font-semibold">
                          {m.countyName} County, {m.stateCode}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Sample ZIP {m.sampleZip} · CMS Marketplace snapshot
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="text-sm text-muted-foreground leading-relaxed border-t pt-6 space-y-2">
          <p>
            <strong className="text-foreground">Plan X-Ray</strong> URLs look like{' '}
            <code className="text-xs">/marketplace/plans/{ACA_MARKET_PLAN_YEAR}/[planId]</code> —
            open them from Plan Explorer results.
          </p>
          <p>
            Independent research. No lead form required. No paid placements. You decide.
          </p>
        </section>
      </div>
      <DisclaimerBanner />
    </>
  );
}
