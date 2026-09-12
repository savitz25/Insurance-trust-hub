import Link from 'next/link';
import { fmtHero, fmtInt, type IllinoisInsuranceSnapshot } from '@/lib/illinois-intelligence/snapshot';

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

export function IllinoisInsurancePage({ snapshot }: { snapshot: IllinoisInsuranceSnapshot }) {
  const s = snapshot;
  const o = s.directors_orders;

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
          <li className="text-slate-800">Illinois research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · Illinois
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">
          Illinois Insurance Market &amp; Regulatory Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of Illinois Department of Insurance company lookup, SBS producer and
          agency verification, Director’s Orders, and consumer complaint paths. This is not a ranking,
          recommendation, or Trust Score. Current company and producer bulk universes are search-only.
          Search-only is not zero.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Snapshot {s.version} · fingerprint {s.fingerprint.slice(0, 12)} · company universe search-only
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
            value={String(s.hero.current_value)}
            label={s.hero.current_label}
            hint={s.hero.current_hint}
          />
          <Metric value="Illinois" label="Statewide only" hint="No Chicago, Cook, county, or city insurance routes." />
        </div>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Regulator / authority</h2>
        <p>
          The <Official href={s.regulators.url} label="Illinois Department of Insurance (IDOI)" /> licenses
          and oversees insurers, producers, and related entities. Company lookup, producer lookup, and
          Director’s Orders are separate official surfaces. A company is not an agency. An agency is not
          an individual producer. NAIC is not NPN.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Insurance company lookup</h2>
        <p>
          Current authorized-insurer bulk roster: <strong>not acquired</strong>. Official verification is
          the{' '}
          <Official href={s.regulators.company_lookup} label="IDOI Company Lookup Application" />.
          Do not treat Director’s Orders, complaint-ratio tables, or reports as a current company census.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Agencies and individual producers</h2>
        <p>
          IDOI instructs the public to use NAIC State Based Systems. Search Individual for a broker or
          agent and Business Entity for an agency. Line of authority appears on individual licenses;
          agencies do not show lines of authority. Bulk individual and business-entity rosters were not
          acquired. SBS remains{' '}
          <Official href={s.regulators.sbs_lookup} label="search-only" />. How-to:{' '}
          <Official href={s.regulators.producer_howto} label="IDOI agent lookup instructions" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Director’s Orders / enforcement</h2>
        <p>
          The official Directors Orders application returned {fmtInt(o.observation_rows)} search-index
          observations ({fmtInt(o.issue_years['2026'] ?? 0)} with 2026 issue dates;{' '}
          {fmtInt(o.issue_years['2025'] ?? 0)} with 2025). An order is not a criminal conviction. A
          consent order is not a court conviction. License denial is not revocation. A fine is not a
          complaint. Names in the index are not NAIC or NPN identifiers, so exact enforcement
          associations and profile attachments remain 0. Name-only matching is unsafe.
        </p>
        <p>
          <Official href={s.regulators.directors_orders} label="Search IDOI Director’s Orders" />
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Consumer complaints / assistance</h2>
        <p>
          No structured public complaint dataset was acquired. Missing bulk complaints is not zero
          complaints. A complaint is not a violation and not an enforcement order. File or research
          through the{' '}
          <Official href={s.regulators.help_center} label="IDOI Help Center" /> or{' '}
          <Official href={s.regulators.complaints} label="How to File a Complaint" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Market conduct / reports / bulletins</h2>
        <p>
          Market-conduct examinations and company reports remain an official research path, not a
          bulk observation file here. An exam is not a disciplinary order. A rate filing is not
          company authorization. Company bulletins are regulatory guidance, not company-level
          enforcement, and are not attached to “all insurers.”{' '}
          <Official href={s.regulators.reports} label="IDOI reports" /> ·{' '}
          <Official href={s.regulators.company_bulletins} label="Company bulletins" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Identity and exact matching</h2>
        <p>
          Preferred insurer identity is NAIC when source-native. NPN is a producer identity. No IL
          company namespace is created because a current NAIC-bearing bulk roster was not acquired.
          Research association is not a profile attachment. No Trust Score. No AggregateRating.
        </p>
      </section>
    </div>
  );
}
