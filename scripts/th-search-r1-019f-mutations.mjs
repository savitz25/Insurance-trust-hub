/**
 * TH-SEARCH-R1-019F mutation check. Each mutation edits ONE file, runs the focused gate, and restores the
 * exact original bytes (sha256-verified) in a finally block. DETECTED = the gate fails.
 *   node scripts/th-search-r1-019f-mutations.mjs
 */
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';

const GATE = 'npm run --silent check:th-search-r1-019f';
const ENGINE = 'lib/insurance-ask/name-candidates.ts', EXECUTE = 'lib/insurance-ask/execute.ts', REQUEST = 'lib/insurance-ask/request.ts', SIBLING = 'lib/specialist-execution/name-candidates.ts';
const MUTATIONS = [
  { id: 'M1_hard_cap_no_continuation', file: ENGINE, find: 'const hasMore = moreInStream;', replace: 'const hasMore = false;', meaning: 'The first window is final again: more candidates exist but no continuation is offered.' },
  { id: 'M2_raw_rows_limited_before_matching', file: EXECUTE, find: "const { data } = await query.order(field).order('id').range(from, to);", replace: "const { data } = await query.order(field).order('id').range(from, Math.min(to, from + 10));", meaning: 'Source rows are cut to 11 BEFORE the name predicate runs (the pre-019F defect).' },
  { id: 'M3_no_stable_tie_break', file: ENGINE, find: '    || byCodeUnit(a.stableKey, b.stableKey);', replace: '    ;', meaning: 'Identities with equal names have no fixed order, so windows are not reproducible.' },
  { id: 'M4_duplicate_identity_across_windows', file: ENGINE, find: 'const start = (page - 1) * limit, all = stream.candidates;', replace: 'const start = (page - 1) * (limit - 1), all = stream.candidates;', meaning: 'Successive windows overlap: the last identity of a window reappears in the next.' },
  { id: 'M5_undefined_serialized_into_links', file: REQUEST, find: '    if (realOption(value)) params.set(key, value);', replace: '    params.set(key, String(value));', meaning: 'Absent options are written into hub links as =undefined (the observed Production defect).' },
  { id: 'M6_stale_selection_accepted', file: ENGINE, find: '  return hits.length === 1 ? hits[0]! : null;', replace: '  return hits.length === 1 ? hits[0]! : stream.candidates[0] ?? null;', meaning: 'A selected identity that is not a current candidate is silently replaced by another identity.' },
  { id: 'M7_producer_rows_admitted', file: ENGINE, find: "  return row.entity_kind === 'agency';", replace: '  return true;', meaning: 'Person/producer rows handed back by the source become unscoped name candidates.' },
  { id: 'M8_source_failure_becomes_miss', file: SIBLING, find: "    return refuse(timeout ? 'TIMEOUT' : 'SOURCE_UNAVAILABLE', timeout ? 504 : 503,", replace: "    return refuse('NO_MATCH', 200,", meaning: 'A source outage is reported as a completed search with no match.' },
  { id: 'M9_profile_action_manufactured', file: SIBLING, find: '    const profileUrl = card.href ?? null, selectionUrl = card.selectionHref!;', replace: '    const profileUrl = card.href ?? `/providers/${card.entityId}`, selectionUrl = card.selectionHref!;', meaning: 'A research-only agency row is given a profile destination that was never published.' },
];

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
/** A mutation only counts if the gate RAN TO THE END and an assertion failed -- a crash or syntax error proves nothing. */
function gate() {
  try { execSync(GATE, { stdio: 'pipe' }); return { ok: true, completedAllChecks: true, failing: [] }; }
  catch (e) {
    const text = String(e.stdout ?? '') + '\n' + String(e.stderr ?? '');
    return { ok: false, completedAllChecks: text.includes('{ pass: '), failing: text.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('FAIL')).map((l) => l.slice(0, 110)) };
  }
}

if (!gate().ok) { console.error('gate is not green before mutation; refusing to run'); process.exit(2); }
const report = { ranAt: new Date().toISOString(), gate: GATE, baseline: 'green', mutations: [] };
for (const m of MUTATIONS) {
  const original = fs.readFileSync(m.file), before = sha(original), text = original.toString('utf8');
  if (text.split(m.find).length !== 2) { report.mutations.push({ id: m.id, detected: null, error: 'mutation site not found exactly once' }); console.log(m.id, 'SITE NOT FOUND'); continue; }
  let result;
  try { fs.writeFileSync(m.file, text.replace(m.find, m.replace)); result = gate(); } finally { fs.writeFileSync(m.file, original); }
  const restored = sha(fs.readFileSync(m.file)) === before;
  report.mutations.push({ id: m.id, file: m.file, meaning: m.meaning, detected: !result.ok && result.completedAllChecks && result.failing.length > 0, gateRanToCompletion: result.completedAllChecks, failingChecks: result.failing, restoredExactBytes: restored });
  console.log(m.id, result.ok ? 'SURVIVED' : result.completedAllChecks && result.failing.length ? 'DETECTED' : 'CRASHED (not counted)', restored ? 'restored' : 'RESTORE FAILED', '| failing checks:', result.failing.map((f) => f.split('.')[0].replace('FAIL ', '')).join(','));
  if (!restored) process.exit(3);
}
report.gateGreenAfterRestore = gate().ok;
report.detected = report.mutations.filter((m) => m.detected).length; report.total = report.mutations.length;
fs.writeFileSync('docs/qa/th-search-r1-019f/mutation-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(`${report.detected}/${report.total} detected; gate green after restore: ${report.gateGreenAfterRestore}`);
process.exit(report.detected === report.total && report.gateGreenAfterRestore ? 0 : 1);
