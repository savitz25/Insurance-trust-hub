/**
 * TH-SEARCH-R1-019F GREEN acceptance against the real source. READ-ONLY. Written to a labelled file; the
 * red baseline files are never touched.
 *   npx tsx --tsconfig scripts/tsconfig.r13.json scripts/th-search-r1-019f-green-acceptance.ts <label>
 */
import fs from 'node:fs';
import { loadLocalEnv } from './lib/load-local-env';
import { executeInsuranceRequest } from '../lib/insurance-ask/execute';
import { executeSpecialistV2 } from '../lib/specialist-execution/v2';
import { executeInsuranceNameCandidatesV1 } from '../lib/specialist-execution/name-candidates';

loadLocalEnv();
const label = process.argv[2] ?? '';
if (!/^[a-z0-9-]+$/.test(label)) { console.error('usage: <label>'); process.exit(1); }
const OUT = `docs/qa/th-search-r1-019f/green-acceptance.${label}.json`;
if (fs.existsSync(OUT)) { console.error(`${OUT} exists; one pass per label.`); process.exit(1); }
const BAD = /=(undefined|null)(&|$)/;
const FROZEN_MULTI_WINDOW_TERM = 'allied';

async function walk(name: string, maxPages = 15) {
  const windows = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const s = (await executeInsuranceNameCandidatesV1({ operation: 'name_candidates', name, page })).body;
    const n = await executeInsuranceRequest(new URLSearchParams({ q: `Find ${name}`, ...(page > 1 ? { page: String(page) } : {}) }));
    const sIds = s.candidates.map((c) => c.stableKey), nIds = n.results.map((c) => `insurance:${c.entityClass === 'insurer' ? 'legal_insurer' : 'agency'}:${c.entityId}`);
    windows.push({
      page, state: s.resultState, returned: s.pagination.returned, hasMore: s.pagination.hasMore, nextPage: s.pagination.nextPage, outOfRange: s.pagination.outOfRange,
      matchedCount: s.pagination.matchedCount, matchedCountIsExact: s.pagination.matchedCountIsExact, completeness: s.pagination.completeness,
      nativeEqualsStructured: JSON.stringify(sIds) === JSON.stringify(nIds) && n.nameCandidateWindow?.hasMore === s.pagination.hasMore,
      malformedLinks: [...s.candidates.flatMap((c) => [c.selectionUrl, c.profileUrl, c.action.url]), ...n.results.map((c) => c.selectionHref)].filter((u) => u && BAD.test(u)).length,
      candidates: s.candidates.map((c) => ({ stableKey: c.stableKey, displayName: c.displayName, method: c.match.method, field: c.match.field, publicationState: c.publicationState, actionType: c.action.type })),
      selectionUrls: s.candidates.map((c) => c.selectionUrl),
    });
    if (!s.pagination.hasMore) break;
  }
  return windows;
}

async function main() {
  const out: Record<string, unknown> = { label, ranAt: new Date().toISOString(), note: 'GREEN. Real source, read-only. Bounded QA; no statistical claim.' };

  const controls: Record<string, unknown> = {};
  for (const name of ['allied', 'beacon', 'summit']) {
    const w = await walk(name); const all = w.flatMap((x) => x.candidates.map((c) => c.stableKey));
    controls[name] = { windows: w.length, candidatesAcrossWindows: all.length, distinct: new Set(all).size, matchedCount: w[0]!.matchedCount, exact: w[0]!.matchedCountIsExact, lastWindowHasMore: w.at(-1)!.hasMore, everyWindowNativeEqualsStructured: w.every((x) => x.nativeEqualsStructured), malformedLinks: w.reduce((a, x) => a + x.malformedLinks, 0), firstWindow: w[0]!.candidates.map((c) => c.displayName) };
  }
  out.historicalControls = controls;

  // Frozen multi-window term: every window, plus out-of-range, plus raw-link reopen from window 2.
  const multi = await walk(FROZEN_MULTI_WINDOW_TERM);
  const beyond = (await executeInsuranceNameCandidatesV1({ operation: 'name_candidates', name: FROZEN_MULTI_WINDOW_TERM, page: multi.length + 3 })).body;
  const reopen = [];
  for (const url of multi[1]!.selectionUrls.slice(0, 3)) {
    const r = await executeInsuranceRequest(new URL(url, 'https://www.insurancetrusthub.com').searchParams);
    reopen.push({ rawSelectionUrl: url, terminalState: r.terminalState, reopened: r.results.map((c) => c.entityId), intended: url.endsWith(r.results[0]?.entityId ?? 'no-identity') && r.results.length === 1 });
  }
  const stale = await executeInsuranceRequest(new URLSearchParams({ q: 'Find beacon', selected: multi[1]!.candidates[0]!.stableKey.split(':')[2]! }));
  out.frozenMultiWindow = {
    term: FROZEN_MULTI_WINDOW_TERM,
    windows: multi.map((w) => ({ page: w.page, returned: w.returned, hasMore: w.hasMore, nextPage: w.nextPage, matchedCount: w.matchedCount, exact: w.matchedCountIsExact, completeness: w.completeness, nativeEqualsStructured: w.nativeEqualsStructured, first: w.candidates[0]?.displayName, last: w.candidates.at(-1)?.displayName })),
    duplicateAcrossWindows: (() => { const k = multi.flatMap((w) => w.candidates.map((c) => c.stableKey)); return k.length - new Set(k).size; })(),
    outOfRange: { page: multi.length + 3, state: beyond.resultState, returned: beyond.pagination.returned, outOfRange: beyond.pagination.outOfRange, hasMore: beyond.pagination.hasMore },
    rawSelectionFromWindow2Reopen: reopen,
    alliedIdentitySelectedUnderBeaconRequest: { terminalState: stale.terminalState, results: stale.results.length, failsClosed: stale.results.length === 0 },
  };

  // Structured v2 on the same term: links and page 2.
  const v1 = await executeSpecialistV2({ identityName: FROZEN_MULTI_WINDOW_TERM, limit: 10 }), v2 = await executeSpecialistV2({ identityName: FROZEN_MULTI_WINDOW_TERM, page: 2, limit: 10 });
  out.structuredV2 = { page1: { state: v1.body.resultState, returned: v1.body.rows.length, pagination: v1.body.pagination }, page2: { state: v2.body.resultState, returned: v2.body.rows.length, pagination: v2.body.pagination }, page2DiffersFromPage1: JSON.stringify(v1.body.rows.map((r) => r.name)) !== JSON.stringify(v2.body.rows.map((r) => r.name)), page2EqualsSiblingWindow2: JSON.stringify(v2.body.rows.map((r) => r.name)) === JSON.stringify(multi[1]!.candidates.map((c) => c.displayName)), malformedSelectionUrls: [...v1.body.rows, ...v2.body.rows].filter((r) => r.selectionUrl && BAD.test(r.selectionUrl)).length, schemaFingerprint: v1.body.schemaFingerprint };

  // Other required name shapes.
  const shapes: Record<string, unknown> = {};
  for (const [key, name] of Object.entries({ exactNormalizedAgency: 'ALLIED AMERICAN UNDERWRITERS, INC.', punctuationVariant: 'allied american underwriters inc', legalInsurerWave1: 'CITIZENS PROP INS CORP', legalInsurerShortWord: 'ocean harbor', genuineMiss: 'Zyqorvane Underwriters', broadButDistinctive: 'summit' })) {
    const s = (await executeInsuranceNameCandidatesV1({ operation: 'name_candidates', name })).body;
    shapes[key] = { supplied: name, state: s.resultState, returned: s.pagination.returned, hasMore: s.pagination.hasMore, matchedCount: s.pagination.matchedCount, first: s.candidates[0] ? { displayName: s.candidates[0].displayName, class: s.candidates[0].entityClass, method: s.candidates[0].match.method, field: s.candidates[0].match.field, action: s.candidates[0].action } : null };
  }
  out.nameShapes = shapes;

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify({ historicalControls: out.historicalControls, frozenMultiWindow: out.frozenMultiWindow, structuredV2: out.structuredV2, nameShapes: out.nameShapes }, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
