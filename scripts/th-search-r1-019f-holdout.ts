/**
 * TH-SEARCH-R1-019F frozen organization-name holdout. READ-ONLY against the real source.
 *   draw : deterministic draw, written ONCE to docs/qa/th-search-r1-019f/holdout-frozen.json (refuses to redraw).
 *          Drawn from the source directly (fixed UUID keyset anchors + fixed Wave-1 positions), NOT through the
 *          candidate engine, and frozen before the final candidate is evaluated.
 *   run <label> : one pass per label through BOTH surfaces; results kept per label, never overwritten.
 * Organization names only (agencies + published Wave-1 legal insurers). No individual-producer discovery.
 * A bounded QA sample: no statistical claims.
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv } from './lib/load-local-env';
import { listPublishedInsurers } from '../lib/national/legal-insurer-pilot';

loadLocalEnv();
const DIR = 'docs/qa/th-search-r1-019f';
const FROZEN = `${DIR}/holdout-frozen.json`;
type Case = { id: string; kind: string; supplied: string; expectedEntityId: string | null; expectedClass: 'agency' | 'insurer' | null; sourceName?: string };

async function draw() {
  if (fs.existsSync(FROZEN)) { console.error(`${FROZEN} exists. The holdout is frozen and is never redrawn.`); process.exit(1); }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const cases: Case[] = [];
  // Fixed keyset anchors (first agency whose id sorts at/after each anchor) -- deterministic, and cheap on the primary key.
  const anchors = ['0a', '1f', '33', '4c', '61', '7e', '95', 'a8', 'c2', 'e7'].map((p) => `${p}000000-0000-4000-8000-000000000000`);
  let n = 0;
  for (const anchor of anchors) {
    const { data, error } = await admin.from('national_entities').select('id, legal_name, display_name').eq('entity_kind', 'agency').gte('id', anchor).order('id').limit(1);
    if (error) throw new Error(error.message);
    const row = data?.[0]; if (!row?.legal_name) continue;
    n += 1; const base = `A${n}`;
    cases.push({ id: `${base}-exact`, kind: 'agency exact source legal name', supplied: row.legal_name, expectedEntityId: row.id, expectedClass: 'agency', sourceName: row.legal_name });
    cases.push({ id: `${base}-lower`, kind: 'agency lowercase', supplied: row.legal_name.toLowerCase(), expectedEntityId: row.id, expectedClass: 'agency', sourceName: row.legal_name });
    const stripped = row.legal_name.replace(/[.,'"()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (stripped !== row.legal_name) cases.push({ id: `${base}-punct`, kind: 'agency punctuation variant', supplied: stripped, expectedEntityId: row.id, expectedClass: 'agency', sourceName: row.legal_name });
    if (/&/.test(row.legal_name)) cases.push({ id: `${base}-amp`, kind: 'agency ampersand variant (& -> and)', supplied: row.legal_name.replace(/&/g, 'and'), expectedEntityId: row.id, expectedClass: 'agency', sourceName: row.legal_name });
    if (row.display_name && row.display_name !== row.legal_name) cases.push({ id: `${base}-display`, kind: 'agency source display name differs from legal name', supplied: row.display_name, expectedEntityId: row.id, expectedClass: 'agency', sourceName: row.display_name });
  }
  const insurers = [...listPublishedInsurers()].sort((a, b) => a.naic_cocode.localeCompare(b.naic_cocode));
  for (const [i, pos] of [0, 7, 14, 21].entries()) {
    const ins = insurers[pos]; if (!ins) continue;
    cases.push({ id: `I${i + 1}-exact`, kind: 'published Wave-1 legal insurer exact name', supplied: ins.canonical_legal_name, expectedEntityId: ins.entity_id, expectedClass: 'insurer', sourceName: ins.canonical_legal_name });
    cases.push({ id: `I${i + 1}-lower`, kind: 'published Wave-1 legal insurer lowercase', supplied: ins.canonical_legal_name.toLowerCase(), expectedEntityId: ins.entity_id, expectedClass: 'insurer', sourceName: ins.canonical_legal_name });
  }
  cases.push({ id: 'B1-broad', kind: 'broad multi-candidate name (frozen multi-window term)', supplied: 'allied', expectedEntityId: null, expectedClass: null });
  for (const [i, miss] of ['Zyqorvane Underwriters', 'Quixelborn Mutual Assurance', 'Vantrellisk Risk Partners'].entries()) cases.push({ id: `M${i + 1}-miss`, kind: 'genuine miss', supplied: miss, expectedEntityId: null, expectedClass: null });
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FROZEN, JSON.stringify({ frozenAt: new Date().toISOString(), method: 'agencies: first national_entities agency at or after each of ten fixed UUID keyset anchors; insurers: Wave-1 sorted by NAIC code at fixed positions; variants derived mechanically; misses are invented strings. Drawn from the source, not through the candidate engine.', cases }, null, 2) + '\n');
  console.log(`froze ${cases.length} cases`);
}

async function run(label: string) {
  if (!/^[a-z0-9-]+$/.test(label ?? '')) { console.error('usage: run <label>'); process.exit(1); }
  const out = `${DIR}/holdout-results.${label}.json`;
  if (fs.existsSync(out)) { console.error(`${out} exists. One pass per label; results are never overwritten.`); process.exit(1); }
  const { cases } = JSON.parse(fs.readFileSync(FROZEN, 'utf8')) as { cases: Case[] };
  const { executeInsuranceRequest } = await import('../lib/insurance-ask/execute');
  const { executeInsuranceNameCandidatesV1 } = await import('../lib/specialist-execution/name-candidates');
  const rows = [];
  for (const c of cases) {
    const row: Record<string, unknown> = { id: c.id, kind: c.kind, supplied: c.supplied };
    try {
      // Walk every window on BOTH surfaces until the expected identity is found or the stream ends.
      const seenNative: string[] = [], seenStructured: string[] = []; let agree = true, continuationAgree = true, badLinks = 0, foundWindow: number | null = null, state = '';
      for (let page = 1; page <= 12; page += 1) {
        const native = await executeInsuranceRequest(new URLSearchParams({ q: `Find ${c.supplied}`, ...(page > 1 ? { page: String(page) } : {}) }));
        const structured = (await executeInsuranceNameCandidatesV1({ operation: 'name_candidates', name: c.supplied, page, limit: 10 })).body;
        state = String(structured.resultState);
        const nIds = native.results.map((r) => r.entityId), sIds = structured.candidates.map((r) => r.stableKey.split(':')[2]!);
        if (JSON.stringify(nIds) !== JSON.stringify(sIds)) agree = false;
        if (Boolean(native.nameCandidateWindow?.hasMore) !== structured.pagination.hasMore) continuationAgree = false;
        for (const r of native.results) if (r.selectionHref && /=(undefined|null)(&|$)/.test(r.selectionHref)) badLinks += 1;
        for (const r of structured.candidates) for (const u of [r.selectionUrl, r.profileUrl]) if (u && /=(undefined|null)(&|$)/.test(u)) badLinks += 1;
        seenNative.push(...nIds); seenStructured.push(...sIds);
        if (c.expectedEntityId && foundWindow === null && sIds.includes(c.expectedEntityId)) foundWindow = page;
        if (!structured.pagination.hasMore || (c.expectedEntityId && foundWindow !== null)) break;
      }
      Object.assign(row, {
        structuredState: state, expectedEntityId: c.expectedEntityId, foundInWindow: foundWindow,
        expectedRecalled: c.expectedEntityId ? foundWindow !== null : null,
        candidatesSeen: seenStructured.length,
        duplicateAcrossWindows: new Set(seenStructured).size !== seenStructured.length,
        nativeStructuredAgreement: agree, continuationAgreement: continuationAgree, malformedLinks: badLinks,
        incorrectIdentityOnMiss: c.kind === 'genuine miss' ? seenStructured.length : null,
      });
    } catch (e) { Object.assign(row, { sourceFailure: (e as Error).message }); }
    rows.push(row); console.log(JSON.stringify(row));
  }
  const targeted = rows.filter((r) => r.expectedEntityId);
  const summary = {
    cases: rows.length, targeted: targeted.length, expectedIdentityRecalled: targeted.filter((r) => r.expectedRecalled).length,
    missesReturningAnyCandidate: rows.filter((r) => (r.incorrectIdentityOnMiss as number) > 0).length,
    duplicateAcrossWindows: rows.filter((r) => r.duplicateAcrossWindows).length, sourceFailures: rows.filter((r) => r.sourceFailure).length,
    malformedLinks: rows.reduce((a, r) => a + ((r.malformedLinks as number) ?? 0), 0),
    nativeStructuredDisagreements: rows.filter((r) => r.nativeStructuredAgreement === false).length,
    continuationDisagreements: rows.filter((r) => r.continuationAgreement === false).length,
    note: 'Bounded QA sample. No statistical claim.',
  };
  fs.writeFileSync(out, JSON.stringify({ label, ranAt: new Date().toISOString(), summary, rows }, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
}

const [cmd, label] = process.argv.slice(2);
(cmd === 'draw' ? draw() : cmd === 'run' ? run(label!) : Promise.reject(new Error('usage: draw | run <label>'))).catch((e) => { console.error(e); process.exit(1); });
