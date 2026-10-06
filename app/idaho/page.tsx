import type { Metadata } from 'next';
import Link from 'next/link';
import snapshot from '@/lib/idaho-intelligence/id-ins-001.json';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Idaho insurance company classes and license stock',
  description:
    'Idaho Department of Insurance 2024 annual report: regulated-entity classes, a mixed license stock, and administrative orders stay separate. A license count is not a person count.',
  path: '/idaho',
});

const fmt = (value: number) => value.toLocaleString('en-US');
const official = (url: string, label: string) => (
  <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">
    {label}
  </a>
);

const licensedRows: Array<[string, number]> = [
  ['County Mutual Fire', snapshot.licensed.countyMutualFire],
  ['Fraternal Benefit Societies', snapshot.licensed.fraternalBenefitSocieties],
  ['Hospital and Professional Service Corporation', snapshot.licensed.hospitalAndProfessionalServiceCorporation],
  ['Hospital Liabilities Trusts', snapshot.licensed.hospitalLiabilitiesTrusts],
  ['Life & Disability', snapshot.licensed.lifeAndDisability],
  ['Managed Care Organizations', snapshot.licensed.managedCareOrganizations],
  ['Petroleum Clean Water Trusts', snapshot.licensed.petroleumCleanWaterTrusts],
  ['Property & Casualty', snapshot.licensed.propertyAndCasualty],
  ['Title', snapshot.licensed.title],
];
const listedRows: Array<[string, number]> = [
  ['Accredited Reinsurers', snapshot.listed.accreditedReinsurers],
  ['Advisory Organization', snapshot.listed.advisoryOrganization],
  ['Certified Reinsurer', snapshot.listed.certifiedReinsurer],
  ['Charitable Gift Annuities', snapshot.listed.charitableGiftAnnuities],
  ['Reciprocal Jurisdiction Reinsurers', snapshot.listed.reciprocalJurisdictionReinsurers],
  ['Surplus Lines', snapshot.listed.surplusLines],
  ['Trusted Reinsurers', snapshot.listed.trustedReinsurers],
];
const registeredRows: Array<[string, number]> = [
  ['Purchasing Group', snapshot.registered.purchasingGroup],
  ['Rating Organizations', snapshot.registered.ratingOrganizations],
  ['Risk Retention Groups', snapshot.registered.riskRetentionGroups],
  ['Self-Funded Employee Health Care Plan', snapshot.registered.selfFundedEmployeeHealthCarePlan],
];
const otherRows: Array<[string, number]> = [
  ['Guaranty Associations', snapshot.otherRegulatedEntities.guarantyAssociations],
  ['Surplus Lines Associations', snapshot.otherRegulatedEntities.surplusLinesAssociations],
];

function ClassTable({ caption, rows }: { caption: string; rows: Array<[string, number]> }) {
  return (
    <table className="mt-3 w-full text-left text-sm">
      <caption className="mb-2 text-left font-semibold text-[#0A2540]">{caption}</caption>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="border-t border-slate-200">
            <td className="py-1 pr-3">{label}</td>
            <td className="py-1 text-right font-medium">{fmt(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function IdahoInsurancePage() {
  const producers = snapshot.orders.producers;
  const insurers = snapshot.orders.insurersAndSelfFundedPlans;
  const otherOrders = snapshot.orders.otherTitleAgenciesTpasRrgs;
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" className="text-sky-700 underline">Home</Link>
        <span aria-hidden="true"> / </span>Idaho research
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Idaho · Department of Insurance</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Idaho insurance classes and license stock</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          The {snapshot.sourceTitle} prints company classes and a license stock as different grains. This page does not add them, does not split the license stock into persons and businesses, and does not rank insurers or people.
        </p>
      </header>

      <section aria-label="Idaho insurance evidence" className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(snapshot.totalCompaniesRegulatedEntities)}</strong>
          <p className="mt-1 text-sm text-slate-600">Printed total of companies and regulated entities. The class lines stay separate.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(snapshot.licensesMaintained)}</strong>
          <p className="mt-1 text-sm text-slate-600">Licenses maintained, including business entities and individuals. Person and business are {snapshot.personVsBusiness}.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">Not combined</strong>
          <p className="mt-1 text-sm text-slate-600">No combined Idaho insurance population is published. Graph writes: {snapshot.graphWrites}.</p>
        </div>
      </section>

      <section className="mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">What the report clock covers</h2>
        <p>
          The {official(snapshot.source, '2024 annual report')} letter is dated November 1, 2025. It says the data are based on annual statements submitted as of December 31, 2024, by insurance companies licensed to operate in Idaho. That clock belongs to those company statements. The sentence that the Producer Licensing Section maintains {fmt(snapshot.licensesMaintained)} licenses does not print its own as-of date. File SHA-256 {snapshot.sha256}. Retrieved {snapshot.retrievedAt}.
        </p>

        <h2 className="text-lg font-semibold text-[#0A2540]">{snapshot.classificationLabel}</h2>
        <p>
          The report prints {fmt(snapshot.totalCompaniesRegulatedEntities)} as “Total Companies Regulated Entities.” The class lines below are that classification. They are not added again on this page. Hospital Liabilities Trusts prints 0 in that class. A printed zero for one class is not a producer count. Surplus lines, risk retention groups, purchasing groups, and title companies stay in their own rows.
        </p>
        <ClassTable caption="Licensed" rows={licensedRows} />
        <ClassTable caption="Listed" rows={listedRows} />
        <ClassTable caption="Registered" rows={registeredRows} />
        <ClassTable caption="Other regulated entities" rows={otherRows} />

        <h2 className="text-lg font-semibold text-[#0A2540]">Licenses are not the company total</h2>
        <p>
          The Producer Licensing Section issues and maintains {fmt(snapshot.licensesMaintained)} licenses, including resident and non-resident business entities and individuals. The report says the section oversees {snapshot.licenseTypesOverseen} license types. The names of those types are not listed in that sentence. Person and business are {snapshot.personVsBusiness}. Resident and nonresident inside the stock are {snapshot.residentVsNonresident}. This stock is not added to {fmt(snapshot.totalCompaniesRegulatedEntities)}. A named producer roster was {snapshot.notAcquired.individualProducerRoster}. An adjuster roster was {snapshot.notAcquired.adjusterRoster}. An appointment roster was {snapshot.notAcquired.appointmentRoster}. An appointment is not a license.
        </p>
        <p>
          The 2024 new-license tables are a flow by line of authority, split on the page between individual and business and between resident and nonresident. They are not the {fmt(snapshot.licensesMaintained)} stock. This page does not print a sum of those rows, because one license line is not one person.
        </p>
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left font-semibold text-[#0A2540]">Individual — new licenses 2024</caption>
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-1 pr-3">Line of authority</th>
              <th className="py-1 pr-3 text-right">Resident</th>
              <th className="py-1 text-right">Nonresident</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.newLicenses2024.individual.map((row) => (
              <tr key={row.line} className="border-t border-slate-200">
                <td className="py-1 pr-3">{row.line}</td>
                <td className="py-1 pr-3 text-right">{fmt(row.resident)}</td>
                <td className="py-1 text-right">{fmt(row.nonresident)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left font-semibold text-[#0A2540]">Business — new licenses 2024</caption>
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-1 pr-3">Line of authority</th>
              <th className="py-1 pr-3 text-right">Resident</th>
              <th className="py-1 text-right">Nonresident</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.newLicenses2024.business.map((row) => (
              <tr key={row.line} className="border-t border-slate-200">
                <td className="py-1 pr-3">{row.line}</td>
                <td className="py-1 pr-3 text-right">{fmt(row.resident)}</td>
                <td className="py-1 text-right">{fmt(row.nonresident)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-lg font-semibold text-[#0A2540]">Orders are not populations</h2>
        <p>
          Producer orders: suspended {fmt(producers.licenseSuspended)}, revoked {fmt(producers.licenseRevoked)}, denied {fmt(producers.licenseDenied)}, surrendered {fmt(producers.licenseSurrendered)}, penalty only {fmt(producers.penaltyOnly)}, other orders {fmt(producers.otherOrders)}. Those are administrative orders. They are not the {fmt(snapshot.licensesMaintained)} licenses. A printed zero is that order category, not a statement that no producers exist.
        </p>
        <p>
          Insurers and self-funded plans: certificate of authority suspended {fmt(insurers.certificateOfAuthoritySuspended)}, revoked {fmt(insurers.certificateOfAuthorityRevoked)}, reinstated {fmt(insurers.certificateOfAuthorityReinstated)}, penalty only {fmt(insurers.penaltyOnly)}, block non-renewal and/or withdrawal {fmt(insurers.blockNonRenewalOrWithdrawal)}, workers’ compensation rate deviation {fmt(insurers.workersCompensationRateDeviation)}, market conduct enforcement orders {fmt(insurers.marketConductEnforcementOrders)}, orders adopting a report of examination {fmt(insurers.ordersAdoptingReportOfExamination)}. Examination orders are not a company census.
        </p>
        <p>
          The report’s other group, for example title insurance agencies, TPAs, and risk retention groups, prints license suspended, revoked, or denied as one combined line: {fmt(otherOrders.licenseSuspendedRevokedOrDenied)}. This page does not split that line. Orders adopting a report of examination in that group: {fmt(otherOrders.ordersAdoptingReportOfExamination)}.
        </p>

        <h2 className="text-lg font-semibold text-[#0A2540]">Complaints, exams, and filings stay separate</h2>
        <p>
          Consumer affairs key statistics: {fmt(snapshot.complaints.closed)} closed consumer complaints and {fmt(snapshot.complaints.new)} new consumer complaints. The report does not say those are the same rows. Consumer contacts: {fmt(snapshot.complaints.contacts)}. Complaint recoveries: ${fmt(snapshot.complaints.recoveriesUsd)}. A complaint is not a finding. No complaint was joined to a licensee by name.
        </p>
        <p>
          Fraud investigations: {fmt(snapshot.fraud.referredToInHouseAttorneys)} cases referred to in-house attorneys, {fmt(snapshot.fraud.referredToStateProsecutors)} referred to state prosecutors, and {fmt(snapshot.fraud.pendingAtAttorneyGeneral)} pending at the Office of the Attorney General as of December 31, 2024. Those are cases, not licenses.
        </p>
        <p>
          Market oversight: {fmt(snapshot.examinations.titleExaminationsCompleted)} title examinations completed and {fmt(snapshot.examinations.marketAnalysisReviewsCompleted)} market analysis reviews completed. Those are not the {fmt(snapshot.licensed.title)} licensed title companies. Continuing education active courses: {fmt(snapshot.continuingEducationCourses)}. A course is not a licensee.
        </p>
        <p>
          Rates and forms says the department receives filings from {fmt(snapshot.serff.companiesSentenceRepeatsRegulatedEntities)} companies licensed or registered to sell products in Idaho. That repeats the regulated-entity total. It is not a second population. SERFF filings in 2024: {fmt(snapshot.serff.filings)}, consisting of {fmt(snapshot.serff.documents)} documents and {fmt(snapshot.serff.rates)} rates. A filing is not a license.
        </p>
        <p>
          A bulk download from NAIC State Based Systems was {snapshot.notAcquired.sbsBulkExport}. A lookup is not a census. Boise is geography only. This page publishes no city route.
        </p>
      </section>
    </main>
  );
}
