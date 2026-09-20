/**
 * TH-SEARCH-R1-019F gate: Insurance organization-name candidate engine, continuation, link integrity,
 * native/structured parity. Fixture source only (scripts/fixtures/insurance-r13.ts) -- no network.
 *   npm run check:th-search-r1-019f
 */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AskInsuranceResultView } from '../components/ask-insurance-result';
import { executeInsuranceRequest, withInsuranceSource, type InsuranceAskResult } from '../lib/insurance-ask/execute';
import { collectInsuranceNameCandidates, nameCandidateWindow, NAME_SCAN_BATCH, type AgencySourceRow, type NameSource } from '../lib/insurance-ask/name-candidates';
import { matchSourceName } from '../lib/insurance-ask/name-match';
import { insuranceAskHref, insuranceRequestHref } from '../lib/insurance-ask/request';
import { executeSpecialistV2 } from '../lib/specialist-execution/v2';
import { SPECIALIST_EXECUTION_CONTRACT, SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT, SPECIALIST_EXECUTION_VERSION } from '../lib/specialist-execution/contract';
import { executeInsuranceNameCandidatesV1, insuranceNameCandidatesCapability, INSURANCE_NAME_CANDIDATES_SCHEMA_FINGERPRINT, type NameCandidatesEnvelope } from '../lib/specialist-execution/name-candidates';
import { GET as nameGet, POST as namePost } from '../app/api/specialist-execution/name-candidates/v1/route';
import { fixtureSource, ids, insurerFixture } from './fixtures/insurance-r13';

let pass = 0, fail = 0;
async function check(name: string, fn: () => unknown | Promise<unknown>) {
  try { await fn(); pass += 1; console.log('PASS', name); }
  catch (e) { fail += 1; console.error('FAIL', name, String(e instanceof Error ? e.message : e)); }
}
const uuid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const BAD_LINK = /=(undefined|null)(&|$)/;

/** 23 "orchard" agencies (3 windows of 10), substring decoys that sort FIRST, a person, and a two-field entity. */
function world(options: { outage?: boolean; flood?: boolean } = {}) {
  const src = fixtureSource(options);
  const entities = src.tables.national_entities!;
  for (let i = 1; i <= 21; i += 1) entities.push({ id: uuid(i), entity_kind: 'agency', npn: String(5000000 + i), display_name: `Orchard Agency ${String(i).padStart(2, '0')}`, legal_name: `ORCHARD AGENCY ${String(i).padStart(2, '0')} LLC` });
  // Substring-only decoys: contain "orchard" inside a longer word, and sort BEFORE every real candidate.
  for (let i = 1; i <= 15; i += 1) entities.push({ id: uuid(100 + i), entity_kind: 'agency', npn: null, display_name: `AAA Orchardson ${i}`, legal_name: `AAA ORCHARDSON ${i} INC` });
  // Exact normalized name (punctuation/ampersand presentation differs) -- must lead the stream.
  entities.push({ id: uuid(200), entity_kind: 'agency', npn: '5999999', display_name: 'Orchard & Vine Insurance', legal_name: 'ORCHARD AND VINE INSURANCE, INC.' });
  // One identity matching through BOTH source-name fields -- must appear once.
  entities.push({ id: uuid(201), entity_kind: 'agency', npn: '5999998', display_name: 'Zed Orchard Partners', legal_name: 'ZED ORCHARD PARTNERS LLC' });
  // An individual producer whose name contains the term -- never eligible.
  entities.push({ id: uuid(300), entity_kind: 'person', npn: '7000001', display_name: 'Olive Orchard', legal_name: 'ORCHARD, OLIVE' });
  // TH-SEARCH-R1-019F-R1: a name broad enough to exhaust the scan bound (5,200 > NAME_SCAN_ROW_BOUND per field).
  if (options.flood) for (let i = 1; i <= 5200; i += 1) entities.push({ id: `20000000-0000-4000-8000-${String(i).padStart(12, '0')}`, entity_kind: 'agency', npn: null, display_name: `Meadow Agency ${String(i).padStart(4, '0')}`, legal_name: `MEADOW AGENCY ${String(i).padStart(4, '0')} LLC` });
  // A bail-bond business and an ordinary agency sharing a distinctive word.
  entities.push({ id: uuid(500), entity_kind: 'agency', npn: '5888801', display_name: 'Quarry Bail Bonds', legal_name: 'QUARRY BAIL BONDS LLC' });
  entities.push({ id: uuid(501), entity_kind: 'agency', npn: '5888802', display_name: 'Quarry Insurance Agency', legal_name: 'QUARRY INSURANCE AGENCY LLC' });
  const insurers = [...insurerFixture, { ...insurerFixture[0]!, entity_id: uuid(400), canonical_legal_name: 'ORCHARD MUTUAL INSURANCE COMPANY', naic_cocode: '20064', slug: 'orchard-mutual-insurance-company', baseSlug: 'orchard-mutual-insurance-company' }];
  return { ...src, insurers, run: <T,>(task: () => Promise<T>) => withInsuranceSource(src.db, task, insurers) };
}
const native = (w: ReturnType<typeof world>, params: Record<string, string>) => w.run(() => executeInsuranceRequest(new URLSearchParams(params)));
const structured = async (w: ReturnType<typeof world>, req: Record<string, unknown>) => (await w.run(() => executeInsuranceNameCandidatesV1({ operation: 'name_candidates', ...req }))).body;
const nativeIds = (r: InsuranceAskResult) => r.results.map((c) => c.entityId);
const structIds = (b: NameCandidatesEnvelope) => b.candidates.map((c) => c.stableKey.split(':')[2]!);
async function allWindows(w: ReturnType<typeof world>, name: string) {
  const windows: NameCandidatesEnvelope[] = [];
  for (let page = 1; page <= 20; page += 1) { const b = await structured(w, { name, page }); windows.push(b); if (!b.pagination.hasMore) break; }
  return windows;
}

async function main() {
  // 1 ---------------------------------------------------------------------------------------------
  await check('1. normalized exact name leads and is labelled exact', async () => {
    const b = await structured(world(), { name: 'Orchard and Vine Insurance Inc' });
    assert.equal(b.resultState, 'CANDIDATES');
    assert.equal(b.candidates[0]!.displayName, 'Orchard & Vine Insurance');
    assert.equal(b.candidates[0]!.match.method, 'normalized_exact_name');
    assert.equal(b.candidates[0]!.match.field, 'legal_name');
  });
  // 2 ---------------------------------------------------------------------------------------------
  await check('2. distinctive-token candidates: whole words only; generic words alone are refused', async () => {
    const b = await structured(world(), { name: 'orchard' });
    assert.ok(b.candidates.every((c) => c.match.method === 'distinctive_token_candidate'));
    assert.ok(b.candidates.every((c) => !/orchardson/i.test(c.displayName)));
    const generic = await w0(() => executeInsuranceNameCandidatesV1({ operation: 'name_candidates', name: 'Insurance Agency LLC' }));
    assert.equal(generic.status, 400); assert.equal(generic.body.error?.code, 'no_distinctive_name_word');
  });
  // 3 ---------------------------------------------------------------------------------------------
  await check('3. punctuation / ampersand presentation does not change the identity found', async () => {
    const w = world(); const variants = ['Orchard & Vine Insurance, Inc.', 'orchard and vine insurance inc', 'ORCHARD AND VINE INSURANCE INC'];
    for (const name of variants) { const b = await structured(w, { name }); assert.equal(structIds(b)[0], uuid(200), name); assert.equal(b.candidates[0]!.match.method, 'normalized_exact_name', name); }
  });
  // 4 ---------------------------------------------------------------------------------------------
  await check('4. agency and legal insurer stay separate classes, independently keyed', async () => {
    const w = world(); const windows = await allWindows(w, 'orchard'); const all = windows.flatMap((b) => b.candidates);
    const insurer = all.find((c) => c.entityClass === 'legal_insurer')!;
    assert.equal(insurer.stableKey, `insurance:legal_insurer:${uuid(400)}`); assert.equal(insurer.naicCode, '20064'); assert.equal(insurer.npn, null);
    assert.ok(all.filter((c) => c.entityClass === 'agency').every((c) => c.stableKey.startsWith('insurance:agency:') && c.naicCode === null));
    const onlyInsurers = await structured(w, { name: 'orchard', entityClass: 'legal_insurer' });
    assert.deepEqual(onlyInsurers.candidates.map((c) => c.entityClass), ['legal_insurer']);
    const onlyAgencies = await allWindows(w, 'orchard'); void onlyAgencies;
  });
  // 5 ---------------------------------------------------------------------------------------------
  await check('5. individual producers are never name candidates (query filter AND engine guard)', async () => {
    const w = world(); const all = (await allWindows(w, 'orchard')).flatMap(structIds);
    assert.ok(!all.includes(uuid(300)));
    assert.ok(w.calls.filter((c) => c.table === 'national_entities').every((c) => c.filters.some(([op, k, v]) => op === 'eq' && k === 'entity_kind' && v === 'agency')));
    // A source that ignores the kind filter still cannot inject a person.
    const person: AgencySourceRow = { id: uuid(300), entity_kind: 'person', npn: '7000001', display_name: 'Olive Orchard', legal_name: 'ORCHARD, OLIVE' };
    const leaky: NameSource = { agenciesExact: async () => [], agenciesContainingTokens: async (_f, _t, from) => (from === 0 ? [person] : []), publishedInsurers: () => [] };
    assert.deepEqual((await collectInsuranceNameCandidates(leaky, { name: 'orchard' })).candidates, []);
    const restricted = await w0(() => executeInsuranceNameCandidatesV1({ operation: 'name_candidates', name: 'orchard', entityClass: 'producer' }));
    assert.equal(restricted.status, 422); assert.equal(restricted.body.resultState, 'RESTRICTED_SCOPE');
  });
  // 6 ---------------------------------------------------------------------------------------------
  await check('6. match BEFORE pagination: 15 substring decoys that sort first cost no candidate', async () => {
    const w = world(); const windows = await allWindows(w, 'orchard'); const all = windows.flatMap(structIds);
    assert.equal(all.length, 24, '21 numbered + exact-capable + two-field agency + 1 insurer');
    assert.equal(windows[0]!.pagination.returned, 10, 'window 1 is full although the first 15 source rows are non-matching decoys');
    for (const c of windows.flatMap((b) => b.candidates)) assert.ok(matchSourceName('orchard', c.match.value), c.displayName);
    // No source read for the name predicate is ever smaller than a scan batch.
    const nameReads = w.calls.filter((c) => c.table === 'national_entities' && c.filters.some(([op]) => op === 'ilike'));
    assert.ok(nameReads.length > 0 && nameReads.every((c) => c.limit === NAME_SCAN_BATCH));
  });
  // 7 ---------------------------------------------------------------------------------------------
  await check('7. deterministic ordering with a stable tie-break', async () => {
    const a = (await allWindows(world(), 'orchard')).flatMap(structIds), b = (await allWindows(world(), 'orchard')).flatMap(structIds);
    assert.deepEqual(a, b);
    // Same display name, different identities: order is fixed by the stable key, in either insertion order.
    const twin = (id: string): AgencySourceRow => ({ id, entity_kind: 'agency', npn: null, display_name: 'Twin Orchard', legal_name: 'TWIN ORCHARD LLC' });
    const src = (rows: AgencySourceRow[]): NameSource => ({ agenciesExact: async () => [], agenciesContainingTokens: async (_f, _t, from) => (from === 0 ? rows : []), publishedInsurers: () => [] });
    const x = await collectInsuranceNameCandidates(src([twin(uuid(2)), twin(uuid(1))]), { name: 'orchard' }), y = await collectInsuranceNameCandidates(src([twin(uuid(1)), twin(uuid(2))]), { name: 'orchard' });
    assert.deepEqual(x.candidates.map((c) => c.entityId), [uuid(1), uuid(2)]); assert.deepEqual(y.candidates.map((c) => c.entityId), [uuid(1), uuid(2)]);
  });
  // 8 ---------------------------------------------------------------------------------------------
  await check('8. second window is a real continuation on BOTH surfaces', async () => {
    const w = world(); const p1 = await structured(w, { name: 'orchard', page: 1 }), p2 = await structured(w, { name: 'orchard', page: 2 });
    assert.equal(p1.pagination.hasMore, true); assert.equal(p1.pagination.nextPage, 2);
    assert.equal(p2.pagination.returned, 10); assert.notDeepEqual(structIds(p1), structIds(p2));
    const n2 = await native(w, { q: 'Find orchard', page: '2' }); assert.deepEqual(nativeIds(n2), structIds(p2));
    // page 1 + page 2 are the first two windows of ONE stream.
    const stream = await w.run(async () => (await import('../lib/insurance-ask/execute')).searchInsuranceNameCandidates({ name: 'orchard', page: 1, limit: 20, q: 'Find orchard' }));
    assert.deepEqual([...structIds(p1), ...structIds(p2)], stream.cards.map((c) => c.entityId));
  });
  // 9 ---------------------------------------------------------------------------------------------
  await check('9. no identity repeats across windows, including one that matches through two fields', async () => {
    const all = (await allWindows(world(), 'orchard')).flatMap(structIds);
    assert.equal(new Set(all).size, all.length); assert.equal(all.filter((id) => id === uuid(201)).length, 1);
  });
  // 10 --------------------------------------------------------------------------------------------
  await check('10. truthful final window, out-of-range window, and no total unless computed', async () => {
    const w = world(); const windows = await allWindows(w, 'orchard'); const last = windows.at(-1)!;
    assert.equal(windows.length, 3); assert.equal(last.pagination.returned, 4); assert.equal(last.pagination.hasMore, false); assert.equal(last.pagination.nextPage, null);
    assert.equal(last.pagination.matchedCount, 24); assert.equal(last.pagination.matchedCountIsExact, true); assert.equal(last.pagination.completeness, 'COMPLETE');
    const beyond = await structured(w, { name: 'orchard', page: 9 });
    assert.equal(beyond.resultState, 'CANDIDATES', 'candidates exist; this window is simply past them -- not NO_MATCH');
    assert.deepEqual([beyond.pagination.outOfRange, beyond.pagination.returned, beyond.pagination.hasMore], [true, 0, false]);
    // Scan bound: no census is emitted, and the last scanned window is not called final.
    const flood: NameSource = { agenciesExact: async () => [], agenciesContainingTokens: async (field, _t, from) => Array.from({ length: NAME_SCAN_BATCH }, (_, i) => ({ id: `${field}-${from + i}`, entity_kind: 'agency', npn: null, display_name: `Orchard ${field} ${from + i}`, legal_name: `ORCHARD ${field} ${from + i}` })), publishedInsurers: () => [] };
    const bounded = await collectInsuranceNameCandidates(flood, { name: 'orchard' }); const cut = nameCandidateWindow(bounded, 1, 10).window;
    assert.equal(bounded.completeness, 'SCAN_BOUND_REACHED'); assert.equal(cut.matchedCount, null);
  });
  // 11 --------------------------------------------------------------------------------------------
  await check('11. source failure is never a miss, an empty window or a last page', async () => {
    const down = world({ outage: true });
    await assert.rejects(native(down, { q: 'Find orchard' }), /unavailable/i);
    const s = await down.run(() => executeInsuranceNameCandidatesV1({ operation: 'name_candidates', name: 'orchard' }));
    assert.equal(s.status, 503); assert.equal(s.body.resultState, 'SOURCE_UNAVAILABLE'); assert.equal(s.body.name.predicateApplied, false); assert.deepEqual(s.body.candidates, []);
    const v2 = await down.run(() => executeSpecialistV2({ identityName: 'orchard' })); assert.equal(v2.body.resultState, 'BACKEND_UNAVAILABLE'); assert.equal(v2.status, 503);
    // Failure in the MIDDLE of the scan also throws -- a partial stream is never served as complete.
    let reads = 0; const dies: NameSource = { agenciesExact: async () => [], agenciesContainingTokens: async (_f, _t, from) => { reads += 1; if (reads > 1) throw new Error('Insurance research source unavailable'); return Array.from({ length: NAME_SCAN_BATCH }, (_, i) => ({ id: `x-${from + i}`, entity_kind: 'agency', npn: null, display_name: `Orchard ${i}`, legal_name: `ORCHARD ${i}` })); }, publishedInsurers: () => [] };
    await assert.rejects(collectInsuranceNameCandidates(dies, { name: 'orchard' }), /unavailable/);
    const miss = await structured(world(), { name: 'Zyqorvane Underwriters' }); assert.equal(miss.resultState, 'NO_MATCH'); assert.equal(miss.pagination.matchedCount, 0); assert.equal(miss.name.predicateApplied, true);
  });
  // 12 --------------------------------------------------------------------------------------------
  await check('12. no hub link ever contains =undefined or =null, on any surface', async () => {
    const w = world();
    const undefinedOptions = { entity: undefined, state: undefined, loa: undefined } as Record<string, undefined>;
    assert.equal(insuranceAskHref({ q: 'Find orchard', options: undefinedOptions, selected: uuid(1) }), `/ask?q=Find+orchard&selected=${uuid(1)}`);
    assert.equal(insuranceAskHref({ q: 'x', options: { state: 'undefined', loa: 'null' } as never }), '/ask?q=x');
    assert.equal(insuranceRequestHref('Find orchard', { state: 'FL', loa: undefined }, 2), '/ask?q=Find+orchard&state=FL&page=2');
    const v2 = await w.run(() => executeSpecialistV2({ identityName: 'orchard', limit: 10 }));
    assert.equal(v2.body.rows.length, 10);
    for (const row of v2.body.rows) { assert.ok(row.selectionUrl); assert.doesNotMatch(row.selectionUrl!, BAD_LINK); }
    for (const d of v2.body.destinations) assert.doesNotMatch(d.url, BAD_LINK);
    for (const b of await allWindows(w, 'orchard')) for (const c of b.candidates) for (const u of [c.selectionUrl, c.profileUrl, c.action.url]) if (u) assert.doesNotMatch(u, BAD_LINK);
    const html = renderToStaticMarkup(createElement(AskInsuranceResultView, { result: await native(w, { q: 'Find orchard' }) })); assert.doesNotMatch(html, /=(undefined|null)(&amp;|&|")/);
  });
  // 13 --------------------------------------------------------------------------------------------
  await check('13. a RAW selection URL (no consumer sanitation) reopens and server-revalidates the intended identity -- from any window', async () => {
    const w = world();
    for (const page of [1, 2, 3]) {
      const b = await structured(w, { name: 'orchard', page }); const v2 = await w.run(() => executeSpecialistV2({ identityName: 'orchard', page, limit: 10 }));
      for (const [url, id] of [...b.candidates.map((c) => [c.selectionUrl, c.stableKey.split(':')[2]!] as const), ...v2.body.rows.map((r) => [r.selectionUrl!, new URLSearchParams(r.selectionUrl!.split('?')[1]).get('selected')!] as const)]) {
        const reopened = await w.run(() => executeInsuranceRequest(new URL(url, 'https://hub.invalid').searchParams));
        assert.equal(reopened.terminalState, 'IDENTITY_FOUND', url); assert.deepEqual(nativeIds(reopened), [id], url);
      }
    }
  });
  // 14 --------------------------------------------------------------------------------------------
  await check('14. a stale or wrong selection fails closed; nothing is substituted', async () => {
    const w = world();
    const wrongName = await native(w, { q: 'Find Acme Insurance Agency', selected: uuid(5) }); // a real identity, but not a candidate of THIS request
    assert.equal(wrongName.terminalState, 'NEEDS_CLARIFICATION'); assert.deepEqual(wrongName.results, []); assert.match(wrongName.limitations[0]!, /not a current candidate/);
    const stale = await native(w, { q: 'Find orchard', selected: uuid(999) }); assert.deepEqual(stale.results, []); assert.equal(stale.terminalState, 'NEEDS_CLARIFICATION');
    const person = await native(w, { q: 'Find orchard', selected: uuid(300) }); assert.deepEqual(person.results, [], 'a producer can never be selected through name discovery');
    const malformed = await native(w, { q: 'Find orchard', selected: 'undefined' }); assert.equal(malformed.terminalState, 'INVALID_INPUT');
  });
  // 15 --------------------------------------------------------------------------------------------
  await check('15. publication action integrity: profile only where published; research rows get only the research continuation', async () => {
    const all = (await allWindows(world(), 'orchard')).flatMap((b) => b.candidates);
    for (const c of all) {
      if (c.entityClass === 'legal_insurer') { assert.equal(c.publicationState, 'PUBLIC_PROFILE'); assert.equal(c.action.type, 'PROFILE'); assert.equal(c.profileUrl, '/insurers/orchard-mutual-insurance-company'); assert.equal(c.action.url, c.profileUrl); }
      else { assert.equal(c.publicationState, 'RESEARCH_ROW_ONLY'); assert.equal(c.profileUrl, null); assert.equal(c.action.type, 'RESEARCH'); assert.match(c.action.url, /^\/ask\?q=Find\+orchard&selected=[0-9a-f-]{36}$/); assert.doesNotMatch(JSON.stringify(c), /\/providers\/|\/insurers\//); }
    }
    const html = renderToStaticMarkup(createElement(AskInsuranceResultView, { result: await native(world(), { q: 'Find orchard' }) }));
    assert.doesNotMatch(html, /href="\/providers\//);
  });
  // 16 --------------------------------------------------------------------------------------------
  await check('16. native / structured parity, field by field, for every window', async () => {
    const w = world();
    for (let page = 1; page <= 4; page += 1) {
      const n = await native(w, { q: 'Find orchard', ...(page > 1 ? { page: String(page) } : {}) }), s = await structured(w, { name: 'orchard', page });
      assert.equal(n.results.length, s.candidates.length, `window ${page}`);
      n.results.forEach((card, i) => { const c = s.candidates[i]!;
        assert.equal(c.stableKey, `insurance:${card.entityClass === 'insurer' ? 'legal_insurer' : 'agency'}:${card.entityId}`);
        assert.equal(c.displayName, card.displayName); assert.equal(c.match.field, card.matchEvidence!.field); assert.equal(c.match.value, card.matchEvidence!.value); assert.equal(c.match.method, card.matchEvidence!.method);
        assert.equal(c.npn, card.npn); assert.equal(c.naicCode, card.naicCode); assert.equal(c.publicationState, card.href ? 'PUBLIC_PROFILE' : 'RESEARCH_ROW_ONLY');
        assert.equal(c.profileUrl, card.href); assert.equal(c.selectionUrl, card.selectionHref);
      });
      assert.deepEqual([n.nameCandidateWindow!.hasMore, n.nameCandidateWindow!.outOfRange, n.nameCandidateWindow!.matchedCount, n.nameCandidateWindow!.completeness], [s.pagination.hasMore, s.pagination.outOfRange, s.pagination.matchedCount, s.pagination.completeness], `window ${page}`);
    }
    // Native UI carries the same continuation: Next on window 1, Previous + Next on 2, Previous only on the last.
    const nav = async (page: number) => renderToStaticMarkup(createElement(AskInsuranceResultView, { result: await native(w, { q: 'Find orchard', ...(page > 1 ? { page: String(page) } : {}) }) }));
    const [h1, h2, h3] = [await nav(1), await nav(2), await nav(3)];
    assert.match(h1, /href="\/ask\?q=Find\+orchard&amp;page=2"/); assert.doesNotMatch(h1, />\s*Previous/);
    assert.match(h2, /href="\/ask\?q=Find\+orchard"[^>]*>\s*Previous/); assert.match(h2, /page=3/);
    assert.match(h3, /page=2"[^>]*>\s*Previous/); assert.doesNotMatch(h3, />\s*Next/);
    for (const h of [h1, h2, h3]) assert.doesNotMatch(h, /\b(\d+ total|all results|complete list)\b/i);
    assert.match(h1, /More matching source-name candidates are available/);
  });
  // 17 --------------------------------------------------------------------------------------------
  await check('17. v2 stays compatible; the sibling contract is independently versioned and proves the name', async () => {
    assert.equal(SPECIALIST_EXECUTION_CONTRACT, 'trusthub-specialist-execution-v2'); assert.equal(SPECIALIST_EXECUTION_VERSION, '2.0.0');
    assert.equal(SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT, '4aa93bb372aebb45c7028b750000e77be4a847d9a210f3c40d3db1df1f7f637f', 'the fingerprint parent Ask pins');
    const w = world();
    const p1 = await w.run(() => executeSpecialistV2({ identityName: 'orchard', limit: 10 })), p2 = await w.run(() => executeSpecialistV2({ identityName: 'orchard', page: 2, limit: 10 }));
    assert.equal(p1.body.resultState, 'AMBIGUOUS_IDENTITIES'); assert.equal(p1.body.pagination.hasMore, true); assert.equal(p1.body.total, 24);
    assert.notDeepEqual(p1.body.rows.map((r) => r.name), p2.body.rows.map((r) => r.name), 'v2 page 2 is no longer page 1 again');
    assert.deepEqual(p2.body.rows.map((r) => r.name), (await structured(w, { name: 'orchard', page: 2 })).candidates.map((c) => c.displayName));
    const npn = await w.run(() => executeSpecialistV2({ identifier: { type: 'NPN', value: '10391484' } })); assert.equal(npn.body.resultState, 'EXACT_IDENTITY'); assert.equal(npn.body.rows[0]!.name, 'Acme Insurance Agency');
    const naic = await w.run(() => executeSpecialistV2({ identifier: { type: 'NAIC', value: '10064' } })); assert.equal(naic.body.resultState, 'EXACT_IDENTITY');
    const s = await structured(w, { name: '  Orchard   and Vine  ' });
    assert.equal(s.contract, 'insurance-name-candidates-v1'); assert.equal(s.contractVersion, '1.0.0'); assert.equal(s.schemaFingerprint, INSURANCE_NAME_CANDIDATES_SCHEMA_FINGERPRINT); assert.match(s.schemaFingerprint, /^[0-9a-f]{64}$/);
    assert.deepEqual([s.name.supplied, s.name.normalized, s.name.predicateApplied], ['Orchard and Vine', 'orchard and vine', true]);
    const cap = await (await nameGet(new Request('https://hub.invalid/api/specialist-execution/name-candidates/v1'))).json(); assert.equal(cap.schemaFingerprint, insuranceNameCandidatesCapability().schemaFingerprint); assert.equal(cap.endpoint, '/api/specialist-execution/name-candidates/v1');
    const post = await w.run(async () => namePost(new Request('https://hub.invalid/x', { method: 'POST', body: JSON.stringify({ operation: 'name_candidates', name: 'orchard', page: 3 }) }))); assert.equal(post.status, 200); assert.equal((await post.json()).pagination.returned, 4);
    for (const [req, status, state] of [[{ operation: 'name_candidates', name: 'orchard', page: 0 }, 400, 'INVALID_REQUEST'], [{ operation: 'name_candidates', name: 'orchard', limit: 50 }, 400, 'INVALID_REQUEST'], [{ operation: 'name_candidates', name: 'orchard', extra: 1 }, 400, 'INVALID_REQUEST'], [{ operation: 'cohort', name: 'orchard' }, 422, 'UNSUPPORTED_OPERATION'], [{ operation: 'name_candidates', name: 'NPN 10391484' }, 422, 'UNSUPPORTED_OPERATION']] as const) {
      const r = await w.run(() => executeInsuranceNameCandidatesV1(req)); assert.equal(r.status, status, JSON.stringify(req)); assert.equal(r.body.resultState, state, JSON.stringify(req)); assert.deepEqual(r.body.candidates, []);
    }
  });
  // 18 --------------------------------------------------------------------------------------------
  await check('18. existing TH-SEARCH-R1-013 name controls still hold through the new engine', async () => {
    const w = world();
    const acme = await native(w, { q: 'Find Acme Insurance Agency' });
    assert.equal(acme.candidateSelection, true); assert.deepEqual(nativeIds(acme).sort(), [ids.agency, ids.other].sort());
    assert.equal(acme.nameCandidateWindow!.hasMore, false); assert.equal(acme.candidateTruncated, false);
    const insurer = await native(w, { q: 'Research ACME INSURANCE COMPANY' }); assert.ok(insurer.results.some((c) => c.entityClass === 'insurer' && c.naicCode === '10064' && c.href === '/insurers/acme-insurance-company'));
    const chosen = await native(w, { q: 'Find Acme Insurance Agency', selected: ids.other }); assert.equal(chosen.terminalState, 'IDENTITY_FOUND'); assert.equal(chosen.results[0]!.credentialJurisdiction, 'TX');
    const none = await native(w, { q: 'Find Zyqorvane Underwriters' }); assert.equal(none.terminalState, 'NO_MATCH'); assert.deepEqual(none.results, []);
  });

  // 19 --------------------------------------------------------------------------------------------
  await check('19. v2 never emits an inexact success total: a bounded name search fails closed on v2, stays honest on sibling + native', async () => {
    const w = world({ flood: true });
    const SUCCESS_SHAPED = ['SUPPORTED_RESULTS', 'AMBIGUOUS_IDENTITIES', 'ZERO_MATCHING_ROWS', 'EXACT_IDENTITY', 'NO_CONFIDENT_MATCH'];
    // A. engine
    const engine = await w.run(async () => (await import('../lib/insurance-ask/execute')).searchInsuranceNameCandidates({ name: 'meadow', page: 1, limit: 10, q: 'Find meadow' }));
    assert.equal(engine.stream.completeness, 'SCAN_BOUND_REACHED'); assert.equal(engine.window.matchedCount, null);
    // B. sibling: partial, honest, useful
    const s = await w.run(() => executeInsuranceNameCandidatesV1({ operation: 'name_candidates', name: 'meadow' }));
    assert.equal(s.status, 200); assert.equal(s.body.resultState, 'PARTIAL_REFINE_REQUIRED'); assert.equal(s.body.name.predicateApplied, true);
    assert.deepEqual([s.body.pagination.completeness, s.body.pagination.matchedCount, s.body.pagination.matchedCountIsExact], ['SCAN_BOUND_REACHED', null, false]);
    assert.equal(s.body.candidates.length, 10);
    // Native: bounded results stay, with the refine disclosure and no total claimed.
    const n = await native(w, { q: 'Find meadow' });
    assert.equal(n.results.length, 10); assert.equal(n.nameCandidateWindow!.matchedCount, null); assert.equal(n.candidateTruncated, true);
    assert.ok(n.limitations.some((l) => /scan bound was reached/.test(l) && /no total is asserted/.test(l) && /not a complete list/.test(l)));
    const html = renderToStaticMarkup(createElement(AskInsuranceResultView, { result: n }));
    assert.match(html, /not a complete candidate list and no total is asserted\. Refine the name/); assert.doesNotMatch(html, /\b(\d[\d,]* total|all results)\b/i); assert.doesNotMatch(html, /\b\d[\d,]{3,} (identities|candidates)\b/);
    // C. v2: fail closed, every page, never success-shaped, never a miss, never an outage.
    for (const page of [1, 2, 7]) {
      const v2 = await w.run(() => executeSpecialistV2({ identityName: 'meadow', page, limit: 10 }));
      assert.equal(v2.status, 422, `page ${page}`); assert.equal(v2.body.resultState, 'UNSUPPORTED_CAPABILITY'); assert.ok(!SUCCESS_SHAPED.includes(v2.body.resultState)); assert.notEqual(v2.body.resultState, 'BACKEND_UNAVAILABLE');
      assert.equal(v2.body.error?.code, 'name_search_refinement_required'); assert.match(v2.body.error!.message, /candidates may exist/i); assert.match(v2.body.error!.message, /insurance-name-candidates-v1/);
      assert.deepEqual(v2.body.rows, []); assert.equal(v2.body.pagination.hasMore, false); assert.equal(v2.body.total, 0);
      assert.ok(v2.body.limitations.some((l) => /NOT a no-match/.test(l) && /not a finding about this name/.test(l)));
      assert.deepEqual(v2.body.destinations.filter((d) => d.type === 'IDENTITY_SELECTION'), []);
      assert.equal(v2.body.schemaFingerprint, '4aa93bb372aebb45c7028b750000e77be4a847d9a210f3c40d3db1df1f7f637f');
    }
    const viaRoute = await w.run(async () => (await import('../app/api/specialist-execution/v2/route')).POST(new Request('https://hub.invalid/x', { method: 'POST', body: JSON.stringify({ identityName: 'meadow' }) })));
    assert.equal(viaRoute.status, 422); assert.equal((await viaRoute.json()).error.code, 'name_search_refinement_required');
    // The invariant, stated generally: v2 is success-shaped for a name ONLY when the count is exact, and then total IS that count.
    for (const name of ['orchard', 'meadow', 'quarry', 'Zyqorvane Underwriters', 'Orchard and Vine Insurance Inc']) {
      const sib = (await w.run(() => executeInsuranceNameCandidatesV1({ operation: 'name_candidates', name }))).body, v2 = await w.run(() => executeSpecialistV2({ identityName: name, limit: 10 }));
      if (sib.pagination.completeness !== 'COMPLETE') { assert.ok(!SUCCESS_SHAPED.includes(v2.body.resultState), name); assert.equal(v2.status, 422, name); }
      else { assert.ok(SUCCESS_SHAPED.includes(v2.body.resultState), name); assert.equal(v2.body.total, sib.pagination.matchedCount, name); assert.equal(v2.body.pagination.total, sib.pagination.matchedCount, name); assert.equal(v2.body.pagination.hasMore, sib.pagination.hasMore, name); }
    }
    const orchard = await w.run(() => executeSpecialistV2({ identityName: 'orchard', limit: 10 })); assert.equal(orchard.body.total, 24); assert.equal(orchard.body.pagination.total, 24);
  });
  // 20 --------------------------------------------------------------------------------------------
  await check('20. bail-bond identity: a retained research identity natively; withheld per page (and disclosed) on network surfaces; one stream for all', async () => {
    const w = world();
    const n = await native(w, { q: 'Find quarry' });
    assert.deepEqual(n.results.map((c) => c.displayName), ['Quarry Bail Bonds', 'Quarry Insurance Agency'], 'native research shows both: INS-DIR-BAIL-001 retains the evidence, it only bars consumer-directory listing');
    assert.ok(n.results.every((c) => c.href === null), 'and neither is a profile');
    const s = await structured(w, { name: 'quarry' });
    assert.deepEqual(s.candidates.map((c) => c.displayName), ['Quarry Insurance Agency']); assert.equal(s.pagination.suppressedByPublicationPolicy, 1);
    assert.deepEqual([s.pagination.matchedCount, s.pagination.hasMore, s.pagination.completeness], [n.nameCandidateWindow!.matchedCount, n.nameCandidateWindow!.hasMore, n.nameCandidateWindow!.completeness], 'same stream, same continuation, same count on both surfaces');
    assert.deepEqual(structIds(s), nativeIds(n).filter((id) => id !== uuid(500)), 'every identity the network surface shows is the native identity, in the native order');
    assert.ok(s.limitations.some((l) => /withheld from this network surface/.test(l)));
    const v2 = await w.run(() => executeSpecialistV2({ identityName: 'quarry', limit: 10 }));
    assert.deepEqual(v2.body.rows.map((r) => r.name), ['Quarry Insurance Agency']); assert.equal(v2.body.diagnostics.bailRowsSuppressedOnPage, 1); assert.equal(v2.body.total, 2);
    const chosen = await native(w, { q: 'Find quarry', selected: uuid(500) }); assert.equal(chosen.terminalState, 'IDENTITY_FOUND'); assert.equal(chosen.results[0]!.href, null);
  });

  console.log({ pass, fail });
  if (fail) process.exit(1);
}
const w0 = <T,>(task: () => Promise<T>) => world().run(task);
main().catch((e) => { console.error(e); process.exit(1); });
