import Link from 'next/link';
import { fmtInt, type TennesseeInsuranceSnapshot } from '@/lib/tennessee-intelligence/snapshot';

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

const STATUS_NOTES: Record<string, string> = {
  Licensed: 'Licensed to transact the listed type of insurance in Tennessee.',
  Eligible: 'Eligible surplus-lines insurer. Eligible is not admitted (licensed) status.',
  Registered: 'Risk retention group registered in Tennessee. Registration is not a Tennessee license.',
  'RJ (passported)': 'Reinsurer recognized from a reciprocal jurisdiction. A reinsurance recognition, not a direct-writing license.',
  Accredited: 'Accredited reinsurer. A reinsurance recognition, not a direct-writing license.',
  Trusteed: 'Reinsurer recognized through a trust arrangement. Not a direct-writing license.',
  'Certified (passported)': 'Certified reinsurer passported from another state. Not a direct-writing license.',
  Suspended: 'Authority suspended, as published. Status dates are shown where TDCI prints one.',
  Restricted: 'Authority restricted, as published.',
};

const SECTION_LABELS: Record<string, string> = {
  admissions_recognitions: 'Admissions / Recognitions',
  mergers: 'Mergers',
  name_changes: 'Name Changes',
  redomestications: 'Redomestications',
  surrenders_revocations: 'Surrenders and Revocations',
  suspensions: 'Suspensions',
  miscellaneous: 'Miscellaneous',
};

export function TennesseeInsurancePage({ snapshot }: { snapshot: TennesseeInsuranceSnapshot }) {
  const s = snapshot;
  const list = s.licensed_companies;
  const xw = s.naic_crosswalk.licensed_companies;
  const m = s.company_activity_updates;
  const a = s.company_actions;
  const e = s.company_examinations;
  const distinctByType = list.distinct_naic_by_type as Record<string, number>;
  const statusByType = list.status_reasons_by_type as Record<string, Record<string, number>>;

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
          <li className="text-slate-800">Tennessee research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0369A1]">
          Independent research · Tennessee · statewide only
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">{s.publication.h1}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of the companies the Tennessee Department of Commerce &amp; Insurance (TDCI) lists as
          licensed, eligible, registered or recognized, its monthly company-activity updates, its Insurance Company
          Actions Archive and its company examinations. An insurance company is not an agency, and an agency is not an
          individual producer. An NAIC company code is not an NPN. This is not a ranking, recommendation, or Trust Score.
          Missing is not zero.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          TDCI list {list.list_statement.replace(/\.$/, '')} · retrieved {s.retrieved_at} · snapshot {s.version} ·
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
            label="Distinct NAIC codes on the List of Licensed Insurance Companies"
            hint={`${fmtInt(list.listed_rows)} listed rows across ${Object.keys(list.company_types).length} company types. ${fmtInt(list.placeholder_rows)} reinsurer and captive rows print the placeholder NAIC ${list.placeholder_naic} and are not counted.`}
          />
          <Metric
            value={fmtInt(xw.EXACT_EXISTING_LEGAL_INSURER_MATCHES)}
            label="Exact NAIC matches to existing legal-insurer identities"
            hint={`${fmtInt(xw.UNMATCHED_NAIC)} NAIC codes are not in the national identity index. No insurer was created or merged by name.`}
          />
          <Metric
            value={fmtInt(a.index_lines)}
            label="Insurance Company Actions Archive lines"
            hint={`Dated ${a.earliest_date.slice(0, 4)}–${a.latest_date.slice(0, 4)}. The archive prints no NAIC code, so every line is a standalone TDCI record.`}
          />
          <Metric
            value="Not acquired"
            label="Agency and producer bulk rosters"
            hint="License verification is live through the NAIC public lookup TDCI links to. No free bulk file was found and none was bought. Search-only is not zero."
          />
        </div>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Licensed companies</h2>
        <p>
          TDCI&apos;s <Official href={s.regulator.licensed_companies_url} label="List of Licensed Insurance Companies" /> is
          published {list.list_statement.replace(/^As of/, 'as of').replace(/\.$/, '')}. It serves {fmtInt(list.raw_rows)}{' '}
          rows; {fmtInt(list.blank_rows)} is blank, leaving {fmtInt(list.listed_rows)} listed rows. Every listed row prints
          an NAIC code, but {fmtInt(list.placeholder_rows)} print {list.placeholder_naic}, a placeholder shared by alien
          reinsurers (and one captive), so they are kept as research rows, not identities. The other{' '}
          {fmtInt(list.rows_with_exact_naic)} rows carry {fmtInt(list.distinct_naic)} distinct codes.{' '}
          {fmtInt(list.naic_on_two_rows)} codes appear twice because the same company is listed both as an accredited
          reinsurer and as an eligible surplus-lines insurer; each is one legal identity, not two insurers.
        </p>
        <p>
          Company type is TDCI&apos;s own classification. Types describe different kinds of authority and are never
          added into one Tennessee insurer total. Being listed is not a quote and not proof a product is offered to you.
        </p>
        <div className="overflow-x-auto" role="region" aria-label="Company types table" tabIndex={0}>
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <caption className="sr-only">Listed rows by TDCI company type</caption>
            <thead>
              <tr className="border-b border-slate-300 text-slate-800">
                <th scope="col" className="py-2 pr-3 font-semibold">Company type (as published)</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Rows</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Distinct NAIC</th>
                <th scope="col" className="py-2 font-semibold">Status reasons (as published)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(list.company_types).map(([type, rows]) => (
                <tr key={type} className="border-b border-slate-100 align-top">
                  <th scope="row" className="py-1.5 pr-3 font-normal">{type}</th>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{fmtInt(rows)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{fmtInt(distinctByType[type] ?? 0)}</td>
                  <td className="py-1.5 text-slate-600">
                    {Object.entries(statusByType[type] ?? {})
                      .map(([status, n]) => `${status} ${fmtInt(n)}`)
                      .join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Status</h2>
        <p>
          STATUS_REASON is kept exactly as TDCI publishes it; nothing is flattened to &ldquo;active&rdquo;. TDCI prints a
          STATUS_DATE on {fmtInt(list.status_dated_rows)} rows (
          {Object.entries(list.status_dated_rows_by_status)
            .map(([status, n]) => `${status} ${fmtInt(n)}`)
            .join(', ')}
          ), as spreadsheet serial numbers; the calendar dates shown in search results are derived from them.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {Object.entries(list.status_reasons).map(([status, rows]) => (
            <li key={status}>
              <span className="font-medium text-slate-800">{status}</span> — {fmtInt(rows)} rows.{' '}
              {STATUS_NOTES[status] ?? 'As published.'}
            </li>
          ))}
        </ul>
        <p>
          Domicile is not Tennessee authority. {fmtInt(list.tennessee_domiciled_rows)} listed rows are domiciled in
          Tennessee and {fmtInt(list.foreign_or_alien_domiciled_rows)} elsewhere; a foreign company can be authorized
          in Tennessee, and a Tennessee domicile is not itself a particular authority class. The mailing-office state is
          not the domicile. Street addresses and phone numbers are on the official list and are not republished here.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">NAIC identity</h2>
        <p>
          The NAIC company code is the only key used to connect a Tennessee row to an existing InsuranceTrustHub
          legal-insurer identity. {fmtInt(xw.EXACT_EXISTING_LEGAL_INSURER_MATCHES)} of the {fmtInt(xw.SOURCE_DISTINCT_NAIC)}{' '}
          codes match exactly. The other {fmtInt(xw.UNMATCHED_NAIC)} (five risk retention groups and two life companies)
          stay as Tennessee research identities. The {fmtInt(list.placeholder_rows)} placeholder rows are not matched by
          name. No profile was created, merged or attached. Search a code, for example{' '}
          <Ask q="NAIC 16862 Tennessee" />, or a listed name, for example <Ask q="Tennessee insurer Farm Bureau" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Company activity updates</h2>
        <p>
          TDCI&apos;s <Official href={s.regulator.monthly_update_url} label="Insurance Activities Monthly Update" /> lists{' '}
          {fmtInt(m.event_rows)} company events ({m.asterisk_statement.replace(/^\* \[asterisk\] /, '')};{' '}
          {m.page_last_updated_statement.replace(/^This Page /, 'page ').toLowerCase()}). {fmtInt(m.naic_keyed_event_rows)}{' '}
          print a 5-digit NAIC code and {fmtInt(m.event_rows_with_other_identifier_only)} print only a reinsurer
          identifier. An event is not a company, and these events are not a second company census.
        </p>
        <div className="overflow-x-auto" role="region" aria-label="Company activity events table" tabIndex={0}>
          <table className="w-full min-w-[320px] border-collapse text-left text-sm">
            <caption className="sr-only">Company activity events by TDCI section</caption>
            <thead>
              <tr className="border-b border-slate-300 text-slate-800">
                <th scope="col" className="py-2 pr-3 font-semibold">TDCI section</th>
                <th scope="col" className="py-2 text-right font-semibold">Events</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(m.event_rows_by_section).map(([key, rows]) => (
                <tr key={key} className="border-b border-slate-100">
                  <th scope="row" className="py-1.5 pr-3 font-normal">{SECTION_LABELS[key] ?? key}</th>
                  <td className="py-1.5 text-right tabular-nums">
                    {rows === 0 && key === 'suspensions' && m.suspensions_published_none ? 'None (as published)' : fmtInt(rows)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Company actions</h2>
        <p>
          The <Official href={s.regulator.company_actions_url} label="Insurance Company Actions Archive" /> lists orders
          and related documents alphabetically by company, with dates from {a.earliest_date.slice(0, 4)} to{' '}
          {a.latest_date.slice(0, 4)}: {fmtInt(a.index_lines)} index lines ({fmtInt(a.top_level_entries)} top-level
          entries) linking {fmtInt(a.linked_documents)} documents. The archive has no list date, no action-type column and
          no NAIC code. Not every entry is punitive: it includes acquisitions, mergers, rehabilitations, bond-fund
          administration and consent orders. Each line stays a standalone TDCI record; none is attached to an insurer by
          name.
        </p>
        <p>Entries dated {a.latest_year}, as listed:</p>
        <ul className="list-disc space-y-1 pl-5">
          {a.latest_year_entries.map((entry) => (
            <li key={entry.caption_as_listed}>{entry.caption_as_listed}</li>
          ))}
        </ul>
        <p>
          Many older entries pair an insurer with a policyholder, often in a workers&apos; compensation premium matter.
          Those {fmtInt(a.captions_withheld)} captions name a second party, sometimes an individual, and are not
          republished here; document links are also withheld because their file names are free text. Read them on the
          official archive.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Examinations</h2>
        <p>
          The <Official href={s.regulator.company_examinations_url} label="Company Examinations Archive" /> lists{' '}
          {fmtInt(e.listings)} examinations, grouped by the year each is as of ({e.exam_as_of_years[0]}–
          {e.exam_as_of_years[1]}), with {fmtInt(e.documents)} report and order PDFs. They print no NAIC code, so none is
          attached to an insurer here. The PDFs were not parsed, and an examination report is not a score. Posted in{' '}
          {e.latest_posting_year}:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {e.latest_posting_year_listings.map((x) => (
            <li key={`${x.company_as_listed}-${x.exam_as_of_year}`}>
              {x.company_as_listed} — examination as of {x.exam_as_of_year}, posted {x.posted.join(', ')}
              {x.documents.map((d) => (
                <span key={d.url}>
                  {' · '}
                  <Official href={d.url} label={d.kind} />
                </span>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Producers and agencies</h2>
        <p>
          Tennessee producer (agent) and agency licenses are verified through TDCI&apos;s{' '}
          <Official href={s.regulator.verify_license_url} label="Verify an Insurance License" /> link, which opens the NAIC
          public license lookup. That is a search, not a download. No free structured bulk roster was found and no paid
          list was bought, so there is no Tennessee producer or agency census here. A producer is a person, an agency is
          an organization, and neither is an insurance company. Search-only is not zero.
        </p>
        <p>
          InsuranceTrustHub holds no Tennessee credential source; existing agency and producer records come from other
          states and federal sources and are not a Tennessee roster. The existing Tennessee market hubs are research
          pathways, not a TDCI license census.
        </p>
        <p>
          The <Official href={s.regulator.producer_discipline_url} label="Agent/Producer Disciplinary Actions Archive" />{' '}
          lists {fmtInt(s.producer_discipline.linked_entries)} entries by individual last name. It prints no NPN and no
          action-date field, so entries are not attached to any producer, agency or insurer, and names are not
          republished here.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Complaints</h2>
        <p>
          Consumers can <Official href={s.regulator.complaint_url} label="file an insurance complaint" /> with TDCI
          Consumer Insurance Services online or by mail; the policy must have been written in Tennessee, and TennCare
          complaints go to the TennCare Oversight Division. TDCI&apos;s &ldquo;Complaint Data&rdquo; link opens the NAIC
          Consumer Insurance Search, a national company lookup. TDCI publishes no Tennessee company-level complaint table
          on its complaint page, so no complaint counts or ratios are shown here. A complaint is not an enforcement
          finding, and a complaint ratio is not a quality score.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Coverage of this extract</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>List of Licensed Insurance Companies, exact NAIC identity, company type and status: known.</li>
          <li>Monthly company-activity events: known, kept as events.</li>
          <li>Insurance Company Actions Archive and Company Examinations Archive: index known; documents not parsed; no NAIC attachment.</li>
          <li>Producer and agency verification: known (search-only). Producer and agency bulk rosters: not acquired.</li>
          <li>Producer disciplinary archive: counted only; names not republished.</li>
          <li>Complaint intake: known. Tennessee company-level complaint data: not acquired.</li>
          <li>Placeholder-NAIC reinsurers: identity unknown here; no name matching.</li>
          <li>Nashville, Memphis and other local insurance intelligence pages: not published.</li>
        </ul>
        <p>
          Generated {s.generated_at}. Retrieval time is not a license effective date. No Tennessee insurance total is
          formed by adding companies, agencies, producers, events or actions.
        </p>
      </section>
    </div>
  );
}
