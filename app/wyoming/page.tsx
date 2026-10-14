import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { StateHubLinks } from "@/components/hubs/state-hub-links";

export const metadata: Metadata = buildMetadata({
  title: "Wyoming insurance licensing and regulatory evidence",
  description: "Wyoming Department of Insurance sources for distinct insurer, agency, producer, adjuster, surplus-lines, appointment, examination, and enforcement records.",
  path: "/wyoming",
});

const department = "https://doi.wyo.gov/";
const licensing = "https://doi.wyo.gov/licensing";
const producers = "https://doi.wyo.gov/licensing/producers";
const companies = "https://doi.wyo.gov/companies";
const lookup = "https://www.sircon.com/";
const official = (url: string, label: string) => (
  <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">{label}</a>
);

export default function WyomingInsurancePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-900">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Wyoming Department of Insurance</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Wyoming insurance licensing evidence</h1>
        <p className="mt-5 text-lg text-slate-700">The Wyoming Department of Insurance publishes separate company and licensee resources and links to public verification. No dated free statewide row-level extract was acquired in this pass; live verification sources are not represented as a frozen census.</p>
      </header>
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Current populations</h2>
        <p className="mt-2 text-sm text-slate-700"><strong>NOT_ACQUIRED.</strong> Current row-level rosters were not acquired as dated files. This is not zero.</p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-700">
          <li>Insurers and company authority: distinct business population; dated roster NOT_ACQUIRED.</li>
          <li>Agencies and other business entities: distinct from individual producers; roster NOT_ACQUIRED.</li>
          <li>Producers, adjusters, and surplus-lines license classes: separate person/license populations; rosters NOT_ACQUIRED.</li>
          <li>Appointments are insurer-to-producer relationships, not licensees; rows NOT_ACQUIRED.</li>
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Oversight records remain separate</h2>
        <p className="mt-2 text-sm text-slate-700">The Department provides examination and financial-report materials with their own reporting periods. Examinations, enforcement orders, receivership actions, and complaints have distinct clocks and meanings. An examination is not automatically an enforcement finding; a complaint is not a violation. No adverse entity joins are made by name alone.</p>
      </section>
      <section className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-semibold text-[#0A2540]">Sources and clocks</h2>
        <p className="mt-2 text-sm text-slate-700">Official DOI licensing and company pages checked October 14, 2026. Live lookup sources were not converted into dated counts; row populations and report clocks remain unacquired.</p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-sm">
          <li>{official(department, "Wyoming Department of Insurance")}</li>
          <li>{official(licensing, "Licensing overview")}</li>
          <li>{official(producers, "Producer licensing")}</li>
          <li>{official(companies, "Insurance companies and company information")}</li>
          <li>{official(lookup, "Sircon public license verification")}</li>
        </ul>
        <StateHubLinks stateSlug="wyoming" />
      </section>
    </main>
  );
}
