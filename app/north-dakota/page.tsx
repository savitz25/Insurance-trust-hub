import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';

const DEPARTMENT = 'https://www.insurance.nd.gov/';
const PRODUCERS = 'https://www.insurance.nd.gov/producers';
const RESIDENT_PRODUCER = 'https://www.insurance.nd.gov/producers/resident-producer';
const COMPANIES = 'https://www.insurance.nd.gov/companies';
const COMPANY_INFO = 'https://www.insurance.nd.gov/consumers/company-information';
const SURPLUS_LINES = 'https://www.insurance.nd.gov/producers/other-licenses/surplus-lines';
const SBS = 'https://sbs.naic.org/solar-external-lookup/';

export const metadata: Metadata = buildMetadata({
  title: 'North Dakota insurance licensing and regulatory evidence',
  description: 'North Dakota Insurance Department sources for distinct insurer, agency, producer, adjuster, surplus-lines, appointment, examination, and enforcement populations.',
  path: '/north-dakota',
});

const Source = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline underline-offset-2">{children}</a>
);

export default function NorthDakotaInsurancePage() {
  return <main className="th-shell mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600"><Link href="/" className="underline">Home</Link> / North Dakota</nav>
    <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">State insurance intelligence · North Dakota Insurance Department</p>
    <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#0A2540]">North Dakota insurance regulatory evidence</h1>
    <p className="mt-5 text-lg text-slate-700">The North Dakota Insurance Department oversees insurance company and producer licensing. The Department points consumers and licensees to separate company and State Based Systems (SBS) lookup paths. No dated, statewide bulk license roster was acquired in this retrieval; current row-level populations and distinct counts are <strong>NOT_ACQUIRED</strong>, not zero.</p>

    <section className="mt-8 rounded-xl border border-slate-200 p-5" aria-labelledby="access-status">
      <h2 id="access-status" className="text-xl font-semibold">Public lookup and roster status</h2>
      <p className="mt-3 text-slate-700">The Department announced its LicenseHub transition with NIPR in September 2026 and its producer page links to public license search. The Department also directs users to SBS for company and license verification. The linked NAIC external company lookup returned HTTP 403 during the October 14, 2026 retrieval; no access control was bypassed. The Department’s company abstract search is a company-name search, not a statewide license roster. No one-by-one name searches were used to reconstruct a population.</p>
      <p className="mt-3 text-slate-700">Source-native roster rows, current status distributions, and distinct licensee/entity totals: <strong>NOT_ACQUIRED</strong>.</p>
    </section>

    <section className="mt-8" aria-labelledby="populations">
      <h2 id="populations" className="text-2xl font-semibold">Separate insurance populations</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-700">
        <li>Insurers and other licensed or registered companies: NOT_ACQUIRED as a current company roster; distinct from agencies and people.</li>
        <li>Agencies and other business entities: NOT_ACQUIRED as dated entity-license rows; distinct from individual producers.</li>
        <li>Individual producers: NOT_ACQUIRED as dated person-license rows. North Dakota identifies the National Producer Number (NPN) as its license number and states resident producer licenses renew biennially.</li>
        <li>Adjusters and other individual license classes: NOT_ACQUIRED as separate populations.</li>
        <li>Surplus-lines producers and eligible surplus-lines insurers: NOT_ACQUIRED; producer authority and insurer eligibility are separate.</li>
        <li>Appointments: NOT_ACQUIRED; insurer-producer relationships, not additional licensees.</li>
      </ul>
      <p className="mt-3 text-slate-700">No combined North Dakota insurance census is reported. Company, business-entity, individual, insurer-eligibility, and appointment records are not added together.</p>
    </section>

    <section className="mt-8" aria-labelledby="oversight">
      <h2 id="oversight" className="text-2xl font-semibold">Examinations and enforcement</h2>
      <p className="mt-3 text-slate-700">The Department identifies financial and market-conduct examination materials and administrative oversight separately from licensing lookups. A dated row-level examination, enforcement, or disciplinary-action corpus was not acquired. Complaints, examinations, and enforcement findings are distinct; none is used here as a license count.</p>
    </section>

    <section className="mt-8 rounded-xl bg-slate-50 p-5" aria-label="Official sources">
      <h2 className="text-lg font-semibold">Official sources and source clock</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li><Source href={DEPARTMENT}>North Dakota Insurance Department</Source> — regulator.</li>
        <li><Source href={PRODUCERS}>Producer licensing</Source> and <Source href={RESIDENT_PRODUCER}>resident producer guidance</Source> — licensing, LicenseHub/NIPR, SBS lookup, NPN, and renewal information.</li>
        <li><Source href={COMPANIES}>Company licensing and resources</Source> and <Source href={COMPANY_INFO}>company information</Source> — company lookup and abstract-search pathways.</li>
        <li><Source href={SURPLUS_LINES}>Surplus-lines guidance</Source> — separate producer and eligible-insurer requirements.</li>
        <li><Source href={SBS}>State Based Systems public lookup</Source> — official-linked verification system.</li>
      </ul>
      <p className="mt-4 text-sm text-slate-600">Official Department pages and lookup pathways checked October 14, 2026. The linked external company lookup returned HTTP 403 on that date. No source-native roster extract or row count was acquired, so no current as-of license count is asserted.</p>
    </section>

    <section className="mt-8 border-t border-slate-200 pt-5">
      <h2 className="text-xl font-semibold">Evidence limits</h2>
      <p className="mt-2 text-sm text-slate-700">NOT_ACQUIRED means a roster was not acquired in this retrieval; it does not mean there are no licensees. Appointments are relationships, examinations are supervisory reviews, and neither is a licensee count. No provider rows, adverse joins, or combined totals are asserted.</p>
      <p className="mt-3 text-sm"><Link href="/ask?q=North%20Dakota%20insurance%20licensing%20evidence" className="underline">Ask about North Dakota insurance regulation</Link></p>
    </section>
  </main>;
}
