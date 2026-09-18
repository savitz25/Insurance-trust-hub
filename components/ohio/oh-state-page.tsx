import Link from 'next/link';
import { fmtHero, fmtInt, type OhioInsuranceSnapshot } from '@/lib/ohio-intelligence/snapshot';

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

export function OhioInsurancePage({ snapshot }: { snapshot: OhioInsuranceSnapshot }) {
  const s = snapshot;
  const a = s.authorized_companies;
  const ag = s.agency_roster;
  const j = s.journal;

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
          <li className="text-slate-800">Ohio research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · Ohio · statewide only
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">
          Ohio Insurance Licensing &amp; Regulatory Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of Ohio Department of Insurance authorized legal insurers, Major
          Lines business-entity mailing lists, and the Administrative Actions Journal. ODI is the
          regulator. A legal insurer is not an insurance agency. An insurance agency is not an
          individual agent. NAIC is not NPN. Authorized is not domestic. This is not a ranking,
          recommendation, or Trust Score. Missing or search-only is not zero.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Snapshot {s.version} · fingerprint {s.fingerprint.slice(0, 12)} · authorized list retrieved{' '}
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
            value={fmtInt(ag.union_distinct_npn)}
            label="Major Lines business-entity NPNs (resident + non-resident)"
            hint="Resident and non-resident mailing lists are separate official filters (overlap 0). This is not agents and not every ODI license type."
          />
          <Metric
            value={fmtInt(j.document_rows)}
            label={s.hero.actions_label}
            hint={s.hero.actions_hint}
          />
          <Metric
            value="Ohio"
            label="Statewide only"
            hint="This page does not add Columbus, Cleveland, Cincinnati, Toledo, Dayton, or Akron insurance intelligence routes."
          />
        </div>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Regulator / authority</h2>
        <p>
          The <Official href={s.regulators.url} label="Ohio Department of Insurance (ODI)" /> licenses
          and oversees insurers, agencies, and agents. Company Search, Agent/Agency Mailing Lists, the
          Agent / Agency Locator, and the Administrative Actions Journal are separate official
          surfaces. A legal insurer is not an insurance agency. An insurance agency is not an
          individual agent. NAIC company code is not NPN. An Ohio license number is not NPN unless
          the official source equates them for a specific field.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Authorized companies</h2>
        <p>
          ODI Company Search publishes a complete current authorized-company Excel (AuthList). This
          extract counts {fmtInt(a.distinct_naic)} distinct NAIC codes / {fmtInt(a.rows)} rows, with{' '}
          {fmtInt(a.rows_missing_naic)} rows missing NAIC. Source file {a.source_filename}, source as
          of {a.source_as_of}. Authorized is not domestic. A NAIC code is not an NPN. Financial data
          is not authorization or quality.{' '}
          <Official href={s.regulators.auth_list} label="Download ODI authorized company list" />.
        </p>
        <p>
          Source-native types on that list: PC {fmtInt(a.types.PC)}; LIFE {fmtInt(a.types.LIFE)}; FR{' '}
          {fmtInt(a.types.FR)}; HIC {fmtInt(a.types.HIC)}; TI {fmtInt(a.types.TI)}; RE {fmtInt(a.types.RE)};
          MPP {fmtInt(a.types.MPP)}; MEWA {fmtInt(a.types.MEWA)}; CUSG {fmtInt(a.types.CUSG)}. Do not add
          those types into one quality score.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Domestic company cohort</h2>
        <p>
          Ohio-domiciled companies are the AuthList rows with domicile OH: {fmtInt(s.domestic_insurers.distinct_naic)}{' '}
          distinct NAIC identities. Domestic is a subset of authorized, not a second insurer universe
          and not a ranking.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Agencies / business entities</h2>
        <p>
          ODI Agent/Agency Mailing Lists can generate a statewide Business Entity report. Residence
          Type is a required single-select. Line of Authority Type is required; the export does not
          include an LOA column — LOA evidence is the source-native report filter. Major Lines
          business-entity NPNs: resident {fmtInt(ag.resident_distinct_npn)}; non-resident{' '}
          {fmtInt(ag.nonresident_distinct_npn)}; certified {fmtInt(ag.certified_distinct_npn)}; union{' '}
          {fmtInt(ag.union_distinct_npn)} (overlap {fmtInt(ag.residence_overlap_npn)}). This is not
          individual agents, not legal insurers, and not every ODI license type (title, surplus-lines
          entity, TPA, and similar classes are separate).{' '}
          <Official href={s.regulators.mailing_list} label="ODI Agent/Agency Mailing Lists" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Agents / producers</h2>
        <p>
          Individual producers are persons. Preferred identity is NPN. The Agent / Agency Locator is
          live search and requires a last name or NPN (and a captcha). A complete current statewide
          individual roster is not mass-published here. Search-only is not zero. NPN is not NAIC. An
          Ohio license number is not NPN unless the official source equates them.{' '}
          <Official href={s.regulators.agent_locator} label="ODI Agent / Agency Locator" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Line of authority / consumer products</h2>
        <p>
          Official mailing-list Line of Authority options include Life and Accident &amp; Health.
          They do not include Homeowners or Auto (Auto Rental is a different limited line). There is
          no Flood LOA. A Property, Casualty, or Personal authority does not prove the agency
          currently sells every P&amp;C product. Phrase this as licensing authority, not current
          product inventory.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>
            Life licensing authority (Business Entity + Major Lines + Life filter): union{' '}
            {fmtInt(s.line_of_authority.life.union_distinct_npn)} NPNs.
          </li>
          <li>
            Accident &amp; Health licensing authority (same entity/license type + Accident &amp;
            Health filter): union {fmtInt(s.line_of_authority.accident_and_health.union_distinct_npn)}{' '}
            NPNs.
          </li>
          <li>Homeowners and auto agency product queries stay unsupported on LOA evidence.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Administrative Actions Journal</h2>
        <p>
          The ODI Journal is the official record of certain administrative actions. ODI warns that
          search results may not be comprehensive and that the Journal does not include most agent
          continuing education (CE) noncompliance actions. Documents dated before April 24, 2026 can
          be viewed directly; later documents require an email request. This extract harvested a
          bounded past-12-months metadata catalog: {fmtInt(j.document_rows)} documents (
          {fmtInt(j.orders)} Order / {fmtInt(j.notices)} Notice), {fmtInt(j.exact_id_rows)} rows with
          an Individual or Org ID. Unique matters remain unknown. A document is not a unique matter.
          Person-name-only rows {fmtInt(j.person_name_only_rows)}; company-name-only rows{' '}
          {fmtInt(j.company_name_only_rows)}. Journal Company Name is not a source-native agency vs
          legal-insurer class, so those grains stay unsplit. Exact profile attachments remain 0. The
          Journal is not a complete adverse census.{' '}
          <Official href={s.regulators.journal} label="ODI Administrative Actions Journal" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Annual financial data</h2>
        <p>
          A complete Annual Financial Data export was not acquired as a bulk table. Per-company
          statement PDFs exist on ODI&apos;s legacy FRAnnuals path and are supporting evidence, not
          the authorized-company census. Financial data is not authorization or quality. A financial
          table rank is not a TrustHub ranking. Missing is not zero financial statements.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Complaints / exams / receivership / surplus lines</h2>
        <p>
          ODI accepts consumer complaints. Complaint intake is not a complaint census. Examination
          reports and receivership/liquidation estates were not acquired as complete public catalogs
          in this extract. Surplus-lines eligible insurers are a separate universe from admitted
          authorized companies. ODI also publishes a certified-reinsurers spreadsheet (
          {fmtInt(s.surplus_lines.certified_reinsurers_xls_rows)} name-bearing rows, no NAIC in the
          file) that is not the surplus-lines eligible list. Search-only is not zero.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Identity and limits</h2>
        <p>
          Preferred insurer identity is NAIC when source-native. Preferred agency and producer
          identity is NPN when source-native. No Trust Score. No AggregateRating. No ranking.
          Columbus and Cleveland queries stay statewide on this page.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Legal insurer ≠ agency ≠ individual agent.</li>
          <li>NAIC ≠ NPN. Ohio license ≠ NPN unless the source equates them.</li>
          <li>Authorized ≠ domestic.</li>
          <li>Agency LOA evidence must be source-native (mailing-list filter).</li>
          <li>Financial data ≠ authorization or quality.</li>
          <li>Administrative Actions Journal warns it is not comprehensive.</li>
          <li>Complaint intake ≠ complaint census. Missing/search-only ≠ zero.</li>
        </ul>
      </section>
    </div>
  );
}
