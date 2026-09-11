import Link from 'next/link';
import { fmtInt, type NewYorkInsuranceSnapshot } from '@/lib/new-york-intelligence/snapshot';

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

export function NewYorkInsurancePage({ snapshot }: { snapshot: NewYorkInsuranceSnapshot }) {
  const s = snapshot;
  const dir = s.company_directory;
  const act = s.enforcement_actions;
  const auto = s.auto_complaints;
  const org = dir.org_type_distribution;

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
          <li className="text-slate-800">New York research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · New York
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">
          New York Insurance Market &amp; Regulatory Intelligence
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of the New York DFS Insurance Company Directory, Insurance
          Enforcement Actions, automobile complaint rankings, and current authorization
          verification. This is not a ranking, recommendation, or Trust Score. A legal insurer is
          not an agency and not a producer. Directory presence is not current writing authority.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Snapshot {s.version} · fingerprint {s.fingerprint.slice(0, 12)} · retrieved {s.retrieved_at}
        </p>
      </header>

      <section aria-labelledby="hero-metrics" className="mt-8">
        <h2 id="hero-metrics" className="sr-only">
          Snapshot metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            value={fmtInt(dir.directory_rows)}
            label="DFS Insurance Company Directory rows"
            hint={`${fmtInt(dir.distinct_naic)} distinct NAIC IDs. Not a currently authorized writing universe.`}
          />
          <Metric
            value={fmtInt(act.observation_rows)}
            label="DFS Insurance Enforcement Action observations"
            hint="Bounded official HTML table. An action is not a conviction and not a unique insurer."
          />
          <Metric
            value={fmtInt(auto.observation_rows)}
            label={`DFS auto complaint-ranking observations (${auto.latest_year})`}
            hint="Open Data NY. DFS rank is not a TrustHub rank. An upheld complaint is not a crime."
          />
          <Metric
            value="Search only"
            label="Current writing authority / agency / producer bulk"
            hint="Missing bulk is not zero. Use official DFS lookup."
          />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="ny-reg">
        <h2 id="ny-reg" className="text-lg font-semibold text-[#0A2540]">
          New York insurance regulation
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The New York State Department of Financial Services regulates insurance companies,
          producers, and related licensees. Company, agency, producer, broker, adjuster, and group
          identities stay separate. This page is statewide only. It does not publish New York City,
          borough, or county insurance gateways.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="ny-dir">
        <h2 id="ny-dir" className="text-lg font-semibold text-[#0A2540]">
          DFS company directory
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The official Insurance Company Search list-all table currently reports {fmtInt(dir.html_reported_total)}{' '}
          rows. This retrieval counted {fmtInt(dir.directory_rows)} directory rows and{' '}
          {fmtInt(dir.distinct_naic)} distinct NAIC IDs. {fmtInt(dir.rows_without_naic)} rows lack a
          NAIC number. Duplicate NAIC IDs: {fmtInt(dir.duplicate_naic_ids.length)}. Organization-type
          counts include {fmtInt(org.PC)} PC, {fmtInt(org.LF)} LF, {fmtInt(org.AH)} AH, and{' '}
          {fmtInt(org.HMO)} HMO. {fmtInt(dir.ny_domicile_rows)} rows list New York domicile.{' '}
          {fmtInt(dir.distinct_group_numbers)} distinct group numbers. A directory row is not a unique
          company merely because it appears, and NAIC is not a group ID.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{dir.caveat}</p>
        <p className="mt-2 text-sm text-slate-600">
          <Official href={dir.url} label="Official DFS Insurance Company Search" />
        </p>
      </section>

      <section className="mt-8" aria-labelledby="ny-auth">
        <h2 id="ny-auth" className="text-lg font-semibold text-[#0A2540]">
          Current authorization verification
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Current writing powers, lines of business, and live license status require the official
          company-search detail path. This ticket did not bulk-enumerate those detail pages. Do not
          treat {fmtInt(dir.directory_rows)} directory rows as currently authorized insurers. Search-only
          is not zero.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="ny-org">
        <h2 id="ny-org" className="text-lg font-semibold text-[#0A2540]">
          Company / organization-type context
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          DFS prints an organization-type code on each directory row. Those codes are source-native
          labels, not a TrustHub ranking of company quality. Property/casualty, life, accident/health,
          HMO, title, risk-retention, and other codes remain separate classes. Do not add them into
          one New York insurer total.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="ny-actions">
        <h2 id="ny-actions" className="text-lg font-semibold text-[#0A2540]">
          DFS enforcement actions
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The official Insurance Enforcement Actions table has {fmtInt(act.observation_rows)}{' '}
          dated observations. The HTML table does not include NAIC numbers, so these observations
          stay unattached. Name-only adverse joins are unsafe. An enforcement action is not a
          criminal conviction, not a unique insurer, and not a claimable profile. Linked PDFs were
          not downloaded.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          <Official href={act.url} label="Official DFS Insurance Enforcement Actions" />
        </p>
      </section>

      <section className="mt-8" aria-labelledby="ny-auto">
        <h2 id="ny-auto" className="text-lg font-semibold text-[#0A2540]">
          Auto complaint evidence
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Open Data NY publishes DFS automobile complaint rankings with NAIC identifiers.{' '}
          {fmtInt(auto.observation_rows)} company observations for filing year {auto.latest_year}{' '}
          ({fmtInt(auto.distinct_naic)} distinct NAIC). {fmtInt(auto.open_data_rows_all_years)} rows
          exist across all published years. DFS rank is not a TrustHub rank. Complaint ratio is not a
          Trust Score. An upheld complaint is not criminal wrongdoing. Do not say best, safest, or
          worst auto insurer.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          DFS also publishes a 2025 ranking PDF ({fmtInt(auto.pdf_2025_ranked_companies)} ranked
          names; complaints closed in 2024). That PDF does not print NAIC, so it is not used for
          company attachment.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          <Official href={auto.url} label="Official DFS auto complaint ranking" />
        </p>
      </section>

      <section className="mt-8" aria-labelledby="ny-health">
        <h2 id="ny-health" className="text-lg font-semibold text-[#0A2540]">
          Health complaint evidence
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          DFS publishes a 2025 Consumer Guide to Health Insurers. The official PDF is a public
          research path. This ticket did not flatten HMO, EPO/PPO, and commercial tables into one
          health-insurer count. Health complaint ranking is not auto complaint ranking. Do not attach
          health-plan metrics to unrelated legal insurers by name.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          <Official href={s.health_complaints.url} label="Official 2025 Health Consumer Guide" />
        </p>
      </section>

      <section className="mt-8" aria-labelledby="ny-agents">
        <h2 id="ny-agents" className="text-lg font-semibold text-[#0A2540]">
          Producer / agency verification
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Producer, agency, broker, and adjuster lookup remain official verification paths. No bulk
          person or agency roster was scraped. The company directory is not an agency directory. A
          producer is not a company. National agency and person totals are not inflated by this
          search-only New York evidence.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="ny-identity">
        <h2 id="ny-identity" className="text-lg font-semibold text-[#0A2540]">
          Identity and claim safety
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Preferred company identity is NAIC company code. DFS CPaf numbers are preserved as
          source-native identifiers. Read-only exact NAIC matching against the existing{' '}
          {fmtInt(s.naic_crosswalk.spine_legal_insurers)} legal-insurer spine:{' '}
          {fmtInt(s.naic_crosswalk.company_directory.EXACT_EXISTING_LEGAL_INSURER_MATCHES)} of{' '}
          {fmtInt(s.naic_crosswalk.company_directory.SOURCE_DISTINCT_NAIC)} directory NAIC IDs match.
          {fmtInt(s.naic_crosswalk.company_directory.UNMATCHED_NAIC)} unmatched directory NAIC IDs.
          Exact match is not graph enrichment and not a public profile attachment. Name-only joins
          are unsafe. This ticket does not create claimable New York profiles.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="ny-not">
        <h2 id="ny-not" className="text-lg font-semibold text-[#0A2540]">
          What these numbers do not mean
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>1,054 directory rows are not currently authorized writing insurers.</li>
          <li>A company is not an agency and not a producer.</li>
          <li>NAIC is not a group number.</li>
          <li>An enforcement action is not a conviction.</li>
          <li>A complaint is not a violation.</li>
          <li>A DFS complaint rank is not a TrustHub rank, and a ratio is not a Trust Score.</li>
          <li>A market-conduct exam or filing is not a violation.</li>
          <li>Unknown and search-only evidence is not zero.</li>
          <li>No paid ranking. No best, safest, or vetted conclusions.</li>
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="ny-gaps">
        <h2 id="ny-gaps" className="text-lg font-semibold text-[#0A2540]">
          Coverage and gaps
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>
            <strong>Grabbed — high yield.</strong> {s.juice_squeeze.GRABBED_HIGH_YIELD.join('; ')}.
          </li>
          <li>
            <strong>Grabbed — easy secondary.</strong> {s.juice_squeeze.GRABBED_EASY_SECONDARY.join('; ')}.
          </li>
          <li>
            <strong>Left — search only.</strong> {s.juice_squeeze.LEFT_SEARCH_ONLY.join('; ')}.
          </li>
          <li>
            <strong>Left — too much work.</strong> {s.juice_squeeze.LEFT_TOO_MUCH_WORK.join('; ')}.
          </li>
          <li>
            <strong>Left — request only.</strong> {s.juice_squeeze.LEFT_REQUEST_ONLY.join('; ')}.
          </li>
          <li>
            <strong>Left — local / future.</strong> {s.juice_squeeze.LEFT_LOCAL_FUTURE.join('; ')}.
          </li>
        </ul>
      </section>
    </div>
  );
}
