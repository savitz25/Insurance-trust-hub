import Link from 'next/link';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { Trace } from '@/components/new-jersey/trace';
import { TexasAgencySearch } from '@/components/texas/tx-agency-search';
import { TexasCompanySearch } from '@/components/texas/tx-company-search';
import { fmtHero, fmtInt, type TexasInsuranceSnapshot } from '@/lib/texas-intelligence/snapshot';

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

export function TexasInsurancePage({ snapshot }: { snapshot: TexasInsuranceSnapshot }) {
  const s = snapshot;
  const typeEntries = Object.entries(s.agencies.license_type_counts);
  const apptTypes = Object.entries(s.appointments.type_counts);
  const evidence = s.evidence_depth;

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
          <li className="text-slate-800">Texas research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · Texas
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">
          Texas Insurance Market &amp; Regulatory Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of official Texas Department of Insurance agency licenses,
          agency-to-company appointments, surplus and title relationships, complaints, the TDI
          complaint index, and home/auto rate filings. This is not a ranking, recommendation, or
          Trust Score. Agency rows are not a person directory. Unknown is not zero.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Snapshot {s.version} · fingerprint {s.fingerprint.slice(0, 12)} · TDI as of {s.as_of}
        </p>
      </header>

      <section aria-labelledby="hero-metrics" className="mt-8">
        <h2 id="hero-metrics" className="sr-only">
          Snapshot metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-5">
          <Metric value={fmtHero(s.hero.universe_value)} label={`TDI Agencies · ${s.hero.universe_label}`} hint={s.hero.universe_hint} />
          <Metric value={fmtHero(s.hero.observations_value)} label={`Agency Appointments · ${s.hero.observations_label}`} hint={s.hero.observations_hint} />
          <Metric value={fmtInt(s.appointments.distinct_naic)} label="Companies · NAIC on appointments" hint="Not the complete authorized-company universe." />
          <Metric value={fmtInt(s.complaints.rows)} label="Complaints · named-party rows" hint="A complaint is not a violation." />
          <Metric value={String(s.hero.as_of_value)} label={`As-of · ${s.hero.as_of_label}`} hint={s.hero.as_of_hint} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Texas regulator map</h2>
        <p className="mt-2 text-sm text-slate-600">
          {s.regulators.tdi.covers} An agency is not an individual agent. An appointment is not a
          license. NAIC identity is not Texas authorization without Texas evidence.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.regulators.tdi.url} label="TDI home" />
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">Entity class</th>
                <th className="py-2 pr-3 font-medium">What it establishes</th>
                <th className="py-2 font-medium">What it does not</th>
              </tr>
            </thead>
            <tbody>
              {s.regulators.entity_classes.map((row) => (
                <tr key={row.class} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{row.class}</td>
                  <td className="py-2 pr-3">{row.establishes}</td>
                  <td className="py-2">{row.does_not}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Market findings</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          {s.findings.map((f) => (
            <li key={f.id}>{f.text}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">TDI agencies</h2>
        <p className="mt-2 text-sm text-slate-600">
          {fmtInt(s.agencies.rows)} official license rows and {fmtInt(s.agencies.distinct_npn)}{' '}
          distinct agency NPN identities ({fmtInt(s.agencies.distinct_tdi_license)} distinct TDI
          license numbers). {fmtInt(s.agencies.expiration_on_or_after_2026_09_03)} rows have an
          expiration on or after 2026-09-03; {fmtInt(s.agencies.expiration_before_2026_09_03)} are
          listed as already expired. {fmtInt(s.agencies.tx_listed_state_rows)} rows show listed state
          TX ({fmtInt(s.agencies.tx_listed_state_npn)} NPN). Listed state is not the licensed-in-Texas
          universe — TDI license jurisdiction is Texas for every row in this file.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Official contacts: phone {s.agencies.contacts.BUSINESS_PHONE.count}, email{' '}
          {s.agencies.contacts.BUSINESS_EMAIL.count}, website {s.agencies.contacts.WEBSITE.count},
          street address {s.agencies.contacts.PHYSICAL_BUSINESS_ADDRESS.count}. City and postal code
          are present on all {fmtInt(s.agencies.rows)} rows. Missing contacts are a source limitation,
          not missing businesses.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">License type</th>
                <th className="py-2 font-medium">Rows</th>
              </tr>
            </thead>
            <tbody>
              {typeEntries.map(([label, count]) => (
                <tr key={label} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{label}</td>
                  <td className="py-2 tabular-nums">{fmtInt(count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TexasAgencySearch licenseClasses={typeEntries.map(([label]) => label)} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Agency appointments</h2>
        <p className="mt-2 text-sm text-slate-600">
          {fmtInt(s.appointments.rows)} active appointment rows. {fmtInt(s.appointments.distinct_agency_npn)}{' '}
          distinct agency NPN values and {fmtInt(s.appointments.distinct_naic)} distinct NAIC company
          codes. {fmtInt(s.appointments.both_exact_npn_and_naic)} rows have both an exact numeric NPN
          and an exact NAIC. Median appointments per agency {s.appointments.per_agency.p50}; median
          agencies per company {s.appointments.per_company.p50}. More appointments is not a better
          agency. Fewer appointments is not a worse agency.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">Appointment type</th>
                <th className="py-2 font-medium">Rows</th>
              </tr>
            </thead>
            <tbody>
              {apptTypes.map(([label, count]) => (
                <tr key={label} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{label}</td>
                  <td className="py-2 tabular-nums">{fmtInt(count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TexasCompanySearch />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Complaints and the TDI complaint index</h2>
        <p className="mt-2 text-sm text-slate-600">
          TDI&apos;s all-data complaint file has {fmtInt(s.complaints.rows)} named-party rows from{' '}
          {s.complaints.received_date_min} through {s.complaints.received_date_max}. Confirmed Yes{' '}
          {fmtInt(s.complaints.confirmed_yes)}; Confirmed No {fmtInt(s.complaints.confirmed_no)}. A
          complaint is not a violation. Raw complaint count is not quality.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          The official <strong>TDI complaint index</strong> file has {fmtInt(s.complaint_index.rows)}{' '}
          rows and {fmtInt(s.complaint_index.distinct_naic)} NAIC values. It is not a TrustHub
          complaint score. {s.complaint_index.methodology}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Rate filings</h2>
        <p className="mt-2 text-sm text-slate-600">
          {fmtInt(s.rate_filings.rows)} home and auto rate-filing rows ({fmtInt(s.rate_filings.distinct_serff)}{' '}
          SERFF IDs). Status Closed {fmtInt(s.rate_filings.status_counts.Closed)}, Pending{' '}
          {fmtInt(s.rate_filings.status_counts.Pending)}. Closed type Reviewed{' '}
          {fmtInt(s.rate_filings.closed_type_counts.Reviewed)}. A rate filing is not a consumer
          premium. Requested change is not an approved change unless the official status says so.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Surplus lines and title</h2>
        <p className="mt-2 text-sm text-slate-600">
          Surplus-lines status detail: {fmtInt(s.surplus.rows)} rows ({fmtInt(s.surplus.entity_type_counts.FIRM)}{' '}
          firm, {fmtInt(s.surplus.entity_type_counts.INDIVIDUAL)} individual; Active{' '}
          {fmtInt(s.surplus.license_status_counts.Active)}). A surplus-lines license is not insurer
          authorization. Individual surplus rows are not published as a person directory.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Title appointments: {fmtInt(s.title.rows)} county×underwriter rows,{' '}
          {fmtInt(s.title.distinct_title_agency_license)} title-agency licenses,{' '}
          {fmtInt(s.title.distinct_underwriter_name)} underwriter names, {fmtInt(s.title.distinct_counties)}{' '}
          counties. A title appointment is not a general insurance appointment. There are no Texas
          county pages.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Intentionally unpublished</h2>
        <p className="mt-2 text-sm text-slate-600">
          Person licenses ({fmtInt(s.person_licenses.rows)} rows) and person appointments (
          {fmtInt(s.person_appointments.rows)} rows) remain an internal evidence layer. PUBLIC_DIRECTORY
          = FALSE. A person license is not a business agency. Relationship file {fmtInt(s.relationships.rows)}{' '}
          rows is shown only as aggregates.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Evidence depth</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 pr-3 font-medium">ID</th>
                <th className="py-2 pr-3 font-medium">Rows</th>
                <th className="py-2 font-medium">Public</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((row) => (
                <tr key={row.source} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{row.source}</td>
                  <td className="py-2 pr-3">{row.dataset_id || '—'}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.rows == null ? 'UNKNOWN' : fmtInt(row.rows)}</td>
                  <td className="py-2">{row.public ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">What we don&apos;t know</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          {s.gaps.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-slate-600">Unknown is not zero. No Trust Score.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Trace this number</h2>
        <Trace
          source={`TDI Open Data ${s.trace.agency_rows.source}`}
          sourceDate={s.trace.agency_rows.clock}
          denominator={`${fmtInt(s.trace.agency_rows.value)} agency license rows`}
          calculation="Count official SODA/CSV rows. Distinct NPN is a separate identity count."
          grain={s.trace.agency_rows.grain}
          coverage="TDI business licenses only. Not people."
          caveat={s.trace.agency_rows.limitations}
        />
        <Trace
          source={`TDI Open Data ${s.trace.agency_appointments.source}`}
          sourceDate={s.trace.agency_appointments.clock}
          denominator={`${fmtInt(s.trace.agency_appointments.value)} active appointment rows`}
          calculation="Count official active agency-to-company appointments. Distinct NAIC counted separately."
          grain={s.trace.agency_appointments.grain}
          coverage="Active appointments only."
          caveat={s.trace.agency_appointments.limitations}
        />
        <Trace
          source={`TDI Open Data ${s.trace.complaints.source}`}
          sourceDate={s.trace.complaints.clock}
          denominator={`${fmtInt(s.trace.complaints.value)} named-party complaint rows`}
          calculation="Count official complaint-name rows. Confirmed Yes/No is a source field, not a TrustHub finding."
          grain={s.trace.complaints.grain}
          coverage="2011-04-28 through 2026-08-31 received dates."
          caveat={s.trace.complaints.limitations}
        />
        <Trace
          source={`TDI Open Data ${s.trace.complaint_index.source}`}
          sourceDate={s.trace.complaint_index.clock}
          denominator={`${fmtInt(s.trace.complaint_index.value)} TDI complaint-index rows`}
          calculation="Preserve TDI native Complaint Index with confirmed complaints and policy counts by NAIC, year, and line."
          grain={s.trace.complaint_index.grain}
          coverage="Company × year × line."
          caveat={s.trace.complaint_index.limitations}
        />
      </section>

      <DisclaimerBanner className="mt-10" />
    </div>
  );
}
