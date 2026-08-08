'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SaveCalculatorButton } from '@/components/my-insurance/save-calculator-button';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';
import { marketPath, type CuratedAcaMarket } from '@/lib/marketplace/curated-markets';
import type { PlanXRayResult } from '@/lib/marketplace/plan-xray';

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return 'Not listed';
  return `$${Math.round(n).toLocaleString()}`;
}

type Props = {
  data: PlanXRayResult;
  relatedMarket?: CuratedAcaMarket | null;
  explorerHref: string;
};

export function PlanXRayView({ data, relatedMarket, explorerHref }: Props) {
  useEffect(() => {
    trackMarketplaceEvent('plan_xray_opened', {
      planId: data.plan?.id ?? null,
      ok: data.ok,
      indexable: data.indexable,
    });
  }, [data.plan?.id, data.ok, data.indexable]);

  const plan = data.plan;

  if (!data.ok || !plan) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
          <p className="font-semibold">{data.errorMessage || 'Plan research unavailable'}</p>
          <p className="mt-2 text-xs leading-relaxed">
            We do not invent plan benefits or premiums. Try Plan Explorer with your ZIP, or confirm
            on HealthCare.gov.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href={explorerHref}>
            <ArrowLeft className="h-4 w-4" />
            Back to Plan Explorer
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#0284C7]/25 bg-[#E0F2FE]/40 px-4 py-3 text-sm text-[#0A2540]">
        <p className="font-semibold">Research only — Plan X-Ray</p>
        <p className="mt-1 text-[#1E293B] leading-relaxed">
          Independent Marketplace research. Educational estimates where labeled. Not enrollment.
          Confirm on HealthCare.gov or issuer materials. No paid placements. You decide.
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Badge>{plan.metalLevel}</Badge>
            <Badge variant="outline">{plan.planType}</Badge>
            {plan.hsaEligible ? <Badge variant="outline">HSA</Badge> : null}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0A2540]">
            {plan.name}
          </h1>
          <p className="mt-1 text-muted-foreground">{plan.issuerName}</p>
          {data.locationLabel ? (
            <p className="text-sm text-muted-foreground mt-1">Market context: {data.locationLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <SaveCalculatorButton
            calculatorId="aca_plan_explorer"
            title={`Plan X-Ray: ${plan.name}`}
            size="sm"
            onSaved={() =>
              trackMarketplaceEvent('save_plan_from_xray', { planId: plan.id })
            }
            snapshot={{
              summaryText: `${plan.name} · ${plan.issuerName} · ${plan.metalLevel}`,
              sourcePath: `/marketplace/plans/${data.planYear}/${encodeURIComponent(plan.id)}`,
              inputs: { planId: plan.id, year: data.planYear, zip: data.marketZip },
              outputs: {
                metal: plan.metalLevel,
                premiumMonthly: plan.premiumMonthly,
                deductible: plan.deductibleIndividual,
                moop: plan.moopIndividual,
              },
            }}
          />
        </div>
      </div>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(
          [
            ['Full premium / mo', money(plan.premiumMonthly)],
            [
              'Est. after credit / mo',
              money(plan.estimatedPremiumAfterCreditMonthly),
              plan.afterCreditIsEstimate ? 'Educational estimate' : null,
            ],
            ['Deductible (indiv.)', money(plan.deductibleIndividual)],
            ['Max OOP (indiv.)', money(plan.moopIndividual)],
            [
              'HSA eligible',
              plan.hsaEligible == null ? 'Not listed' : plan.hsaEligible ? 'Yes' : 'No',
            ],
            [
              'Quality signal',
              plan.qualityRating != null ? String(plan.qualityRating) : 'Not listed',
            ],
          ] as [string, string, string | null | undefined][]
        ).map(([label, value, note]) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold tabular-nums mt-0.5">{value}</p>
              {note ? <p className="text-[11px] text-muted-foreground">{note}</p> : null}
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cost picture</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground leading-relaxed">
          <p>
            Monthly premium fields above are issuer-reported when CMS returned them for this plan
            {data.marketZip ? ` in ZIP ${data.marketZip}` : ' (add ?zip= for market-priced fields)'}.
          </p>
          {plan.cmsOopc != null ? (
            <p>
              CMS expected out-of-pocket (OOPC) under Medium utilization research context:{' '}
              <strong className="text-foreground">{money(plan.cmsOopc)}</strong>
            </p>
          ) : (
            <p>
              Scenario yearly-cost OOPC is not attached on this static X-Ray load
              {data.marketZip ? ' (or CMS did not calculate oopc).' : ' — open Explorer with a care scenario for Phase 9 yearly totals.'}
            </p>
          )}
          {plan.networkName ? (
            <p>
              Network name: <strong className="text-foreground">{plan.networkName}</strong>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Coverage match</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          Doctor and prescription match signals are session-based in{' '}
          <Link href={explorerHref} className="text-primary hover:underline">
            Plan Explorer
          </Link>
          . This X-Ray page does not invent in-network or formulary claims without your
          doctor/Rx list.
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Benefits / cost sharing</CardTitle>
        </CardHeader>
        <CardContent>
          {data.benefits.length > 0 ? (
            <ul className="divide-y text-sm">
              {data.benefits.map((b) => (
                <li key={b.name} className="py-2 flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-foreground">{b.name}</span>
                  <span className="text-muted-foreground text-xs sm:text-sm">
                    {b.costSharing || 'Details not listed in CMS payload'}
                  </span>
                </li>
              ))}
            </ul>
          ) : plan.benefitsSummary ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{plan.benefitsSummary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No benefit line items returned by CMS for this plan. Unavailable — not fabricated.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What this page does not claim</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Not enrollment or a guarantee of acceptance at a specific provider</li>
            <li>Not a guarantee of final yearly cost</li>
            <li>Networks and formularies change — re-check issuer / Marketplace sources</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sources</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>
            Source: {data.sourceSystem === 'cms_marketplace_api' ? 'CMS Marketplace API' : 'unavailable'}
          </p>
          <p>Plan year: {data.planYear}</p>
          <p>Retrieved: {new Date(data.retrievedAt).toLocaleString()}</p>
          {data.countyFips ? <p>County FIPS: {data.countyFips}</p> : null}
          {data.limitations.map((l) => (
            <p key={l}>• {l}</p>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="gap-2">
          <Link href={explorerHref}>
            <ArrowLeft className="h-4 w-4" />
            Back to Explorer
          </Link>
        </Button>
        {relatedMarket ? (
          <Button asChild variant="outline">
            <Link href={marketPath(relatedMarket)}>
              {relatedMarket.countyName} county intelligence
            </Link>
          </Button>
        ) : null}
        {plan.marketingUrl ? (
          <Button asChild variant="outline" className="gap-1">
            <a
              href={plan.marketingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackMarketplaceEvent('outbound_official_exchange_click', {
                  target: 'issuer',
                })
              }
            >
              Issuer materials
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : null}
        <Button asChild variant="trust" className="gap-1">
          <a
            href="https://www.healthcare.gov/see-plans/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackMarketplaceEvent('outbound_official_exchange_click', {
                target: 'healthcare_gov',
              })
            }
          >
            Confirm on HealthCare.gov
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
