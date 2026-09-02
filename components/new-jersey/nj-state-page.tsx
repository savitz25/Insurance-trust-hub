import Link from 'next/link';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { Trace } from '@/components/new-jersey/trace';
import {
  fmtHero,
  fmtInt,
  type NewJerseyInsuranceSnapshot,
} from '@/lib/new-jersey-intelligence/snapshot';

function Metric({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="break-words text-2xl font-bold tabular-nums text-[#0A2540]">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{label}</p>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Official({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="font-medium text-[#0284C7] underline underline-offset-2"
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}

export function NewJerseyInsurancePage({ snapshot }: { snapshot: NewJerseyInsuranceSnapshot }) {
  const s = snapshot;
  const H = s.hero;
  const E = s.enforcement;
  const classEntries = Object.entries(E.class_counts);
  const actionEntries = Object.entries(E.action_class_counts);
  const bfdClass = Object.entries(E.bfd.class_counts);

  return (
    <div className="th-shell mx-auto w-full max-w-[880px] overflow-x-clip px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600">
        <ol className="flex flex-wrap gap-1">
          <li>
            <Link href="/" className="text-[#0284C7] underline underline-offset-2">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-800">New Jersey research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · New Jersey
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">
          New Jersey Insurance Market &amp; Regulatory Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of New Jersey admitted carriers, NJDOBI enforcement and examinations,
          auto complaint reports, Individual Health Coverage, Small Employer Health, Get Covered NJ
          participation, and residual-market programs. This is not a ranking, recommendation, or
          Trust Score.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Existing agency catalog pages remain at{' '}
          <Link href="/hubs/new-jersey" className="text-[#0284C7] underline underline-offset-2">
            /hubs/new-jersey
          </Link>
          . Those pages are not this official-source intelligence snapshot.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Snapshot {s.version} · fingerprint {s.fingerprint.slice(0, 12)} · as of {s.as_of}
        </p>
      </header>

      <section aria-labelledby="hero-metrics" className="mt-8">
        <h2 id="hero-metrics" className="sr-only">
          Snapshot metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-5">
          <Metric
            value={fmtHero(H.universe_value)}
            label={`Universe · ${H.universe_label}`}
            hint={H.universe_hint}
          />
          <Metric
            value={fmtHero(H.current_value)}
            label={`Current · ${H.current_label}`}
            hint={H.current_hint}
          />
          <Metric
            value={fmtHero(H.observations_value)}
            label={`Observations · ${H.observations_label}`}
            hint={H.observations_hint}
          />
          <Metric
            value={fmtHero(H.geography_value)}
            label={`Geography · ${H.geography_label}`}
            hint={H.geography_hint}
          />
          <Metric
            value={String(H.as_of_value)}
            label={`As-of · ${H.as_of_label}`}
            hint={H.as_of_hint}
          />
        </div>
      </section>

      <section aria-labelledby="findings-heading" className="mt-10">
        <h2 id="findings-heading" className="text-lg font-semibold text-[#0A2540]">
          Market findings
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          {s.findings.map((f) => (
            <li key={f.id}>{f.text}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="auth-heading" className="mt-10">
        <h2 id="auth-heading" className="text-lg font-semibold text-[#0A2540]">
          Carrier authorization
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.authorization.caveat}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric
            value={fmtInt(s.authorization.admitted)}
            label="Admitted legal insurers"
            hint="Exact NAIC company codes. Legal-entity grain."
          />
          <Metric
            value="not in this census"
            label="Surplus-lines eligible"
            hint="Official whitelist exists. SOURCE_NOT_ACQUIRED as a public count. Missing is not zero."
          />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Class in this snapshot: admitted insurer {fmtInt(s.authorization.classes.ADMITTED_INSURER)}.
          License is not an appointment. A group is not a company. A producer is not an insurer.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.authorization.source_url} label="NJDOBI licensed insurance carriers" />
          {' · '}
          <Official href={s.authorization.surplus_lines_url} label="Surplus-lines eligible list (not ingested)" />
        </p>
        <Trace
          source="NJDOBI Licensed Insurance Carriers with NAIC numbers"
          sourceDate={s.as_of}
          denominator={`${fmtInt(s.authorization.admitted)} admitted legal-entity rows`}
          calculation="Count of source rows with exact NAIC; all classified ADMITTED_INSURER"
          grain="Legal entity, not group, not appointment"
          coverage="ACQUIRED_CURRENT_SNAPSHOT for admitted; SOURCE_NOT_ACQUIRED for surplus-lines eligible census"
          caveat={s.authorization.caveat}
        />
      </section>

      <section aria-labelledby="enforcement-heading" className="mt-10">
        <h2 id="enforcement-heading" className="text-lg font-semibold text-[#0A2540]">
          Enforcement
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{E.caveat}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric value={fmtInt(E.events)} label="Events" hint="Index event grain." />
          <Metric value={fmtInt(E.unique_orders)} label="Unique orders" hint="Order-number grain." />
          <Metric
            value={fmtInt(s.document_depth.document_links)}
            label="Document links"
            hint="Not unique hashes."
          />
          <Metric
            value={fmtInt(s.document_depth.unique_hashes)}
            label="Unique hashes"
            hint="Canonical document identity."
          />
        </div>
        <h3 className="mt-6 text-base font-semibold text-[#0A2540]">Instrument class</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {classEntries.map(([k, v]) => (
            <li key={k}>
              {k.replace(/_/g, ' ')}: {fmtInt(v)}
            </li>
          ))}
        </ul>
        <h3 className="mt-6 text-base font-semibold text-[#0A2540]">
          Sanction class (separate from instrument)
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {actionEntries.map(([k, v]) => (
            <li key={k}>
              {k.replace(/_/g, ' ')}: {fmtInt(v)}
            </li>
          ))}
        </ul>
        <h3 className="mt-6 text-base font-semibold text-[#0A2540]">Bureau of Fraud Deterrence</h3>
        <p className="mt-2 text-sm text-slate-700">
          {fmtInt(E.bfd.events)} BFD events in the acquired corpus, classified from official page
          headings:
          {bfdClass.map(([k, v]) => ` ${k.replace(/_/g, ' ')} ${fmtInt(v)}`).join(';')}. Remaining
          OTHER {fmtInt(E.bfd.remaining_other)}; remaining UNKNOWN {fmtInt(E.bfd.remaining_unknown)}.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Identity treatment: exact NAIC {fmtInt(E.identity.exact_naic)}; internal-only individuals{' '}
          {fmtInt(E.identity.match_status_counts.INTERNAL_ONLY_INDIVIDUAL)}; unresolved{' '}
          {fmtInt(E.identity.match_status_counts.UNRESOLVED)}; review-required{' '}
          {fmtInt(E.identity.match_status_counts.REVIEW_REQUIRED)}. Unresolved evidence is not
          profile-attached. Individual actions are not copied to an agency. Absence of a matching
          record is not a clean history. This section is not an enforcement ranking.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          DOI 2008 coverage is {E.doi_2008_coverage_state}. That missing year is not a finding of
          zero actions.
        </p>
        <p className="mt-2 text-sm">
          <Official href={E.source_url_doi} label="NJDOBI Division of Insurance enforcement" />
          {' · '}
          <Official href={E.source_url_bfd} label="Bureau of Fraud Deterrence enforcement" />
        </p>
        <Trace
          source="NJDOBI DOI and BFD enforcement indexes"
          sourceDate={s.as_of}
          denominator={`${fmtInt(E.events)} events in the acquired corpus`}
          calculation="Event count from audited NJ-INS-001/001C; unique orders and document hashes counted separately"
          grain="INDEX occurrence ≠ event ≠ document ≠ unique hash"
          coverage="Partial history; 2008 DOI SOURCE_NOT_ACQUIRED"
          caveat={E.caveat}
        />
      </section>

      <section aria-labelledby="docs-heading" className="mt-10">
        <h2 id="docs-heading" className="text-lg font-semibold text-[#0A2540]">
          Document depth
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.document_depth.caveat}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2 pr-3 font-medium">Grain</th>
                <th className="py-2 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {s.evidence_depth.map((row) => (
                <tr key={row.grain} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{row.grain}</td>
                  <td className="py-2 tabular-nums">{fmtInt(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="mc-heading" className="mt-10">
        <h2 id="mc-heading" className="text-lg font-semibold text-[#0A2540]">
          Market-conduct examinations
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.market_conduct.caveat}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric value={fmtInt(s.market_conduct.reports)} label="Reports" />
          <Metric value={fmtInt(s.market_conduct.exact_naic)} label="Exact NAIC" hint="None attached." />
          <Metric value={fmtInt(s.market_conduct.name_only_unresolved)} label="Name-only unresolved" />
          <Metric value={fmtInt(s.market_conduct.multi_entity_review)} label="Multi-entity review" />
        </div>
        <p className="mt-3 text-sm text-slate-700">
          Converted to enforcement: {fmtInt(s.market_conduct.converted_to_enforcement)}. No exam
          score is published. Ambiguous market-conduct reports are withheld from profiles.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.market_conduct.source_url} label="NJDOBI market-conduct examinations" />
        </p>
      </section>

      <section aria-labelledby="fin-heading" className="mt-10">
        <h2 id="fin-heading" className="text-lg font-semibold text-[#0A2540]">
          Financial examinations
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.financial_exams.caveat}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric value={fmtInt(s.financial_exams.reports)} label="Reports" />
          <Metric
            value={fmtInt(s.financial_exams.exact_naic)}
            label="Exact NAIC"
            hint="May attach only to an already-published legal-insurer profile."
          />
          <Metric value={fmtInt(s.financial_exams.unresolved)} label="Unresolved" />
        </div>
        <p className="mt-3 text-sm text-slate-700">
          Converted to enforcement: {fmtInt(s.financial_exams.converted_to_enforcement)}. A financial
          examination is not a market-conduct examination and is not enforcement.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.financial_exams.source_url} label="NJDOBI financial examination reports" />
        </p>
      </section>

      <section aria-labelledby="complaint-heading" className="mt-10">
        <h2 id="complaint-heading" className="text-lg font-semibold text-[#0A2540]">
          Auto consumer complaint report
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.auto_complaints.caveat}</p>
        <p className="mt-2 text-sm text-slate-700">{s.auto_complaints.methodology}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric
            value={fmtInt(s.auto_complaints.rows)}
            label="Rows"
            hint={`Years ${s.auto_complaints.years.join(' and ')}.`}
          />
          <Metric
            value={`${fmtInt(s.auto_complaints.group_grain_rows)} / ${fmtInt(s.auto_complaints.company_grain_rows)}`}
            label="Group / company grain"
            hint="Group rows stay at group grain."
          />
        </div>
        <p className="mt-3 text-sm text-slate-700">
          A valid complaint is not all complaints and is not a violation. Eligibility threshold:{' '}
          {fmtInt(s.auto_complaints.eligibility_threshold_vehicles)} insured autos. No complaint
          ranking is published. Group complaint index is not copied to a subsidiary.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.auto_complaints.source_url} label="NJDOBI auto consumer information" />
        </p>
      </section>

      <section aria-labelledby="ihc-heading" className="mt-10">
        <h2 id="ihc-heading" className="text-lg font-semibold text-[#0A2540]">
          Individual Health Coverage (IHC)
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.ihc.caveat}</p>
        <p className="mt-2 text-sm text-slate-700">
          Coverage {s.ihc.coverage_state}. Latest official enrollment-index period: {s.ihc.latest_period}{' '}
          ({s.ihc.latest_period_grain}). Statewide covered-lives total is not in the committed public
          snapshot. A missing quarter is not zero enrollment.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Rate-change years {s.ihc.rate_change_years[0]}–{s.ihc.rate_change_years[s.ihc.rate_change_years.length - 1]}:{' '}
          {fmtInt(s.ihc.rate_change_observations)} observations. Plan-count rows:{' '}
          {fmtInt(s.ihc.plan_counts)}. Off-marketplace enrollment rows:{' '}
          {fmtInt(s.ihc.off_marketplace_enrollment_rows)}. Exact NAIC: {fmtInt(s.ihc.exact_naic)}.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Brand-grain carriers: {s.ihc.carriers.join(', ')}.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          An official average rate change is not every consumer’s premium. IHC is not SEH.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.ihc.source_url} label="IHC/SEH enrollment index" />
          {' · '}
          <Official href={s.ihc.rate_source_url} label="Average rate changes" />
        </p>
      </section>

      <section aria-labelledby="seh-heading" className="mt-10">
        <h2 id="seh-heading" className="text-lg font-semibold text-[#0A2540]">
          Small Employer Health (SEH)
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.seh.caveat}</p>
        <p className="mt-2 text-sm text-slate-700">
          Coverage {s.seh.coverage_state}. Latest official enrollment-index period: {s.seh.latest_period}.
          Statewide enrollment total is not in the committed public snapshot.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Rate-change years {s.seh.rate_change_years[0]}–{s.seh.rate_change_years[s.seh.rate_change_years.length - 1]}.
          Brand-grain carriers: {s.seh.carriers.join(', ')}. Loss-ratio year{' '}
          {s.seh.loss_ratio_years.join(', ')}: {fmtInt(s.seh.loss_ratio_rows)} rows. Loss ratio is not
          a quality score. Exact NAIC: {fmtInt(s.seh.exact_naic)}.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.seh.source_url} label="IHC/SEH enrollment index" />
        </p>
      </section>

      <section aria-labelledby="gcnj-heading" className="mt-10">
        <h2 id="gcnj-heading" className="text-lg font-semibold text-[#0A2540]">
          Get Covered NJ
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.get_covered.caveat}</p>
        <p className="mt-2 text-sm text-slate-700">
          {s.get_covered.source}. Plan years {s.get_covered.plan_years[0]}–
          {s.get_covered.plan_years[s.get_covered.plan_years.length - 1]}.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Participating names in the acquired asterisk observations:{' '}
          {s.get_covered.participating.join(', ')}.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          IHC writers that appear without a marketplace asterisk in acquired tables:{' '}
          {s.get_covered.not_asterisked_ihc_writers.join(', ')}. Marketplace participation is not an
          endorsement.
        </p>
      </section>

      <section aria-labelledby="residual-heading" className="mt-10">
        <h2 id="residual-heading" className="text-lg font-semibold text-[#0A2540]">
          Residual markets
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.residuals.caveat}</p>
        <div className="mt-4 space-y-3">
          {s.residuals.programs.map((p) => (
            <article key={p.code} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-base font-semibold text-[#0A2540]">{p.name}</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li>Program code: {p.code}</li>
                {'not_a_voluntary_insurer' in p && p.not_a_voluntary_insurer ? (
                  <li>Not a voluntary insurer</li>
                ) : null}
                {'not_a_legal_carrier' in p && p.not_a_legal_carrier ? <li>Not a legal carrier</li> : null}
                {'not_a_carrier' in p && p.not_a_carrier ? <li>Not an insurer</li> : null}
                {'oversees' in p && p.oversees ? <li>Oversees {p.oversees}</li> : null}
                {'separate_from' in p && p.separate_from ? <li>Separate from {p.separate_from}</li> : null}
                <li>Residual placement is not a quality flag</li>
                {'source_note' in p && p.source_note ? <li>{p.source_note}</li> : null}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-3 text-sm">
          <Official href={s.residuals.source_url} label="NJDOBI property and casualty residual markets" />
        </p>
      </section>

      <section aria-labelledby="crib-heading" className="mt-10">
        <h2 id="crib-heading" className="text-lg font-semibold text-[#0A2540]">
          NJCRIB Plan Risk
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.crib.caveat}</p>
        <p className="mt-2 text-sm text-slate-700">
          Access classification {s.crib.access_classification}. Publication allowed:{' '}
          {s.crib.publication_allowed ? 'yes' : 'no'}. This page publishes {s.crib.published}.
          Withheld: {s.crib.withheld.join(', ')}. Restricted rows are not rendered and are not
          downloadable here.
        </p>
      </section>

      <section aria-labelledby="serff-heading" className="mt-10">
        <h2 id="serff-heading" className="text-lg font-semibold text-[#0A2540]">
          SERFF filing access
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.serff.caveat}</p>
        <p className="mt-2 text-sm text-slate-700">
          Coverage {s.serff.coverage_state} (HTTP {s.serff.http_status}). A blocked source is not
          zero filings. Filed is not approved. No access-control bypass was attempted.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.serff.source_url} label="SERFF Filing Access for New Jersey" />
        </p>
      </section>

      <section aria-labelledby="rehab-heading" className="mt-10">
        <h2 id="rehab-heading" className="text-lg font-semibold text-[#0A2540]">
          Rehabilitation / liquidation
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.rehab.caveat}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric value={fmtInt(s.rehab.entities)} label="Official entities" />
          <Metric value={fmtInt(s.rehab.liquidation)} label="Liquidation" />
          <Metric value={fmtInt(s.rehab.rehabilitation)} label="Rehabilitation" />
        </div>
        <p className="mt-3 text-sm text-slate-700">
          Status is only what NJDOBI publishes. Insolvency is not inferred. Names are not copied
          onto public insurer profiles from this unresolved listing.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.rehab.source_url} label="NJDOBI companies in rehabilitation or liquidation" />
        </p>
      </section>

      <section aria-labelledby="profiles-heading" className="mt-10">
        <h2 id="profiles-heading" className="text-lg font-semibold text-[#0A2540]">
          Profile evidence modules
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {s.profile_modules.public_profile_links_reason}
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Public profile links rendered on this page:{' '}
          {fmtInt(s.profile_modules.public_profile_links_rendered)}. Withheld review / unresolved /
          unsafe rows: {fmtInt(s.profile_modules.withheld_review_unresolved)}. Internal-only
          individuals: {fmtInt(s.profile_modules.internal_only_individuals)}. No public person
          expansion. Bail-bond firewall preserved.
        </p>
        <p className="mt-2 text-sm">
          Existing legal-insurer research profiles remain at{' '}
          <Link href="/insurers" className="text-[#0284C7] underline underline-offset-2">
            /insurers
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="gaps-heading" className="mt-10">
        <h2 id="gaps-heading" className="text-lg font-semibold text-[#0A2540]">
          Coverage gaps
        </h2>
        <p className="mt-2 text-sm text-slate-600">Unknown is not zero.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2 pr-3 font-medium">Gap</th>
                <th className="py-2 pr-3 font-medium">State</th>
                <th className="py-2 font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {s.coverage_gaps.map((g) => (
                <tr key={g.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3">{g.label}</td>
                  <td className="py-2 pr-3">{g.state}</td>
                  <td className="py-2">{g.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="changed-heading" className="mt-10">
        <h2 id="changed-heading" className="text-lg font-semibold text-[#0A2540]">
          What changed
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          These are source observations, not a retrieval timestamp.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          {s.what_changed.map((row) => (
            <li key={row.family}>
              {row.observation} ({row.family})
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="hubs-heading" className="mt-10">
        <h2 id="hubs-heading" className="text-lg font-semibold text-[#0A2540]">
          Existing New Jersey agency hubs
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Phase 9 agency hubs stay on their current routes. They are not this intelligence snapshot
          and are not county pages.
        </p>
        <ul className="mt-3 list-disc pl-5 text-sm">
          {s.existing_nj_agency_hubs.map((href) => (
            <li key={href}>
              <Link href={href} className="text-[#0284C7] underline underline-offset-2">
                {href}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10">
        <DisclaimerBanner />
      </div>
    </div>
  );
}
