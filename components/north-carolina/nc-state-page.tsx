import Link from 'next/link';
import { fmtHero, fmtInt, type NorthCarolinaInsuranceSnapshot } from '@/lib/north-carolina-intelligence/snapshot';

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

export function NorthCarolinaInsurancePage({ snapshot }: { snapshot: NorthCarolinaInsuranceSnapshot }) {
  const s = snapshot;
  const ms = s.market_share;
  const a = s.licensing_actions;

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
          <li className="text-slate-800">North Carolina research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · North Carolina · statewide only
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">
          North Carolina Insurance Market &amp; Regulatory Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of North Carolina Department of Insurance licensing actions, 2025
          company market-share line activity, market-regulation and financial examination indexes, and
          current receivership estates. NCDOI is the regulator. A company is not an agency. An agency
          is not an individual producer. NAIC is not NPN. This is not a ranking, recommendation, or
          Trust Score. Licensed-company, agency, and producer bulk universes are search-only.
          Search-only is not zero.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Snapshot {s.version} · fingerprint {s.fingerprint.slice(0, 12)} · catalogs retrieved{' '}
          {s.retrieved_at}
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
            value={fmtInt(ms.homeowners_multiple_peril_rows)}
            label="2025 homeowners multiple peril company-line rows"
            hint="Year × legal insurer × source line. Written premium is not current authorization and not an agency product capability."
          />
          <Metric
            value="North Carolina"
            label="Statewide only"
            hint="No Charlotte, Raleigh, Mecklenburg, Wake, or other local insurance intelligence routes."
          />
        </div>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Regulator / authority</h2>
        <p>
          The <Official href={s.regulators.url} label="North Carolina Department of Insurance (NCDOI)" />{' '}
          licenses and oversees insurers, business entities, and producers. Company licensing,
          business-entity licensing, and individual producer lookup are separate official surfaces. A
          legal insurer is not an insurance agency. An insurance agency is not an individual producer.
          A producer is not an adjuster. NAIC company code is not NPN. An NC license number is not NPN
          unless the official source equates them.{' '}
          <Official href={s.regulators.sbs_lookup} label="NAIC SBS North Carolina licensee lookup" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Licensed companies</h2>
        <p>
          NCDOI Company Licensing and Registration publishes application and class pages (domestic,
          foreign, HMO, prepaid health plans, risk retention/purchasing groups, surplus lines,
          reinsurers). It does not publish a complete current downloadable legal-insurer roster in this
          extract. Market-share reporters, examination-report companies, domestics-only PDFs, and
          surplus-lines eligibility are not that census. Missing is not zero licensed companies.{' '}
          <Official href={s.regulators.company_licensing} label="Company Licensing and Registration" />.
        </p>
        <p>
          North Carolina-domiciled companies are a distinct cohort. The 2025 P&amp;C domestics
          market-share PDF lists {fmtInt(s.domestic_insurers.pc_market_share_2025_distinct_naic)} distinct
          NAIC identities with P&amp;C market activity. That is not the complete domestic insurer
          census and not statewide authorization.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Business entities / agencies</h2>
        <p>
          NCDOI licenses insurance business entities in source-native classes, including Corporation or
          Partnership, Surplus Lines Business Entity, Public Adjuster Business Entity, and limited
          licenses. Do not call every business entity an insurance agency. For the ordinary
          Corporation/Partnership business-entity license, North Carolina does not assign lines of
          authority to the entity license. Authority comes through licensed individual producers. A
          business-entity license is not homeowners, auto, or life authority. A designated responsible
          licensed producer is not the entire affiliated-producer roster.{' '}
          <Official
            href={s.regulators.business_entity_licensing}
            label="Obtain an Insurance Business License"
          />
          . Official verification remains{' '}
          <Official href={s.regulators.sbs_lookup} label="SBS lookup" />. Search-only is not zero.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Individual producers</h2>
        <p>
          Individual producers are persons. Preferred identity is NPN. No complete current statewide
          producer census was acquired. This page does not mass-publish individual producers. NPN and
          NC license number remain separate unless the official source equates them for a class.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">2025 company market share / premium</h2>
        <p>
          NCDOI publishes the 2025 annual market-share and premium report family ({fmtInt(ms.report_files)}{' '}
          source files). Company-line grain is year × legal insurer × source-native line. Parsed
          key-line PDFs: homeowners multiple peril {fmtInt(ms.homeowners_multiple_peril_rows)} rows /{' '}
          {fmtInt(ms.homeowners_distinct_naic)} distinct NAIC; federal flood {fmtInt(ms.federal_flood_rows)}{' '}
          / {fmtInt(ms.federal_flood_distinct_naic)}; private flood {fmtInt(ms.private_flood_rows)} /{' '}
          {fmtInt(ms.private_flood_distinct_naic)}; private-passenger auto company rows{' '}
          {fmtInt(ms.private_passenger_auto_company_rows)}; commercial auto company rows{' '}
          {fmtInt(ms.commercial_auto_company_rows)}; workers compensation {fmtInt(ms.workers_compensation_rows)}{' '}
          / {fmtInt(ms.workers_compensation_distinct_naic)}. Do not add those lines into one scale
          score. Written premium is not current authorization. Market share is not quality. A large
          premium volume is not the safest insurer. Zero reported premium is not unlicensed.{' '}
          <Official href={s.regulators.market_share} label="Market share and premium information" />.
        </p>
        <p>
          Company market activity can support research about companies writing a line. It cannot
          answer homeowners insurance agencies North Carolina. Company line ≠ agency product
          capability. SQA-009 product intent survives.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Licensing actions</h2>
        <p>
          NCDOI Licensing Actions catalog: {fmtInt(a.document_rows)} rows across 116 pages.
          Insurance Producer {fmtInt(a.producer_rows)}; Business Entity {fmtInt(a.business_entity_rows)};
          Public Adjuster plus Company/Independent Firm Adjuster {fmtInt(a.adjuster_rows)}; other
          source-native classes {fmtInt(a.other_rows)} (including bail-bond and collection-agency rows).
          Exact NPN on {fmtInt(a.exact_npn_rows)} rows. Distinct published docket numbers{' '}
          {fmtInt(a.distinct_dockets)}. Unique matters for the whole catalog remain unknown because
          undocketed rows cannot be collapsed defensibly. A row is not a unique matter. Voluntary
          surrender is not a criminal conviction. A fine is not a revocation. An order is not a
          complaint. Name-only attachment is unsafe. Exact profile attachments remain 0.{' '}
          <Official href={s.regulators.licensing_actions} label="NCDOI Licensing Actions" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Market-regulation examinations</h2>
        <p>
          NCDOI Market Regulation Examination Reports index: {fmtInt(s.market_conduct.document_rows)}{' '}
          reports / {fmtInt(s.market_conduct.distinct_titles)} distinct titles. A market exam is not a
          complaint, not a licensing action, and not a financial exam. Exam existence is not a fine.
          Names are not attached to insurer profiles. MCAS/scorecard ratios are informational and are
          not TrustHub ratings.{' '}
          <Official href={s.regulators.market_exams} label="Market Regulation Examination Reports" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Financial examinations</h2>
        <p>
          NCDOI Financial Examination Reports index: {fmtInt(s.financial_exams.document_rows)} reports /{' '}
          {fmtInt(s.financial_exams.distinct_titles)} distinct titles. A financial exam is solvency
          review, not market conduct and not enforcement. Exam existence is not insolvency. Exact NAIC
          attachments remain 0.{' '}
          <Official href={s.regulators.financial_exams} label="Financial Examination Reports" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Receivership / rehabilitation / liquidation</h2>
        <p>
          Current NCDOI receivership estate index names {fmtInt(s.receiverships.named_current_estates)}{' '}
          legal entities in {fmtInt(s.receiverships.accordion_groups)} accordion groups:{' '}
          Friday Health Plans of North Carolina, Inc. (receivership); Southland National Insurance
          Corporation, Colorado Bankers Life Insurance Company, and Bankers Life Insurance Company
          (liquidation) with Southland National Reinsurance Corporation (rehabilitation); North
          Carolina Mutual Life Insurance Company (liquidation). Rehabilitation is not liquidation.
          Liquidation is not administrative supervision. Historic receivership is not current
          authorization. Document hrefs ({fmtInt(s.receiverships.document_hrefs)}) are not the estate
          count. Name-only attachment is unsafe.{' '}
          <Official href={s.regulators.receiverships} label="Receiverships" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Surplus lines</h2>
        <p>
          Eligible U.S.-domiciled surplus-lines insurers are a separate universe from admitted
          companies. NCDOI points the eligible list to NAIC external lookup. Non-U.S. alien insurers
          are the NAIC IID quarterly listing, a further separate universe. A surplus-lines insurer is
          not a surplus-lines business entity. No complete free eligible-list dump was acquired.
          Search-only is not zero.{' '}
          <Official href={s.regulators.surplus_lines} label="Surplus Lines Insurers" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Complaints</h2>
        <p>
          NCDOI accepts consumer complaints. A complete public insurer-level complaint census was not
          acquired. Complaint intake is not a bulk census. Market-exam complaint templates are not a
          public complaint database. MCAS ratios are not a Trust Score. Missing is not zero complaints.{' '}
          <Official href={s.regulators.complaints} label="Assistance / complaints" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Identity and limits</h2>
        <p>
          Preferred insurer identity is NAIC when source-native. Preferred producer identity is NPN
          when source-native. No Trust Score. No AggregateRating. No Charlotte or Raleigh insurance
          intelligence pages. Homeowners and auto company market-share lines are not an agency
          product-capability cohort.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Insurer ≠ agency ≠ individual producer ≠ surplus lines.</li>
          <li>NAIC ≠ NPN. NC license ≠ NPN unless the source equates them.</li>
          <li>Business-entity license ≠ product line of authority.</li>
          <li>Company market-share line ≠ agency product capability.</li>
          <li>Licensing action ≠ complaint. Market exam ≠ financial exam.</li>
          <li>Receivership statuses are not interchangeable. Search-only ≠ zero.</li>
        </ul>
      </section>
    </div>
  );
}
