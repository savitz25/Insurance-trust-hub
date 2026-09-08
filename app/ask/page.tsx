import { AskInsuranceResultView } from '@/components/ask-insurance-result';
import { InsuranceSpecialistSearchShell } from '@/components/specialist-search/insurance-specialist-search-shell';
import { SearchAnalytics } from '@/components/specialist-search/search-analytics';
import { executeInsuranceAsk } from '@/lib/insurance-ask/execute';
import { buildMetadata } from '@/lib/seo/metadata';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const meta = buildMetadata({
    title: q?.trim() ? `Ask: ${q.trim().slice(0, 80)}` : 'Ask InsuranceTrustHub',
    description:
      'Structured insurance regulatory research. Agencies, producers, and legal insurers stay separate. Not a ranking or quote engine.',
    path: q?.trim() ? `/ask?q=${encodeURIComponent(q.trim())}` : '/ask',
    noIndex: true,
  });
  return { ...meta, robots: { index: false, follow: true } };
}

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; entity?: string; state?: string; loa?: string; evidence?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? '').trim().slice(0, 180);
  const page = Number(params.page ?? '1') || 1;
  const effectiveQuery = buildEffectiveQuery(q, params);
  let result = null;
  let executionUnavailable = false;
  if (effectiveQuery) {
    try { result = await executeInsuranceAsk(effectiveQuery, page); }
    catch { executionUnavailable = true; }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0284C7]">InsuranceTrustHub specialist research</p>
      <h1 className="mt-3 text-3xl font-semibold text-[#0A2540] sm:text-4xl">
        Research insurance identities and regulatory evidence
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#1E293B]">
        Ask interprets the question. Current regulatory extracts answer it. Agencies, producers, and legal insurers
        stay separate. A credential is not a service territory and not an appointment.
      </p>
      <div className="mt-8"><InsuranceSpecialistSearchShell query={q} /></div>
      {result ? (
        <div className="mt-10" data-specialist-results>
          <SearchAnalytics dimensions={{ hub: 'insurance', intent: intentFor(result.parsed.query.mode), entityClass: result.parsed.query.entityClass, state: result.parsed.query.jurisdiction?.state, hasIdentifier: Boolean(result.parsed.query.identifier), identifierType: result.parsed.query.identifier?.type, hasLoa: Boolean(result.parsed.query.linesOfAuthority?.length), hasAppointmentFilter: result.parsed.query.evidenceFamily === 'appointment', evidenceFamily: result.parsed.query.evidenceFamily, coverageState: result.coverageState, directoryHandoff: result.parsed.query.mode === 'directory' }} resultCount={result.results.length} />
          <AskInsuranceResultView result={result} />
        </div>
      ) : executionUnavailable ? <section className="mx-auto mt-8 max-w-5xl rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="text-xl font-semibold text-[#0A2540]">Regulatory research is temporarily unavailable</h2><p className="mt-2 text-sm text-slate-700">The source-backed query could not be completed. No result or zero-count conclusion was inferred. Please try again.</p></section> : null}
    </div>
  );
}

function intentFor(mode: string): 'IDENTITY' | 'DISCOVERY' | 'EVIDENCE' | 'EXPLAIN' | 'COUNT' | 'COMPARE' | 'DIRECTORY' | 'UNKNOWN' {
  return mode === 'identifier' ? 'IDENTITY' : mode === 'entity' ? 'DISCOVERY' : mode === 'evidence' ? 'EVIDENCE' : mode === 'definition' ? 'EXPLAIN' : mode === 'count' || mode === 'aggregate' ? 'COUNT' : mode === 'comparison' ? 'COMPARE' : mode === 'directory' ? 'DIRECTORY' : 'UNKNOWN';
}

function buildEffectiveQuery(q: string, params: { entity?: string; state?: string; loa?: string; evidence?: string }) {
  if (!q) return '';
  const entities: Record<string, string> = { agency: 'insurance agencies', insurer: 'legal insurers', person: 'insurance producers' };
  const states: Record<string, string> = { FL: 'Florida', TX: 'Texas', MA: 'Massachusetts', OH: 'Ohio', VT: 'Vermont' };
  const evidence: Record<string, string> = { credential: 'with credential evidence', appointment: 'with appointments', marketplace: 'with Marketplace evidence' };
  return [q, entities[params.entity ?? ''], states[params.state ?? ''], params.loa, evidence[params.evidence ?? '']].filter(Boolean).join(' ').slice(0, 180);
}
