import Link from 'next/link';
import { fmtInt, type NevadaInsuranceSnapshot } from '@/lib/nevada-intelligence/snapshot';

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
    <a href={href} className="font-medium text-[#0284C7] underline underline-offset-2" rel="noopener noreferrer" target="_blank">
      {label}
    </a>
  );
}

function CountTable({ title, counts, total }: { title: string; counts: Record<string, number>; total: number }) {
  const rows = Object.entries(counts);
  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[280px] text-left text-sm">
        <caption className="bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</caption>
        <tbody>
          {rows.map(([label, n]) => (
            <tr key={label} className="border-t border-slate-100">
              <td className="px-3 py-1.5 text-slate-700">{label}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">{fmtInt(n)}</td>
            </tr>
          ))}
          <tr className="border-t border-slate-200 bg-slate-50">
            <td className="px-3 py-1.5 font-medium text-slate-800">Rows</td>
            <td className="px-3 py-1.5 text-right font-medium tabular-nums text-slate-900">{fmtInt(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function NevadaInsurancePage({ snapshot }: { snapshot: NevadaInsuranceSnapshot }) {
  const s = snapshot;
  const census = s.market_report_census;
  const lic = census.licensees;
  const co = census.companies;
  const order = s.enforcement.orders[0];
  const c = s.complaint_data;
  const years = Object.entries(c.years).sort(([a], [b]) => b.localeCompare(a));
  const y2024 = c.years['2024'];

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
          <li className="text-slate-800">Nevada research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">Independent research · Nevada · statewide only</p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">{s.publication.h1}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of how the Nevada Division of Insurance (NDOI) licenses insurance companies, agencies and
          individual producers, what NDOI itself says about the size of each group, the current Enforcements &amp; Orders
          posting, and NDOI&apos;s consumer complaint data. An insurance company is not an agency. An agency is not an
          individual producer. Las Vegas and Reno are geography, not separate licensing regimes. This is not a ranking,
          recommendation or Trust Score. Missing or search-only is not zero.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Snapshot {s.version} · fingerprint {s.fingerprint.slice(0, 12)} · retrieved {s.retrieved_at} · snapshot as of{' '}
          {s.snapshot_as_of}
        </p>
      </header>

      <section aria-labelledby="hero-metrics" className="mt-8">
        <h2 id="hero-metrics" className="sr-only">
          Snapshot metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            value={fmtInt(co.licensed_domestic_and_foreign_insurers)}
            label="Licensed domestic and foreign insurers, as NDOI states it"
            hint={`${census.figures_as_of_statement} NDOI's own figure, not a company list we hold. Captives, self-insurers and surplus-lines insurers are counted separately.`}
          />
          <Metric
            value={fmtInt(lic.agency_licensees)}
            label="Agency licensees, as NDOI states it"
            hint={`${fmtInt(lic.agency_resident)} resident and ${fmtInt(lic.agency_non_resident)} non-resident firms. Not added to individuals or insurers.`}
          />
          <Metric
            value={fmtInt(y2024.complaint_reason_rows)}
            label="NDOI complaint-reason rows opened in 2024"
            hint="One complaint can print one row per reason, so rows are not complaints. Respondent names are not republished and nothing is attached to a company."
          />
          <Metric
            value="Not acquired"
            label="Company, agency and producer bulk rosters"
            hint="NDOI's self-serve export rejected automated access. The lookup is search-only. Search-only is not zero."
          />
        </div>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Regulator and grains</h2>
        <p>
          The <Official href={s.regulator.home_url} label="Nevada Division of Insurance" />, part of the Department of Business
          and Industry, licenses insurance companies, business entities (agencies) and individual producers. Its{' '}
          <Official href={s.regulator.license_lookup_url} label="lookup" /> offers three separate searches: company, agency and
          agent. An insurance company is identified by an NAIC company code. An agency is a business entity, identified by an NPN
          or a Nevada license number. An individual producer is a person, identified by an NPN. Those identifiers are not
          interchangeable, and a shared name is not a join.
        </p>
        <p>
          NDOI&apos;s 2025 Insurance Market Report states its own licensee and company figures. They are quoted below as
          NDOI&apos;s statements with NDOI&apos;s clock ({census.figures_as_of_statement}). They are not InsuranceTrustHub records,
          and they are never added together. The report&apos;s own &ldquo;{fmtInt(lic.report_stated_active_licensee_total)} active
          licensees&rdquo; figure equals individuals plus agencies and leaves out the {fmtInt(lic.captive_licensees)} captives it
          lists alongside them, so it is not republished as a Nevada insurance total.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Legal companies</h2>
        <p>
          NDOI states that Nevada has {fmtInt(co.licensed_domestic_and_foreign_insurers)} licensed domestic and foreign insurers,{' '}
          {fmtInt(co.captive_insurers)} captive insurers, {fmtInt(co.sponsored_captive_cells)} sponsored captive cells,{' '}
          {fmtInt(co.self_insured_employers)} self-insured employers and {fmtInt(co.self_insured_groups_active)} active self-insured
          groups, and that about {fmtInt(co.surplus_lines_insurers_approximate)} insurers make up the non-admitted surplus-lines
          market. Each is a different kind of entity with a different legal footing; they are not one company count.
        </p>
        <p>
          No downloadable NDOI company list was found, so this page holds no Nevada company roster and ran no NAIC crosswalk.
          Company verification is the NDOI company lookup, which NDOI notes does not show surplus-lines insurers. The{' '}
          {fmtInt(s.legal_companies.national_legal_insurer_spine)} legal-insurer identities InsuranceTrustHub holds nationally are NAIC identities, not proof of Nevada authority.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Producers</h2>
        <p>
          NDOI states {fmtInt(lic.individual_licensees)} individual licensees ({fmtInt(lic.individual_resident)} resident,{' '}
          {fmtInt(lic.individual_non_resident)} non-resident) and that about {lic.producer_license_share_pct}% of all licensees
          hold a producer license. An individual licensee is a person; not every individual licensee is a producer, and a
          producer is not an agency. No producer roster was acquired and no producer names are published here. Verify an
          individual through the <Official href={s.regulator.license_lookup_url} label="NDOI agent lookup" /> or by NPN.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Agencies</h2>
        <p>
          NDOI states {fmtInt(lic.agency_licensees)} agency licensees: {fmtInt(lic.agency_resident)} resident and{' '}
          {fmtInt(lic.agency_non_resident)} non-resident firms. NDOI publishes producer and agency lists on its{' '}
          <Official href={s.regulator.self_serve_lists_url} label="self-serve reports site" />, by license or qualification type,
          with business email, address and phone. That site rejected automated access for this research, and no protection was
          bypassed, so no new agency list was acquired here.
        </p>
        <p>
          InsuranceTrustHub&apos;s existing Nevada agency directory comes from an earlier NDOI firm export. It showed{' '}
          {fmtInt(s.agency_roster.existing_nv_directory.verified_listings_observed)} verified listings when checked on{' '}
          {s.agency_roster.existing_nv_directory.observed_at.slice(0, 10)}. That is a directory layer on a different clock, not
          NDOI&apos;s agency census, and it is not compared with or added to the figure above. One agency can employ many
          licensed producers; producer relationships are not agencies.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Company authority</h2>
        <p>
          Nevada authorizes companies through different instruments: a Certificate of Authority, a Certificate of Registration
          (for example a foreign risk retention group), a Certificate of Approval or a Certificate of License. NDOI&apos;s{' '}
          <Official href={s.company_authority.instrument_source} label="company admission page" /> lists{' '}
          {s.company_authority.application_types_listed} application types, among them accredited reinsurers, fraternal benefit
          societies, HMOs, prepaid limited health service organizations, premium finance companies and motor clubs. These
          instruments are kept as NDOI names them and are not all &ldquo;licensed.&rdquo; A risk retention group registration is
          not a Certificate of Authority, an accredited reinsurer approval is not direct-writing authority, surplus-lines
          eligibility is not admitted status, and a captive is not a traditional insurer license.
        </p>
        <p>
          A company type is not proof the company currently writes homeowners, auto or workers&apos; compensation coverage in
          Nevada. No product-level authority source, including a workers&apos; compensation insurer lens, was acquired.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Enforcement</h2>
        <p>
          NDOI&apos;s <Official href={s.regulator.enforcements_url} label="Enforcements & Orders page" /> lists one current
          posting and no archive, and no archived copies of that page were found. It is kept as a standalone record:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Official href={order.source_document} label={`In the Matter of ${order.respondent_as_listed}`} />, Cause No.{' '}
            {order.cause_number}, {order.order_type_as_printed}, listed {order.listed_date}. The order says the respondent does
            not hold a Nevada third-party administrator certificate of registration; it is a business entity, not an insurer.
          </li>
        </ul>
        <p>
          The order prints no NAIC code, NPN or Nevada license number, so it is attached to no company, agency or producer.
          Nothing is attached by name. Orders before the current posting were not acquired; a public records request is the
          path for older orders.
        </p>
        <p>
          NDOI also lists {s.mhpaea_reports.company_reports} company draft reports under the Mental Health Parity and Addiction
          Equity Act on its <Official href={s.mhpaea_reports.page} label="Publications page" />. The list is kept as an index
          only. The reports were not parsed, a draft report is not a finding, and no NAIC code is attached.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Complaints</h2>
        <p>
          Consumers can <Official href={s.regulator.complaint_url} label="file a complaint with NDOI" />; an investigator is
          assigned. NDOI states that in fiscal year 2024 its Consumer Services section answered about{' '}
          {fmtInt(census.consumer_services_fy2024.inquiries_approximate)} inquiries and investigated{' '}
          {fmtInt(census.consumer_services_fy2024.complaints_investigated)} complaints. That is workload, not a count for any
          company.
        </p>
        <p>
          NDOI also publishes <Official href={s.regulator.complaint_data_url} label="consumer complaint data files" /> by calendar
          year. The 2022, 2023 and 2024 files were read. Each row is one complaint reason (a complaint can print several), so rows
          are not complaints, and calendar-year rows do not match the fiscal-year figure above. The respondent column is cut at
          30 characters, carries no NAIC code, NPN or complaint number, and names individual people as well as companies, so
          respondent names are not republished and no row is attached to an insurer or agent. A complaint is not an enforcement
          finding, and a complaint count is not a quality score. Files for 2015 through 2021 are published but were not read.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {years.map(([year, y]) => (
            <Metric
              key={year}
              value={fmtInt(y.complaint_reason_rows)}
              label={`Complaint-reason rows opened in ${year}`}
              hint={`${fmtInt(y.distinct_respondent_strings)} distinct respondent strings; ${fmtInt(y.rows_with_individual_name_format_respondent)} rows name an individual.`}
            />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <CountTable title="2024 by coverage type" counts={y2024.coverage_type} total={y2024.complaint_reason_rows} />
          <CountTable title="2024 by reason category" counts={y2024.reason_category} total={y2024.complaint_reason_rows} />
          <CountTable title="2024 by disposition" counts={y2024.disposition} total={y2024.complaint_reason_rows} />
        </div>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">SERFF filings</h2>
        <p>
          NDOI states that life, health, property and casualty rates, rules and forms filed with the Division are public through{' '}
          <Official href={s.regulator.serff_url} label="SERFF Filing Access for Nevada" />. This page links to that access; no
          filings were ingested. A filing is not a price quote, a rating or a recommendation.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Limitations</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>No combined Nevada insurance total. Insurers, captives, agencies and individuals are separate grains.</li>
          <li>Company, agency and producer bulk rosters: not acquired. Verification: NDOI lookup, search only.</li>
          <li>NDOI-stated figures: known, as of October 2024, quoted rather than counted.</li>
          <li>Enforcement: the one current posting. Earlier orders: not acquired. Name-only attachment: unsupported.</li>
          <li>Complaint data: 2022–2024 aggregates only. Respondent-level attachment: unsupported.</li>
          <li>Workers&apos; compensation and other product-authority lenses: not acquired.</li>
          <li>SERFF: filing access only. Public records: by request.</li>
          <li>Statewide only: no Las Vegas, Reno, Clark County or Washoe County intelligence routes.</li>
        </ul>
        <p>
          Generated {s.generated_at}. Retrieval time is not an enforcement date, a license effective date or a license
          expiration date.
        </p>
      </section>
    </div>
  );
}
