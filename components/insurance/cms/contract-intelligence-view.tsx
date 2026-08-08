'use client';

import Link from 'next/link';
import { ExternalLink, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ContractIntelligence } from '@/lib/insurance/cms/contract-intelligence';
import { formatComplaintRate } from '@/lib/insurance/cms/county-summaries';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';
import { MedicareContractOpenBeacon } from '@/components/insurance/cms/medicare-analytics';

type Props = { data: ContractIntelligence };

export function ContractIntelligenceView({ data }: Props) {
  if (!data.ok) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
          <p className="font-semibold">Contract research unavailable</p>
          <p className="mt-2 text-xs leading-relaxed">
            {data.unavailableReason ||
              'No CMS-backed complaint or county enrollment data for this contract in our extracts.'}{' '}
            We do not invent ratings or enrollment.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/data/plan-complaint-index">Plan Complaint Index</Link>
        </Button>
      </div>
    );
  }

  const synced = new Date(data.complaintSyncedAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      <MedicareContractOpenBeacon contractId={data.contractId} />

      <div className="rounded-xl border border-[#0284C7]/25 bg-[#E0F2FE]/40 px-4 py-3 text-sm text-[#0A2540]">
        <p className="font-semibold">Research only — Medicare contract intelligence</p>
        <p className="mt-1 text-[#1E293B] leading-relaxed">
          Independent CMS-backed context for shoppers and caregivers. Not Medicare enrollment, not
          an official CMS tool, and not a “best plan” award. Confirm current options on
          Medicare.gov. No paid placements. You decide.
        </p>
      </div>

      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          {data.planType ? <Badge variant="secondary">{data.planType}</Badge> : null}
          <Badge variant="outline">{data.contractId}</Badge>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0A2540]">
          {data.carrierName || 'CMS contract'}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Contract <span className="font-mono">{data.contractId}</span>
          {' · '}
          Complaint data vintage <strong>{data.dataVintage}</strong>
          {' · '}
          Synced {synced}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Complaint rate / 1,000</p>
            <p className="text-2xl font-bold tabular-nums">
              {data.complaintRatePerThousand != null
                ? formatComplaintRate(data.complaintRatePerThousand)
                : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Measure {data.complaintMeasure || 'not listed'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Complaint-measure star</p>
            <p className="text-2xl font-bold tabular-nums">
              {data.complaintMeasureStar != null ? data.complaintMeasureStar : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              C28/D02 star when CMS reported — not always overall rating
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">National rank (lowest rate first)</p>
            <p className="text-2xl font-bold tabular-nums">
              {data.nationalRank != null ? `#${data.nationalRank}` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">FL / TX rank</p>
            <p className="text-2xl font-bold tabular-nums">
              {data.floridaRank != null ? `FL #${data.floridaRank}` : 'FL —'}
              {' · '}
              {data.texasRank != null ? `TX #${data.texasRank}` : 'TX —'}
            </p>
          </CardContent>
        </Card>
      </div>

      {data.materialStates.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Material state presence (complaint index)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {data.materialStates.join(', ')}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Curated county enrollment presence
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data.countyPresence.length ? (
            <p className="text-sm text-muted-foreground">
              Not in top material contracts for our curated county dashboards (may still enroll
              elsewhere). Unavailable locally — not invented.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {data.countyPresence.map((c) => (
                <li key={c.slug} className="py-2 flex flex-wrap justify-between gap-2">
                  <Link href={c.path} className="font-medium text-[#0284C7] hover:underline">
                    {c.displayName}, {c.stateCode}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">
                    {c.publishedEnrollment.toLocaleString()} published enrollees
                    {c.bucket ? ` · ${c.bucket.toUpperCase()}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sources &amp; limitations
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>Complaint / star measure: CMS Star Ratings ({data.dataVintage})</p>
          <p>Enrollment context: {data.enrollmentSource}</p>
          {data.limitations.map((l) => (
            <p key={l}>• {l}</p>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="trust" className="gap-1">
          <a
            href="https://www.medicare.gov/plan-compare/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackMarketplaceEvent('outbound_medicare_gov_click', {
                from: 'contract',
                contractId: data.contractId,
              })
            }
          >
            Confirm on Medicare.gov
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
        <Button asChild variant="outline">
          <Link
            href="/data/plan-complaint-index"
            onClick={() =>
              trackMarketplaceEvent('medicare_tool_handoff', { to: 'complaint_index' })
            }
          >
            Plan Complaint Index
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/medicare">Medicare research hub</Link>
        </Button>
      </div>
    </div>
  );
}
