import Link from 'next/link';
import type { GeorgiaInsuranceSnapshot } from '@/lib/georgia-intelligence/snapshot';

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

function clockFor(event: GeorgiaInsuranceSnapshot['receiverships']['events'][number]): string {
  if (event.list === 'later_announcement' && event.name.startsWith('Sonder')) {
    return 'Supervision 2025-04-11 · court order 2025-08-13 · press release 2025-08-15';
  }
  if (event.list === 'later_announcement') {
    return 'Supervision 2023-03-08 · announced 2023-05-31 · court order date not extracted';
  }
  return 'On the OCI index since September 2010 · liquidation-order PDF date not extracted';
}

export function GeorgiaInsurancePage({ snapshot }: { snapshot: GeorgiaInsuranceSnapshot }) {
  const s = snapshot;
  const indexEvents = s.receiverships.events.filter((event) => event.list === 'receivership_index');
  const laterEvents = s.receiverships.events.filter((event) => event.list === 'later_announcement');

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
          <li className="text-slate-800">Georgia research</li>
        </ol>
      </nav>

      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
          Independent research · Georgia · statewide only
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold text-[#0A2540] sm:text-3xl">{s.publication.h1}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          A source-backed view of how the Georgia Office of the Commissioner of Insurance and Safety
          Fire licenses insurance companies, agencies, and individual producers. An insurance company
          is not an agency. An agency is not an individual producer. Atlanta is geography, not a
          separate licensing regime. This is not a ranking, recommendation, or Trust Score. Missing
          or search-only is not zero.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Snapshot {s.version} · fingerprint {s.fingerprint.slice(0, 12)} · retrieved {s.retrievedAt} ·
          snapshot as of {s.snapshotAsOf}
        </p>
      </header>

      <section aria-labelledby="hero-metrics" className="mt-8">
        <h2 id="hero-metrics" className="sr-only">
          Snapshot metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            value="Not acquired"
            label="Agency, producer, and company bulk rosters"
            hint="Sircon lookup is live. A search box is not a census, and these three grains are not added together."
          />
          <Metric
            value="Principal agency"
            label="Current business-entity license"
            hint="HB410, signed May 14, 2025, eliminated branch-agency licensing. Historical branch evidence is not a current census."
          />
          <Metric
            value={String(s.receiverships.index_entities)}
            label="Receivership-index companies since September 2010"
            hint="Insurer pages only. Two later announcements are listed separately. Exact NAIC attachments: 0."
          />
          <Metric
            value="Georgia"
            label="Statewide only"
            hint="This page does not add Atlanta, Savannah, Augusta, Macon, or other local insurance intelligence routes."
          />
        </div>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Regulator and grains</h2>
        <p>
          The <Official href="https://oci.georgia.gov/" label="Office of the Commissioner of Insurance and Safety Fire (OCI)" />{' '}
          regulates insurers, agencies, and individual producers in Georgia. The licensing system of
          record is Sircon. OCI&apos;s{' '}
          <Official href={s.regulator.lookup_url} label="license lookup page" /> points to{' '}
          <Official href={s.regulator.sircon_url} label="Sircon for Georgia" />. Company licensing is
          a separate OCI path:{' '}
          <Official href={s.regulator.company_licensing_url} label="company licensing and renewals" />.
        </p>
        <p>
          An insurance company is identified by an NAIC company code or a Georgia certificate of
          authority. An insurance agency is a business entity, identified by a Georgia agency license
          or an NPN. An individual producer is a person, identified by an NPN or a Georgia individual
          license. Those identifiers are not interchangeable, and a shared name is not a join.
        </p>
        <p>
          Marketplace copy on Atlanta hub pages is not an OCI licensed-agency census. This page does
          not republish those cards as regulatory population and does not claim to list all Georgia
          agents, agencies, or companies.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Current agency structure</h2>
        <p>
          OCI states that HB410 in the 2025–2026 legislative session was signed by Governor Kemp on
          May 14, 2025. One section eliminated branch licensing. The current business-entity concept
          is the principal agency: the primary location an organization designates. A branch-agency
          license is no longer issued. Historical branch records can still exist; this page does not
          publish them as a current branch-license census.{' '}
          <Official href={s.regulator.agency_licensing_url} label="OCI agency licensing and renewals" />{' '}
          and <Official href={s.regulator.hb410_url} label="HB410" />.
        </p>
        <p>
          Agency renewal timing also changed under HB410. Agencies whose renewal date was December
          31, 2025 stay on that cycle for the renewal then underway. Later renewals move to the last
          day of the original approval month, on the biennial schedule OCI describes. A renewal date
          is not current license status, and presence in a search box is not proof a license is active.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">What was acquired</h2>
        <p>
          Bulk agency, producer, and company rosters were not acquired. Paid NIPR, Sircon, and NAIC
          roster products were not purchased. SERFF rate filings were not built. Individual producer
          pages were not scraped. Verification remains a live Sircon lookup: search-only, not zero.
        </p>
        <p>
          The easy official receivership evidence was acquired as standalone insurer events. None of
          these names were attached to an InsuranceTrustHub profile. Exact NAIC attachments: 0. Exact
          agency attachments: 0.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Receivership index</h2>
        <p>
          OCI&apos;s <Official href={s.regulator.receiverships_url} label="receiverships index" /> lists
          companies subject to receivership action since September 2010. Retrieved {s.receiverships.index_retrieved_at}.
          Each linked company page publishes a Liquidation Order document. The order dates inside
          those PDFs were not extracted, so this page does not invent an enforcement date from the
          day the index was retrieved. These seven names are insurers, not agencies.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          {indexEvents.map((event) => (
            <li key={event.source}>
              <Official href={event.source} label={event.name} /> — liquidation document published on
              the company page. {clockFor(event)}.
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Later receivership announcements</h2>
        <p>
          Friday Health Plans of Georgia, Inc. and Sonder Health Plans, Inc. are not on that September
          2010 index. They are stored as later official announcements, still at insurer grain, still
          without an NAIC join.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          {laterEvents.map((event) => (
            <li key={event.source}>
              <Official href={event.source} label={event.name} />. {clockFor(event)}.
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Mental health parity</h2>
        <p>
          The January 12, 2026 OCI press release says market-conduct examinations of twenty-two
          insurers followed the August 15, 2023 data-call report, and that the Commissioner issued
          nearly $25 million in fines. The release does not name the twenty-two insurers or their
          NAIC codes. Company-level orders were not acquired. The examination count and the fine
          description are the announcement&apos;s words, not a TrustHub company roster.{' '}
          <Official href={s.mental_health_parity.source} label="January 12, 2026 press release" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Complaints</h2>
        <p>
          Consumers can file a complaint with OCI. Intake is available. A public complaint dataset
          was not acquired, so this page publishes no complaint count. Absence of a table is not zero
          complaints, and a complaint is not a finding.{' '}
          <Official href={s.complaints.source} label="File a consumer insurance complaint" />.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">Coverage of this extract</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>License verification: known, Sircon lookup only.</li>
          <li>Agency, producer, and company bulk rosters: not acquired.</li>
          <li>Principal-agency structure after HB410: known. Current branch-license census: unsupported.</li>
          <li>Receivership index: partial. Named company pages, no NAIC attachment.</li>
          <li>Mental-health parity company orders: not acquired. The announcement is aggregate.</li>
          <li>Complaint intake: known. Complaint dataset: not acquired.</li>
          <li>SERFF filings, paid rosters, and niche entity classes: not acquired.</li>
        </ul>
        <p>
          Generated {s.generated_at}. Retrieval time is not an enforcement date, a license effective
          date, or a license expiration date.
        </p>
      </section>
    </div>
  );
}
