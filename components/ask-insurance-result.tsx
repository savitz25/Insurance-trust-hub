import { insuranceRequestHref } from '@/lib/insurance-ask/request';
import Link from 'next/link';
import { ASK_DEFINITIONS, INSURANCE_ASK_PAGE_SIZE } from '@/lib/insurance-ask/contract';
import type { InsuranceAskResult } from '@/lib/insurance-ask/execute';

function href(q: string, page?: number) {
  const params = new URLSearchParams({ q });
  if (page && page > 1) params.set('page', String(page));
  return `/ask?${params.toString()}`;
}

export function AskInsuranceResultView({ result }: { result: InsuranceAskResult }) {
  const q = result.parsed.query;
  const def = q.definitionId ? ASK_DEFINITIONS[q.definitionId] : undefined;

  return (
    <div className="min-w-0 space-y-8 [overflow-wrap:anywhere]">
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">
          We interpreted your question as
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {result.parsed.interpretation.map((row) => (
            <div key={`${row.label}-${row.value}`}>
              <dt className="text-xs uppercase text-[#1E293B]">{row.label}</dt>
              <dd className="text-base font-semibold text-[#0A2540]">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Interpreted research criteria">
          {result.parsed.interpretation.filter((row) => !['Mode', 'Sort'].includes(row.label)).map((row) => (
            <span key={`criterion-${row.label}-${row.value}`} className="inline-flex min-h-11 max-w-full items-center rounded-full border border-sky-200 px-3 text-sm text-sky-800 [overflow-wrap:anywhere]">{row.label}: {row.value}</span>
          ))}
        </div>
        <p className="mt-3 text-sm text-[#1E293B]">
          Parsing and regulatory execution stay separate. Credential jurisdiction is not service territory.
        </p>
        <form action="/ask" method="get" className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="ask-edit" className="sr-only">
            Change interpretation
          </label>
          {Object.entries(q.requestOptions ?? {}).filter(([k])=>!['selected','zip'].includes(k)).map(([k,v])=><input key={k} type="hidden" name={k} value={v} />)}
          <input
            maxLength={180}
            id="ask-edit"
            name="q"
            defaultValue={result.queryText}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#E2E8F0] px-3 text-sm text-[#0A2540]"
          />
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0A2540] px-4 text-sm font-semibold text-white">
            Change interpretation
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4" aria-label="Research coverage">
        <p className="font-semibold text-[#0A2540]">Coverage: {result.coverageState}</p>
        <p className="mt-1 text-sm text-slate-700">Unavailable or incomplete data is never converted into a zero or a clean-history claim.</p>
      </section>

      {q.refinement === 'zip' ? <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-semibold">Enter a ZIP for directory research</h2><p className="mt-2">Requested location: {q.directoryContext?.requestedLocation}. We do not use device location or guess a ZIP.</p><form action="/ask" method="get" className="mt-4 flex flex-wrap gap-3"><input type="hidden" name="q" value={result.queryText}/>{Object.entries(q.requestOptions??{}).filter(([k])=>!['zip','selected'].includes(k)).map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>)}<label htmlFor="directory-zip" className="grid gap-1">Five-digit ZIP<input id="directory-zip" name="zip" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required className="min-h-11 min-w-0 rounded border px-3"/></label><button className="min-h-11 rounded bg-sky-900 px-4 text-white">Apply ZIP</button></form></section> : null}
      {q.conditions?.length ? <section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Additional requested conditions</h2><ul>{q.conditions.map((c,i)=><li key={i}>{c.meaning}: {c.value} ? {c.outcome}. Identity resolution does not establish this condition.</li>)}</ul></section>:null}
      {q.directoryContext?.unresolvedConditions.map(x=><p key={x} className="rounded-xl bg-amber-50 p-4">{x}</p>)}
      {result.terminalState === 'NO_MATCH' ? <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-semibold">No matching indexed research identity</h2><p>The complete {q.identifier ? `${q.identifier.type} ${q.identifier.value}` : q.nameQuery} was searched in the permitted corpus. No other identity or cohort was substituted. Absence here does not establish an invalid identifier or lack of authorization.</p></section>:null}
      {result.candidateSelection ? <section className="rounded-xl bg-sky-50 p-4"><h2 className="text-xl font-semibold">Select the source identity you mean</h2><p>Names indicate candidates. Compare class and identifiers before continuing the original question.</p>{result.candidateTruncated?<p>Only 10 candidates are displayed; refine the name. This is not an exhaustive total.</p>:null}</section>:null}
      {q.mode === 'directory' && q.directoryZip ? (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="text-2xl font-semibold text-[#0A2540]">Local directory research</h2>
          <p className="mt-3 text-sm text-slate-700">ZIP listings are a separate publication grain. They are not canonical agency identities and do not prove service territory.</p>
          <a href={`/directory?${new URLSearchParams({zip:q.directoryZip,insuranceContext:q.directoryContext?.requestedInsuranceContext.join(',')??'',requestedPlace:q.directoryContext?.requestedLocation??''})}`} className="mt-4 inline-flex min-h-11 items-center font-semibold text-sky-700">Browse listings for {q.directoryZip} →</a>
        </section>
      ) : null}

      {q.mode === 'fail_closed' ? (
        <section className="rounded-2xl border border-[#E2E8F0] bg-[#F0F9FF] p-5">
          <h2 className="text-2xl font-semibold text-[#0A2540]">{q.terminalState === 'INVALID_INPUT' ? 'Check the request' : q.refinement ? 'A little more information is needed' : 'Current research limitation'}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#1E293B]">{q.failReason}</p>
          {!q.refinement && !result.recoveryActions?.length && q.alternatives?.length ? (
            <ul className="mt-4 space-y-2">
              {q.alternatives.map((alt) => (
                <li key={alt}>
                  <Link href={href(alt)} className="font-semibold text-[#0284C7] underline-offset-2 hover:underline">
                    {alt}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {def ? (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="text-2xl font-semibold text-[#0A2540]">{def.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#1E293B]">{def.body}</p>
        </section>
      ) : null}

      {result.counts.length ? (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="text-2xl font-semibold text-[#0A2540]">Count</h2>
          <ul className="mt-4 divide-y divide-[#E2E8F0]">
            {result.counts.map((row) => (
              <li key={row.label} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
                <span className="text-sm text-[#0A2540]">{row.label}</span>
                <span className="font-semibold tabular-nums text-[#0A2540]">{row.value.toLocaleString('en-US')}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#1E293B]">{result.counts[0]?.grain}</p>
        </section>
      ) : null}

      {q.mode !== 'fail_closed' && q.mode !== 'directory' && !def && !result.results.length && !result.counts.length ? (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="text-2xl font-semibold text-[#0A2540]">No matching research identities in this extract</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#1E293B]">
            Absence is not a clean record, not unlicensed, and not a ranking. The interpretation above is what Ask
            executed.
          </p>
        </section>
      ) : null}

      {result.results.length ? (
        <ol className="grid gap-4">
          {result.results.map((row) => (
            <li key={`${row.entityId}:${row.evidenceFamily ?? ''}:${row.planYear ?? ''}:${row.sourceObservedAt ?? ''}`} className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-xl font-semibold text-[#0A2540]">{row.displayName}</h3>
                <span className="rounded-full border border-[#E2E8F0] px-2 py-0.5 text-[11px] font-semibold">
                  {row.entityClass === 'person' ? 'Producer / individual' : row.entityClass === 'insurer' ? 'Legal insurer' : 'Agency'}
                </span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {row.npn ? (
                  <div>
                    <dt className="text-xs uppercase">NPN</dt>
                    <dd className="font-semibold">{row.npn}</dd>
                  </div>
                ) : null}
                {row.naicCode ? (
                  <div>
                    <dt className="text-xs uppercase">NAIC company code</dt>
                    <dd className="font-semibold">{row.naicCode}</dd>
                  </div>
                ) : null}
                {row.credentialJurisdiction ? (
                  <div>
                    <dt className="text-xs uppercase">credential jurisdiction</dt>
                    <dd>{row.credentialJurisdiction}</dd>
                  </div>
                ) : null}
                {row.credentialStatus ? (
                  <div>
                    <dt className="text-xs uppercase">Source credential status</dt>
                    <dd>{row.credentialStatus}</dd>
                  </div>
                ) : null}
                {row.loas.length ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase">LOA / credential class text</dt>
                    <dd>{row.loas.join('; ')}</dd>
                  </div>
                ) : null}
                {row.sourceObservedAt ? (
                  <div>
                    <dt className="text-xs uppercase">Source date</dt>
                    <dd>{row.sourceObservedAt}</dd>
                  </div>
                ) : null}
                {row.planYear ? (
                  <div>
                    <dt className="text-xs uppercase">Marketplace plan year</dt>
                    <dd>{row.planYear}</dd>
                  </div>
                ) : null}
                {row.evidenceFamily ? (
                  <div>
                    <dt className="text-xs uppercase">Evidence family</dt>
                    <dd>{row.evidenceFamily}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-3 text-sm leading-relaxed text-[#1E293B]">
                <span className="font-semibold">Why this matched. </span>
                {row.whyMatched}
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
              {row.publicationNote ? <p className="mt-2 text-xs text-[#1E293B]">{row.publicationNote}</p> : null}
              {row.selectionHref ? <Link href={row.selectionHref} className="inline-flex min-h-11 items-center font-semibold text-sky-800">Select this identity and continue</Link>:null}
              {row.href ? (
                <Link href={row.href} data-specialist-event="profile_open" className="inline-flex min-h-11 items-center font-semibold text-[#0284C7]">
                  Research this {row.entityClass === 'insurer' ? 'insurer' : row.entityClass === 'person' ? 'producer' : 'agency'}
                </Link>
              ) : null}
              </div>
              <details data-specialist-event="trace_open" className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                <summary className="min-h-11 cursor-pointer py-2 font-semibold text-sky-800">Trace this result</summary>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div><dt className="text-xs uppercase">Identity class</dt><dd>{row.entityClass}</dd></div>
                  <div><dt className="text-xs uppercase">Identity method</dt><dd>{row.matchEvidence ? `${row.matchEvidence.method}: ${row.matchEvidence.field} = ${row.matchEvidence.value}` : row.npn ? 'Exact NPN or canonical graph identity' : row.naicCode ? 'Exact NAIC company code' : 'Structured source match'}</dd></div>
                  <div><dt className="text-xs uppercase">Credential source</dt><dd>{row.sourceDataset ?? 'See accepted source family'}</dd></div>
                  <div><dt className="text-xs uppercase">Official/source date</dt><dd>{row.sourceObservedAt ?? 'Source clock unavailable'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs uppercase">Geography meaning</dt><dd>{row.credentialJurisdiction ? `${row.credentialJurisdiction} credential jurisdiction — not office or service territory` : 'No service territory inferred'}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-slate-600">LOA is not appointment. Appointment is not employment or endorsement. Marketplace evidence is not a state license.</p>
              </details>
            </li>
          ))}
        </ol>
      ) : null}

      {result.results.length > 0 && result.pagination.total > INSURANCE_ASK_PAGE_SIZE ? (
        <nav className="flex gap-3" aria-label="Pagination">
          {result.pagination.page > 1 ? (
            <Link href={insuranceRequestHref(result.queryText,q.requestOptions,result.pagination.page-1)} className="inline-flex min-h-11 items-center rounded-xl border px-4">
              Previous
            </Link>
          ) : null}
          {result.pagination.hasMore ? (
            <Link href={insuranceRequestHref(result.queryText,q.requestOptions,result.pagination.page+1)} className="inline-flex min-h-11 items-center rounded-xl bg-[#0A2540] px-4 text-white">
              Next
            </Link>
          ) : null}
          <p className="self-center text-xs">
            Page {result.pagination.page} · {result.pagination.total.toLocaleString('en-US')} identities
          </p>
        </nav>
      ) : null}

      {result.recoveryActions?.length ? <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-semibold">What you can do next</h2><ul className="mt-3 space-y-4">{result.recoveryActions.map(action=><li key={action.destination}><a href={action.destination} className="inline-flex min-h-11 items-center font-semibold text-sky-800">{action.label}</a><p>{action.reason}</p><p className="text-sm">{action.establishes} {action.doesNotEstablish}</p></li>)}</ul></section>:null}
      <details className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
        <summary className="min-h-11 cursor-pointer font-semibold text-[#0A2540]">Trace this query</summary>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase">Contract</dt>
            <dd>{result.contract}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase">Entity class</dt>
            <dd>{result.entityClass ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase">Geography meaning</dt>
            <dd>{result.provenance.geographyMeaning}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase">Grain</dt>
            <dd>{result.provenance.grain}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase">Official as-of</dt>
            <dd>{result.provenance.officialAsOf}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase">Elapsed</dt>
            <dd>{result.elapsedMs} ms</dd>
          </div>
        </dl>
        <ul className="mt-3 list-disc pl-5 text-xs text-[#1E293B]">
          {result.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
