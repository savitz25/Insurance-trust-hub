import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ZipSearch } from "@/components/zip-search";
import { HomeIntelEvents } from "./home-intel-events";
import type { InsuranceHomeIntelV1 } from "@/lib/national/home-intel";
import type { InsuranceNetworkMetricsV1 } from "@/lib/metrics/insurance-network-metrics-v1";
import {
  buildInsuranceHomepageEvidenceInventory,
  INSURANCE_HOME_EVIDENCE_FAMILIES,
  INSURANCE_HOMEPAGE_STATE_CARDS,
  type InsuranceHomeEvidenceMeasure,
} from "@/lib/metrics/insurance-home-evidence-inventory";

function Trace({ row }: { row: InsuranceHomeEvidenceMeasure }) {
  return (
    <details className="mt-3 text-sm">
      <summary
        data-intel-event="insurance_intel_trace_number"
        className="min-h-11 cursor-pointer py-2 font-semibold text-sky-700"
      >
        Trace this number
      </summary>
      <div className="space-y-1 text-slate-700">
        <p>
          <b>What this counts:</b> {row.definition}
        </p>
        <p>
          <b>What it does not count:</b> {row.doesNotCount}
        </p>
        <p>
          <b>Grain:</b> {row.grain}
        </p>
        <p>
          <b>Entity / evidence class:</b> {row.entityClass}
        </p>
        <p>
          <b>Geography:</b> {row.geography}
        </p>
        <p>
          <b>Agency / source:</b> {row.source}
        </p>
        {row.sourceAsOf ? (
          <p>
            <b>Source as of:</b> {row.sourceAsOf}
          </p>
        ) : null}
        {row.retrievedAt ? (
          <p>
            <b>Retrieved:</b> {row.retrievedAt}
          </p>
        ) : null}
        {row.snapshotAsOf ? (
          <p>
            <b>Accepted snapshot as of:</b> {row.snapshotAsOf}
          </p>
        ) : null}
        {row.networkGeneratedAt ? (
          <p>
            <b>Network generated:</b> {row.networkGeneratedAt}
          </p>
        ) : null}
        <p>
          <b>Publication context:</b>{" "}
          {row.publicationStatus === "PUBLIC_RESEARCH_GRAPH"
            ? "Public aggregate research-graph scale; not public profiles"
            : row.publicationStatus}
        </p>
        {row.limitation ? (
          <p>
            <b>Coverage limitation:</b> {row.limitation}
          </p>
        ) : null}
        <p>
          <b>Accepted artifact:</b> {row.acceptedArtifact}
        </p>
        <Link
          href={row.destination}
          className="inline-flex min-h-11 items-center font-semibold text-sky-700"
        >
          Related research →
        </Link>
      </div>
    </details>
  );
}

const identities = [
  ["Agency NPN", "A licensed business that may sell or service insurance"],
  [
    "Producer NPN",
    "A licensed individual represented only at publication-safe aggregate scale",
  ],
  [
    "Legal insurer / NAIC CoCode",
    "The legal insurer that underwrites a policy",
  ],
  ["Appointing-entity records", "Source-native relationship identity"],
  ["Insurance group", "Group identity, not one company"],
  ["Consumer brand", "Brand, not the regulated entity"],
];

export function InsuranceHomeIntelligence({
  intel,
  metrics,
}: {
  intel: InsuranceHomeIntelV1;
  metrics: InsuranceNetworkMetricsV1;
}) {
  const inventory = buildInsuranceHomepageEvidenceInventory(metrics);
  const highlights = [
    "insurance_agencies",
    "insurance_producer_records",
    "licensed_insurance_companies",
    "credential_observations",
    "line_of_authority_observations",
    "person_appointment_relationships",
    "cms_marketplace_evidence_observations",
    "public_directory_listings",
  ].map((key) => inventory.find((row) => row.key === key)!);
  return (
    <main
      className="overflow-x-clip bg-white text-slate-800"
      data-hub="insurance"
    >
      <HomeIntelEvents />
      <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_85%_15%,#bae6fd_0,transparent_34%),linear-gradient(145deg,#fff_0%,#f0f9ff_58%,#e0f2fe_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-sky-700">
            InsuranceTrustHub · public regulatory intelligence
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-[#0A2540] sm:text-6xl">
            Research the insurance entity. Trace the evidence around it.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8">
            Connect agencies, producers, legal insurers, licenses, lines of
            authority, appointments, complaints, examinations, rate filings, and
            public market evidence—where official sources support the
            relationship.
          </p>
          <p className="mt-3 font-semibold text-[#0A2540]">
            No paid ranking. No Trust Score. We organize public evidence. You
            decide.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/directory"
              data-intel-event="insurance_intel_research_agency"
            >
              <Button size="lg" variant="trust">
                Search public directory
              </Button>
            </Link>
            <a href="#states" data-intel-event="insurance_intel_explore">
              <Button size="lg" variant="outline">
                Explore state intelligence
              </Button>
            </a>
            <Link href="/ask" data-intel-event="insurance_intel_ask">
              <Button size="lg" variant="outline">
                Ask InsuranceTrustHub
              </Button>
            </Link>
          </div>
          <div className="mt-8 max-w-2xl rounded-2xl border border-sky-200 bg-white/90 p-5">
            <p className="text-sm font-semibold text-[#0A2540]">
              Search public directory listings by ZIP
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Directory listings are not the same universe as research-graph
              agencies, people, or insurers.
            </p>
            <div className="mt-3">
              <ZipSearch />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-[#071f35] text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-300">
            Separate source-native grains
          </p>
          <h2 className="mt-2 text-3xl font-semibold">
            The research graph is much larger than a ZIP directory
          </h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            These measures describe different entities, observations, and
            relationships. They are never added into a fake “insurance records”
            total.
          </p>
          <div className="mt-7 grid gap-px overflow-hidden rounded-2xl bg-slate-700 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((row) => (
              <article key={row.key} className="min-w-0 bg-[#0A2540] p-5">
                <p className="break-words text-3xl font-semibold tabular-nums">
                  {row.display}
                </p>
                <h3 className="mt-2 font-semibold text-sky-200">{row.label}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-300">
                  {row.doesNotCount}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">
            Different regulated identities
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#0A2540]">
            There is no single “insurance company” identity
          </h2>
          <p className="mt-3 max-w-3xl">
            Relationships appear only when accepted evidence supports an exact
            or deterministic connection. An appointment is not employment or
            endorsement.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {identities.map(([title, note]) => (
              <article
                key={title}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="font-semibold text-[#0A2540]">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50" id="inventory">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">
            Full public evidence inventory
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#0A2540]">
            Evidence depth, with its grain attached
          </h2>
          <p className="mt-3 max-w-3xl">
            Research-graph measures describe publication-safe aggregate scale,
            not public people pages. Unknown and not acquired are never
            converted to zero.
          </p>
          <div className="mt-8 space-y-8">
            {Object.entries(INSURANCE_HOME_EVIDENCE_FAMILIES).map(
              ([family, label]) => {
                const rows = inventory.filter((row) => row.family === family);
                return rows.length ? (
                  <section key={family}>
                    <h3 className="border-b border-slate-300 pb-2 text-xl font-semibold text-[#0A2540]">
                      {label}
                    </h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {rows.map((row) => (
                        <article
                          key={row.key}
                          className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <p className="text-2xl font-semibold tabular-nums text-[#0A2540]">
                            {row.display}
                          </p>
                          <h4 className="mt-1 font-semibold">{row.label}</h4>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {row.definition}
                          </p>
                          <Trace row={row} />
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null;
              },
            )}
          </div>
        </div>
      </section>

      <section id="states" className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">
            State intelligence coverage & source freshness
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#0A2540]">
            Five state regulatory systems, kept source-native
          </h2>
          <p className="mt-3 max-w-3xl">
            State cards describe evidence coverage—not market quality. Arizona
            has no published InsuranceTrustHub state-intelligence page;
            search-only or paid access is not presented as zero.
          </p>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {INSURANCE_HOMEPAGE_STATE_CARDS.map((state) => (
              <article
                key={state.href}
                className="flex min-w-0 flex-col rounded-2xl border border-slate-200 p-5 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
                  {state.regulators}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[#0A2540]">
                  {state.state}
                </h3>
                <ul className="mt-3 flex-1 list-disc space-y-1 pl-5 text-sm">
                  {state.evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-5 text-slate-600">
                  {state.limitation}
                </p>
                {state.sourceClocks.map((clock) => (
                  <p key={clock.label} className="mt-2 text-xs">
                    <b>{clock.label}:</b>{" "}
                    {clock.sourceAsOf
                      ? `Source as of ${clock.sourceAsOf}`
                      : `Snapshot as of ${clock.snapshotAsOf}`}
                  </p>
                ))}
                <Link
                  href={state.href}
                  data-intel-event="insurance_intel_state_click"
                  className="mt-5 inline-flex min-h-11 items-center font-semibold text-sky-700"
                >
                  Explore {state.abbreviation} intelligence →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-sky-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">
              Research graph → safe public surfaces
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#0A2540]">
              Depth does not override publication safety
            </h2>
            <p className="mt-3 leading-7">
              The graph can retain producer identities and relationship evidence
              while public person profiles remain disabled. Private contact
              data, restricted rosters, unsafe identity candidates, and
              ambiguous adverse matches do not belong on the homepage.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-white p-5">
            <p className="font-semibold text-[#0A2540]">
              Current public surfaces
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                {metrics.nationalGraph.publicDirectoryListings.toLocaleString()}{" "}
                public directory listings—not{" "}
                {metrics.nationalGraph.agencies.toLocaleString()} graph agencies
              </li>
              <li>
                {metrics.publication.publicPeople} public people profiles;
                person publishing remains disabled
              </li>
              <li>
                {metrics.publication.publicLegalInsurerWave1} evidence-gated
                Wave-1 insurer profiles—not blanket legal-insurer-kind
                publication
              </li>
              <li>
                {INSURANCE_HOMEPAGE_STATE_CARDS.length} published state
                intelligence pages
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">
            What evidence does not establish
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#0A2540]">
            Evidence supports research—not a verdict
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "License ≠ endorsement",
              "Appointment ≠ employment",
              "Complaint ≠ proven violation",
              "Exam listing ≠ adverse finding",
              "Rate filing ≠ consumer premium",
              "CMS observation ≠ plan or insurer",
              "Group ≠ company",
              "Brand ≠ legal entity",
              "Missing or not acquired ≠ zero",
            ].map((item) => (
              <p
                key={item}
                className="rounded-xl border border-slate-200 p-4 font-medium"
              >
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#071f35] text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-300">
            Continue your research
          </p>
          <h2 className="mt-2 text-3xl font-semibold">
            Ask a structured insurance research question
          </h2>
          <form
            action="/ask"
            data-intel-event="insurance_intel_ask"
            className="mt-5 flex max-w-2xl flex-col gap-2 sm:flex-row"
            role="search"
          >
            <label className="sr-only" htmlFor="insurance-question">
              Ask InsuranceTrustHub
            </label>
            <input
              id="insurance-question"
              name="q"
              className="min-h-12 flex-1 rounded-xl bg-white px-4 text-slate-900"
              placeholder="What evidence should I check about an insurer or agency?"
            />
            <button className="min-h-12 rounded-xl bg-sky-600 px-6 font-semibold">
              Ask InsuranceTrustHub
            </button>
          </form>
          <p className="mt-8 text-xs text-slate-300">
            Inventory generated from {metrics.schemaVersion} at{" "}
            {metrics.generatedAt}. Source clocks vary by agency and evidence
            family; generation and deployment dates are not agency source dates.
            Snapshot {intel.version}.
          </p>
        </div>
      </section>
    </main>
  );
}
