import Link from 'next/link';
import { fmtHero, fmtInt, type OregonInsuranceSnapshot } from '@/lib/oregon-intelligence/snapshot';

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

export function OregonInsurancePage({ snapshot }: { snapshot: OregonInsuranceSnapshot }) {
  const s = snapshot;
  const o = s.dfr_orders;
  const c = s.complaints;

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
          <li className="text-slate-800">Oregon research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · Oregon · statewide only
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">
          Oregon Insurance Market &amp; Regulatory Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of Oregon Division of Financial Regulation licensing paths, 2025
          insurer complaint tables, examination reports, and administrative orders. DFR is the
          regulator. NAIC SBS is the public license-status search. NIPR is licensing transaction
          infrastructure. This is not a ranking, recommendation, or Trust Score. Current agency,
          producer, and authorized-insurer bulk universes are search-only. Search-only is not zero.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Snapshot {s.version} · fingerprint {s.fingerprint.slice(0, 12)} · license universes
          search-only
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
            label="2025 DFR insurer-line complaint table rows"
            hint="Name-only. Premium is the published denominator. DFR Complaint Index is not a Trust Score. Not sorted best-to-worst."
          />
          <Metric value="Oregon" label="Statewide only" hint="No Portland, Multnomah, county, or city insurance intelligence routes." />
        </div>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Regulator / authority</h2>
        <p>
          The <Official href={s.regulators.url} label="Oregon Division of Financial Regulation (DFR)" />{' '}
          licenses and oversees insurers, agencies, and producers. DFR directs consumers to{' '}
          <Official href={s.regulators.sbs_lookup} label="NAIC State Based Systems (SBS)" /> to check
          Oregon license status. Applications and renewals commonly use{' '}
          <Official href={s.regulators.nipr} label="NIPR" />. SBS and NIPR are not the regulator.{' '}
          <Official href={s.regulators.check_license} label="DFR Check a license" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Insurers / companies</h2>
        <p>
          Current Oregon-authorized insurer bulk roster: <strong>not acquired</strong>. Official
          verification is SBS company lookup. Do not treat complaint tables, examination reports,
          domestic-insurer lists, or orders as that census. A 2022 domestic-insurer PDF is historical
          supporting context (source date February 1, 2022), not a current 2026 roster. Domestic ≠
          every insurer authorized in Oregon.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Agencies and individual producers</h2>
        <p>
          Oregon requires applicable business entities acting as insurance agencies to obtain an
          agency license. Sole proprietors are treated differently and are not silently combined with
          the agency business-entity license. Individual producers are people. DFR states that the
          National Producer Number is used as the Oregon insurance producer license number; that is
          not an insurer certificate-of-authority number. Bulk agency and producer rosters were not
          acquired. SBS remains search-only. License ≠ appointment. Line of authority ≠ appointment.
          Agency affiliation ≠ carrier appointment.{' '}
          <Official href={s.regulators.agencies} label="DFR insurance agencies guidance" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">2025 insurer complaint tables</h2>
        <p>
          DFR publishes insurer complaint tables by line for 2025: auto {fmtInt(c.line_rows.auto)}{' '}
          insurer rows / {fmtInt(c.line_total_complaints.auto)} total complaints; homeowners{' '}
          {fmtInt(c.line_rows.homeowners)} / {fmtInt(c.line_total_complaints.homeowners)}; health{' '}
          {fmtInt(c.line_rows.health)} / {fmtInt(c.line_total_complaints.health)}; life{' '}
          {fmtInt(c.line_rows.life)} / {fmtInt(c.line_total_complaints.life)}; annuities{' '}
          {fmtInt(c.line_rows.annuities)} / {fmtInt(c.line_total_complaints.annuities)}; long-term care{' '}
          {fmtInt(c.line_rows.long_term_care)} / {fmtInt(c.line_total_complaints.long_term_care)}. Across
          lines: {fmtInt(c.row_total)} insurer-line rows and {fmtInt(c.distinct_names)} distinct
          published names. Names are not NAIC identifiers, so exact profile attachments remain 0. A
          complaint is not a violation. Confirmed complaints are not automatically TrustHub misconduct
          findings. The source Complaint Index is Oregon DFR&apos;s metric, not a Trust Score, and is
          not reproduced as a ranking.{' '}
          <Official href={s.regulators.complaints} label="DFR complaint information" /> ·{' '}
          <Official href={s.regulators.complaint_compare} label="Complaint compare search" />.
        </p>
        <p>
          Separate statewide context: DFR Consumer Advocacy reported 3,452 insurance cases opened in
          2025. That aggregate is not insurer-level table evidence and is not attached to profiles.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Market-conduct examinations</h2>
        <p>
          Public market-conduct report index: {fmtInt(s.market_conduct.report_rows)} reports /{' '}
          {fmtInt(s.market_conduct.distinct_insurers)} distinct insurer names on the official page. An
          examination is not discipline. An exam report is not an administrative order. Exam existence
          is not a negative finding. Names are not attached to profiles.{' '}
          <Official href={s.regulators.exams} label="DFR examination reports" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Financial examinations</h2>
        <p>
          Public financial-exam report index: {fmtInt(s.financial_exams.report_rows)} reports /{' '}
          {fmtInt(s.financial_exams.distinct_insurers)} distinct insurer names. A financial exam is
          solvency/financial-compliance review, not market conduct and not enforcement. Do not add
          these rows to enforcement counts.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">DFR administrative orders</h2>
        <p>
          AdminOrders files in insurance-native DFRAction classes: {fmtInt(o.document_rows)} documents
          / {fmtInt(o.distinct_cases)} distinct case numbers (date range {String(o.dateMin).slice(0, 10)}{' '}
          to {String(o.dateMax).slice(0, 10)}). Largest classes: Marketplace violations{' '}
          {fmtInt(o.actions['Marketplace violations'])}, Producer {fmtInt(o.actions.Producer)},
          Financial-suspension {fmtInt(o.actions['Financial-suspension'])}. Mixed DFRAction buckets
          (Enforcement, Filing, Mortgage, Securities sales, Debt Management) are not this insurance
          census. A document is not a unique case. Name-only attachment is unsafe. Proposed ≠ final.
          Consent ≠ admission unless the source says so.{' '}
          <Official href={s.regulators.orders} label="Search DFR Notices and orders" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Receivership / supervision</h2>
        <p>
          Oregon DFR links companies in receivership to the NAIC GRID search. No Oregon-specific bulk
          receivership roster was acquired. Supervision orders in this AdminOrders extract (
          {fmtInt(s.receivership.supervision_order_rows)} extending/terminating supervision documents)
          are not a receivership census. Supervision ≠ receivership. Historical receivership ≠ current
          license status.{' '}
          <Official href={s.regulators.receivership} label="NAIC GRID" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Identity and limits</h2>
        <p>
          Preferred producer identity is NPN when source-native. Preferred insurer identity is NAIC
          when source-native. Directory rows with an Oregon address are not the licensed-agency
          census. No Trust Score. No AggregateRating. No Portland or Multnomah intelligence pages.
          SERFF rate/form filings are a future research path, not adverse evidence and not proof of
          current authorization.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Insurer ≠ agency ≠ individual producer.</li>
          <li>License ≠ appointment. Line of authority ≠ appointment.</li>
          <li>Complaint ≠ violation. Complaint index ≠ Trust Score.</li>
          <li>Market-conduct exam ≠ discipline. Financial exam ≠ enforcement.</li>
          <li>Document ≠ regulatory matter. Search-only ≠ zero.</li>
        </ul>
      </section>
    </div>
  );
}
