import Link from 'next/link';
import { Trace } from '@/components/new-jersey/trace';
import {
  fmtHero,
  fmtInt,
  type ColoradoInsuranceSnapshot,
} from '@/lib/colorado-intelligence/snapshot';

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

export function ColoradoInsurancePage({ snapshot }: { snapshot: ColoradoInsuranceSnapshot }) {
  const s = snapshot;
  const d = s.statistical_report.naic_companies_tab;
  const sl = s.surplus_lines;

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
          <li className="text-slate-800">Colorado research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · Colorado
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">
          Colorado Insurance Market &amp; Regulatory Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of Colorado Division of Insurance verification paths, the dated 2025
          statistical-report company directory, surplus-lines eligibility, domestic certificates,
          SERFF filing search, and disciplinary lookup. This is not a ranking, recommendation, or
          Trust Score. Producer and agency lists are search-only. The statistical report is not a
          live insurer roster.
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
            value={fmtHero(s.hero.universe_value)}
            label={`Universe · ${s.hero.universe_label}`}
            hint={s.hero.universe_hint}
          />
          <Metric
            value={String(s.hero.current_value)}
            label={`Current · ${s.hero.current_label}`}
            hint={s.hero.current_hint}
          />
          <Metric
            value={fmtHero(s.hero.observations_value)}
            label={`Observations · ${s.hero.observations_label}`}
            hint={s.hero.observations_hint}
          />
          <Metric
            value={String(s.hero.geography_value)}
            label={`Geography · ${s.hero.geography_label}`}
            hint={s.hero.geography_hint}
          />
          <Metric
            value={String(s.hero.as_of_value)}
            label={`As-of · ${s.hero.as_of_label}`}
            hint={s.hero.as_of_hint}
          />
        </div>
        <Trace
          source={s.statistical_report.xlsx_url}
          sourceDate="2025-12-31 (report published August 2026; retrieved 2026-09-09)"
          denominator="NAIC Companies tab company rows after excluding the statement-type legend"
          calculation="1,840 nonempty rows − 1 legend row = 1,839 company directory rows = 1,839 distinct NAIC CoCodes."
          grain="dated statistical-report directory row"
          coverage="ACQUIRED as a 2025 market report, not current authorization"
          caveat={s.statistical_report.naic_companies_tab.note}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Who regulates Colorado insurance?</h2>
        <p className="mt-2 text-sm text-slate-600">
          {s.regulators.doi.name} ({s.regulators.doi.parent}) regulates {s.regulators.doi.covers} A
          producer is not an agency. An agency is not an insurer. A plan is not an insurer. NAIC
          CoCode is not NPN. Domicile is not Colorado authority.
        </p>
        <div className="mt-4 min-w-0 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <caption className="sr-only">Colorado insurance credential classes.</caption>
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3" scope="col">
                  Class
                </th>
                <th className="py-2 pr-3" scope="col">
                  Identity
                </th>
                <th className="py-2 pr-3" scope="col">
                  Establishes
                </th>
                <th className="py-2" scope="col">
                  Does not establish
                </th>
              </tr>
            </thead>
            <tbody>
              {s.regulators.entity_classes.map((row) => (
                <tr key={row.class} className="border-b border-slate-100 align-top">
                  <th className="py-2 pr-3 font-medium text-slate-800" scope="row">
                    {row.class}
                  </th>
                  <td className="py-2 pr-3">{row.id}</td>
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
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          {s.findings.map((f) => (
            <li key={f.id}>
              <strong>{f.title}.</strong> {f.summary} This does not mean {f.doesNotMean.join('; ')}.
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">How to verify an insurer, agency, or producer</h2>
        <p className="mt-2 text-sm text-slate-600">{s.verify.explains}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            <Official href={s.verify.company} label="Sircon consumer license inquiry" /> — live
            official verification. Not scraped. Not a TrustHub shadow directory.
          </li>
          <li>
            DOI producer page:{' '}
            <Official href={s.source_access.producer_agency_lookup.doi_page} label="For producers / agents" />
          </li>
          <li>
            Existing InsuranceTrustHub{' '}
            <Link href="/carriers" className="font-medium text-[#0284C7] underline underline-offset-2">
              carrier research
            </Link>{' '}
            and{' '}
            <Link href="/directory" className="font-medium text-[#0284C7] underline underline-offset-2">
              directory
            </Link>{' '}
            are national graph tools plus DOI verification — not a Colorado roster substitute.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">2025 statistical report</h2>
        <p className="mt-2 text-sm text-slate-600">
          Official source as of {s.statistical_report.source_as_of}, published {s.statistical_report.published_at},
          retrieved {s.statistical_report.retrieved_at}. {d.note}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric
            value={fmtInt(d.company_directory_rows)}
            label="NAIC Companies directory rows"
            hint="Not “1,839 Colorado insurance companies.” Not current authorization."
          />
          <Metric
            value={fmtInt(d.distinct_naic)}
            label="Distinct NAIC CoCodes on that tab"
            hint="1:1 with directory rows after excluding the legend."
          />
          <Metric
            value={fmtInt(d.colorado_domicile_distinct_naic)}
            label="DOM=CO rows on that tab"
            hint="Domicile is not Colorado authority and not the certificates subset."
          />
          <Metric
            value={fmtInt(s.statistical_report.companies_by_group_tab.data_rows)}
            label="Companies by Group overlay rows"
            hint="Grouping overlay, not a second insurer universe."
          />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          The official PDF narrative of premium written to 1,844 companies is a different grain and
          is not used as a headline. Line tabs are per-line market observations; summing every tab is
          not an insurer count. Non-NAIC and pre-need tabs are different grains.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.statistical_report.landing_url} label="Colorado Insurance Industry Statistical Report" />
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">What TrustHub does not have as a roster</h2>
        <p className="mt-2 text-sm text-slate-600">{s.producer_roster.caveat}</p>
        <p className="mt-2 text-sm text-slate-600">{s.agency_roster.caveat}</p>
        <p className="mt-2 text-sm text-slate-600">{s.authorized_insurers.caveat}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric
            value="SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY"
            label="CO_PRODUCER_BULK_ROSTER"
            hint="Restricted/search-only is not zero."
          />
          <Metric
            value="SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY"
            label="CO_AGENCY_BULK_ROSTER"
            hint="Missing is not zero. Search-only is not zero."
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Domestic certificates of compliance</h2>
        <p className="mt-2 text-sm text-slate-600">{s.domestic_certificates.caveat}</p>
        <p className="mt-2 text-sm text-slate-600">{s.domestic_certificates.reconciliation}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric
            value={fmtInt(s.domestic_certificates.named_company_entries)}
            label="Named certificate-of-compliance company entries"
            hint="Not a document-link count. Not all authorized insurers."
          />
          <Metric
            value={fmtInt(s.domestic_certificates.company_document_links)}
            label="Company document links"
            hint="45 DOI PDFs + 4 Google Drive. The 50th list-item href is the Title Agencies heading."
          />
        </div>
        <p className="mt-2 text-sm">
          <Official href={s.domestic_certificates.url} label="Certificates of compliance" />
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Eligible non-admitted surplus-lines list</h2>
        <p className="mt-2 text-sm text-slate-600">{sl.caveat}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric
            value={fmtInt(sl.eligible_identities)}
            label="2026–2027 eligible identities"
            hint="Effective 2026-07-01 through 2027-06-30. Not admitted. Not producers."
          />
          <Metric value={fmtInt(sl.naic_cocode_identities)} label="NAIC CoCode identities" />
          <Metric
            value={fmtInt(sl.alien_aa_identities)}
            label="Alien AA- identities"
            hint="Alien AA- is not a NAIC CoCode."
          />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          The prior 2025–2026 list ({fmtInt(sl.prior_2025_2026_list.eligible_identities)} identities, effective{' '}
          {sl.prior_2025_2026_list.effective_from} through {sl.prior_2025_2026_list.effective_through}) is a historical
          eligibility snapshot. An expired period is not current eligibility, and a missing later list would not be
          zero insurers.
        </p>
        <Trace
          source={sl.url}
          sourceDate={`effective ${sl.effective_from} through ${sl.effective_through}; updated ${sl.updated_at}`}
          denominator="Official 2026–2027 eligible non-admitted insurer list rows"
          calculation="225 NAIC CoCodes + 34 alien AA- identities = 259 distinct eligible identities. No duplicate IDs."
          grain="surplus-lines eligibility identity"
          coverage="ACQUIRED for the list's effective window"
          caveat={sl.caveat}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Title</h2>
        <p className="mt-2 text-sm text-slate-600">{s.title.caveat}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Disciplinary actions and insurer enforcement</h2>
        <p className="mt-2 text-sm text-slate-600">{s.disciplinary_actions.caveat}</p>
        <p className="mt-2 text-sm text-slate-600">
          Name-only attach is {s.disciplinary_actions.name_only}. Name+city is{' '}
          {s.disciplinary_actions.name_plus_city}. Disciplinary is not conviction. Producer
          disciplinary is not insurer enforcement. An order is not an examination.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.disciplinary_actions.url} label="Agent, producer, and agency disciplinary actions" />
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Examinations</h2>
        <p className="mt-2 text-sm text-slate-600">{s.market_conduct_exams.caveat}</p>
        <p className="mt-2 text-sm text-slate-600">{s.financial_exams.caveat}</p>
        <p className="mt-2 text-sm text-slate-600">
          Market conduct is not enforcement. A financial exam is not insolvency. Unknown is not zero.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>
            <Official href={s.market_conduct_exams.url} label="Market-conduct examinations" />
          </li>
          <li>
            <Official href={s.financial_exams.url} label="Financial examinations" />
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Rate and form filings</h2>
        <p className="mt-2 text-sm text-slate-600">
          {s.rate_filings.RATE_FILINGS}. A rate filing is not a consumer quote, not insurer quality,
          and not an approval unless the source-native status says so. SERFF is not scraped
          query-by-query to manufacture a statewide filing denominator.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.rate_filings.url} label="SERFF Filing Access (Colorado)" />
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Complaints</h2>
        <p className="mt-2 text-sm text-slate-600">
          Colorado DOI publishes annual complaint-and-recoveries reports and a source-native Complaint
          Ratio / Complaint Index. Complaint Ratio and Complaint Index are regulator-published
          comparative measures. They are not a TrustHub score, ranking, best/worst label, or quality
          grade. DOI calculates both from all received complaints, not confirmed-only. Total
          complaints are not confirmed complaints. A complaint is not a violation. A confirmed
          complaint is not a conviction. Zero complaints in one year and line is not a universal
          clean history.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric
            value={`$${fmtInt(s.complaints.annual.recoveries_total_usd)}`}
            label="FY 2024-25 recoveries"
            hint="Money restored to consumers. Recoveries are not fines and not a consumer-loss total."
          />
          <Metric
            value={fmtInt(s.complaints.standard_ratio_index.company_line_rows)}
            label="2025 standard ratio/index company-line rows"
            hint="Bounded official tables (5+ complaints or 0.1% premium share). Not a TrustHub ranking."
          />
        </div>
        <Trace
          source={s.complaints.annual.url}
          sourceDate="FY 2024-25 (July 2024 - June 2025); news release 2025-11-19"
          denominator="DOI annual recoveries, not a complaint-only count"
          calculation="Colorado DOI reports $17,607,341 in total recoveries. The two published line amounts shown here are $10,430,250 for property/casualty and $7,176,838 for life/health, which sum to $17,607,088; the $253 difference is not attributed to either displayed line in this extraction. The 7,792 closed figure mixes complaints and inquiries (including 222 inquiries) and is not a complaint-only total."
          grain="dated annual recoveries aggregate"
          coverage="ACQUIRED as report-level aggregates"
          caveat={s.complaints.annual.note}
        />
        <p className="mt-3 text-sm text-slate-600">
          Standard 2025 tables have NAIC CoCodes on official company-detail links. Read-only exact
          NAIC matches are not graph enrichment and are not public profile attachments. Name-only
          attach remains unsafe. A parenthetical alias/DBA on a company label is not an identity key.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>
            <Official href={s.complaints.landing_url} label="Insurance Complaint Reports" />
          </li>
          <li>
            <Official href={s.complaints.standard_ratio_index.url} label="Standard Complaint Ratio / Index reports" />
          </li>
          <li>
            <Official href={s.complaints.interactive_ratio_index.url} label="Interactive Complaint Ratio / Index" />{' '}
            (search only; not scraped)
          </li>
          <li>
            <Official href={s.complaints.file_a_complaint.url} label="File a complaint" />
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Federal overlay</h2>
        <p className="mt-2 text-sm text-slate-600">{s.federal_overlays.note}</p>
        <Metric
          value={s.federal_overlays.cms_marketplace_colorado_projection}
          label="CMS Marketplace Colorado projection"
          hint="Marketplace participation is not Colorado DOI authority and is not a recommendation."
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Expansion ledger</h2>
        <p className="mt-2 text-sm text-slate-600">{s.expansion_ledger.note}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric value={fmtInt(s.expansion_ledger.NET_NEW_CANONICAL_LEGAL_INSURERS)} label="Net-new canonical legal insurers" />
          <Metric value={fmtInt(s.expansion_ledger.NET_NEW_PUBLIC_PROFILES)} label="Net-new public profiles" />
          <Metric value={fmtInt(s.expansion_ledger.NEW_MARKET_OBSERVATION_ROWS)} label="New market observation rows (snapshot)" />
          <Metric value={fmtInt(s.expansion_ledger.NEW_SURPLUS_LINES_ROWS)} label="New surplus-lines rows (snapshot)" />
          <Metric
            value={fmtInt(s.expansion_ledger.EXACT_STATISTICAL_NAIC_MATCHES)}
            label="Exact statistical NAIC matches (read-only)"
            hint="Exact identity match is not graph enrichment."
          />
          <Metric
            value={fmtInt(s.expansion_ledger.NEW_COMPLAINT_ROWS)}
            label="New 2025 standard complaint-report rows (snapshot)"
            hint="Company × line observations. Not legal-insurer identities."
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Gaps</h2>
        <p className="mt-2 text-sm text-slate-600">
          Unknown is not zero. Search-only is not zero. Request-only is not zero. No CORA request was
          filed to enlarge this ticket.
        </p>
        <div className="mt-4 min-w-0 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3" scope="col">
                  Class
                </th>
                <th className="py-2" scope="col">
                  Items
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(s.gaps).map(([cls, items]) => (
                <tr key={cls} className="border-b border-slate-100 align-top">
                  <th className="py-2 pr-3 font-medium text-slate-800" scope="row">
                    {cls}
                  </th>
                  <td className="py-2">{items.length ? items.join('; ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Semantic guardrails</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {s.semantic_guardrails.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-slate-600">
          No Trust Score. No paid ranking. No Denver or county insurance pages.
        </p>
      </section>
    </div>
  );
}
