import type { ComponentType } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Building2,
  ExternalLink,
  FileText,
  Shield,
  Star,
  Users,
} from 'lucide-react';
import type { HubAgent } from '@/types/agent';
import type { CountyMedicareSummary } from '@/lib/insurance/cms/types';
import {
  COUNTY_SUMMARIES_META,
  formatComplaintRate,
  formatEnrollment,
} from '@/lib/insurance/cms/county-summaries';
import { contractIntelligencePath } from '@/lib/insurance/cms/medicare-routes';
import { AgentCard } from '@/components/agent-card';
import { cn } from '@/lib/utils';

type Props = {
  summary: CountyMedicareSummary;
  agents: HubAgent[];
};

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0284C7]">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      {note ? <p className="mt-3 text-xs leading-relaxed text-slate-500">{note}</p> : null}
    </div>
  );
}

export function CountyMedicareDashboard({ summary, agents }: Props) {
  const m = summary.metrics;
  const syncedLabel = new Date(COUNTY_SUMMARIES_META.syncedAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const starCounts = summary.starDistribution.counts;
  const starTotal = summary.starDistribution.contractsWithStar;
  const medicareAgents = agents.filter(
    (a) =>
      a.isMedicareFeatured ||
      a.specialties.includes('Medicare Specialists') ||
      a.insuranceTypes.includes('medicare')
  );
  const featuredAgents = (medicareAgents.length ? medicareAgents : agents).slice(0, 6);

  return (
    <div className="space-y-10">
      {/* Positioning + official handoff */}
      <div className="rounded-2xl border border-[#0284C7]/25 bg-[#E0F2FE]/40 px-4 py-4 text-sm text-[#0A2540]">
        <p className="font-semibold">
          Understand your Medicare market before anyone sells you a plan
        </p>
        <p className="mt-1 text-[#1E293B] leading-relaxed">
          Independent CMS-backed research — not Medicare enrollment, not an official CMS tool, and
          not a “best plan in {summary.displayName}” ranking. Plan availability and costs change.
          Confirm on Medicare.gov. No paid placements. You decide.
        </p>
        <p className="mt-2 text-xs text-slate-600">
          Data vintage: {COUNTY_SUMMARIES_META.enrollmentSource} · Complaint measures:{' '}
          {COUNTY_SUMMARIES_META.starSource} · Last synced {syncedLabel}
          {COUNTY_SUMMARIES_META.usingPlaceholderData
            ? ' · Note: placeholder flag is set on this extract'
            : ''}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="https://www.medicare.gov/plan-compare/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-[#0284C7] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A]"
          >
            Confirm on Medicare.gov
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
          <Link
            href="/data/plan-complaint-index"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-[#0284C7]/40"
          >
            Plan Complaint Index
          </Link>
          <Link
            href="/tools/medicare-provider-lookup"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-[#0284C7]/40"
          >
            Provider lookup (FFS / Opt Out)
          </Link>
          <Link
            href="/tools/medicare-plan-finder"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-[#0284C7]/40"
          >
            Medicare research guide
          </Link>
        </div>
      </div>

      {/* Snapshot */}
      <section aria-labelledby="market-snapshot-heading">
        <h2 id="market-snapshot-heading" className="text-xl font-semibold text-slate-900">
          Medicare market snapshot
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Enrollment period <strong className="font-medium text-slate-800">{summary.enrollmentPeriod}</strong>
          {' · '}
          FIPS {summary.fips}
          {' · '}
          Distinct from ACA Marketplace research (separate programs)
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Published MA/PD enrollment"
            value={formatEnrollment(m.publishedEnrollment)}
            note="Lower bound — suppressed CMS cells (≤10) excluded"
            icon={Users}
          />
          <MetricCard
            label="Material contracts"
            value={String(m.materialConsumerContracts)}
            note={`≥${m.materialThreshold} published enrollees; employer-only excluded`}
            icon={Building2}
          />
          <MetricCard
            label="MA contracts (material)"
            value={String(m.maContractsMaterial)}
            note={`${m.pdpContractsMaterial} Part D (PDP) contracts also material`}
            icon={Activity}
          />
          <MetricCard
            label="Plan options present"
            value={formatEnrollment(m.planOptionsWithAnyPresence)}
            note={`${m.contractsWithAnyPresence} contracts with any county row (incl. suppressed)`}
            icon={FileText}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Not available from loaded files</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed">
              <li>{m.yearOverYearNote}</li>
              <li>{m.maPenetrationNote}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Enrollment caveats</p>
            <p className="mt-1 text-xs leading-relaxed">{m.publishedEnrollmentNote}</p>
          </div>
        </div>
      </section>

      {/* Quality & complaints */}
      <section aria-labelledby="quality-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="quality-heading" className="text-xl font-semibold text-slate-900">
              Quality &amp; complaint context
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Star values below are <strong className="font-medium">contract-level</strong> CMS
              measure stars for complaints (C28 / D02), not plan marketing ratings. Overall Part
              C/D summary stars are not joined in this build.
            </p>
          </div>
          <Link
            href="/data/plan-complaint-index"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#0284C7] hover:underline"
          >
            Plan Complaint Index <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Complaint-measure star distribution
          </p>
          <p className="mt-1 text-xs text-slate-500">{summary.starDistribution.measure}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = starCounts[String(star)] ?? 0;
              const pct = starTotal > 0 ? Math.round((count / starTotal) * 100) : 0;
              return (
                <div
                  key={star}
                  className="min-w-[4.5rem] flex-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-center"
                >
                  <p className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-slate-800">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                    {star}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{count}</p>
                  <p className="text-[10px] text-slate-500">{pct}% of rated</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {starTotal} material consumer contracts with a reported C28/D02 star
            {starCounts.unknown
              ? ` · ${starCounts.unknown} material contracts without a complaint-measure star`
              : ''}
            .
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Largest contracts by published county enrollment
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Contract</th>
                    <th className="px-4 py-2 font-semibold">Type</th>
                    <th className="px-4 py-2 font-semibold">Enrollment</th>
                    <th className="px-4 py-2 font-semibold">Complaint rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.topContractsByEnrollment.map((c) => (
                    <tr key={c.contractId}>
                      <td className="px-4 py-2.5">
                        <Link
                          href={contractIntelligencePath(c.contractId)}
                          className="font-medium text-[#0284C7] hover:underline"
                        >
                          {c.carrierName}
                        </Link>
                        <p className="text-xs text-slate-500 font-mono">{c.contractId}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs uppercase text-slate-600">
                        {c.bucket ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums font-medium">
                        {formatEnrollment(c.publishedEnrollment)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-700">
                        {formatComplaintRate(c.complaintRatePerThousand)}
                        {c.complaintRatePerThousand != null ? (
                          <span className="text-xs text-slate-400"> /1k</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Lowest complaint rates among material contracts
              </h3>
              <p className="text-xs text-slate-500">
                From Plan Complaint Index join (contract-level C28/D02)
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {summary.lowestComplaintAmongMaterial.length === 0 ? (
                <li className="px-5 py-4 text-sm text-slate-500">No complaint rates available.</li>
              ) : (
                summary.lowestComplaintAmongMaterial.map((c, i) => (
                  <li key={c.contractId} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        #{i + 1}{' '}
                        <Link
                          href={contractIntelligencePath(c.contractId)}
                          className="text-[#0284C7] hover:underline"
                        >
                          {c.carrierName}
                        </Link>
                      </p>
                      <p className="text-xs text-slate-500">
                        {c.contractId} · {formatEnrollment(c.publishedEnrollment)} published enrollees
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-[#0284C7]">
                      {formatComplaintRate(c.complaintRatePerThousand)}
                      <span className="text-xs font-normal text-slate-500"> /1k</span>
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Optional human help — secondary to research; not a lead funnel primary CTA */}
      <section aria-labelledby="agents-heading" className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="agents-heading" className="text-lg font-semibold text-slate-900">
              Optional: licensed help (secondary)
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Research first with CMS context and Medicare.gov. Directory listings are separate —
              we do not sell your research as leads from this page.
              {agents.length
                ? ` ${agents.length} local listing${agents.length === 1 ? '' : 's'} available if you want human help.`
                : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-medium">
            <Link
              href={`/hubs/${summary.hubStateSlug}/${summary.hubSlug}`}
              className="text-[#0284C7] hover:underline"
            >
              County agent hub
            </Link>
          </div>
        </div>
        {featuredAgents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No curated agents linked for this county yet.</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredAgents.slice(0, 3).map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </section>

      {/* Provenance */}
      <section
        aria-labelledby="provenance-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
      >
        <h2 id="provenance-heading" className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <Shield className="h-5 w-5 text-[#0284C7]" aria-hidden />
          Data provenance
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Enrollment source
            </dt>
            <dd className="mt-1 text-slate-700">{COUNTY_SUMMARIES_META.enrollmentSource}</dd>
            <dd className="text-xs text-slate-500">{COUNTY_SUMMARIES_META.enrollmentFile}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quality / complaints
            </dt>
            <dd className="mt-1 text-slate-700">{COUNTY_SUMMARIES_META.starSource}</dd>
            <dd className="text-xs text-slate-500">{COUNTY_SUMMARIES_META.complaintSource}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Last synced
            </dt>
            <dd className="mt-1 text-slate-700">{syncedLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Placeholder data
            </dt>
            <dd className="mt-1 text-slate-700">
              {COUNTY_SUMMARIES_META.usingPlaceholderData ? 'Yes' : 'No — CMS-derived'}
            </dd>
          </div>
        </dl>
        <p
          className={cn(
            'mt-6 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 text-sm leading-relaxed text-amber-950'
          )}
        >
          <strong className="font-semibold">Editorial disclaimer:</strong> This dashboard is
          educational transparency content only. It is not medical, legal, or insurance advice; not
          an endorsement of any carrier, contract, or agent; and not affiliated with CMS, HHS, or
          any plan sponsor. Enrollment figures are lower bounds where CMS suppresses small cells.
          Always verify current plan details on Medicare.gov and with licensed agents.
        </p>
      </section>
    </div>
  );
}
