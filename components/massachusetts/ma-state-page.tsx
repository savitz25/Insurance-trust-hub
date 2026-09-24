import Link from 'next/link';
import { fmtInt, type MassachusettsInsuranceSnapshot } from '@/lib/massachusetts-intelligence/snapshot';

function Metric({ value, label, hint }: { value: string; label: string; hint?: string }) {
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
      className="font-medium text-[#0369A1] underline underline-offset-2"
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}

function Ask({ q }: { q: string }) {
  return (
    <Link href={`/ask?q=${encodeURIComponent(q)}`} className="font-medium text-[#0369A1] underline underline-offset-2">
      {q}
    </Link>
  );
}

const CLASS_LABELS: Record<string, string> = {
  SETTLEMENT_AGREEMENT: 'Settlement Agreement',
  HEARING_OFFICER_DECISION: 'Hearing Officer Decision (as listed)',
  ORDER_TO_SHOW_CAUSE: 'Order to Show Cause (as listed)',
  CONSENT_AGREEMENT: 'Consent Agreement',
  HEARING_OFFICER_ORDER: 'Hearing Officer Order (as listed)',
  NOT_STATED: 'Not stated (N/A or blank)',
  OTHER_AS_LISTED: 'Other wording as listed',
};

export function MassachusettsInsurancePage({ snapshot }: { snapshot: MassachusettsInsuranceSnapshot }) {
  const s = snapshot;
  const list = s.licensed_or_approved;
  const d = s.designations;
  const xw = s.naic_crosswalk.licensed_or_approved;
  const a = s.administrative_actions;
  const designationRows = [
    { layer: d.auto_liability_6g, note: 'Authority to write auto liability. Not proof a policy is offered to you, and not a quote.' },
    { layer: d.workers_comp_6e, note: 'Authority to write workers’ compensation.' },
    { layer: d.health_6b, note: 'Health - all kinds. Includes life/health and property/casualty company types.' },
    { layer: d.eligible_surplus_lines, note: `The workbook is titled “${d.eligible_surplus_lines.workbook_title}”. Surplus-lines eligibility is not admitted status.` },
    { layer: d.fidelity_surety_4, note: 'Fidelity and surety authority.' },
    { layer: d.domestic_pc, note: 'Massachusetts-domestic property and casualty companies. Domestic is not a product capability.' },
    { layer: d.domestic_life, note: 'Massachusetts-domestic life companies.' },
  ];
  const years = Object.entries(a.rows_by_table_year);
  const classes = Object.entries(a.disposition_classes).sort((x, y) => y[1] - x[1]);

  return (
    <div className="th-shell mx-auto w-full max-w-[880px] overflow-x-clip px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600">
        <ol className="flex flex-wrap gap-1">
          <li>
            <Link href="/" className="text-[#0369A1] underline underline-offset-2">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-800">Massachusetts research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0369A1]">
          Independent research · Massachusetts · statewide only
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">{s.publication.h1}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of the companies the Massachusetts Division of Insurance (DOI) lists as licensed or
          approved, the product and designation lists it publishes, and its administrative actions. An insurance
          company is not an agency, and an agency is not an individual producer. An NAIC company code is not an NPN.
          This is not a ranking, recommendation, or Trust Score. Missing is not zero.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          DOI company lists dated {list.source_printed_date} · retrieved {s.retrieved_at} · snapshot {s.version} ·
          fingerprint {s.fingerprint.slice(0, 12)}
        </p>
      </header>

      <section aria-labelledby="hero-metrics" className="mt-8">
        <h2 id="hero-metrics" className="sr-only">
          Snapshot metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            value={fmtInt(list.distinct_naic)}
            label="Distinct NAIC codes on the Licensed or Approved Companies list"
            hint={`${fmtInt(list.rows)} list rows across ${Object.keys(list.company_types).length} company types. ${fmtInt(list.rows_missing_naic)} rows print no NAIC code.`}
          />
          <Metric
            value={fmtInt(xw.EXACT_EXISTING_LEGAL_INSURER_MATCHES)}
            label="Exact NAIC matches to existing legal-insurer identities"
            hint={`${fmtInt(xw.UNMATCHED_NAIC)} NAIC codes are not in the national identity index. No insurer was created or merged by name.`}
          />
          <Metric
            value={fmtInt(a.observation_rows)}
            label={`DOI administrative-action rows, ${a.window_years[0]}–${a.window_years[1]}`}
            hint="Standalone events. A listed allegation is not a finding. Earlier actions are available only by public record request."
          />
          <Metric
            value="Not acquired"
            label="Agency and producer bulk rosters"
            hint="SBS license verification is live. Bulk lists are paid (NAIC fee) or a public record request. Search-only is not zero."
          />
        </div>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Licensed or approved companies</h2>
        <p>
          The DOI&apos;s <Official href={s.regulator.company_lists_url} label="Massachusetts Licensed Insurance Companies" />{' '}
          page publishes the {list.list_page_label} workbook, dated {list.source_printed_date}. It lists{' '}
          {fmtInt(list.rows)} rows. {fmtInt(list.rows_with_naic)} rows carry an NAIC company code, covering{' '}
          {fmtInt(list.distinct_naic)} distinct codes. {fmtInt(list.naic_on_two_rows)} codes appear twice because the
          same company is listed under two company types (for example Accredited Reinsurer and Surplus Lines); each is
          one legal identity, not two insurers.
        </p>
        <p>
          The list mixes very different company types. Surplus-lines companies are eligible, not admitted.
          Third-party administrators, risk purchasing groups, service contract providers, pharmacy benefit managers
          and similar rows print no NAIC code; they are kept as source rows and are not counted as insurers. The State
          column is a mailing address, not the state of domicile. Being on the list is not a quote and not proof a
          product is available to you.
        </p>
        <div className="overflow-x-auto" role="region" aria-label="Company types table" tabIndex={0}>
          <table className="w-full min-w-[420px] border-collapse text-left text-sm">
            <caption className="sr-only">Licensed or Approved Companies rows by company type</caption>
            <thead>
              <tr className="border-b border-slate-300 text-slate-800">
                <th scope="col" className="py-2 pr-3 font-semibold">Company type (as listed)</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Rows</th>
                <th scope="col" className="py-2 text-right font-semibold">Rows with NAIC</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(list.company_types)
                .sort((x, y) => y[1] - x[1])
                .map(([type, rows]) => (
                  <tr key={type} className="border-b border-slate-100">
                    <th scope="row" className="py-1.5 pr-3 font-normal">{type}</th>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmtInt(rows)}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {fmtInt(list.rows_with_naic_by_type[type as keyof typeof list.rows_with_naic_by_type] ?? 0)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Product and designation lists</h2>
        <p>
          The DOI also publishes one workbook per product or designation list, all dated {list.source_printed_date}.
          Every NAIC code on these lists is also on the Licensed or Approved Companies list. One company can appear on
          several lists, so these counts overlap and are never added together. Appearing on a list is legal authority,
          not proof that a policy is being offered to every consumer.
        </p>
        <div className="overflow-x-auto" role="region" aria-label="Designation lists table" tabIndex={0}>
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <caption className="sr-only">DOI product and designation lists</caption>
            <thead>
              <tr className="border-b border-slate-300 text-slate-800">
                <th scope="col" className="py-2 pr-3 font-semibold">DOI list</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Companies</th>
                <th scope="col" className="py-2 font-semibold">Reading it correctly</th>
              </tr>
            </thead>
            <tbody>
              {designationRows.map(({ layer, note }) => (
                <tr key={layer.code} className="border-b border-slate-100 align-top">
                  <th scope="row" className="py-1.5 pr-3 font-normal">
                    <Official href={layer.download_url} label={layer.list_page_label} />
                  </th>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{fmtInt(layer.distinct_naic)}</td>
                  <td className="py-1.5 text-slate-600">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">NAIC identity</h2>
        <p>
          The NAIC company code is the only key used to connect a Massachusetts row to an existing InsuranceTrustHub
          legal-insurer identity. {fmtInt(xw.EXACT_EXISTING_LEGAL_INSURER_MATCHES)} of the {fmtInt(xw.SOURCE_DISTINCT_NAIC)}{' '}
          codes match exactly. The other {fmtInt(xw.UNMATCHED_NAIC)} (mostly risk retention groups and accredited
          reinsurers) stay as Massachusetts research identities. No profile was created, merged or attached by name.
          Search a code, for example <Ask q="NAIC 36404 Massachusetts" />, or a listed name, for example{' '}
          <Ask q="Massachusetts insurer Arbella" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Agencies and producers</h2>
        <p>
          Massachusetts verifies insurance producers, agencies, public adjusters, appraisers and other licensees
          through the <Official href={s.regulator.sbs_lookup_url} label="State Based Systems (SBS) verification service" />.
          Bulk licensee lists come from the SBS Report Generator after a fee assessed by the NAIC, or from a{' '}
          <Official href={s.regulator.public_records_url} label="DOI public record request" /> that may take up to 10
          business days. Neither was bought or requested for this page, so there is no Massachusetts agency or
          producer census here. Search-only is not zero.
        </p>
        <p>
          InsuranceTrustHub already holds {fmtInt(s.agency_roster.existing_graph_ma_agency_credentials)} Massachusetts
          agency credentials, matched to existing agencies by exact NPN from an earlier DOI producer-license extract.
          That is partial coverage, not a count of Massachusetts agencies. Individual producers are not published as
          profiles.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">DOI administrative actions</h2>
        <p>
          The <Official href={s.regulator.administrative_actions_url} label="DOI Administrative Actions" /> page lists
          actions by year from {a.window_years[0]} to {a.window_years[1]}: {fmtInt(a.observation_rows)} rows, with
          effective dates from {a.period_start} to {a.period_end}. The DOI says copies of administrative actions before
          2015 require a public record request. Most rows concern producers, agencies and unlicensed activity, and the
          table prints no NAIC code. Every row is kept as a standalone DOI event: none is attached to a company, agency
          or person profile, and names are not used to join. This page does not republish licensee names.
        </p>
        <div className="overflow-x-auto" role="region" aria-label="Administrative actions by year table" tabIndex={0}>
          <table className="w-full min-w-[320px] border-collapse text-left text-sm">
            <caption className="sr-only">Administrative-action rows by table year</caption>
            <thead>
              <tr className="border-b border-slate-300 text-slate-800">
                <th scope="col" className="py-2 pr-3 font-semibold">Year table</th>
                <th scope="col" className="py-2 text-right font-semibold">Rows</th>
              </tr>
            </thead>
            <tbody>
              {years.map(([year, rows]) => (
                <tr key={year} className="border-b border-slate-100">
                  <th scope="row" className="py-1.5 pr-3 font-normal">{year}</th>
                  <td className="py-1.5 text-right tabular-nums">{fmtInt(rows)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>How each row was resolved, as the DOI lists it:</p>
        <ul className="list-disc space-y-1 pl-5">
          {classes.map(([key, rows]) => (
            <li key={key}>
              {CLASS_LABELS[key] ?? key}: {fmtInt(rows)}
            </li>
          ))}
        </ul>
        <p>The DOI&apos;s own definitions, from its <Official href={a.terms_source} label="Enforcement page" />:</p>
        <dl className="space-y-2">
          {Object.entries(a.terms).map(([term, definition]) => (
            <div key={term}>
              <dt className="font-semibold text-slate-800">{term}</dt>
              <dd>{definition}</dd>
            </div>
          ))}
        </dl>
        <p>
          A primary allegation is what the licensee allegedly did; it is not a finding. A Settlement Agreement is an
          informal resolution, not a hearing decision. Hearing Officer Decision, Order to Show Cause and other labels are
          kept exactly as listed. {fmtInt(a.licensing_action_mentions.cease_and_desist)} rows mention a cease and desist
          and {fmtInt(a.licensing_action_mentions.revocation)} mention a revocation; one row can mention both, so these
          are not added. Fines and restitution are shown per row by the DOI and are not totaled here. An effective date
          is not a license expiration date.
        </p>
        <p className="text-xs text-slate-500">
          Source notes: {a.source_quirks.join(' ')}
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Public hearing decisions and market conduct</h2>
        <p>
          The DOI&apos;s <Official href={s.hearing_decisions.source} label="Public Hearing Decisions" /> page lists{' '}
          {fmtInt(s.hearing_decisions.listing_rows)} decisions from {s.hearing_decisions.list_years[0]} to{' '}
          {s.hearing_decisions.list_years[1]}: rate cases, enforcement matters, control and structure of domestic insurers,
          and appeals. The DOI notes these are not official copies. They are indexed here by docket and issue date only;
          the PDFs were not parsed. {fmtInt(s.hearing_decisions.exact_docket_matches_with_administrative_actions.length)}{' '}
          docket numbers also appear on the administrative-action table. A decision listing and an action row stay
          separate records.
        </p>
        <p>
          The <Official href={s.market_conduct.source} label="Market Conduct Examination Reports" /> page lists{' '}
          {fmtInt(s.market_conduct.listing_rows)} report and adoption-order documents. Reports are posted under the year
          examined, not the year completed. They name companies but print no NAIC code, so none is attached to an insurer
          here, and examination findings are not converted into scores.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Complaints</h2>
        <p>
          The DOI&apos;s <Official href={s.regulator.consumer_services_url} label="Consumer Services Unit" /> helps consumers
          with complaints against insurers, producers and other licensees and says it typically resolves over 2,000
          written complaints each year. That is program context, not a count for any company. Examiners can provide
          license status and complaint numbers when asked; no public company-level complaint dataset was acquired. A
          complaint is not an enforcement action and not a finding.{' '}
          <Official href={s.regulator.complaint_url} label="Filing an insurance complaint" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Coverage of this extract</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Licensed or Approved Companies list and exact NAIC identity: known.</li>
          <li>Auto 6G, Workers’ Comp 6E, Health 6B, surplus lines, fidelity and surety, domestic life and domestic P&amp;C lists: known, separate, never summed.</li>
          <li>Agency and producer verification: known through SBS. Agency and producer bulk rosters: not acquired (paid or request only).</li>
          <li>Administrative actions from 2015: known. Before 2015: public record request only.</li>
          <li>Public hearing decisions and market-conduct reports: index only; documents not parsed.</li>
          <li>Complaint intake: known. Company-level complaint counts: request only.</li>
          <li>Financial and receivership data, private-passenger-auto group list: not acquired.</li>
          <li>Boston, Worcester, Springfield and other local insurance pages: not published.</li>
        </ul>
        <p>
          Generated {s.generated_at}. Retrieval time is not a license effective date, and an action effective date is
          not a license expiration date. No Massachusetts insurance total is formed by adding companies, agencies and
          producers.
        </p>
      </section>
    </div>
  );
}
