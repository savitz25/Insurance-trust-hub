import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import snapshot from '@/lib/alabama-intelligence/al-ins-001.json';

export const metadata: Metadata = buildMetadata({
  title: 'Alabama insurance licensing and ALDOI regulatory evidence',
  description:
    'Alabama Department of Insurance 2024 company-type counts, separate License Type and Business Type counts, receivership names, and examination activity. Those grains are not one census.',
  path: '/alabama',
});

const fmt = (n: number) => n.toLocaleString('en-US');
const official = (url: string, label: string) => (
  <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">
    {label}
  </a>
);

const report = snapshot.annualReport;
const companySearch = snapshot.links.companySearch;
const licenseeSearch = snapshot.links.licenseeSearch;
const enforcementSearch = snapshot.links.enforcementSearch;
const complaints = snapshot.links.complaintIntake;
const receivershipUrl = snapshot.receivership.source;
const examIndexUrl = snapshot.examIndex.source;
const unauthorizedUrl = snapshot.links.unauthorizedCompanies;
const producerCd = snapshot.producerDirectoryCd.source;

export default function AlabamaInsurancePage() {
  const activeReceivership = snapshot.receivership.rows.filter((row) => row.status === 'ACTIVE').length;
  const closedReceivership = snapshot.receivership.rows.filter((row) => row.status === 'CLOSED').length;
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" className="text-sky-700 underline">Home</Link>
        <span aria-hidden="true"> / </span>Alabama research
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Alabama · ALDOI regulator evidence</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Alabama insurance licensing and regulatory records</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          The Alabama Department of Insurance publishes a 2024 annual report with company-type counts and two side-by-side licensee tables. An authorized company, a business-entity license, an individual producer, an adjuster, a surplus-lines broker, and a managing general agent are different records. They are not added together.
        </p>
      </header>

      <section aria-label="Alabama evidence summary" className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(snapshot.companyOverview.printedTotal)}</strong>
          <p className="mt-1 text-sm">Company-type entries by domicile in the 2024 annual report. These are not distinct companies and not an authorized-insurer census.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(snapshot.licenseType.printedTotal)}</strong>
          <p className="mt-1 text-sm">License Type total. A separate Business Type total is {fmt(snapshot.businessType.printedTotal)}. The two totals are not added.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-lg text-[#0A2540]">NOT_ACQUIRED</strong>
          <p className="mt-1 text-sm">Company, agency, producer, adjuster, surplus-lines, and managing-general-agent row rosters are null. Lookup remains OPEN_SEARCH_ONLY.</p>
        </div>
      </section>

      <section id="companies" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Company types</h2>
        <p className="mt-2 text-sm text-slate-700">
          The {official(report.source, '2024 Annual Report')} prints this Insurance Company Overview. The report covers calendar year 2024. The page layout date is {report.layoutDate}, which is a production date and not a separate authority clock. Retrieved {report.retrievedAt}. SHA-256 {report.sha256}. Category entries are not distinct companies. Life and Health, Property and Casualty, and Title stay in their own rows. Premium finance, preneed, pharmacy benefit managers, captives, service contracts, automobile clubs, and purchasing groups are in the same printed table and are not relabeled as authorized insurance companies. The printed total is not an authorized-insurer census and not a row roster. Company-level rows and NAIC codes: NOT_ACQUIRED. Current company status requires the {official(companySearch, 'NAIC insurance company search')}. That search is not an Alabama bulk roster.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Alabama company types by domicile</caption>
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-3">Company type</th>
                <th className="py-2 pr-3">Domestic</th>
                <th className="py-2 pr-3">Foreign</th>
                <th className="py-2 pr-3">Alien</th>
                <th className="py-2 pr-3">Other</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.companyOverview.rows.map((row) => (
                <tr key={row.name} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{row.name}</td>
                  <td className="py-2 pr-3">{fmt(row.domestic)}</td>
                  <td className="py-2 pr-3">{fmt(row.foreign)}</td>
                  <td className="py-2 pr-3">{fmt(row.alien)}</td>
                  <td className="py-2 pr-3">{fmt(row.other)}</td>
                  <td className="py-2">{fmt(row.total)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 pr-3">Total</td>
                <td className="py-2 pr-3">{fmt(snapshot.companyOverview.domestic)}</td>
                <td className="py-2 pr-3">{fmt(snapshot.companyOverview.foreign)}</td>
                <td className="py-2 pr-3">{fmt(snapshot.companyOverview.alien)}</td>
                <td className="py-2 pr-3">{fmt(snapshot.companyOverview.other)}</td>
                <td className="py-2">{fmt(snapshot.companyOverview.printedTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="licensees" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">License Type and Business Type</h2>
        <p className="mt-2 text-sm text-slate-700">
          The Producer Licensing Division page prints two tables. The headers are License Type and Business Type. The report does not label one column as individuals and the other as agencies. License Type counts are not proven persons. Business Type counts are not proven agencies. Managing general agent appears only on the Business Type side. Adjuster, surplus lines broker, and title insurance agent appear on both sides and stay separate. The tables are not added. The narrative figure of licensees who can sell insurance is not reconciled to either table.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="mb-2 text-left font-semibold text-[#0A2540]">License Type</caption>
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="py-2 pr-3">License Type</th>
                  <th className="py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.licenseType.rows.map((row) => (
                  <tr key={row.name} className="border-b border-slate-100">
                    <td className="py-2 pr-3">{row.name}</td>
                    <td className="py-2">{fmt(row.total)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 pr-3">Totals</td>
                  <td className="py-2">{fmt(snapshot.licenseType.printedTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="mb-2 text-left font-semibold text-[#0A2540]">Business Type</caption>
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="py-2 pr-3">Business Type</th>
                  <th className="py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.businessType.rows.map((row) => (
                  <tr key={row.name} className="border-b border-slate-100">
                    <td className="py-2 pr-3">{row.name}</td>
                    <td className="py-2">{fmt(row.total)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 pr-3">Totals</td>
                  <td className="py-2">{fmt(snapshot.businessType.printedTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-700">
          The same report says the division issued more than {fmt(snapshot.narrative.licensesIssuedMoreThan)} licenses. That figure is approximate issuance activity, not the current stock of licenses. It also says the division currently regulates {fmt(snapshot.narrative.licenseesWhoCanSell)} licensees who can sell insurance in Alabama, {fmt(snapshot.narrative.basedInTheState)} of them based in the state. “Based in the state” is a location attribute, not a license class. The narrative does not give those three figures a separate as-of date. They are not added to either table. Row rosters for agencies, individual producers, adjusters, surplus-lines brokers, and managing general agents: null. Publication: OPEN_SEARCH_ONLY / NOT_ACQUIRED.
        </p>
        <p className="mt-3 text-sm text-slate-700">
          {official(licenseeSearch, 'Check License Status / Licensee Search')} and the {official(companySearch, 'NAIC insurance agent search')} look up one record at a time. The {official(producerCd, 'producer directory CD')} is sold to continuing-education providers only and was not purchased. No person record becomes a business profile.
        </p>
      </section>

      <section id="receivership" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Rehabilitation and liquidation</h2>
        <p className="mt-2 text-sm text-slate-700">
          ALDOI publishes {snapshot.receivership.rows.length} names on the {official(receivershipUrl, 'companies in rehabilitation and liquidation')} list, retrieved {snapshot.receivership.retrievedAt}. {activeReceivership} are labeled ACTIVE and {closedReceivership} are labeled CLOSED. The list page does not print an authority as-of date. Names are the source labels. DEARBOR is printed that way and is not expanded here. These names are not joined to company profiles, to the company-type table, or to NAIC codes. This list is not the company-type total.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Alabama receivership companies</caption>
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-3">Company</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.receivership.rows.map((row) => (
                <tr key={row.detailId} className="border-b border-slate-100">
                  <td className="py-2 pr-3">
                    <a className="text-sky-700 underline" href={`${receivershipUrl.replace('ReceivershipCompanyList.aspx', 'ReceivershipCompanyDetails.aspx')}?ID=${row.detailId}`} rel="noopener noreferrer" target="_blank">
                      {row.name}
                    </a>
                  </td>
                  <td className="py-2">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="unauthorized" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Unauthorized companies and surplus lines</h2>
        <p className="mt-2 text-sm text-slate-700">
          The page labeled {official(unauthorizedUrl, 'Unauthorized Insurance Companies')} is surplus-lines filing instructions and an import tool. It is not an unauthorized-company roster. Unauthorized-company rows: null. NOT_ACQUIRED. Surplus-lines broker counts above are the annual-report category rows. A surplus-lines broker roster was not acquired.
        </p>
      </section>

      <section id="enforcement" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Enforcement</h2>
        <p className="mt-2 text-sm text-slate-700">
          ALDOI provides an {official(enforcementSearch, 'enforcement action search')}. The action corpus is NOT_ACQUIRED. Exact adverse attachments: 0. Name-only adverse joins: 0. A search form is not an enforcement census.
        </p>
      </section>

      <section id="exams" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">2024 examinations</h2>
        <p className="mt-2 text-sm text-slate-700">
          The 2024 Alabama Insurance Examination Report prints examination activity, not a count of licensed producers. Grand total: {fmt(snapshot.examinations.examsGiven)} exams given, {fmt(snapshot.examinations.examsPassed)} passed, printed passing ratio {snapshot.examinations.passingRatioPrinted}. Online: {fmt(snapshot.examinations.onlineExamsGiven)} given and {fmt(snapshot.examinations.onlineExamsPassed)} passed. The report also names testing centers. Those place names are geography only and are not published here as city license counts. No city pages are published.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="mb-2 text-left font-semibold text-[#0A2540]">Exams given, all attempts</caption>
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-3">Exam</th>
                <th className="py-2 pr-3">Given</th>
                <th className="py-2 pr-3">Passed</th>
                <th className="py-2">Printed ratio</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.examinations.types.map((row) => (
                <tr key={row.name} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{row.name}</td>
                  <td className="py-2 pr-3">{fmt(row.given)}</td>
                  <td className="py-2 pr-3">{fmt(row.passed)}</td>
                  <td className="py-2">{row.ratio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate-700">
          First attempts only are a separate grain and are not added to the all-attempts total. The report says a first attempt is the first time an individual has taken a particular exam. Grand total: {fmt(snapshot.examinations.firstAttempts.examsGiven)} given, {fmt(snapshot.examinations.firstAttempts.examsPassed)} passed, printed passing ratio {snapshot.examinations.firstAttempts.passingRatioPrinted}.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="mb-2 text-left font-semibold text-[#0A2540]">First attempts only</caption>
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-3">Exam</th>
                <th className="py-2 pr-3">Given</th>
                <th className="py-2 pr-3">Passed</th>
                <th className="py-2">Printed ratio</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.examinations.firstAttempts.types.map((row) => (
                <tr key={row.name} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{row.name}</td>
                  <td className="py-2 pr-3">{fmt(row.given)}</td>
                  <td className="py-2 pr-3">{fmt(row.passed)}</td>
                  <td className="py-2">{row.ratio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-700">
          The {official(examIndexUrl, 'examination reports')} index lists {snapshot.examIndex.pdfLinks} PDF links. The labels span {snapshot.examIndex.labelYearMin} through {snapshot.examIndex.labelYearMax}. {snapshot.examIndex.marketConductOrComplianceLabels} labels say market conduct or compliance. The index is not a license roster, not a company count, and not an enforcement corpus. The PDF files were not downloaded. No company profile was linked by name.
        </p>
      </section>

      <section id="complaints" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Complaint and inquiry activity</h2>
        <p className="mt-2 text-sm text-slate-700">
          Consumer Services intake is KNOWN through the {official(complaints, 'file a consumer complaint')} form. The 2024 annual report also prints division activity by line. That activity is not a provider-level complaint census, not an enforcement finding, and not a licensee count. The report says Consumer Services handled {fmt(snapshot.consumerServices.handledComplaintsAndInquiries)} complaints and inquiries. That figure is the sum of the complaint column and the inquiry column. The department recovered {snapshot.consumerServices.recoveredForConsumers} for consumers through complaint resolutions. That recovery is activity, not a case roster.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">2024 complaint and inquiry activity</caption>
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-3">Line of insurance</th>
                <th className="py-2 pr-3">Complaints</th>
                <th className="py-2">Inquiries</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.consumerServices.rows.map((row) => (
                <tr key={row.line} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{row.line}</td>
                  <td className="py-2 pr-3">{fmt(row.complaints)}</td>
                  <td className="py-2">{fmt(row.inquiries)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 pr-3">Totals</td>
                <td className="py-2 pr-3">{fmt(snapshot.consumerServices.complaintTotal)}</td>
                <td className="py-2">{fmt(snapshot.consumerServices.inquiryTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="filings" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">2024 rate and form filings</h2>
        <p className="mt-2 text-sm text-slate-700">
          Filing totals are division activity, not licenses. Property and casualty prints homeowners {fmt(snapshot.filings.propertyAndCasualty.homeowners)} (the report spells the line Homewoners), auto {fmt(snapshot.filings.propertyAndCasualty.auto)}, and other lines {fmt(snapshot.filings.propertyAndCasualty.otherLines)}. Those three add to the printed total {fmt(snapshot.filings.propertyAndCasualty.printedTotal)}. The Life and Health section prints four lines that do not add to the printed total on that page, so those Life and Health filing lines are not published.
        </p>
      </section>

      <section id="clocks" className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-semibold text-[#0A2540]">Source clocks and limits</h2>
        <p className="mt-2 text-sm text-slate-700">
          Annual-report tables: calendar year 2024, layout date {report.layoutDate}, retrieved {report.retrievedAt}. Receivership list and examination-report index: retrieved {snapshot.receivership.retrievedAt}, with no receivership authority as-of date on the list. Company search, licensee search, enforcement search, and complaint intake were observed the same day. Individual live license status was not snapshotted. Page generated {snapshot.generatedAt}. No universal Alabama insurance as-of date is asserted.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Exact company, agency, and license matches: NOT_ACQUIRED. Exact enforcement attachments: 0. New canonical organizations: 0. Graph writes: 0. Claim eligibility changes: 0. Statewide company rows, individual producer rows, agency rows, adjuster rows, surplus-lines broker rows, managing-general-agent rows, the enforcement corpus, unauthorized-company rows, and provider complaint cases: NOT_ACQUIRED. Counts that were not acquired stay null. State Fire Marshal permits are not insurance producer licenses. Birmingham, Montgomery, Huntsville, Tuscaloosa, and Mobile are geography only. No city pages are published.
        </p>
        <p className="mt-3 text-sm">
          <Link className="text-sky-700 underline" href="/ask?q=Alabama%20insurance%20license">Ask about Alabama ALDOI evidence</Link>
        </p>
      </section>
    </main>
  );
}
