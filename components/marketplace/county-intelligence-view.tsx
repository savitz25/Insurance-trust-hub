'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';
import type { CountyIntelligenceResult } from '@/lib/marketplace/county-intelligence';

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}

function moneyRange(r: { min: number; max: number; count: number } | null | undefined): string {
  if (!r) return 'Not available';
  if (r.min === r.max) return `${money(r.min)} (${r.count} plans)`;
  return `${money(r.min)} – ${money(r.max)} (${r.count} plans)`;
}

type Props = {
  data: CountyIntelligenceResult;
};

export function CountyIntelligenceView({ data }: Props) {
  useEffect(() => {
    trackMarketplaceEvent('county_intelligence_opened', {
      state: data.market.stateSlug,
      county: data.market.countySlug,
      ok: data.ok,
      indexable: data.indexable,
      planCount: data.planCount,
    });
  }, [data.market.stateSlug, data.market.countySlug, data.ok, data.indexable, data.planCount]);

  const m = data.market;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#0284C7]/25 bg-[#E0F2FE]/40 px-4 py-3 text-sm text-[#0A2540]">
        <p className="font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4" aria-hidden />
          County ACA intelligence — research only
        </p>
        <p className="mt-1 text-[#1E293B] leading-relaxed">
          Independent Marketplace market snapshot. Not “best insurance in {m.countyName}.” No paid
          placements. Confirm on HealthCare.gov or your state exchange. You decide.
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Plan year {data.planYear}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0A2540]">
          {m.countyName} County, {m.stateName}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl leading-relaxed">
          ACA individual-market research snapshot from CMS Marketplace plan data for sample ZIP{' '}
          <strong className="text-foreground">{m.sampleZip}</strong>
          {data.locationLabel ? ` (${data.locationLabel})` : ''}.
        </p>
        {data.thin ? (
          <Badge variant="outline" className="mt-3 border-amber-300 text-amber-950">
            Limited data — not a full market encyclopedia
          </Badge>
        ) : null}
      </div>

      {!data.ok ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
          <p className="font-semibold">{data.errorMessage || 'Market data unavailable'}</p>
          <p className="mt-2 text-xs">
            We do not invent issuer counts or premium ranges. Use Plan Explorer or HealthCare.gov.
          </p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Plans (sample search)</p>
                <p className="text-2xl font-bold tabular-nums">{data.planCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Issuers</p>
                <p className="text-2xl font-bold tabular-nums">{data.issuerCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">HSA-capable plans</p>
                <p className="text-2xl font-bold tabular-nums">{data.hsaPlanCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Avg quality signal</p>
                <p className="text-2xl font-bold tabular-nums">
                  {data.quality.average != null
                    ? `${data.quality.average} (${data.quality.count})`
                    : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Metal-level mix</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {Object.keys(data.metalMix).length === 0 ? (
                  <p className="text-muted-foreground">Not available</p>
                ) : (
                  Object.entries(data.metalMix)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span>{k}</span>
                        <span className="tabular-nums font-medium">{v}</span>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Plan-type mix</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {Object.keys(data.planTypeMix).length === 0 ? (
                  <p className="text-muted-foreground">Not available</p>
                ) : (
                  Object.entries(data.planTypeMix)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span>{k}</span>
                        <span className="tabular-nums font-medium">{v}</span>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Premium ranges by metal</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="text-xs text-muted-foreground mb-2">
                Full monthly premium from CMS search household (not a quote for every household).
              </p>
              {Object.keys(data.premiumByMetal).length === 0 ? (
                <p className="text-muted-foreground">Not available</p>
              ) : (
                Object.entries(data.premiumByMetal).map(([metal, r]) => (
                  <div key={metal} className="flex justify-between gap-2">
                    <span>{metal}</span>
                    <span className="tabular-nums font-medium">{moneyRange(r)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Deductible range</CardTitle>
              </CardHeader>
              <CardContent className="text-sm font-medium tabular-nums">
                {moneyRange(data.deductibleRange)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Max OOP range</CardTitle>
              </CardHeader>
              <CardContent className="text-sm font-medium tabular-nums">
                {moneyRange(data.moopRange)}
              </CardContent>
            </Card>
          </div>

          {data.issuers.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Issuers in sample</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm columns-1 sm:columns-2 gap-x-6">
                  {data.issuers.map((name) => (
                    <li key={name} className="py-0.5">
                      {name}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Research next steps</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="trust">
            <Link
              href={data.explorerHref}
              onClick={() =>
                trackMarketplaceEvent('explorer_prefill_from_county', {
                  zip: m.sampleZip,
                  county: m.countySlug,
                })
              }
            >
              Open Plan Explorer for {m.sampleZip}
            </Link>
          </Button>
          {m.medicareDashboardSlug ? (
            <Button asChild variant="outline">
              <Link href={`/data/counties/${m.medicareDashboardSlug}`}>
                Medicare county dashboard
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="gap-1">
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
              HealthCare.gov
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
        <p>
          Source:{' '}
          {data.sourceSystem === 'cms_marketplace_api'
            ? 'CMS Marketplace API (aggregated from plan search)'
            : 'unavailable'}
        </p>
        <p>Retrieved: {new Date(data.retrievedAt).toLocaleString()}</p>
        {data.countyFips ? <p>County FIPS: {data.countyFips}</p> : null}
        {data.limitations.map((l) => (
          <p key={l}>• {l}</p>
        ))}
      </div>
    </div>
  );
}
