import Link from 'next/link';
import { fmtHero, fmtInt, type PennsylvaniaInsuranceSnapshot } from '@/lib/pennsylvania-intelligence/snapshot';

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
      className="font-medium text-[#0284C7] underline underline-offset-2"
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}

export function PennsylvaniaInsurancePage({ snapshot }: { snapshot: PennsylvaniaInsuranceSnapshot }) {
  const s = snapshot;
  const c = s.complaints;
  const p = s.company_lookup.power_counts;

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
          <li className="text-slate-800">Pennsylvania research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · Pennsylvania · statewide only
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">
          Pennsylvania Insurance Market &amp; Regulatory Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of Pennsylvania Insurance Department licensed companies, surplus-lines
          eligibility, 2025 complaint comparison tables, enforcement and market-conduct catalogs,
          financial examination reports, and liquidation/rehab/discharge. PID is the regulator. This is
          not a ranking, recommendation, or Trust Score. Agency and producer bulk universes are
          search-only. Search-only is not zero.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Snapshot {s.version} · fingerprint {s.fingerprint.slice(0, 12)} · company information current
          as of {s.company_lookup.source_as_of}
        </p>
      </header>

      <section aria-labelledby="hero-metrics" className="mt-8">
        <h2 id="hero-metrics" className="sr-only">
          Snapshot metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            value={fmtHero(s.hero.universe_value)}
            label={s.hero.universe_label}
            hint={s.hero.universe_hint}
          />
          <Metric
            value={fmtInt(s.hero.actions_value)}
            label={s.hero.actions_label}
            hint={s.hero.actions_hint}
          />
          <Metric
            value={fmtInt(c.row_total)}
            label="2025 PID complaint comparison insurer-line rows"
            hint="Name-only. Premium is the published denominator. PID Complaint Index is not a Trust Score. A complaint is not a finding."
          />
          <Metric
            value="Pennsylvania"
            label="Statewide only"
            hint="No Philadelphia, Pittsburgh, county, or city insurance intelligence routes."
          />
        </div>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Regulator / authority</h2>
        <p>
          The <Official href={s.regulators.url} label="Pennsylvania Insurance Department (PID)" /> licenses
          and oversees insurers, agencies, and producers. Company lookup, business-entity lookup, and
          individual lookup are separate official surfaces. A company is not an agency. An agency is not
          an individual producer. NAIC is not NPN. A Pennsylvania producer license number is not NPN
          unless the source says so.{' '}
          <Official href={s.regulators.search_tools} label="PID search tool library" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Licensed companies</h2>
        <p>
          PID Licensed Company Search A–Z: {fmtInt(s.company_lookup.distinct_naic)} distinct NAIC
          identities ({fmtInt(s.company_lookup.count)} letter rows; {fmtInt(s.company_lookup.pa_domicile_distinct_naic)}{' '}
          Pennsylvania-domicile). Identity is the 5-digit NAIC company code. Company information is
          current as of {s.company_lookup.source_as_of}. PID notes the list is normally refreshed
          weekly; weekly cadence is not the source-as-of date. This census is not agencies, not
          producers, not surplus lines, and not the liquidation catalog. This page does not auto-publish
          insurer profiles from the census.{' '}
          <Official href={s.regulators.company_lookup} label="PID Licensed Company Search" />.
        </p>
        <p>
          Source-native company powers (not consumer products): Accident and Health {fmtInt(p['Accident and Health'])};{' '}
          Life and Annuities {fmtInt(p['Life and Annuities'])}; Auto Liability {fmtInt(p['Auto Liability'])}; Property
          and Allied Lines {fmtInt(p['Property and Allied Lines'])}; Workers Compensation{' '}
          {fmtInt(p['Workers Compensation'])}; HMO Authority {fmtInt(p['HMO Authority'])}; Title {fmtInt(p.Title)}.
          Property and Allied Lines is not homeowners. Auto Liability is not a consumer auto-agency
          product cohort.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Agencies and individual producers</h2>
        <p>
          Licensed Business Entity Search and Licensed Individual Search require a name, city, or
          license number. No complete bulk roster was acquired. Search-only is not zero. License
          information is current as of Wednesday, September 16, 2026. An agency is not an insurer. An
          individual producer is not an agency. License ≠ appointment.{' '}
          <Official href={s.regulators.agency_lookup} label="Business entity search" /> ·{' '}
          <Official href={s.regulators.producer_lookup} label="Individual search" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Surplus lines</h2>
        <p>
          Eligible surplus-lines companies: {fmtInt(s.surplus_lines.distinct_naic)} distinct NAIC
          identities. Surplus lines is not the admitted licensed-company census.{' '}
          <Official href={s.regulators.surplus_lines} label="Eligible Surplus Lines Company Search" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">2025 complaint comparison tables</h2>
        <p>
          PID Complaint Comparison Tool, reporting year 2025: Accident and Health {fmtInt(c.line_rows['Accident and Health'])}{' '}
          insurer rows / {fmtInt(c.line_total_complaints['Accident and Health'])} complaints; Auto{' '}
          {fmtInt(c.line_rows.Auto)} / {fmtInt(c.line_total_complaints.Auto)}; Homeowners{' '}
          {fmtInt(c.line_rows.Homeowners)} / {fmtInt(c.line_total_complaints.Homeowners)}; Life{' '}
          {fmtInt(c.line_rows.Life)} / {fmtInt(c.line_total_complaints.Life)}; Annuity{' '}
          {fmtInt(c.line_rows.Annuity)} / {fmtInt(c.line_total_complaints.Annuity)}; Title{' '}
          {fmtInt(c.line_rows.Title)} / {fmtInt(c.line_total_complaints.Title)}. Across lines:{' '}
          {fmtInt(c.row_total)} insurer-line rows, {fmtInt(c.distinct_names)} distinct published names,{' '}
          {fmtInt(c.sum_complaints)} published complaints. Names are not NAIC identifiers, so exact
          profile attachments remain 0. A complaint is not a violation and not an enforcement action.
          The source Complaint Index uses published premium as the denominator and is not a Trust Score.
          Tables are not sorted best-to-worst.{' '}
          <Official href={s.regulators.complaints} label="Complaint Comparison Tool" /> ·{' '}
          <Official href={s.regulators.file_complaint} label="File a complaint" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Enforcement catalog</h2>
        <p>
          PID Insurance-Regulatory Actions hub: {fmtInt(s.enforcement.document_rows)} documents, of which{' '}
          {fmtInt(s.enforcement.enforcement_actions)} are Enforcement Actions,{' '}
          {fmtInt(s.enforcement.market_conduct_actions)} are Market Conduct Actions, and{' '}
          {fmtInt(s.enforcement.ccrc_reports)} are CCRC Reports. Unique titles {fmtInt(s.enforcement.unique_titles)}.
          No source-native NAIC or docket field was populated, so unique regulatory matters remain
          unknown and exact profile attachments remain 0. Company enforcement cannot be split from
          producer enforcement without those identifiers. CCRC reports are not company enforcement. A
          document is not a unique matter. Name-only attachment is unsafe.{' '}
          <Official href={s.regulators.enforcement} label="Enforcement Actions Search" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Market-conduct examinations</h2>
        <p>
          Source facet Market Conduct Actions: {fmtInt(s.market_conduct.document_rows)} documents in the
          same regulatory-actions hub. An examination is not discipline. Market conduct is not an
          Enforcement Actions document and not a financial exam. Exam existence is not a negative
          finding. Names are not attached to profiles.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Financial examinations</h2>
        <p>
          PID financial examination report index: {fmtInt(s.financial_exams.document_rows)} documents /{' '}
          {fmtInt(s.financial_exams.unique_titles)} unique titles. NAIC was not populated on the index, so
          company↔exam exact bridges remain 0. A financial exam is solvency/financial-compliance review,
          not market conduct and not enforcement. Do not add these rows to enforcement counts.{' '}
          <Official href={s.regulators.financial_exams} label="Financial Examination Reports" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Liquidation / rehabilitation / discharge</h2>
        <p>
          PID liquidated, rehabilitated, and discharged catalog: {fmtInt(s.liquidation.document_rows)}{' '}
          documents ({fmtInt(s.liquidation.statuses.Liquidation)} liquidation,{' '}
          {fmtInt(s.liquidation.statuses.Discharged)} discharged,{' '}
          {fmtInt(s.liquidation.statuses.Rehabilitation)} rehabilitation). This catalog is not the current
          licensed-company census. Rehabilitation is not liquidation. Discharge is not current license
          status. Names are not NAIC attachments.{' '}
          <Official href={s.regulators.liquidation} label="Liquidated, Rehabilitated and Discharged Companies" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Other specialized classes</h2>
        <p>
          Continuing-care retirement communities, TPAs, premium-finance agencies, qualified unlicensed
          reinsurers, risk retention/purchasing groups, and viatical settlement providers are separate
          PID search tools. They are not added into the licensed-company total. CCRC reports in the
          enforcement hub ({fmtInt(s.enforcement.ccrc_reports)}) are not company enforcement.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Identity and limits</h2>
        <p>
          Preferred insurer identity is NAIC when source-native. Preferred producer identity is NPN when
          source-native. No Trust Score. No AggregateRating. No Philadelphia or Pittsburgh insurance
          intelligence pages. Homeowners and auto are consumer products; they are not PID company powers
          and are not an agency line-of-authority cohort in this extract.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Insurer ≠ agency ≠ individual producer ≠ surplus lines.</li>
          <li>License ≠ appointment. NAIC ≠ NPN. Pennsylvania license ≠ NPN.</li>
          <li>Complaint ≠ violation. Complaint Index ≠ Trust Score. Complaint ≠ enforcement.</li>
          <li>Market-conduct exam ≠ discipline. Financial exam ≠ enforcement.</li>
          <li>Liquidation/rehab/discharge ≠ current licensed-company census.</li>
          <li>Search-only ≠ zero. Name-only attachment is unsafe.</li>
        </ul>
      </section>
    </div>
  );
}
