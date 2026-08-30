import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ZipSearch } from '@/components/zip-search';
import { HomeIntelChecklist } from '@/components/home/home-intel-checklist';
import { HomeIntelEvents } from '@/components/home/home-intel-events';
import type { Finding, InsuranceHomeIntelV1, Metric } from '@/lib/national/home-intel';
import { INSURANCE_BRAND, INSURANCE_INDEPENDENCE_LINE } from '@/lib/design/insurance-design-system';

function Trace({ metric }: { metric: Metric }) {
  return (
    <details className="mt-2">
      <summary
        className="inline-flex min-h-11 cursor-pointer items-center py-2 text-sm font-semibold text-[#0284C7]"
        data-intel-event="insurance_intel_trace_number"
      >
        Trace this number
      </summary>
      <div className="space-y-1 text-sm text-[#1E293B]">
        <p>
          <strong>Metric.</strong> {metric.id} — {metric.label}
        </p>
        <p>
          <strong>Entity class.</strong> {metric.entityClass}
        </p>
        <p>
          <strong>Cohort.</strong> {metric.cohort}
        </p>
        <p>
          <strong>Grain.</strong> {metric.grain}
        </p>
        {metric.denominator != null ? (
          <p>
            <strong>Denominator context.</strong> {metric.denominator.toLocaleString('en-US')}
          </p>
        ) : null}
        <p>
          <strong>Source.</strong> {metric.source}
        </p>
        <p>
          <strong>As-of.</strong> {metric.asOf}
        </p>
        <p>
          <strong>Retrieved / generated.</strong> {metric.generatedAt}
        </p>
        <p>
          <strong>Limitation.</strong> {metric.limitation}
        </p>
      </div>
    </details>
  );
}

function countHeaderForFinding(id: string): string {
  if (id === 'network') return 'Entities';
  if (id === 'lines-of-authority') return 'LOA observation rows';
  return 'Agencies';
}

function Bars({ finding }: { finding: Finding }) {
  const max = Math.max(...finding.series.map((row) => row.value), 1);
  return (
    <article className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_2px_rgb(10_37_64_/_0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">{finding.type}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#0A2540]">{finding.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#1E293B]">{finding.summary}</p>
      <figure className="mt-4">
        <figcaption className="text-sm text-[#1E293B]">{finding.chartCaption}</figcaption>
        <ul className="mt-3 space-y-2" aria-label={finding.chartCaption}>
          {finding.series.map((row) => (
            <li key={row.key}>
              <div className="flex justify-between gap-3 text-sm">
                <span>{row.label}</span>
                <span className="font-semibold tabular-nums">
                  {row.value.toLocaleString('en-US')}
                  {row.shareOf
                    ? ` · ${((100 * row.value) / row.shareOf).toFixed(1)}% of ${row.shareOf.toLocaleString('en-US')}`
                    : ''}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-[#E0F2FE]" aria-hidden>
                <div
                  className="h-2 rounded-full bg-[#0284C7]"
                  style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 min-w-0 overflow-x-auto">
          <table className="w-full min-w-0 max-w-full text-left text-sm">
            <caption className="sr-only">{finding.chartCaption}</caption>
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col">{countHeaderForFinding(finding.id)}</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {finding.series.map((row) => (
                <tr key={row.key} className="border-t border-[#E2E8F0]">
                  <th scope="row" className="py-1 font-medium">
                    {row.label}
                  </th>
                  <td className="tabular-nums">{row.value.toLocaleString('en-US')}</td>
                  <td className="tabular-nums">
                    {row.shareOf ? `${((100 * row.value) / row.shareOf).toFixed(1)}% of D2` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>
      <details className="mt-3">
        <summary
          className="inline-flex min-h-11 cursor-pointer items-center py-2 text-sm font-semibold text-[#0284C7]"
          data-intel-event="insurance_intel_explain_chart"
        >
          Explain this chart
        </summary>
        <div className="space-y-2 text-sm text-[#1E293B]">
          <p>
            <strong>What am I looking at?</strong> {finding.chartCaption}
          </p>
          <p>
            <strong>Why might this matter?</strong> {finding.whyItMatters}
          </p>
          <p>
            <strong>What this does not mean</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {finding.doesNotMean.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            <strong>Source.</strong> {finding.source} · as-of {finding.asOf}
          </p>
          <p>
            <strong>Limitation.</strong> {finding.limitation}
          </p>
        </div>
      </details>
    </article>
  );
}

export function InsuranceHomeIntelligence({ intel }: { intel: InsuranceHomeIntelV1 }) {
  const metrics = [
    intel.population.agencies,
    intel.population.persons,
    intel.population.legalInsurers,
    intel.population.marketplaceObservations,
    intel.population.credentials,
  ];
  const maxGeo = Math.max(...intel.geography.map((row) => row.credentialRows), 1);

  return (
    <div data-hub="insurance">
      <HomeIntelEvents />
      <section
        className="border-b"
        style={{ borderColor: INSURANCE_BRAND.border, background: `linear-gradient(165deg, #fff 0%, ${INSURANCE_BRAND.canvas} 55%, ${INSURANCE_BRAND.ice} 100%)` }}
        aria-labelledby="home-title"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0284C7]">
            InsuranceTrustHub · National insurance intelligence
          </p>
          <h1 id="home-title" className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-[#0A2540] sm:text-5xl">
            Understand the insurance market through public regulatory evidence.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#1E293B]">
            Research insurance agencies, producers, insurers, licenses, authority, regulatory evidence, and federal
            program participation before choosing coverage or representation. Carriers, agencies, and producers are
            different regulated classes.
          </p>
          <p className="mt-3 text-sm font-medium text-[#0A2540]">{INSURANCE_INDEPENDENCE_LINE}</p>
          <p className="mt-1 text-sm font-medium text-[#0A2540]">Understand the market. Verify the evidence. You decide.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href="#record" data-intel-event="insurance_intel_explore">
              <Button size="lg" variant="trust" className="h-12 w-full sm:w-auto">
                Explore Insurance Intelligence
              </Button>
            </a>
            <Link href="/directory" data-intel-event="insurance_intel_research_agency">
              <Button size="lg" variant="outline" className="h-12 w-full sm:w-auto">
                Browse public directory listings
              </Button>
            </Link>
            <Link href="/ask">
              <Button size="lg" variant="outline" className="h-12 w-full sm:w-auto">
                Ask InsuranceTrustHub
              </Button>
            </Link>
          </div>
          <div className="mt-8 min-w-0 max-w-2xl rounded-xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">Public directory listings</p>
            <p className="mt-1 text-sm leading-relaxed text-[#1E293B]">
              Search public insurance directory listings by ZIP. This is a ZIP lookup of directory records, not a search
              of all graph agencies, producers, or legal insurers. It is not a ranking.
            </p>
            <div className="mt-4 min-w-0">
              <ZipSearch />
            </div>
          </div>
        </div>
      </section>

      <section id="record" className="scroll-mt-24 border-b border-[#E2E8F0] bg-white" aria-labelledby="record-title">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">State of the record</p>
          <h2 id="record-title" className="mt-2 text-3xl font-semibold text-[#0A2540]">
            What is in this research universe
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#1E293B]">
            These classes stay separate. Do not add them together. A large research graph is not the same as public
            profiles — public people and public legal-insurer pages are currently zero.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {metrics.map((item) => (
              <article key={item.id} className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <p className="font-serif text-2xl font-semibold tabular-nums text-[#0A2540]">{item.display}</p>
                <h3 className="mt-1 text-sm font-semibold text-[#0A2540]">{item.label}</h3>
                <p className="mt-1 text-xs text-[#1E293B]">{item.grain}</p>
                {item.id === 'graph-persons' ? (
                  <p className="mt-2 text-xs leading-5 text-[#64748B]">
                    Graph persons, not a public people directory. Public people pages remain 0.
                  </p>
                ) : null}
                {item.id === 'graph-agencies' ? (
                  <p className="mt-2 text-xs leading-5 text-[#64748B]">
                    Graph agencies with attached-credential evidence. Not the 170,499 public directory listings, and not
                    a public agency-profile directory (0 published).
                  </p>
                ) : null}
                {item.id === 'graph-legal-insurers' ? (
                  <p className="mt-2 text-xs leading-5 text-[#64748B]">
                    Legal insurer identities. Distinct from 13,547{' '}
                    <code className="text-[10px]">entity_kind=carrier</code> rows and from marketplace / appointed-by
                    grains.
                  </p>
                ) : null}
                <Trace metric={item} />
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm text-[#1E293B]">
            Public directory listings currently available: {intel.publicAvailability.publicDirectoryProviders.toLocaleString('en-US')}.
            Public graph-agency profiles: {intel.publicAvailability.publicGraphAgencies}. Public people:{' '}
            {intel.publicAvailability.publicPeople}. Public legal-insurer pages:{' '}
            {intel.publicAvailability.publicLegalInsurers}.
          </p>
        </div>
      </section>

      <section id="findings" className="scroll-mt-24 border-b border-[#E2E8F0] bg-[#F8FAFC]" aria-labelledby="findings-title">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">What the data says</p>
          <h2 id="findings-title" className="mt-2 text-3xl font-semibold text-[#0A2540]">
            Three national evidence stories
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-1">
            {intel.featuredFindings.map((finding) => (
              <Bars key={finding.id} finding={finding} />
            ))}
          </div>
        </div>
      </section>

      <section id="depth" className="scroll-mt-24 border-b border-[#E2E8F0] bg-white" aria-labelledby="depth-title">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">Evidence depth</p>
          <h2 id="depth-title" className="mt-2 text-3xl font-semibold text-[#0A2540]">
            What insurance evidence is available?
          </h2>
          <p className="mt-2 text-sm text-[#1E293B]">Coverage describes research availability, not firm quality.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Evidence availability by family</caption>
              <thead>
                <tr>
                  <th scope="col" className="py-2">
                    Family
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">Note</th>
                </tr>
              </thead>
              <tbody>
                {intel.evidenceCoverage.map((row) => (
                  <tr key={row.family} className="border-t border-[#E2E8F0]">
                    <th scope="row" className="py-2 font-medium">
                      {row.family}
                    </th>
                    <td>{row.status}</td>
                    <td>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="gaps" className="scroll-mt-24 border-b border-[#E2E8F0] bg-[#F8FAFC]" aria-labelledby="gaps-title">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">What we don&apos;t know</p>
          <h2 id="gaps-title" className="mt-2 text-3xl font-semibold text-[#0A2540]">
            Limits of this national extract
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[#1E293B]">
            {intel.missingness.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3 className="mt-8 text-xl font-semibold text-[#0A2540]">What you may still want to verify directly</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#1E293B]">
            {intel.verifyDirectly.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <dl className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ['Carrier', 'The legal insurer that underwrites a policy.'],
              ['Agency', 'A licensed business that may sell or service insurance.'],
              ['Producer', 'A licensed individual. Not automatically the same as the agency or carrier.'],
              ['NPN', 'National Producer Number — an identifier, not an endorsement.'],
              ['NAIC', 'National Association of Insurance Commissioners company identity system.'],
              ['LOA', 'Line of authority — what a credential authorizes, as the source defines it.'],
              ['Appointment', 'A sourced affiliation with an appointing entity. Not employment.'],
              ['Domicile', 'The insurer’s state of incorporation or statutory home, when sourced.'],
              ['Marketplace', 'Federal ACA Marketplace program evidence. Not a state DOI license.'],
              ['Medicare Advantage', 'A federal Medicare health-plan type researched on separate tools.'],
            ].map(([term, def]) => (
              <div key={term} className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                <dt className="font-semibold text-[#0A2540]">{term}</dt>
                <dd className="mt-1 text-[#1E293B]">{def}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="explore" className="scroll-mt-24 border-b border-[#E2E8F0] bg-white" aria-labelledby="explore-title">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">Explore the market</p>
          <h2 id="explore-title" className="mt-2 text-3xl font-semibold text-[#0A2540]">
            Explore insurance intelligence by state
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[#1E293B]">
            Color intensity is credential-row volume in the research graph — not safest state, not best market, not
            service territory. Florida is the only live state intelligence page.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {intel.geography.map((row) => (
              <Link
                key={row.state}
                href={row.href}
                data-intel-event="insurance_intel_state_click"
                className="min-h-11 rounded-lg border border-[#E2E8F0] p-3 text-sm text-[#0A2540] no-underline"
                style={{
                  background: `color-mix(in srgb, #0284C7 ${Math.round((row.credentialRows / maxGeo) * 35)}%, #fff)`,
                }}
              >
                <strong>{row.state}</strong>
                <span className="mt-1 block tabular-nums">{row.credentialRows.toLocaleString('en-US')} credential rows</span>
                <span className="mt-1 block text-xs">
                  {row.liveIntelligence ? 'Opens Florida intelligence' : 'Opens agency directory'}
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-sm">
            Live state intelligence:{' '}
            <Link href="/florida" className="font-medium text-[#0284C7] underline-offset-2 hover:underline">
              Florida Insurance Intelligence
            </Link>
            . Other jurisdictions:{' '}
            <Link href="/hubs/browse" className="font-medium text-[#0284C7] underline-offset-2 hover:underline">
              browse existing state/MSA hubs
            </Link>
            . No additional /texas or /california intelligence routes were created.
          </p>
        </div>
      </section>

      <section id="axis" className="scroll-mt-24 border-b border-[#E2E8F0] bg-[#F8FAFC]" aria-labelledby="axis-title">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">Federal overlays</p>
          <h2 id="axis-title" className="mt-2 text-3xl font-semibold text-[#0A2540]">
            State licensing and federal program evidence stay in separate lanes
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {intel.federalOverlays.map((row) => (
              <li key={row.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0284C7]">{row.status}</p>
                <p className="mt-1 font-semibold text-[#0A2540]">{row.label}</p>
                <p className="mt-1 text-sm text-[#1E293B]">{row.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="ask" className="scroll-mt-24 border-b border-[#E2E8F0] bg-white" aria-labelledby="ask-title">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">Ask the market</p>
          <h2 id="ask-title" className="mt-2 text-3xl font-semibold text-[#0A2540]">
            Structured questions, not a chatbot
          </h2>
          <form action="/ask" method="get" className="mt-4 max-w-2xl" role="search" aria-label="Ask InsuranceTrustHub">
            <label htmlFor="home-ask-q" className="sr-only">
              Ask InsuranceTrustHub
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="home-ask-q"
                name="q"
                placeholder="Show insurance agencies credentialed in Florida."
                className="min-h-12 flex-1 rounded-xl border border-[#E2E8F0] px-4"
              />
              <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0A2540] px-5 font-semibold text-white">
                Ask
              </button>
            </div>
            <p className="mt-2 text-xs text-[#1E293B]">
              Structured regulatory research. Not a ranking or quote engine.{' '}
              <Link href="/ask" className="font-semibold text-[#0284C7]">
                Open Ask InsuranceTrustHub
              </Link>
            </p>
          </form>
          <div className="mt-4 space-y-2">
            {intel.ask.map((item) => (
              <details key={item.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4">
                <summary className="cursor-pointer py-3 font-medium text-[#0A2540]">{item.question}</summary>
                <p className="pb-3 text-sm text-[#1E293B]">{item.answer}</p>
                <p className="pb-3 text-sm">
                  <Link href={item.href} className="font-medium text-[#0284C7] underline-offset-2 hover:underline">
                    {item.hrefLabel}
                  </Link>
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="use" className="scroll-mt-24 border-b border-[#E2E8F0] bg-[#F8FAFC]" aria-labelledby="use-title">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">Use the research</p>
          <h2 id="use-title" className="mt-2 text-3xl font-semibold text-[#0A2540]">
            Tools that actually exist
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {intel.tools.map((tool) => (
              <Link
                key={tool.href + tool.label}
                href={tool.href}
                className="rounded-xl border border-[#E2E8F0] bg-white p-4 no-underline"
              >
                <strong className="text-[#0A2540]">{tool.label}</strong>
                <span className="mt-1 block text-sm text-[#1E293B]">{tool.note}</span>
              </Link>
            ))}
          </div>
          <h3 className="mt-10 text-xl font-semibold text-[#0A2540]">Before working with an insurance producer or agency</h3>
          <HomeIntelChecklist items={intel.checklist} />
          <h3 className="mt-10 text-xl font-semibold text-[#0A2540]">Insurance evidence journey</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#1E293B]">
            {intel.evidenceJourney.map((step) => (
              <li key={step.id}>
                {step.label} — {step.status}. {step.note}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="sources" className="min-w-0 scroll-mt-24 bg-white" aria-labelledby="sources-title">
        <div className="mx-auto min-w-0 max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">Evidence / sources / limitations</p>
          <h2 id="sources-title" className="mt-2 text-3xl font-semibold text-[#0A2540]">
            Where the numbers come from
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Source ledger</caption>
              <thead>
                <tr>
                  <th scope="col" className="py-2">
                    Source
                  </th>
                  <th scope="col">Used for</th>
                  <th scope="col">Limitation</th>
                </tr>
              </thead>
              <tbody>
                {intel.sources.map((row) => (
                  <tr key={row.id} className="border-t border-[#E2E8F0]">
                    <th scope="row" className="py-2 font-medium">
                      {row.name}
                    </th>
                    <td>{row.usedFor}</td>
                    <td>{row.limitation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mt-8 text-xl font-semibold text-[#0A2540]">Limitations</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#1E293B]">
            {intel.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-6 max-w-full break-all text-xs text-[#1E293B]">
            Snapshot {intel.version}. Fingerprint {intel.fingerprint.slice(0, 12)}… db_writes={intel.db_writes}. Florida
            locked fingerprint remains {intel.sourceClocks[1]?.asOf}.
          </p>
        </div>
      </section>
    </div>
  );
}
