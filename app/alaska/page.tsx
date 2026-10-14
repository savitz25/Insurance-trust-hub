import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { StateHubLinks } from '@/components/hubs/state-hub-links';

export const metadata: Metadata = buildMetadata({
  title: 'Alaska insurance licensing and regulatory evidence',
  description: 'Alaska Division of Insurance sources for distinct insurer, agency, producer, adjuster, surplus-lines, appointment, and enforcement records.',
  path: '/alaska',
});

const department = 'https://www.commerce.alaska.gov/web/ins/';
const lookup = 'https://www.commerce.alaska.gov/web/ins/Consumers/ConsumerTools/ResearchaCompany.aspx';
const producers = 'https://www.commerce.alaska.gov/web/ins/InsuranceProducer';
const resources = 'https://www.commerce.alaska.gov/web/ins/Resources';
const annual = 'https://www.commerce.alaska.gov/web/Portals/11/Pub/AnnualReport_2025.pdf';
const surplus = 'https://www.commerce.alaska.gov/web/Portals/11/Pub/B26-01.pdf';
const official = (url: string, label: string) => <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">{label}</a>;

export default function AlaskaInsurancePage() {
  return <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm"><Link href="/" className="text-sky-700 underline">Home</Link><span aria-hidden="true"> / </span>Alaska research</nav>
    <header><p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Alaska · Division of Insurance evidence</p><h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Alaska insurance licensing and regulatory records</h1><p className="mt-3 max-w-3xl text-slate-700">The Alaska Division of Insurance regulates insurer authority and insurance licensees. The state provides live company/licensee lookup and dated regulator reports; no combined insurance census is asserted.</p></header>
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-2xl font-semibold text-[#0A2540]">Current licensee populations</h2><p className="mt-2 text-sm text-slate-700">The Department links to a public Company and Licensee Search for companies, agents, and brokers. A date-stamped free statewide export was not acquired in this pass; current row rosters and licensee totals are <strong>NOT_ACQUIRED</strong>, not zero.</p><ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-700"><li>Insurers/certificates of authority — NOT_ACQUIRED as a current roster.</li><li>Agencies and other business entities — NOT_ACQUIRED; separate from people.</li><li>Individual producers and adjusters — live lookup is available; dated bulk rows NOT_ACQUIRED.</li><li>Surplus-lines eligibility — separately published insurer eligibility list; it is not an admitted insurer roster or broker-license count.</li><li>Appointments — insurer-to-producer relationships, not separate licensees; NOT_ACQUIRED as row data.</li></ul></section>
    <section className="mt-8"><h2 className="text-2xl font-semibold text-[#0A2540]">Separate oversight evidence</h2><p className="mt-2 text-sm text-slate-700">The Division publishes dated orders, license actions, financial examinations, market-conduct examinations, and annual reports. These are separate event/report classes: an examination is not automatically an enforcement finding, a complaint is not a violation, and insurer premium activity is not an insurer-license census.</p><ul className="mt-3 list-disc space-y-2 pl-6 text-sm"> <li>{official(resources, 'Division resources: orders, examinations, annual reports, notices')}</li><li>{official(annual, '87th annual report, calendar 2024 / fiscal 2025')}</li><li>{official(surplus, '2026 eligible surplus-lines insurer bulletin B26-01, dated February 5, 2026')}</li></ul></section>
    <section className="mt-8 border-t border-slate-200 pt-6"><h2 className="text-xl font-semibold text-[#0A2540]">Sources and clocks</h2><p className="mt-2 text-sm text-slate-700">Official sources checked October 14, 2026. Company and licensee search is live. Bulletin B26-01 is dated February 5, 2026. The latest annual report covers calendar year 2024 and fiscal year 2025. Source clocks differ by record class.</p><ul className="mt-3 list-disc space-y-2 pl-6 text-sm"><li>{official(department, 'Alaska Division of Insurance')}</li><li>{official(lookup, 'Company and licensee search')}</li><li>{official(producers, 'Producer and licensing information')}</li></ul><StateHubLinks stateSlug="alaska" /></section>
  </main>;
}
