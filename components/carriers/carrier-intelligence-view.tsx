'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ExternalLink, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CarrierIntelligence } from '@/lib/carriers/rollup';
import { formatComplaintRate } from '@/lib/insurance/cms/county-summaries';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}

function moneyRange(
  r: { min: number; max: number; count: number } | null | undefined
): string {
  if (!r) return 'Not available from sample markets';
  if (r.min === r.max) return `${money(r.min)} (${r.count} plans)`;
  return `${money(r.min)} – ${money(r.max)} (${r.count} plans)`;
}

type Props = { data: CarrierIntelligence };

export function CarrierIntelligenceView({ data }: Props) {
  useEffect(() => {
    trackMarketplaceEvent('carrier_page_opened', {
      slug: data.slug,
      indexable: data.indexable,
      aca: data.aca.available,
      medicare: data.medicare.available,
    });
  }, [data.slug, data.indexable, data.aca.available, data.medicare.available]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-[#0284C7]/25 bg-[#E0F2FE]/40 px-4 py-3 text-sm text-[#0A2540]">
        <p className="font-semibold">Carrier research from public data — not a sales ranking</p>
        <p className="mt-1 text-[#1E293B] leading-relaxed">
          Independent rollups of CMS Marketplace and Medicare extracts. Not an endorsement, not paid
          placement, and not an official CMS page. Confirm on HealthCare.gov / Medicare.gov / issuer
          materials. You decide.
        </p>
      </div>

      <header>
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="secondary">Research only</Badge>
          {data.aca.available ? <Badge variant="outline">ACA evidence</Badge> : null}
          {data.medicare.available ? <Badge variant="outline">Medicare evidence</Badge> : null}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0A2540] flex items-center gap-2">
          <Building2 className="h-8 w-8 text-[#0284C7] shrink-0" aria-hidden />
          {data.displayName}
        </h1>
        {data.aliases.length > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Also known as: {data.aliases.join(' · ')}
          </p>
        ) : null}
        {data.identityNote ? (
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-2xl">
            {data.identityNote}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Retrieved {new Date(data.retrievedAt).toLocaleString()}
          {data.medicare.available
            ? ` · Medicare complaint vintage ${data.medicare.complaintVintage}`
            : ''}
          {data.aca.available ? ` · ACA plan year ${data.aca.planYear}` : ''}
        </p>
      </header>

      {/* ACA */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">ACA Marketplace snapshot</h2>
        <p className="text-sm text-muted-foreground">
          Separate from Medicare Advantage / Part D. Counts use CMS Marketplace plan search in
          curated sample markets only.
        </p>
        {!data.aca.available ? (
          <Card className="border-dashed">
            <CardContent className="py-5 text-sm text-muted-foreground">
              {data.aca.notes.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Matched plans (sample markets)</p>
                  <p className="text-2xl font-bold tabular-nums">{data.aca.planCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Markets with evidence</p>
                  <p className="text-2xl font-bold tabular-nums">{data.aca.markets.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Premium range (monthly)</p>
                  <p className="text-sm font-semibold tabular-nums mt-1">
                    {moneyRange(data.aca.premiumRange)}
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Metal mix</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {Object.entries(data.aca.metalMix).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span className="tabular-nums font-medium">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Plan type mix</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {Object.entries(data.aca.planTypeMix).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span className="tabular-nums font-medium">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Curated markets with issuer match</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.aca.markets.map((m) => (
                  <div key={m.marketPath} className="flex flex-wrap justify-between gap-2">
                    <Link
                      href={m.marketPath}
                      className="font-medium text-[#0284C7] hover:underline"
                      onClick={() =>
                        trackMarketplaceEvent('carrier_to_aca_explorer', {
                          slug: data.slug,
                          market: m.marketPath,
                        })
                      }
                    >
                      {m.label}
                    </Link>
                    <span className="text-muted-foreground tabular-nums">
                      {m.planCount} plans · {m.sampleIssuerNames.join(', ')}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2">
                  Deductible range: {moneyRange(data.aca.deductibleRange)}
                </p>
                {data.aca.notes.map((n) => (
                  <p key={n} className="text-xs text-muted-foreground">
                    {n}
                  </p>
                ))}
              </CardContent>
            </Card>
            <Button asChild variant="outline" size="sm">
              <Link
                href="/tools/aca-plan-explorer"
                onClick={() =>
                  trackMarketplaceEvent('carrier_to_aca_explorer', { slug: data.slug })
                }
              >
                Research ACA plans in Plan Explorer
              </Link>
            </Button>
          </>
        )}
      </section>

      {/* Medicare */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Medicare snapshot</h2>
        <p className="text-sm text-muted-foreground">
          Medicare Advantage / Part D contract and curated county context from CMS extracts — not
          Marketplace plans.
        </p>
        {!data.medicare.available ? (
          <Card className="border-dashed">
            <CardContent className="py-5 text-sm text-muted-foreground">
              {data.medicare.notes.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Matched contracts</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {data.medicare.contracts.length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">
                    Published enrollment in curated counties (lower bound)
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {data.medicare.totalPublishedEnrollmentInCuratedCounties.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Related contracts</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {data.medicare.contracts.slice(0, 15).map((c) => (
                    <li key={c.contractId} className="py-2 flex flex-wrap justify-between gap-2">
                      <div>
                        <Link
                          href={c.path}
                          className="font-medium text-[#0284C7] hover:underline"
                          onClick={() =>
                            trackMarketplaceEvent('carrier_to_contract', {
                              slug: data.slug,
                              contractId: c.contractId,
                            })
                          }
                        >
                          {c.reportedCarrierName}
                        </Link>
                        <p className="text-xs text-muted-foreground font-mono">
                          {c.contractId}
                          {c.planType ? ` · ${c.planType}` : ''}
                          {c.nationalRank != null ? ` · US rank #${c.nationalRank}` : ''}
                        </p>
                      </div>
                      <div className="text-right text-xs tabular-nums">
                        <p>
                          {c.complaintRatePerThousand != null
                            ? `${formatComplaintRate(c.complaintRatePerThousand)} /1k`
                            : 'Rate —'}
                        </p>
                        <p className="text-muted-foreground">
                          Star {c.complaintMeasureStar ?? '—'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            {data.medicare.counties.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Curated county presence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {data.medicare.counties.map((c) => (
                    <div
                      key={`${c.slug}-${c.contractId}`}
                      className="flex flex-wrap justify-between gap-2"
                    >
                      <Link
                        href={c.path}
                        className="font-medium text-[#0284C7] hover:underline"
                        onClick={() =>
                          trackMarketplaceEvent('carrier_to_medicare_county', {
                            slug: data.slug,
                            county: c.slug,
                          })
                        }
                      >
                        {c.displayName}, {c.stateCode}
                      </Link>
                      <span className="text-muted-foreground tabular-nums text-xs">
                        {c.publishedEnrollment.toLocaleString()} enrollees · {c.contractId}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Complaint vintage: {data.medicare.complaintVintage}. Enrollment:{' '}
              {data.medicare.enrollmentSource}.
            </p>
            {data.medicare.notes.map((n) => (
              <p key={n} className="text-xs text-muted-foreground">
                {n}
              </p>
            ))}
            <Button asChild variant="outline" size="sm">
              <Link href="/medicare">Medicare Market Intelligence hub</Link>
            </Button>
          </>
        )}
      </section>

      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What we can and cannot say</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>Not an endorsement or “best carrier” award</li>
            <li>Not a complete national inventory of every product</li>
            <li>Networks, formularies, and plan menus change</li>
            <li>Confirm on HealthCare.gov, Medicare.gov, and issuer materials</li>
          </ul>
          {data.limitations.map((l) => (
            <p key={l} className="text-xs">
              • {l}
            </p>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="trust" className="gap-1">
          <a
            href="https://www.healthcare.gov/see-plans/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackMarketplaceEvent('outbound_official_source_click', {
                from: 'carrier',
                target: 'healthcare_gov',
              })
            }
          >
            HealthCare.gov
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
        <Button asChild variant="outline" className="gap-1">
          <a
            href="https://www.medicare.gov/plan-compare/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackMarketplaceEvent('outbound_official_source_click', {
                from: 'carrier',
                target: 'medicare_gov',
              })
            }
          >
            Medicare.gov
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
        <Button asChild variant="outline">
          <Link href="/carriers">All researched carriers</Link>
        </Button>
      </div>
    </div>
  );
}
