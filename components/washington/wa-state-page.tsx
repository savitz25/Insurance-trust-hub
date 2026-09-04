import Link from 'next/link';
import { Trace } from '@/components/new-jersey/trace';
import {
  fmtHero,
  fmtInt,
  type WashingtonInsuranceSnapshot,
} from '@/lib/washington-intelligence/snapshot';

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

export function WashingtonInsurancePage({ snapshot }: { snapshot: WashingtonInsuranceSnapshot }) {
  const s = snapshot;
  const a = s.annual_aggregates;

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
          <li className="text-slate-800">Washington research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · Washington
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">
          Washington Insurance Market &amp; Regulatory Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of Washington Office of the Insurance Commissioner verification
          paths, dated annual-report entity aggregates, SERFF rate-filing search, and regulatory-order
          lookup. This is not a ranking, recommendation, or Trust Score. Producer lists are
          restricted. Annual aggregates are not a live insurer roster.
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
            value={fmtHero(a.domestic)}
            label="Domestic entities (annual report)"
            hint="Dated 2025 aggregate. Not a live domestic-company roster."
          />
          <Metric
            value={String(s.hero.current_value)}
            label={`Current · ${s.hero.current_label}`}
            hint={s.hero.current_hint}
          />
          <Metric
            value={String(s.hero.observations_value)}
            label={`Observations · ${s.hero.observations_label}`}
            hint={s.hero.observations_hint}
          />
          <Metric
            value={String(s.hero.as_of_value)}
            label={`As-of · ${s.hero.as_of_label}`}
            hint={s.hero.as_of_hint}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Who regulates Washington insurance?</h2>
        <p className="mt-2 text-sm text-slate-600">
          {s.regulators.oic.name} regulates insurance companies, agencies, individual producers,
          appointments, rate and form filings, orders, and complaints as described on official OIC
          pages. A producer is not an agency. An agency is not an insurer. A plan is not an insurer.
          NAIC is not NPN.
        </p>
        <div className="mt-4 min-w-0 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <caption className="sr-only">Washington insurance credential classes.</caption>
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
            <Official href={s.verify.company} label="OIC Agent and Company Lookup" /> — live official
            verification. Not scraped. Not a TrustHub shadow directory.
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
            are national graph tools plus OIC verification — not a Washington roster substitute.
          </li>
          <li>
            <Link href="/tools/license-verification" className="font-medium text-[#0284C7] underline underline-offset-2">
              License verification tool
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">OIC 2025 annual-report aggregates</h2>
        <p className="mt-2 text-sm text-slate-600">{a.definition}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric
            value={fmtInt(a.regulated_entities)}
            label="Regulated entities"
            hint="Official label: insurance and risk/non-risk bearing entities. Not “2,924 Washington insurance companies.”"
          />
          <Metric value={fmtInt(a.domestic)} label="Domestic" />
          <Metric value={fmtInt(a.foreign)} label="Foreign" />
          <Metric value={fmtInt(a.alien)} label="Alien" />
        </div>
        <Trace
          source={a.url}
          sourceDate="2025 annual report (PDF posted 2026-07)"
          denominator="OIC 2025 annual-report entity total"
          calculation="Official report figures 263 domestic + 2,590 foreign + 71 alien = 2,924."
          grain="dated annual-report aggregate"
          coverage="PUBLIC_BULK_OK as aggregate only"
          caveat={a.definition}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">What TrustHub does not have as a roster</h2>
        <p className="mt-2 text-sm text-slate-600">{s.producer_roster.caveat}</p>
        <p className="mt-2 text-sm text-slate-600">{s.agency_roster.caveat}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric
            value="SOURCE_USE_RESTRICTED / SEARCH_ONLY"
            label="WA_PRODUCER_BULK_ROSTER"
            hint="RCW 42.56 lists of individuals for commercial purposes. Restricted is not zero."
          />
          <Metric
            value="SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY"
            label="WA_AGENCY_BULK_ROSTER"
            hint="Missing is not zero. Search-only is not zero."
          />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Individual-list request path:{' '}
          <Official href={s.source_access.lists_of_individuals.url} label="OIC request for list of individuals" />
          . No commercial-use declaration was submitted and no person list was acquired.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Rate filings</h2>
        <p className="mt-2 text-sm text-slate-600">
          {s.rate_filings.RATE_FILINGS}. A rate filing is not a consumer quote, not insurer quality,
          and not an approved price for every policyholder. Health, property/casualty, life, and
          other classes are researchable in SERFF as filed — this page does not scrape them.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.rate_filings.url} label="Search company filings (SERFF Filing Access)" />
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Regulatory orders</h2>
        <p className="mt-2 text-sm text-slate-600">
          OIC orders remain {s.orders.access}. Name-only attach is {s.orders.name_only}. Notice is
          not a final order. An order is not a complaint. Order count is not quality. Fine is not
          consumer loss.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.orders.url} label="OIC orders / consumer toolkit search" />
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Complaints and market conduct</h2>
        <p className="mt-2 text-sm text-slate-600">{s.complaints_market_conduct.note}</p>
        <p className="mt-2 text-sm text-slate-600">
          Complaint is not a violation. No complaint found is not a clean record. Company complaint
          rates are not published without an exposure denominator.
        </p>
        <p className="mt-2 text-sm">
          <Official href={s.complaints_market_conduct.complaint_url} label="OIC file a complaint" />
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Federal overlay</h2>
        <p className="mt-2 text-sm text-slate-600">{s.federal_overlay.note}</p>
        <Metric
          value={s.federal_overlay.cms_marketplace_washington_projection}
          label="CMS Marketplace Washington projection"
          hint="Marketplace participation is not OIC company authority and is not a recommendation."
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[#0A2540]">Evidence depth</h2>
        <p className="mt-2 text-sm text-slate-600">Unknown is not zero. Restricted is not zero.</p>
        <div className="mt-4 min-w-0 overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3" scope="col">
                  Family
                </th>
                <th className="py-2 pr-3" scope="col">
                  Access
                </th>
                <th className="py-2 pr-3" scope="col">
                  Count
                </th>
                <th className="py-2 pr-3" scope="col">
                  Identity
                </th>
                <th className="py-2" scope="col">
                  Limitation
                </th>
              </tr>
            </thead>
            <tbody>
              {s.evidence_depth.map((row) => (
                <tr key={row.family} className="border-b border-slate-100 align-top">
                  <th className="py-2 pr-3 font-medium text-slate-800" scope="row">
                    {row.family}
                  </th>
                  <td className="py-2 pr-3">{row.access}</td>
                  <td className="py-2 pr-3">{row.count == null ? 'Unknown / not acquired' : fmtInt(row.count)}</td>
                  <td className="py-2 pr-3">{row.identity}</td>
                  <td className="py-2">{row.limitations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
