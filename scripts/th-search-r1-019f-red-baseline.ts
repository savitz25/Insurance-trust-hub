/**
 * TH-SEARCH-R1-019F RED baseline. Run ONCE against the UNMODIFIED origin/main code (860345d) before any
 * fix; its output is preserved as docs/qa/th-search-r1-019f/red-baseline.json and is never overwritten by
 * green output. READ-ONLY: only SELECTs through the existing engine and one read-only probe of the real
 * source to size candidate sets (used to FREEZE the multi-window term before retrieval is changed).
 *   npx tsx --tsconfig scripts/tsconfig.r13.json scripts/th-search-r1-019f-red-baseline.ts
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv } from './lib/load-local-env';
import { executeInsuranceAsk, executeInsuranceRequest } from '../lib/insurance-ask/execute';
import { executeSpecialistV2 } from '../lib/specialist-execution/v2';
import { distinctiveNameTokens, escapeNamePattern, matchSourceName } from '../lib/insurance-ask/name-match';

loadLocalEnv();
const OUT = 'docs/qa/th-search-r1-019f/red-baseline.json';
if (fs.existsSync(OUT)) { console.error(`${OUT} already exists. Red evidence is never overwritten.`); process.exit(1); }

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

/** Read-only: how many DISTINCT agency identities really satisfy the existing whole-word predicate? */
async function trueAgencyMatches(name: string, scanCap = 5000) {
  const tokens = distinctiveNameTokens(name); const ids = new Set<string>(); let scanned = 0; let exhausted = true;
  for (const field of ['legal_name', 'display_name'] as const) {
    for (let from = 0; ; from += 1000) {
      let q = admin.from('national_entities').select('id, legal_name, display_name').eq('entity_kind', 'agency');
      for (const t of tokens) q = q.ilike(field, `%${escapeNamePattern(t)}%`);
      const { data, error } = await q.order(field).order('id').range(from, from + 999);
      if (error) throw new Error(error.message);
      scanned += data.length;
      for (const row of data) if (matchSourceName(name, (row as Record<string, string>)[field])) ids.add(row.id);
      if (data.length < 1000) break;
      if (from + 1000 >= scanCap) { exhausted = false; break; }
    }
  }
  return { name, substringRowsScanned: scanned, distinctWholeWordAgencyMatches: ids.size, supersetExhausted: exhausted };
}

async function main() {
  const out: Record<string, unknown> = { capturedAt: new Date().toISOString(), codeUnderTest: 'origin/main 860345d85adcc2616efe5768acf5d941c7f8cf92 (unmodified)', note: 'RED evidence. Never overwritten by green output.' };

  // Sizing probe for the frozen multi-window term (decided from THIS output, before any retrieval change).
  const sizing = [];
  for (const term of ['allied', 'beacon', 'summit']) sizing.push(await trueAgencyMatches(term));
  out.realSourceCandidateSetSizes = sizing;

  // A/B/C: native page 1 for the three historical controls.
  const native: Record<string, unknown> = {};
  for (const term of ['allied', 'beacon', 'summit']) {
    const r = await executeInsuranceAsk(`Find ${term}`, 1);
    const hrefs = r.results.map((c) => c.selectionHref ?? null);
    native[term] = {
      terminalState: r.terminalState, returned: r.results.length, candidateTruncated: r.candidateTruncated ?? false,
      pagination: r.pagination,
      selectionHrefsWithLiteralUndefinedOrNull: hrefs.filter((h) => h && /=(undefined|null)(&|$)/.test(h)).length,
      firstSelectionHref: hrefs[0],
      names: r.results.map((c) => c.displayName),
    };
  }
  out.nativePage1 = native;

  // B: does the RAW hub link reopen/revalidate the intended identity with no parent sanitation?
  const allied = await executeInsuranceAsk('Find allied', 1);
  const reopen = [];
  for (const card of allied.results.slice(0, 3)) {
    const params = new URL(card.selectionHref!, 'https://www.insurancetrusthub.com').searchParams;
    let res; try { res = await executeInsuranceRequest(params); } catch (e) { res = { terminalState: `THROWN: ${(e as Error).message}`, results: [] as typeof allied.results }; }
    reopen.push({ intended: card.displayName, intendedEntityId: card.entityId, rawSelectionHref: card.selectionHref, terminalState: res.terminalState, reopenedEntityIds: res.results.map((x) => x.entityId), reopenedIntended: res.results.length === 1 && res.results[0]!.entityId === card.entityId });
  }
  out.rawSelectionLinkReopen = reopen;

  // D: page 2 through native and through structured v2.
  const p1 = await executeInsuranceAsk('Find allied', 1), p2 = await executeInsuranceAsk('Find allied', 2);
  out.nativePage2 = { page1Ids: p1.results.map((c) => c.entityId), page2Ids: p2.results.map((c) => c.entityId), page2IdenticalToPage1: JSON.stringify(p1.results.map((c) => c.entityId)) === JSON.stringify(p2.results.map((c) => c.entityId)), page2Pagination: p2.pagination };
  const v1 = await executeSpecialistV2({ identityName: 'allied', page: 1, limit: 10 }), v2 = await executeSpecialistV2({ identityName: 'allied', page: 2, limit: 10 });
  out.structuredV2Page2 = {
    page1: { state: v1.body.resultState, returned: v1.body.rows.length, total: v1.body.total, pagination: v1.body.pagination },
    page2: { state: v2.body.resultState, returned: v2.body.rows.length, total: v2.body.total, pagination: v2.body.pagination },
    page2IdenticalToPage1: JSON.stringify(v1.body.rows.map((r) => r.name)) === JSON.stringify(v2.body.rows.map((r) => r.name)),
    selectionUrlsWithLiteralUndefinedOrNull: v1.body.rows.filter((r) => r.selectionUrl && /=(undefined|null)(&|$)/.test(r.selectionUrl)).length,
  };

  fs.mkdirSync('docs/qa/th-search-r1-019f', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
