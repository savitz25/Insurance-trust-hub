import { INSURANCE_ASK_INPUT_LIMIT, type InsuranceRequestOptions } from '@/lib/insurance-ask/contract';
import Link from 'next/link';
import { SearchShellAnalytics } from './search-shell-analytics';

const EXAMPLES = [
  'NPN 10391484',
  'Insurance agencies credentialed in Florida',
  'Agency vs insurer',
  'What is an insurance appointment?',
];

export function InsuranceSpecialistSearchShell({ query = '', compact = false, options = {} }: { query?: string; compact?: boolean; options?: InsuranceRequestOptions }) {
  const suffix = compact ? 'home' : 'ask';
  return (
    <section className={`rounded-3xl border border-sky-200 bg-white/95 p-5 shadow-sm sm:p-7 ${compact ? '' : 'mx-auto max-w-5xl'}`} aria-labelledby={`${suffix}-insurance-search-title`}>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-sky-700">Research insurance</p>
      <h2 id={`${suffix}-insurance-search-title`} className="mt-2 text-2xl font-semibold tracking-tight text-[#0A2540] sm:text-3xl">What do you want to find out?</h2>
      <form action="/ask" method="get" role="search" aria-label="Research insurance identities and evidence" className="mt-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="sr-only" htmlFor={`${suffix}-insurance-search-q`}>Question, agency, insurer, NPN, or NAIC code</label>
          <input id={`${suffix}-insurance-search-q`} name="q" type="search" maxLength={INSURANCE_ASK_INPUT_LIMIT} defaultValue={query} required placeholder="Ask a question, enter an agency, insurer, NPN, NAIC code, state or credential..." className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 px-4 text-base text-[#0A2540] outline-none focus-visible:ring-2 focus-visible:ring-sky-600" />
          <button type="submit" className="min-h-12 rounded-xl bg-[#0A2540] px-7 font-semibold text-white outline-none hover:bg-sky-900 focus-visible:ring-2 focus-visible:ring-sky-600">Research</button>
        </div>
        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-[#0A2540]">Advanced filters</summary>
          <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <Filter label="Entity class" name="entity" value={options.entity} options={[['', 'Interpret from question'], ['agency', 'Agency'], ['insurer', 'Legal insurer'], ['person', 'Producer / individual']]} />
            <Filter label="Credential jurisdiction" name="state" value={options.state} options={[['', 'Any supported state'], ['FL', 'Florida'], ['TX', 'Texas'], ['MA', 'Massachusetts'], ['OH', 'Ohio'], ['VT', 'Vermont']]} />
            <Filter label="Authority / class" name="loa" value={options.loa} options={[['', 'Any supported authority'], ['property', 'Property'], ['casualty', 'Casualty'], ['life', 'Life'], ['health', 'Health']]} />
            <Filter label="Evidence" name="evidence" value={options.evidence} options={[['', 'Any supported evidence'], ['credential', 'Credential'], ['appointment', 'Appointment'], ['marketplace', 'Marketplace']]} />
          </div>
        </details>
      </form>
      <SearchShellAnalytics />
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Example insurance research questions">
        {EXAMPLES.map((example) => <Link key={example} href={`/ask?q=${encodeURIComponent(example)}`} className="inline-flex min-h-11 items-center rounded-full border border-sky-200 px-3 text-sm font-medium text-sky-800 hover:bg-sky-50">{example}</Link>)}
      </nav>
      <p className="mt-4 text-sm leading-6 text-slate-600">Natural language is mapped to bounded regulatory research. Agencies, producers, and legal insurers stay separate; missing evidence is not zero.</p>
    </section>
  );
}

function Filter({ label, name, options, value }: { label: string; name: string; value?: string; options: Array<[string, string]> }) {
  return <label className="grid gap-1 text-sm font-semibold text-[#0A2540]">{label}<select name={name} defaultValue={value ?? ''} className="min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 font-normal">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
}
