import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';

const CSI = 'https://csimt.gov/insurance/';
const LICENSING = 'https://csimt.gov/insurance/licensing/';
const MARKET_CONDUCT = 'https://csimt.gov/insurance/market-conduct/';
const SBS = 'https://sbs.naic.org/solar-external-lookup/';

export const metadata: Metadata = buildMetadata({
  title: 'Montana insurance licensing and regulatory evidence',
  description: 'Montana CSI and SBS source framework, separate insurance populations, and explicit roster-access limits.',
  path: '/montana',
});

const Source = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline underline-offset-2">{children}</a>
);

export default function MontanaInsurancePage() {
  return <main className="th-shell mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600"><Link href="/" className="underline">Home</Link> / Montana</nav>
    <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">State insurance intelligence · Montana CSI</p>
    <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#0A2540]">Montana insurance regulatory evidence</h1>
    <p className="mt-5 text-lg text-slate-700">The Montana State Auditor, Commissioner of Securities and Insurance (CSI) regulates insurance and provides public licensing and company lookup pathways. The State Based Systems (SBS) lookup is identified by CSI as its electronic lookup for producers and companies. No unrestricted statewide roster export was acquired in the October 14, 2026 preflight; current licensee rows and class totals are <strong>NOT_ACQUIRED</strong>, not zero.</p>

    <section className="mt-8 rounded-xl border border-slate-200 p-5" aria-labelledby="roster-status">
      <h2 id="roster-status" className="text-xl font-semibold">Statewide roster status</h2>
      <p className="mt-3 text-slate-700">CSI’s public lookup paths remain available for search and verification, but the preflight did not acquire a public unrestricted bulk roster. A producer list is described as available through a qualifying continuing-education provider use path, which is not general public bulk access. No person-by-person search was used to imitate a statewide export.</p>
      <p className="mt-3 text-slate-700">Current insurer, agency or business-entity, producer, adjuster, consultant, and surplus-lines rows, status distributions, and distinct counts: <strong>NOT_ACQUIRED</strong>.</p>
    </section>

    <section className="mt-8" aria-labelledby="separate-populations">
      <h2 id="separate-populations" className="text-2xl font-semibold">Separate license and regulatory populations</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-700">
        <li>Insurers and other insurance companies are separate from agencies and other business entities.</li>
        <li>Individual producers, adjusters, consultants, and surplus-lines licensees are distinct license populations.</li>
        <li>Appointments are insurer–producer relationships, not additional licensees.</li>
        <li>CSI notes that business-entity/agency licenses are perpetual and that an entity’s active status depends on having at least one active producer. This does not establish a statewide current entity count.</li>
      </ul>
      <p className="mt-3 text-slate-700">No combined Montana insurance census is reported. The source’s insurer/company and individual/agency search pathways are distinct, and appointment records are not summed with licensees.</p>
    </section>

    <section className="mt-8" aria-labelledby="exams-enforcement">
      <h2 id="exams-enforcement" className="text-2xl font-semibold">Examinations and enforcement are separate</h2>
      <p className="mt-3 text-slate-700">CSI publishes market-conduct examination reports. An examination is a supervisory review, not itself an enforcement action or a current insurer census. A bounded row-level examination, enforcement, disciplinary-order, or receivership corpus was not acquired in this retrieval; each remains NOT_ACQUIRED.</p>
    </section>

    <section className="mt-8 rounded-xl bg-slate-50 p-5" aria-label="Official sources">
      <h2 className="text-lg font-semibold">Official sources and source clock</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li><Source href={CSI}>Montana State Auditor, Commissioner of Securities and Insurance</Source> — regulator and company licensing context.</li>
        <li><Source href={LICENSING}>CSI insurance licensing</Source> — public licensing and SBS access information.</li>
        <li><Source href={SBS}>NAIC State Based Systems lookup</Source> — CSI-identified electronic lookup for producers and companies.</li>
        <li><Source href={MARKET_CONDUCT}>CSI market-conduct examinations</Source> — examination reports, kept separate from enforcement and license populations.</li>
      </ul>
      <p className="mt-4 text-sm text-slate-600">Source review clock: October 14, 2026 (G-B3 Montana evidence preflight). No source-native row extracts were acquired, so no current license as-of date, roster row count, or distinct-entity count is asserted.</p>
    </section>

    <section className="mt-8 border-t border-slate-200 pt-5">
      <h2 className="text-xl font-semibold">Evidence limits</h2>
      <p className="mt-2 text-sm text-slate-700">Dashboard annual filing activity is not a licensee population. Appointments are not licenses. Examinations are not enforcement findings. Missing acquired roster rows are NOT_ACQUIRED and do not mean no licensees exist. No local or county licensing work was performed.</p>
      <p className="mt-3 text-sm"><Link href="/ask?q=Montana%20insurance%20licensing%20evidence" className="underline">Ask about Montana insurance regulation</Link></p>
    </section>
  </main>;
}
