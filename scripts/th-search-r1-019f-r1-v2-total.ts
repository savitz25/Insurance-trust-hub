/**
 * TH-SEARCH-R1-019F-R1 evidence: the v2 exact-total contract on a SCAN_BOUND_REACHED name. READ-ONLY, real
 * source. One file per label under docs/qa/th-search-r1-019f/, never overwritten (red first, then green).
 *   npx tsx --tsconfig scripts/tsconfig.r13.json scripts/th-search-r1-019f-r1-v2-total.ts <label>
 */
import fs from 'node:fs';
import { loadLocalEnv } from './lib/load-local-env';
import { executeInsuranceRequest } from '../lib/insurance-ask/execute';
import { executeSpecialistV2 } from '../lib/specialist-execution/v2';
import { executeInsuranceNameCandidatesV1 } from '../lib/specialist-execution/name-candidates';
import { SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT, SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT } from '../lib/specialist-execution/contract';

loadLocalEnv();
const label = process.argv[2] ?? '';
if (!/^[a-z0-9-]+$/.test(label)) { console.error('usage: <label>'); process.exit(1); }
const OUT = `docs/qa/th-search-r1-019f/r1-v2-exact-total.${label}.json`;
if (fs.existsSync(OUT)) { console.error(`${OUT} exists; one pass per label.`); process.exit(1); }
/** Frozen real-source partial case: its only distinctive word is "financial". */
const FROZEN_PARTIAL = 'V FINANCIAL LLC';

async function main() {
  const out: Record<string, unknown> = { label, ranAt: new Date().toISOString(), frozenPartialCase: FROZEN_PARTIAL, v2Fingerprints: { schema: SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT, contract: SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT } };

  const sibling = await executeInsuranceNameCandidatesV1({ operation: 'name_candidates', name: FROZEN_PARTIAL });
  out.sibling = { status: sibling.status, resultState: sibling.body.resultState, predicateApplied: sibling.body.name.predicateApplied, returned: sibling.body.pagination.returned, completeness: sibling.body.pagination.completeness, matchedCount: sibling.body.pagination.matchedCount, matchedCountIsExact: sibling.body.pagination.matchedCountIsExact };

  const native = await executeInsuranceRequest(new URLSearchParams({ q: `Find ${FROZEN_PARTIAL}` }));
  out.native = { terminalState: native.terminalState, returned: native.results.length, completeness: native.nameCandidateWindow?.completeness, matchedCount: native.nameCandidateWindow?.matchedCount, candidateTruncated: native.candidateTruncated, refineDisclosure: native.limitations.filter((l) => /scan bound|not a complete list|no total is asserted/i.test(l)) };

  const v2 = await executeSpecialistV2({ identityName: FROZEN_PARTIAL, limit: 10 });
  out.v2 = { httpStatus: v2.status, resultState: v2.body.resultState, rows: v2.body.rows.length, total: v2.body.total, pagination: v2.body.pagination, error: v2.body.error ?? null, notAMissLimitation: v2.body.limitations.filter((l) => /not a no-match|may exist/i.test(l)) };
  out.v2EmitsSuccessShapedInexactTotal = ['SUPPORTED_RESULTS', 'AMBIGUOUS_IDENTITIES', 'ZERO_MATCHING_ROWS', 'EXACT_IDENTITY', 'NO_CONFIDENT_MATCH'].includes(v2.body.resultState) && sibling.body.pagination.matchedCountIsExact === false;

  // COMPLETE names must stay ordinary v2 successes with an exact total and a real page 2.
  const complete: Record<string, unknown> = {};
  for (const name of ['allied', 'beacon', 'summit']) {
    const p1 = await executeSpecialistV2({ identityName: name, limit: 10 }), p2 = await executeSpecialistV2({ identityName: name, page: 2, limit: 10 });
    const s = (await executeInsuranceNameCandidatesV1({ operation: 'name_candidates', name })).body;
    complete[name] = { httpStatus: p1.status, resultState: p1.body.resultState, total: p1.body.total, paginationTotal: p1.body.pagination.total, hasMore: p1.body.pagination.hasMore, siblingMatchedCount: s.pagination.matchedCount, siblingExact: s.pagination.matchedCountIsExact, totalEqualsSiblingExactCount: p1.body.total === s.pagination.matchedCount && p1.body.pagination.total === s.pagination.matchedCount, page2DiffersFromPage1: JSON.stringify(p1.body.rows.map((r) => r.name)) !== JSON.stringify(p2.body.rows.map((r) => r.name)), page2Rows: p2.body.rows.length };
  }
  out.completeNames = complete;

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
