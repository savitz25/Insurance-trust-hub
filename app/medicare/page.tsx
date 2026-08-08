import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, ExternalLink, MapPin, Stethoscope } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { Card, CardContent } from '@/components/ui/card';
import {
  COUNTY_SUMMARIES_META,
  formatEnrollment,
  getAllCountySummaries,
} from '@/lib/insurance/cms/county-summaries';
import {
  countyPathFromSummary,
  isMedicareCountyIndexable,
} from '@/lib/insurance/cms/medicare-routes';
import { CMS_COMPLAINT_DATASET_META } from '@/lib/insurance/cms/complaint-rankings';

export const metadata: Metadata = buildMetadata({
  title: 'Medicare Market Intelligence — CMS-backed county & contract research',
  description:
    'Understand your Medicare market before anyone sells you a plan. County enrollment context, complaint-measure signals, and contract research from CMS extracts. Educational only — confirm on Medicare.gov.',
  path: '/medicare',
});

export default function MedicareHubPage() {
  const counties = getAllCountySummaries().filter(isMedicareCountyIndexable);
  const synced = new Date(COUNTY_SUMMARIES_META.syncedAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <div className="border-b bg-muted/20">
        <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
          <ContextNav pathname="/medicare" currentLabel="Medicare research" className="mb-4" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
            Medicare Market Intelligence
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-[#0A2540]">
            Understand your Medicare market before anyone sells you a plan
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
            CMS-backed county snapshots and contract complaint context — research only, not
            enrollment, and not an official CMS tool. Separate from ACA Marketplace research. Confirm
            on Medicare.gov. No paid placements.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Enrollment vintage: {COUNTY_SUMMARIES_META.enrollmentSource.split('—')[1]?.trim() ?? 'CMS'}{' '}
            · Complaint measures: {CMS_COMPLAINT_DATASET_META.dataVintage} · Synced {synced}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-10 space-y-10">
        <section>
          <h2 className="text-lg font-semibold mb-3">Start research</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link href="/data/plan-complaint-index">
              <Card className="h-full hover:border-primary/40 transition-colors">
                <CardContent className="pt-5 pb-4 flex gap-3">
                  <BarChart3 className="h-5 w-5 text-[#0284C7] shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">Plan Complaint Index</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      MA / Part D contracts ranked by CMS complaints per 1,000
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/tools/medicare-provider-lookup">
              <Card className="h-full hover:border-primary/40 transition-colors">
                <CardContent className="pt-5 pb-4 flex gap-3">
                  <Stethoscope className="h-5 w-5 text-[#0284C7] shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">Medicare provider lookup</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      CMS FFS participation / Opt Out signals — not MA network membership
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/tools/medicare-plan-finder">
              <Card className="h-full hover:border-primary/40 transition-colors">
                <CardContent className="pt-5 pb-4 flex gap-3">
                  <MapPin className="h-5 w-5 text-[#0284C7] shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">Situation research guide</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Turning 65, moving, switching — not a quoting tool
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <a
              href="https://www.medicare.gov/plan-compare/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card className="h-full hover:border-primary/40 transition-colors">
                <CardContent className="pt-5 pb-4 flex gap-3">
                  <ExternalLink className="h-5 w-5 text-[#0284C7] shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">Medicare.gov Plan Compare</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Official enrollment and plan shopping
                    </p>
                  </div>
                </CardContent>
              </Card>
            </a>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">County Medicare intelligence</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Quality-gated markets with real CMS enrollment and complaint-measure context — not mass
            thin pages for every US county.
          </p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {counties.map((c) => (
              <li key={c.slug}>
                <Link href={countyPathFromSummary(c)}>
                  <Card className="h-full hover:border-primary/40 transition-colors">
                    <CardContent className="pt-5 pb-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0284C7]">
                        {c.stateName}
                      </p>
                      <p className="font-semibold mt-0.5">{c.displayName}</p>
                      <p className="mt-2 text-xl font-bold tabular-nums">
                        {formatEnrollment(c.metrics.publishedEnrollment)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        published MA/PD enrollment · {c.metrics.materialConsumerContracts} material
                        contracts
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Also available at legacy paths under{' '}
            <Link href="/data/counties" className="text-primary hover:underline">
              /data/counties
            </Link>
            .
          </p>
        </section>

        <section className="text-xs text-muted-foreground border-t pt-6 space-y-1">
          <p>
            ACA Marketplace tools (Plan Explorer, subsidies) are a separate research track from
            Medicare Advantage / Part D.
          </p>
          <p>
            Sources: {COUNTY_SUMMARIES_META.enrollmentSource};{' '}
            {CMS_COMPLAINT_DATASET_META.sourceLabel}.
          </p>
        </section>
      </div>
      <DisclaimerBanner />
    </>
  );
}
