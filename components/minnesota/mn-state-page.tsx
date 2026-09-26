import type { MinnesotaInsuranceSnapshot } from '@/lib/minnesota-intelligence/snapshot';

function Official({ href, label }: { href: string; label: string }) {
  return (
    <a className="underline" href={href} rel="noreferrer">
      {label}
    </a>
  );
}

export function MinnesotaInsurancePage({ snapshot }: { snapshot: MinnesotaInsuranceSnapshot }) {
  const s = snapshot;
  const cap = s.capabilities;
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">Independent research · Minnesota · statewide only</p>
      <h1 className="text-3xl font-semibold text-slate-900">Minnesota insurance regulation</h1>
      <p className="text-slate-700">
        The <Official href={s.regulator.home_url} label="Minnesota Department of Commerce Insurance Division" /> licenses
        insurance companies, agencies and producers. A legal insurer, an agency and a producer are different grains.
        A license is not an appointment, company authority, an enforcement action, a financial examination, a complaint
        or a SERFF filing. This page does not rank providers and does not publish a Trust Score.
      </p>

      <section>
        <h2 className="text-xl font-semibold">Insurance companies</h2>
        <p className="mt-2 text-slate-700">
          Company verification is {cap.company_verification}. Commerce&apos;s{' '}
          <Official href={s.regulator.license_lookup_url} label="license lookup" /> and{' '}
          <Official href={s.regulator.company_licensing_url} label="insurer licensing" /> pages are the public way to
          check a company. No statewide company roster was acquired ({cap.company_bulk_roster}). Missing is not zero.
          A national NAIC identity is not proof of Minnesota authority, and a name match is not a merge.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Producers</h2>
        <p className="mt-2 text-slate-700">
          Producer verification is {cap.producer_verification}. Resident and nonresident producer licensing is person
          grain and runs through <Official href={s.regulator.sircon_url} label="Sircon for Minnesota" />. An NPN is the
          preferred identifier. No producer roster was acquired ({cap.producer_bulk_roster}), and no producer names,
          home addresses, phones, emails or dates of birth are published here. A producer is not an agency.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Agencies</h2>
        <p className="mt-2 text-slate-700">
          Agency verification is {cap.agency_verification}. A business entity is organization grain. No agency roster
          was acquired ({cap.agency_bulk_roster}). Appointments and designated responsible producers are not counted
          as agencies. The Twin Cities directory hub is not a Commerce census.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Company authority</h2>
        <p className="mt-2 text-slate-700">
          Minnesota authority classes stay source-native. An admitted insurer, HMO, fraternal, captive, risk retention
          group, surplus lines insurer, reinsurer or title company is not the same class, and an authority class is
          not a product offering. Product-line authority such as homeowners, auto, life, health, workers compensation
          or title is {cap.product_line_authority} unless a Minnesota source states it for that company.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Commerce enforcement</h2>
        <p className="mt-2 text-slate-700">
          Enforcement search is {cap.enforcement} through Commerce Actions and Regulatory Documents Search (CARDS).
          A clean insurance-only action index for 2022 through 2026 was {cap.enforcement_index}. Rows here: none.
          Nothing is attached by name. A complaint is not an allegation, a consent order or an adjudicated finding.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Financial examinations</h2>
        <p className="mt-2 text-slate-700">
          Financial examinations are {cap.financial_examinations} as a public CARDS document class, described on{' '}
          <Official href={s.regulator.financial_reporting_url} label="Commerce financial reporting" />. A metadata
          index was {cap.financial_examination_index}. An examination is not an enforcement action and is not a score.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Financial reporting and SERFF</h2>
        <p className="mt-2 text-slate-700">
          Insurance financial statements are {cap.financial_statements} through CARDS. A statewide statement index was{' '}
          {cap.financial_statement_index}. SERFF filing access is {cap.serff}. No filings were ingested. A filing is
          not a quote and not a recommendation.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Complaints</h2>
        <p className="mt-2 text-slate-700">
          Complaint intake is {cap.complaint_intake}. The Insurance Division consumer line is {s.regulator.complaint_phone}.
          Provider-level complaint outcomes are {cap.complaint_outcomes}. A complaint is not a finding, and there is
          no complaint ranking.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Limitations</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
          <li>No combined Minnesota insurance total.</li>
          <li>No Minneapolis, St. Paul, Rochester or Duluth intelligence page. A city is context only.</li>
          <li>No Trust Score, star rating or paid placement.</li>
          <li>Graph writes {s.expansion_ledger.GRAPH_WRITES}. Claim eligibility was not broadened.</li>
        </ul>
      </section>
    </main>
  );
}
