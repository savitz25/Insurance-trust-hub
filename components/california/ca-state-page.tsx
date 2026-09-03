import Link from 'next/link';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { Trace } from '@/components/new-jersey/trace';
import { CaliforniaEnforcementSearch } from '@/components/california/ca-enforcement-search';
import {
  fmtHero,
  fmtInt,
  type CaliforniaInsuranceSnapshot,
} from '@/lib/california-intelligence/snapshot';

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

export function CaliforniaInsurancePage({ snapshot }: { snapshot: CaliforniaInsuranceSnapshot }) {
  const s = snapshot;
  const actionEntries = Object.entries(s.enforcement.action_counts).sort((a, b) => b[1] - a[1]);
  const imrYears = Object.entries(s.imr.year_counts).sort((a, b) => a[0].localeCompare(b[0]));
  const detEntries = Object.entries(s.imr.determination_counts);
  const typeEntries = Object.entries(s.imr.type_counts);

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
          <li className="text-slate-800">California research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · California
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">
          California Insurance Market &amp; Regulatory Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of California DMHC enforcement and Independent Medical Review data,
          CDI&apos;s dated health-insurer list, and official FAIR Plan residual-market context. This
          is not a ranking, recommendation, or Trust Score. Acquired rows are not the complete
          California insurer or producer universe.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Snapshot {s.version} · fingerprint {s.fingerprint.slice(0, 12)} · DMHC as of {s.as_of}
        </p>
      </header>

      <section aria-labelledby="hero-metrics" className="mt-8">
        <h2 id="hero-metrics" className="sr-only">
          Snapshot metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-5">
          <Metric value={fmtHero(s.hero.universe_value)} label={`Universe · ${s.hero.universe_label}`} hint={s.hero.universe_hint} />
          <Metric value={fmtHero(s.hero.current_value)} label={`Current · ${s.hero.current_label}`} hint={s.hero.current_hint} />
          <Metric value={fmtHero(s.hero.observations_value)} label={`Observations · ${s.hero.observations_label}`} hint={s.hero.observations_hint} />
          <Metric value={String(s.hero.geography_value)} label={`Geography · ${s.hero.geography_label}`} hint={s.hero.geography_hint} />
          <Metric value={String(s.hero.as_of_value)} label={`As-of · ${s.hero.as_of_label}`} hint={s.hero.as_of_hint} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">California regulators</h2>
        <p className="mt-2 text-sm text-slate-600">
          DMHC is not CDI. A DMHC Knox-Keene health plan is not all California insurers. A CDI
          licensed insurer is not a DMHC Knox-Keene plan. CDI company lookup is not a bulk admitted
          universe.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-[#0A2540]">{s.regulators.cdi.name}</h3>
            <p className="mt-1 text-sm">{s.regulators.cdi.covers}</p>
            <p className="mt-2 text-sm">
              <Official href={s.regulators.cdi.url} label="CDI home" />
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-[#0A2540]">{s.regulators.dmhc.name}</h3>
            <p className="mt-1 text-sm">{s.regulators.dmhc.covers}</p>
            <p className="mt-2 text-sm">
              <Official href={s.regulators.dmhc.url} label="DMHC home" />
            </p>
          </article>
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
        <h2 className="text-lg font-semibold text-[#0A2540]">DMHC enforcement</h2>
        <p className="mt-2 text-sm text-slate-600">
          {fmtInt(s.enforcement.rows)} action rows naming {fmtInt(s.enforcement.distinct_organization_names)}{' '}
          distinct organization-name strings, {s.enforcement.date_min} through {s.enforcement.date_max}.
          A letter of agreement is not a settlement. An accusation is not a final finding. A
          cease-and-desist order is not a revocation. Raw enforcement count is not quality. Documents
          are INDEX_ONLY via official action-display links. No name-only profile attachment.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">Source-native action class</th>
                <th className="py-2 font-medium">Rows</th>
              </tr>
            </thead>
            <tbody>
              {actionEntries.map(([label, count]) => (
                <tr key={label} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{label}</td>
                  <td className="py-2 tabular-nums">{fmtInt(count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Trace
          source="CHHS datastore: DMHC Enforcement Actions, Trend"
          sourceDate="2026-06-01"
          denominator={`${fmtInt(s.enforcement.rows)} acquired enforcement-action rows`}
          calculation="Count datastore records. Action class is the official EnforcementAction field. Distinct names are distinct OrganizationName strings, not unique licensed plans."
          grain="ENFORCEMENT ACTION ROW — not unique company"
          coverage="Knox-Keene / DMHC only. No plan ID or NAIC in this file."
          caveat="Do not rank insurers. Absence is not a clean record. Name-only is UNSAFE for adverse profile attach."
        />
        <p className="mt-2 text-sm">
          <Official href={s.verify.dmhc_enforcement} label="DMHC enforcement actions" />
        </p>
      </section>

      <CaliforniaEnforcementSearch
        actions={actionEntries.map(([label]) => label)}
        years={Object.keys(s.enforcement.year_counts).sort()}
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">DMHC Independent Medical Review</h2>
        <p className="mt-2 text-sm text-slate-600">
          {fmtInt(s.imr.rows)} IMR determinations. IMR is not a complaint and not enforcement. This
          extract has no plan identifier, so plan-level IMR rates are not published.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {detEntries.map(([label, count]) => (
            <Metric key={label} value={fmtInt(count)} label={label} />
          ))}
        </div>
        <h3 className="mt-6 text-base font-semibold">Review type</h3>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {typeEntries.map(([label, count]) => (
            <li key={label}>
              {label}: {fmtInt(count)}
            </li>
          ))}
        </ul>
        <h3 className="mt-6 text-base font-semibold">Determinations by report year</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[16rem] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">Year</th>
                <th className="py-2 font-medium">Determinations</th>
              </tr>
            </thead>
            <tbody>
              {imrYears.map(([year, count]) => (
                <tr key={year} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{year}</td>
                  <td className="py-2 tabular-nums">{fmtInt(count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Trace
          source="CHHS datastore: DMHC IMR Determinations, Trend"
          sourceDate="2026-06-01"
          denominator={`${fmtInt(s.imr.rows)} IMR determination rows`}
          calculation="GROUP BY ReportYear, Determination, and Type on the official datastore. Findings text is not republished."
          grain="IMR DETERMINATION — not complaint, not enforcement"
          coverage="No plan name/NAIC in the published columns. No enrollment denominator."
          caveat="Do not rank plans by raw IMR counts. IMR volume is not market share."
        />
        <p className="mt-2 text-sm">
          <Official href={s.verify.dmhc_imr} label="DMHC Independent Medical Review" />
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Companies on CDI&apos;s dated health-insurer list</h2>
        <p className="mt-2 text-sm text-slate-600">
          {fmtInt(s.cdi_health_list.row_count)} companies as of {s.cdi_health_list.source_as_of}.{' '}
          {fmtInt(s.cdi_health_list.phone_count)} public business phones.{' '}
          {fmtInt(s.cdi_health_list.website_count)} websites. Licensed is not currently selling. This
          is not the complete admitted universe and not all property/casualty insurers.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">Company</th>
                <th className="py-2 pr-3 font-medium">Business phone</th>
                <th className="py-2 font-medium">Website</th>
              </tr>
            </thead>
            <tbody>
              {s.cdi_health_list.companies.map((row) => (
                <tr key={row.company_name} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{row.company_name}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.phone || '—'}</td>
                  <td className="py-2">
                    {row.website ? (
                      <a
                        href={row.website}
                        className="text-[#0284C7] underline underline-offset-2"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Official site
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm">
          <Official href={s.verify.cdi_health_list} label="CDI health-insurer list" />
          {' · '}
          <Official href={s.verify.cdi_company_lookup} label="CDI company lookup (search-only)" />
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">FAIR Plan / property market</h2>
        <p className="mt-2 text-sm text-slate-600">{s.fair_plan.note}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric
            value={fmtInt(s.fair_plan.new_and_renewed_policies_2023.fair_plan)}
            label="FAIR Plan new+renewed 2023"
            hint="Residual market. Not the typical California insurance market."
          />
          <Metric
            value={fmtInt(s.fair_plan.new_and_renewed_policies_2023.voluntary_market)}
            label="Voluntary market new+renewed 2023"
          />
          <Metric
            value={fmtInt(s.fair_plan.new_and_renewed_policies_2023.surplus_lines)}
            label="Surplus lines new+renewed 2023"
          />
        </div>
        <p className="mt-2 text-sm">
          <Official href={s.fair_plan.source} label="CDI residential / FAIR Plan fact sheet (PDF)" />
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Complaints, rates, producers</h2>
        <p className="mt-2 text-sm">
          CDI 2024 commissioner-report totals: {fmtInt(s.complaints.commissioner_report_2024.complaint_cases_opened)}{' '}
          complaint cases opened and {fmtInt(s.complaints.commissioner_report_2024.complaint_cases_closed)} closed.
          A complaint is not a violation. IMR is not a complaint. CDI&apos;s justified-complaint study
          ranking is not republished here.
        </p>
        <p className="mt-2 text-sm">
          Rate filings: {s.rate_filings.access}. A rate filing is not a consumer premium. Complete
          CDI admitted/company universe: {s.cdi_admitted.coverage}. Producer universe:{' '}
          {s.producer.coverage}. Missing is not zero. National NPN identity is not a California
          license.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.verify.cdi_complaint_study} label="CDI Consumer Complaint Study" />
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Evidence depth</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">Family</th>
                <th className="py-2 pr-3 font-medium">Grain</th>
                <th className="py-2 pr-3 font-medium">Rows</th>
                <th className="py-2 font-medium">Publication</th>
              </tr>
            </thead>
            <tbody>
              {s.evidence_depth.map((row) => (
                <tr key={row.family} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3">{row.family}</td>
                  <td className="py-2 pr-3">{row.grain}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.rows == null ? '—' : fmtInt(row.rows)}</td>
                  <td className="py-2">{row.publication_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">What we don&apos;t yet know</h2>
        <p className="mt-2 text-sm">Unknown is not zero. Missing is not zero.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {s.coverage_gaps.map((g) => (
            <li key={g.id}>
              {g.label}: {g.state}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Semantic rules</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {s.semantics.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm">No Trust Score. No paid ranking.</p>
      </section>

      <div className="mt-10">
        <DisclaimerBanner />
      </div>
    </div>
  );
}
