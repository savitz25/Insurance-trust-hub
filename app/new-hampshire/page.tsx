import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { StateHubLinks } from '@/components/hubs/state-hub-links';

export const metadata: Metadata = buildMetadata({
  title: 'New Hampshire insurance licensing and regulatory evidence',
  description: 'New Hampshire Insurance Department sources for separate insurer, agency, producer, adjuster, surplus-lines, appointment, and enforcement records.',
  path: '/new-hampshire',
});

const department = 'https://www.insurance.nh.gov/';
const lookup = 'https://www.insurance.nh.gov/producersadjusters/state-based-systems-sbs-connect';
const official = (url: string, label: string) => <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">{label}</a>;

export default function NewHampshireInsurancePage() {
  return <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm"><Link href="/" className="text-sky-700 underline">Home</Link><span aria-hidden="true"> / </span>New Hampshire research</nav>
    <header><p className="text-xs font-semibold uppercase tracking-wider text-sky-700">New Hampshire · Insurance Department evidence</p><h1 className="mt-2 text-3xl font-bold text-[#0A2540]">New Hampshire insurance licensing and regulatory records</h1><p className="mt-3 max-w-3xl text-slate-700">The New Hampshire Insurance Department administers state insurance licensing and market oversight. Insurers, agencies/business entities, individual producers, adjusters, surplus-lines authority, insurer appointments, and enforcement actions are distinct source populations.</p></header>

    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-2xl font-semibold text-[#0A2540]">License verification</h2><p className="mt-2 text-sm text-slate-700">The Department directs producer and adjuster lookups to State Based Systems (SBS). {official(department, 'New Hampshire Insurance Department')} · {official(lookup, 'Department SBS Connect guidance')}. The live lookup was not snapshotted as a dated statewide roster in this pass. Current statewide rows and distinct licensee totals: NOT_ACQUIRED, not zero.</p></section>

    <section className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Separate state insurance populations</h2><ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-700">
      <li>Insurers and certificates of authority: NOT_ACQUIRED as a current carrier roster.</li>
      <li>Agencies and other business entities: NOT_ACQUIRED; separate from individual producers.</li>
      <li>Resident and nonresident individual producers: NOT_ACQUIRED as dated person-license rows.</li>
      <li>Adjusters and adjusting entities: NOT_ACQUIRED; separate license classes.</li>
      <li>Surplus-lines authority: NOT_ACQUIRED; not merged with producer records.</li>
      <li>Appointments: NOT_ACQUIRED; an insurer-producer relationship, not another licensee.</li>
      <li>Examinations, orders, and enforcement: NOT_ACQUIRED; a complaint or examination is not itself a violation.</li>
    </ul></section>

    <section className="mt-10 border-t border-slate-200 pt-6"><h2 className="text-xl font-semibold text-[#0A2540]">Source clock and limits</h2><p className="mt-2 text-sm text-slate-700">Department and SBS sources checked October 12, 2026. SBS is a live verification system; no current date-stamped bulk extract was acquired. Historical annual-report counts are not presented as current. No combined insurance census or adverse name-only joins are asserted.</p><StateHubLinks stateSlug="new-hampshire" /></section>
  </main>;
}
