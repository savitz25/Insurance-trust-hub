import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { StateHubLinks } from '@/components/hubs/state-hub-links';

const DBR = 'https://dbr.ri.gov/insurance/insurance-companies/licensed-and-approved-insurance-companies';
const PROFESSIONALS = 'https://dbr.ri.gov/insurance/insurance-professionals';
const EXAMS = 'https://dbr.ri.gov/insurance/insurance-companies/examinations/financial-condition-examinations';
const ENFORCEMENT = 'https://dbr.ri.gov/insurance/legal-information';
const Source = ({ href, children }: { href: string; children: ReactNode }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline underline-offset-2">{children}</a>;
export const metadata: Metadata = buildMetadata({ title: 'Rhode Island insurance licensing and regulatory evidence', description: 'DBR insurer reports by source class and separate insurance license, appointment, examination, and enforcement records.', path: '/rhode-island' });
const reports = [
  ['Fraternal benefit societies', '26', 'https://dbr.ri.gov/sites/g/files/xkgbur696/files/2026-01/Fratenal_Benefit_Societies.pdf'],
  ['Health insurers', '16', 'https://dbr.ri.gov/sites/g/files/xkgbur696/files/2026-01/Health_Insurers.pdf'],
  ['Life insurers', '386', 'https://dbr.ri.gov/sites/g/files/xkgbur696/files/2026-01/Life_Insurance_Companies.pdf'],
  ['Mortgage guaranty insurers', '14', 'https://dbr.ri.gov/sites/g/files/xkgbur696/files/2026-01/Mortgage_Guaranty%20.pdf'],
  ['Property and casualty insurers', '840', 'https://dbr.ri.gov/sites/g/files/xkgbur696/files/2026-02/Property_and_Casualty_Insurance_Companies.pdf'],
  ['Title insurers', '19', 'https://dbr.ri.gov/sites/g/files/xkgbur696/files/2026-01/Title_Insurance_Companies.pdf'],
] as const;
export default function RhodeIslandInsurancePage() {
  return <main className="th-shell mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600"><Link href="/" className="underline">Home</Link> / Rhode Island</nav>
    <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">State insurance intelligence · Rhode Island DBR</p>
    <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#0A2540]">Rhode Island insurance regulatory evidence</h1>
    <p className="mt-5 text-lg text-slate-700">The Rhode Island Department of Business Regulation (DBR), Insurance Division publishes separate quarterly reports of licensed and approved insurance companies. Companies, agencies, individual producers, adjusters, surplus-lines authority, appointments, examinations, and enforcement observations remain separate populations.</p>
    <section className="mt-8 rounded-xl border border-slate-200 p-5"><h2 className="text-2xl font-semibold">Insurer reports by source class</h2><p className="mt-2 text-sm text-slate-700">Each linked DBR report displays a report date of October 2, 2026. The counts below are report-level class counts; they are not added into a statewide combined census.</p><ul className="mt-4 space-y-2">{reports.map(([label, count, href]) => <li key={label} className="flex flex-wrap justify-between gap-2 border-b py-2"><span>{label}</span><span><strong>{count}</strong> · <Source href={href}>official report</Source></span></li>)}</ul><p className="mt-3 text-sm text-slate-600">Retrieved October 14, 2026. DBR states that its public company reports are updated quarterly. Raw PDFs and SHA-256 values are attached in <code>data/rhode-island-ins-001/</code>.</p></section>
    <section className="mt-8 rounded-xl border border-slate-200 p-5"><h2 className="text-2xl font-semibold">Producer and business-entity records</h2><p className="mt-2 text-slate-700">DBR describes separate producer/business-entity, motor-vehicle damage appraiser, and adjuster report downloads and a public lookup path. The linked free XLSX report downloads returned a managed human-verification challenge during retrieval, so those rows were not acquired. Current individual producer, agency/business-entity, adjuster/appraiser, surplus-lines broker, and appointment populations are <strong>NOT_ACQUIRED</strong>; missing rows do not mean zero.</p><p className="mt-2"><Source href={PROFESSIONALS}>DBR insurance professional licensing and report sources</Source>. Appointments are insurer-producer relationships, not additional licensees.</p></section>
    <section className="mt-8"><h2 className="text-2xl font-semibold">Examinations, enforcement, and complaints</h2><p className="mt-2 text-slate-700">Financial-condition examination publications and insurance legal/enforcement records are separate regulatory sources. This evidence pass did not acquire bounded row-level examination, enforcement/order, receivership, or complaint extracts. Complaints do not establish violations; no name-only adverse joins or combined event totals are published.</p><p className="mt-2"><Source href={EXAMS}>DBR financial-condition examination information</Source> · <Source href={ENFORCEMENT}>DBR insurance legal information</Source></p></section>
    <section className="mt-8 border-t pt-6"><h2 className="text-xl font-semibold">Source clock and limits</h2><p className="mt-2 text-sm text-slate-700">Insurer reports: report date October 2, 2026; retrieved October 14, 2026. Professional-report links were attempted October 14, 2026 and blocked by managed verification. This page keeps insurer classes separate from people, entities, appointments, and regulatory events; it presents no combined insurance census.</p><StateHubLinks stateSlug="rhode-island" /></section>
  </main>;
}
