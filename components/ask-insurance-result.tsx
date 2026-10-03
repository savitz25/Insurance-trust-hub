import { insuranceRequestHref } from '@/lib/insurance-ask/request';
import Link from 'next/link';
import { ASK_DEFINITIONS, INSURANCE_ASK_PAGE_SIZE } from '@/lib/insurance-ask/contract';
import type { AskCard, InsuranceAskResult } from '@/lib/insurance-ask/execute';
import { AskResultCardShell } from '@/components/ask-result-card';

function href(q: string, page?: number) {
  const params = new URLSearchParams({ q });
  if (page && page > 1) params.set('page', String(page));
  return `/ask?${params.toString()}`;
}

function classLabel(entityClass: AskCard['entityClass']): string {
  if (entityClass === 'person') return 'Producer / individual';
  if (entityClass === 'insurer') return 'Legal insurer';
  return 'Agency';
}

function profileLabel(row: AskCard): string {
  if (row.credentialFacts && row.href?.startsWith('/providers/')) return 'View company profile →';
  if (row.entityClass === 'insurer') return 'Research this insurer';
  if (row.entityClass === 'person') return 'Research this producer';
  return 'Research this agency';
}

/** Resting line only. The full whyMatched sentence stays in the match disclosure. */
function restingMatchLine(row: AskCard): string | null {
  const field = row.matchEvidence?.field;
  const named = field === 'legal_name' || field === 'display_name' || field === 'canonical_legal_name';
  if (!named) return null;
  if (row.npn) return 'Matched by company name and NPN.';
  if (row.naicCode) return 'Matched by company name and NAIC company code.';
  return 'Matched by company name.';
}

function phoneHref(display: string): string {
  const digits = display.replace(/\D/g, '');
  return `tel:${digits || display}`;
}

/**
 * A resolved company-name pick. Candidate windows, counts, comparisons,
 * evidence, and ambiguous interpretation keep the research sections.
 */
export function isResolvedSimpleNameIdentity(result: InsuranceAskResult): boolean {
  const q = result.parsed.query;
  return q.intent === 'NAME_IDENTITY'
    && Boolean(q.selectedEntity)
    && result.terminalState === 'IDENTITY_FOUND'
    && result.results.length === 1
    && q.mode === 'entity'
    && q.requestedTask === 'identity'
    && !q.conditions?.length
    && !q.identifier
    && !q.evidenceFamily
    && !q.linesOfAuthority?.length
    && !q.compareJurisdiction
    && !q.definitionId
    && !result.candidateSelection;
}

const controlClass = 'pointer-events-auto';

function AskResultCard({ row }: { row: AskCard }) {
  const matchLine = restingMatchLine(row);
  return (
    <AskResultCardShell href={row.href}>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold leading-snug text-[#0A2540] [overflow-wrap:anywhere] sm:text-xl">{row.displayName}</h3>
        <p className="mt-1 text-sm font-medium text-[#0284C7]">{classLabel(row.entityClass)}</p>
      </div>
      {row.recordedPlace ? <p className="mt-1 text-sm text-[#1E293B]">{row.recordedPlace}</p> : null}
      {row.npn || row.naicCode ? (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {row.npn ? (
            <div className="min-w-0">
              <dt className="text-xs uppercase text-slate-500">NPN</dt>
              <dd className="font-semibold text-[#0A2540] [overflow-wrap:anywhere]">{row.npn}</dd>
            </div>
          ) : null}
          {row.naicCode ? (
            <div className="min-w-0">
              <dt className="text-xs uppercase text-slate-500">NAIC company code</dt>
              <dd className="font-semibold text-[#0A2540] [overflow-wrap:anywhere]">{row.naicCode}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {row.credentialFacts?.length ? (
        <div className="mt-3 text-sm text-[#1E293B]">
          <p className="text-xs font-semibold uppercase text-slate-500">Credential evidence</p>
          <ul className="mt-1 space-y-1">
            {row.credentialFacts.map((line, index) => <li key={`${line}:${index}`} className="[overflow-wrap:anywhere]">{line}</li>)}
          </ul>
        </div>
      ) : row.credentialStatus || row.credentialJurisdiction || row.loas.length ? (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {row.credentialStatus ? (
            <div>
              <dt className="text-xs uppercase text-slate-500">Source credential status</dt>
              <dd className="font-medium text-[#0A2540]">{row.credentialStatus}</dd>
            </div>
          ) : null}
          {row.credentialJurisdiction ? (
            <div>
              <dt className="text-xs uppercase text-slate-500">Credential jurisdiction</dt>
              <dd className="font-medium text-[#0A2540]">{row.credentialJurisdiction}</dd>
            </div>
          ) : null}
          {row.loas.length ? (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-slate-500">Lines of authority</dt>
              <dd className="[overflow-wrap:anywhere]">{row.loas.slice(0, 3).join('; ')}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {row.publicPhone ? (
        <p className="mt-3 text-sm text-[#1E293B]">
          Phone: <a href={phoneHref(row.publicPhone)} data-card-control className={`${controlClass} font-medium text-[#0A2540] underline decoration-slate-300 underline-offset-2`}>{row.publicPhone}</a>
        </p>
      ) : null}
      {row.publicEmail ? (
        <p className="mt-1 text-sm text-[#1E293B] [overflow-wrap:anywhere]">
          Email: <a href={`mailto:${row.publicEmail}`} data-card-control className={`${controlClass} font-medium text-[#0A2540] underline decoration-slate-300 underline-offset-2`}>{row.publicEmail}</a>
        </p>
      ) : null}
      {matchLine ? <p data-ask-match-line className="mt-3 text-sm text-slate-500">{matchLine}</p> : null}
      {row.href || row.selectionHref ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          {row.href ? (
            <Link
              href={row.href}
              data-specialist-event="profile_open"
              data-card-control
              className={`${controlClass} inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0A2540] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7] sm:w-auto`}
            >
              {profileLabel(row)}
            </Link>
          ) : null}
          {row.selectionHref ? (
            <Link href={row.selectionHref} data-card-control className={`${controlClass} inline-flex min-h-11 items-center justify-center text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4`}>
              Select this identity and continue
            </Link>
          ) : null}
        </div>
      ) : null}
      <details data-specialist-event="trace_open" data-card-control className={`${controlClass} mt-4 border-t border-[#E2E8F0] pt-1 text-sm`}>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-slate-500">How we matched this result</summary>
        <div className="pb-2 text-[#1E293B]">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trace this result</h4>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <div><dt className="text-xs uppercase text-slate-500">Identity class</dt><dd>{row.entityClass}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Identity method</dt><dd className="[overflow-wrap:anywhere]">{row.matchEvidence ? `${row.matchEvidence.method}: ${row.matchEvidence.field} = ${row.matchEvidence.value}` : row.npn ? 'Exact NPN or canonical graph identity' : row.naicCode ? 'Exact NAIC company code' : 'Structured source match'}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Credential source</dt><dd className="[overflow-wrap:anywhere]">{row.sourceDataset ?? 'See accepted source family'}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Official/source date</dt><dd>{row.sourceObservedAt ?? 'Source clock unavailable'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs uppercase text-slate-500">Geography meaning</dt><dd>{row.credentialJurisdiction ? `${row.credentialJurisdiction} credential jurisdiction — not office or service territory` : 'No service territory inferred'}{row.recordedPlace ? ` Recorded address ${row.recordedPlace} is not a service area.` : ''}</dd></div>
            {row.loas.length ? <div className="sm:col-span-2"><dt className="text-xs uppercase text-slate-500">LOA / credential class text</dt><dd className="[overflow-wrap:anywhere]">{row.loas.join('; ')}</dd></div> : null}
            {row.planYear ? <div><dt className="text-xs uppercase text-slate-500">Marketplace plan year</dt><dd>{row.planYear}</dd></div> : null}
            {row.evidenceFamily ? <div><dt className="text-xs uppercase text-slate-500">Evidence family</dt><dd>{row.evidenceFamily}</dd></div> : null}
          </dl>
          <p className="mt-3 text-sm leading-relaxed">
            <span className="font-semibold">Why this matched. </span>
            {row.whyMatched}
          </p>
          {row.publicationNote ? <p className="mt-2 text-xs">{row.publicationNote}</p> : null}
          <p className="mt-3 text-xs text-slate-600">LOA is not appointment. Appointment is not employment or endorsement. Marketplace evidence is not a state license.</p>
        </div>
      </details>
    </AskResultCardShell>
  );
}

export function AskInsuranceResultView({ result }: { result: InsuranceAskResult }) {
  const q = result.parsed.query;
  const def = q.definitionId ? ASK_DEFINITIONS[q.definitionId] : undefined;
  const resolvedName = isResolvedSimpleNameIdentity(result);

  return (
    <div className="min-w-0 space-y-8 [overflow-wrap:anywhere]">
      {resolvedName ? null : (
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
      )}

      {resolvedName ? null : (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4" aria-label="Research coverage">
          <p className="font-semibold text-[#0A2540]">Coverage: {result.coverageState}</p>
          <p className="mt-1 text-sm text-slate-700">Unavailable or incomplete data is never converted into a zero or a clean-history claim.</p>
        </section>
      )}

      {q.refinement === 'zip' ? <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-semibold">Enter a ZIP for directory research</h2><p className="mt-2">Requested location: {q.directoryContext?.requestedLocation}. We do not use device location or guess a ZIP.</p><form action="/ask" method="get" className="mt-4 flex flex-wrap gap-3"><input type="hidden" name="q" value={result.queryText}/>{Object.entries(q.requestOptions??{}).filter(([k])=>!['zip','selected'].includes(k)).map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>)}<label htmlFor="directory-zip" className="grid gap-1">Five-digit ZIP<input id="directory-zip" name="zip" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required className="min-h-11 min-w-0 rounded border px-3"/></label><button className="min-h-11 rounded bg-sky-900 px-4 text-white">Apply ZIP</button></form></section> : null}
      {q.conditions?.length ? <section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Additional requested conditions</h2><ul>{q.conditions.map((c,i)=><li key={i}>{c.meaning}: {c.value} ? {c.outcome}. Identity resolution does not establish this condition.</li>)}</ul></section>:null}
      {q.directoryContext?.unresolvedConditions.map(x=><p key={x} className="rounded-xl bg-amber-50 p-4">{x}</p>)}
      {result.terminalState === 'NO_MATCH' ? <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-semibold">No matching indexed research identity</h2><p>The complete {q.identifier ? `${q.identifier.type} ${q.identifier.value}` : q.nameQuery} was searched in the permitted corpus. No other identity or cohort was substituted. Absence here does not establish an invalid identifier or lack of authorization.</p></section>:null}
      {result.candidateSelection ? <section className="rounded-xl bg-sky-50 p-4"><h2 className="text-xl font-semibold">Select the source identity you mean</h2><p>Names indicate candidates. Compare class and identifiers before continuing the original question.</p>{result.nameCandidateWindow?.outOfRange?<p className="mt-2">This candidate window is past the end of the matching source-name candidates. No candidate was substituted. <Link href={insuranceRequestHref(result.queryText,q.requestOptions,1)} className="font-semibold text-sky-800 underline">Return to the first window</Link>.</p>:null}{result.nameCandidateWindow?.hasMore?<p className="mt-2">More matching source-name candidates are available. Candidates are shown {result.nameCandidateWindow.limit} at a time in a fixed order; use Next to continue, or refine the name.</p>:null}{result.nameCandidateWindow?.completeness==='SCAN_BOUND_REACHED'?<p className="mt-2">This name is very broad: the source search stopped at its scan bound, so this is not a complete candidate list and no total is asserted. Refine the name.</p>:null}</section>:null}
      {q.mode === 'directory' && (q.directoryZip || q.directoryLaunchCountyId) ? (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="text-2xl font-semibold text-[#0A2540]">Local directory research</h2>
          <p className="mt-3 text-sm text-slate-700">
            {q.directoryZip
              ? 'ZIP listings are a separate publication grain. They are not canonical agency identities and do not prove service territory.'
              : 'These are recorded public-directory addresses in the requested county. A recorded address is not a confirmed service area -- a directory record does not mean an agency serves every customer in the surrounding area.'}
          </p>
          {q.directoryZip ? (
            <a href={`/directory?${new URLSearchParams({zip:q.directoryZip,insuranceContext:q.directoryContext?.requestedInsuranceContext.join(',')??'',requestedPlace:q.directoryContext?.requestedLocation??''})}`} className="mt-4 inline-flex min-h-11 items-center font-semibold text-sky-700">Browse listings for {q.directoryZip} →</a>
          ) : null}
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

      {!resolvedName && result.counts.length && q.mode !== 'fail_closed' ? (
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
        <ol className="grid list-none gap-4">
          {result.results.map((row) => (
            <li key={`${row.entityId}:${row.evidenceFamily ?? ''}:${row.planYear ?? ''}:${row.sourceObservedAt ?? ''}`} className="min-w-0">
              <AskResultCard row={row} />
            </li>
          ))}
        </ol>
      ) : null}

      {result.nameCandidateWindow && (result.nameCandidateWindow.page > 1 || result.nameCandidateWindow.hasMore) ? (
        <nav className="flex flex-wrap items-center gap-3" aria-label="Source-name candidate windows" data-name-candidate-nav>
          {result.nameCandidateWindow.page > 1 ? (
            <Link href={insuranceRequestHref(result.queryText,q.requestOptions,result.nameCandidateWindow.page-1)} className="inline-flex min-h-11 items-center rounded-xl border px-4">
              Previous
            </Link>
          ) : null}
          {result.nameCandidateWindow.hasMore && result.nameCandidateWindow.nextPage ? (
            <Link href={insuranceRequestHref(result.queryText,q.requestOptions,result.nameCandidateWindow.nextPage)} className="inline-flex min-h-11 items-center rounded-xl bg-[#0A2540] px-4 text-white">
              Next
            </Link>
          ) : null}
          <p className="text-xs">
            Candidate window {result.nameCandidateWindow.page}{result.nameCandidateWindow.hasMore ? ' · more matching source-name candidates are available' : result.nameCandidateWindow.completeness === 'COMPLETE' && !result.nameCandidateWindow.outOfRange ? ' · last window for this name' : ''}
          </p>
        </nav>
      ) : null}

      {!result.nameCandidateWindow && result.results.length > 0 && result.pagination.total > INSURANCE_ASK_PAGE_SIZE ? (
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
