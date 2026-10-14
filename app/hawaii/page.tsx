import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';

const INS = 'https://www.cca.hawaii.gov/ins/';
const CATEGORIES = 'https://cca.hawaii.gov/ins/insurance-license-categories/';
const COMPANY = 'https://www.cca.hawaii.gov/ins/insurance-company-license/';
const BUSINESS = 'https://cca.hawaii.gov/business-check/';

export const metadata: Metadata = buildMetadata({
  title: 'Hawaii insurance licensing and regulatory evidence',
  description: 'Hawaii Insurance Division licensing classes and source-native evidence limits.',
  path: '/hawaii',
});

const Source = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline underline-offset-2">{children}</a>
);

export default function HawaiiInsurancePage() {
  return <main className="th-shell mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600"><Link href="/" className="underline">Home</Link> / Hawaii</nav>
    <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">State insurance intelligence · Hawaii Insurance Division</p>
    <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#0A2540]">Hawaii insurance regulatory evidence</h1>
    <p className="mt-5 text-lg text-slate-700">The Hawaii DCCA Insurance Division licenses and examines insurers and insurance producers, oversees self-insurers and captives, reviews rate and policy filings, and investigates insurance complaints.</p>
    <section className="mt-8 rounded-xl border border-slate-200 p-5" aria-labelledby="roster-status">
      <h2 id="roster-status" className="text-xl font-semibold">Statewide roster status</h2>
      <p className="mt-3 text-slate-700">Current Hawaii insurer, agency, producer, adjuster, and surplus-lines roster rows and counts are <strong>NOT_ACQUIRED</strong> from a statewide bulk export during this retrieval. The Division provides public license-search pathways; this page does not infer a population from individual searches.</p>
    </section>
    <section className="mt-8" aria-labelledby="separate-records">
      <h2 id="separate-records" className="text-2xl font-semibold">Separate licenses and regulatory records</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-700">
        <li>Insurers, agencies or business entities, individual producers, adjusters, and surplus-lines licensees are separate populations.</li>
        <li>Appointments are relationships between an insurer and producer, not additional licensees.</li>
        <li>Examinations and enforcement actions are separate regulatory events. Complaint intake does not establish wrongdoing.</li>
        <li>No combined Hawaii insurance census or unsupported ranking is presented.</li>
      </ul>
    </section>
    <section className="mt-8 rounded-xl bg-slate-50 p-5" aria-label="Official sources">
      <h2 className="text-lg font-semibold">Official sources</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li><Source href={INS}>Hawaii Insurance Division</Source> — regulator scope and public license search.</li>
        <li><Source href={CATEGORIES}>Insurance license categories</Source> — source-defined lines and roles.</li>
        <li><Source href={COMPANY}>Insurance company licensing</Source> — insurer authority pathway.</li>
        <li><Source href={BUSINESS}>DCCA business check</Source> — business identity lookup, not insurance license evidence by itself.</li>
      </ul>
    </section>
  </main>;
}
