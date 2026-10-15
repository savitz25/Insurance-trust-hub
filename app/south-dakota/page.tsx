import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";

const department = "https://dlr.sd.gov/insurance/";
const verification = "https://dlr.sd.gov/insurance/license_inquiry_service.aspx";
const producers = "https://dlr.sd.gov/insurance/producers.aspx";
const listedCompanies = "https://dlr.sd.gov/insurance/company_listings/domestics.aspx";
const farmMutuals = "https://dlr.sd.gov/insurance/company_listings/farm_mutuals.aspx";
const foreignCompanies = "https://dlr.sd.gov/insurance/company_listings/documents/companies_licensed_foreign.pdf";
const actions = "https://dlr.sd.gov/insurance/admin_actions.aspx";
const examinations = "https://dlr.sd.gov/insurance/market_conduct_and_multi_state_examinations.aspx";
const sbs = "https://sbs.naic.org/solar-external-lookup/";

export const metadata: Metadata = buildMetadata({
  title: "South Dakota insurance licensing and regulatory evidence",
  description: "South Dakota Division of Insurance source-dated company observations, SBS verification, and separate producer, agency, examination, and enforcement populations.",
  path: "/south-dakota",
});

function Source({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline underline-offset-2">{children}</a>;
}

export default function SouthDakotaInsurancePage() {
  return <main className="th-shell mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600"><Link href="/" className="underline">Home</Link> / South Dakota</nav>
    <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">State insurance regulation · South Dakota Division of Insurance</p>
    <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#0A2540]">South Dakota insurance regulatory evidence</h1>
    <p className="mt-5 text-lg text-slate-700">The South Dakota Department of Labor and Regulation’s Division of Insurance regulates insurers and insurance producers. Its public State Based Systems lookup verifies individual producers, agencies, and insurance companies. The available state-published company tables have their own scopes and dates; they do not establish one current, complete insurer census.</p>

    <section className="mt-8 rounded-xl border border-slate-200 p-5" aria-labelledby="company-evidence">
      <h2 id="company-evidence" className="text-2xl font-semibold">Source-dated company observations</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-700">
        <li>The Division’s source-labelled “Domestic Companies Licensed to Sell Insurance and Actively Marketing in South Dakota” table contains 22 named company observations with 22 distinct listed NAIC identifiers, as of October 2023. The page states that its scope excludes farm mutual and captive insurance companies. This historical table is not a current complete insurer count.</li>
        <li>The Division’s separate Farm Mutual Companies table contains 7 named farm-mutual company observations, as of September 2026. This source-defined class is kept separate from the older company table.</li>
        <li>The Division also publishes a foreign-insurer listing dated March 27, 2024. Its linked file returned HTTP 404 during this retrieval, so its rows and current status were <strong>NOT_ACQUIRED</strong>.</li>
      </ul>
      <p className="mt-3 text-sm text-slate-700">These dated tables are cited at their source scopes. Their observations are not added into a combined current insurer census. Current comprehensive insurer and status totals: <strong>NOT_ACQUIRED</strong>.</p>
    </section>

    <section className="mt-8 rounded-xl border border-slate-200 p-5" aria-labelledby="license-populations">
      <h2 id="license-populations" className="text-2xl font-semibold">Other licensing populations</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-700">
        <li>Agencies and insurance business entities: the state links SBS verification; dated statewide roster rows and status distribution <strong>NOT_ACQUIRED</strong>.</li>
        <li>Individual producers: a person population, separate from agencies and insurers; current statewide rows and status distribution <strong>NOT_ACQUIRED</strong>.</li>
        <li>Adjusters and other individual license classes: separate populations; dated statewide rows <strong>NOT_ACQUIRED</strong>.</li>
        <li>Surplus-lines producers and insurer eligibility: separate license and company-authority populations; current roster rows <strong>NOT_ACQUIRED</strong>.</li>
        <li>Appointments and terminations: insurer–producer relationships, not additional licensees; statewide relationship rows <strong>NOT_ACQUIRED</strong>.</li>
      </ul>
      <p className="mt-3 text-sm text-slate-700">The official verification service is a lookup, not a dated bulk roster. No name-by-name searches were used to reconstruct statewide totals, and no paid list or data order was used. NOT_ACQUIRED does not mean zero licensees.</p>
    </section>

    <section className="mt-8" aria-labelledby="oversight">
      <h2 id="oversight" className="text-2xl font-semibold">Examinations, actions, and complaints</h2>
      <p className="mt-2 text-slate-700">The Division publishes administrative actions and market-conduct or multi-state examination materials through separate sources. This retrieval did not acquire a complete, dated examination or enforcement corpus. Complaints, examinations, and administrative actions are not interchangeable, and none is used as a licensee count or joined to a provider by name alone.</p>
    </section>

    <section className="mt-8 rounded-xl bg-slate-50 p-5" aria-label="Official sources and clocks">
      <h2 className="text-lg font-semibold">Official sources and source clocks</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li><Source href={department}>South Dakota Division of Insurance</Source> — regulator scope; checked October 14, 2026.</li>
        <li><Source href={verification}>License verification service</Source> and <Source href={sbs}>State Based Systems public lookup</Source> — individual lookup for producers, agencies, and insurers; no bulk rows acquired.</li>
        <li><Source href={producers}>Producer information</Source> — person licensing, business entities, appointments, surplus lines, and examinations; checked October 14, 2026.</li>
        <li><Source href={listedCompanies}>Source-labelled company table</Source> — 22 company observations, as of October 2023; farm mutuals and captives excluded by the source.</li>
        <li><Source href={farmMutuals}>Farm mutual company table</Source> — 7 observations, as of September 2026.</li>
        <li><Source href={foreignCompanies}>Foreign insurer listing</Source> — dated March 27, 2024; linked file returned HTTP 404 on October 14, 2026, and row-level data were not acquired.</li>
        <li><Source href={actions}>Administrative actions</Source> and <Source href={examinations}>market-conduct examinations</Source> — separate oversight populations; no combined count published.</li>
      </ul>
      <p className="mt-4 text-sm text-slate-600">No agency, producer, adjuster, surplus-lines, appointment, examination, or enforcement census is inferred from lookup availability or company observations. No combined insurance total or rating is asserted.</p>
    </section>
  </main>;
}
