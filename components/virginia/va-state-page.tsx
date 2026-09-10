import Link from 'next/link';
import { fmtInt, type VirginiaInsuranceSnapshot } from '@/lib/virginia-intelligence/snapshot';

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

export function VirginiaInsurancePage({ snapshot }: { snapshot: VirginiaInsuranceSnapshot }) {
  const s = snapshot;
  const stat = s.statistical_report;
  const act = s.regulatory_actions;
  const mc = s.market_conduct;

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
          <li className="text-slate-800">Virginia research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · Virginia
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">
          Virginia Insurance Market &amp; Regulatory Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of Virginia SCC Bureau of Insurance 2025 statistical-report company
          evidence, Regulatory Actions, Market Conduct examinations, and current company
          verification. This is not a ranking, recommendation, or Trust Score. A legal insurer is
          not an agency and not a producer. The 2025 report is not current authorization.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Snapshot {s.version} · fingerprint {s.fingerprint.slice(0, 12)} · period ended {s.period_end}{' '}
          · reported as of {s.reported_as_of}
        </p>
      </header>

      <section aria-labelledby="hero-metrics" className="mt-8">
        <h2 id="hero-metrics" className="sr-only">
          Snapshot metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            value={fmtInt(stat.distinct_naic)}
            label="2025 statistical-report companies (distinct NAIC)"
            hint="Year ended 2025-12-31. Reported as of 2026-06-01. Not a live authorized roster."
          />
          <Metric
            value={fmtInt(act.observation_rows)}
            label="Regulatory Action observations"
            hint={`${fmtInt(act.distinct_cases)} distinct cases. A row is not a unique insurer and not a conviction.`}
          />
          <Metric
            value={fmtInt(mc.observation_rows)}
            label="Market Conduct Examination observations"
            hint="An examination is not a finding of wrongdoing."
          />
          <Metric
            value="Search only"
            label="Current company / agency / producer bulk"
            hint="Missing bulk is not zero. Use official SCC lookup."
          />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="va-stat">
        <h2 id="va-stat" className="text-lg font-semibold text-[#0A2540]">
          2025 Insurance Company Statistical Report
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          SCC publishes financial information and Virginia premium profiles for companies licensed
          in Virginia. The data was reported to NAIC or the Bureau as of June 1, 2026 for the year
          ended December 31, 2025. This ticket acquired company-level financial-data PDFs:{' '}
          {fmtInt(stat.by_category.health)} health, {fmtInt(stat.by_category.life)} life,{' '}
          {fmtInt(stat.by_category.pc)} property &amp; casualty, {fmtInt(stat.by_category.title)}{' '}
          title, plus smaller burial, legal-service, mutual-assessment, and local-government
          classes. {fmtInt(stat.distinct_naic)} distinct NAIC identities. Premium is not quality.
          A statistical-report row is not a claimable profile.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          <Official href={stat.landing} label="Official SCC company financial reporting" />
        </p>
      </section>

      <section className="mt-8" aria-labelledby="va-current">
        <h2 id="va-current" className="text-lg font-semibold text-[#0A2540]">
          Current company verification
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Current SCC company search remains a live verification path. It was not enumerated as a
          bulk roster. Do not say every 2025 statistical-report company is currently authorized in
          September 2026. Search-only is not zero.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="va-actions">
        <h2 id="va-actions" className="text-lg font-semibold text-[#0A2540]">
          Regulatory Actions
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The official table has {fmtInt(act.observation_rows)} company observations across{' '}
          {fmtInt(act.distinct_cases)} case files and {fmtInt(act.distinct_naic)} NAIC IDs. Multiple
          insurers can appear in one case. A regulatory action is not a criminal conviction. A case
          is not a violation count. Case PDFs were not crawled.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          <Official href={act.url} label="Official SCC Regulatory Actions table" />
        </p>
      </section>

      <section className="mt-8" aria-labelledby="va-mc">
        <h2 id="va-mc" className="text-lg font-semibold text-[#0A2540]">
          Market Conduct Examinations
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {fmtInt(mc.observation_rows)} examination observations covering {fmtInt(mc.distinct_naic)}{' '}
          NAIC IDs. A market conduct examination is not a regulatory violation and not an
          enforcement order. Do not infer wrongdoing merely because a company was examined.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          <Official href={mc.url} label="Official SCC Market Conduct Examination Reports" />
        </p>
      </section>

      <section className="mt-8" aria-labelledby="va-other">
        <h2 id="va-other" className="text-lg font-semibold text-[#0A2540]">
          Other company evidence
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The same financial-reporting page lists {fmtInt(s.financial_exams.listing_rows)} domestic
          financial-examination entries ({fmtInt(s.financial_exams.distinct_naic)} with a 5-digit
          NAIC). A financial examination is not a market-conduct examination. Surplus-lines
          eligibility was not acquired as a current dated list.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="va-agents">
        <h2 id="va-agents" className="text-lg font-semibold text-[#0A2540]">
          Agents, agencies, complaints
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Agent, agency, and navigator search remain official verification paths. No bulk producer
          or agency roster was acquired. A producer is not an agency and not a legal insurer. No
          statewide complaint-ratio table was acquired. A complaint is not a violation and is not a
          Trust Score.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="va-identity">
        <h2 id="va-identity" className="text-lg font-semibold text-[#0A2540]">
          Identity and claim safety
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Read-only exact NAIC matching against the existing 6,185 legal-insurer spine:{' '}
          {fmtInt(s.naic_crosswalk.statistical_report.EXACT_EXISTING_LEGAL_INSURER_MATCHES)} of{' '}
          {fmtInt(s.naic_crosswalk.statistical_report.SOURCE_DISTINCT_NAIC)} statistical-report NAIC
          IDs match. Exact match is not graph enrichment and not a public profile attachment.
          Name-only joins are unsafe. This ticket does not create claimable Virginia profiles.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="va-gaps">
        <h2 id="va-gaps" className="text-lg font-semibold text-[#0A2540]">
          What was left
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {s.juice_squeeze.map((row) => (
            <li key={row.source}>
              <strong>{row.decision}.</strong> {row.source} — {row.note}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
