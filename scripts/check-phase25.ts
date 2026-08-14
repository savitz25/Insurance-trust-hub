/**
 * Phase 25 guards — Places loop + LOA chip gating.
 *   npm run check:phase25
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { evaluatePlacesBatchGates } from '../lib/enrichment/places-quality-gates';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}
function must(rel: string) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

must('docs/PHASE-25-PLACES-LOOP.md');
must('scripts/dfs/enrich-places-loop.ts');
must('scripts/dfs/enrich-places-loop-status.ts');
must('lib/enrichment/places-fp-gate.ts');
must('lib/enrichment/places-quality-gates.ts');
must('lib/regulators/labels.ts');

const loop = read('scripts/dfs/enrich-places-loop.ts');
if (!/min-match-rate', 0\.18|minMatchRate = num\('min-match-rate', 0\.18\)/.test(loop)) {
  errors.push('loop default min-match-rate must be 0.18');
}
if (!/scope === 'sfl'|scopeRaw === 'sfl'/.test(loop)) {
  errors.push('loop must support --scope fl|sfl');
}
if (!/loadFlEligibleProviders/.test(loop)) {
  errors.push('loop must load statewide FL pool');
}
if (!/!hasFlag\('no-strict'\)/.test(loop)) {
  errors.push('loop must default --strict on');
}
if (!/poolLimit|num\('limit'/.test(loop)) {
  errors.push('loop must support --limit');
}

const fp = read('lib/enrichment/places-fp-gate.ts');
if (!/strict !== false/.test(fp)) {
  errors.push('FP gate must support strict option');
}
if (!/hasLocalAgencyWebsitePath/.test(fp)) {
  errors.push('FP gate must detect carrier agency-path URLs');
}
if (!/phone match insufficient/.test(fp)) {
  errors.push('strict weak-name + no insurance type reject missing');
}
if (!/isHopelessNonAgencyLegalName/.test(fp)) {
  errors.push('FP gate must skip hopeless non-agency legal names');
}
if (!/preferredPlacesQueryName/.test(fp)) {
  errors.push('FP gate must prefer DBA for Places query');
}

const labels = read('lib/regulators/labels.ts');
if (!/regulatorHasLoaSpecialtyTags/.test(labels)) {
  errors.push('LOA chip helper missing');
}
if (!/code === 'MS'/.test(labels)) {
  errors.push('MS must not advertise invented LOA chips');
}

const hub = read('components/hub-page-view.tsx');
if (!/regulatorHasLoaSpecialtyTags\(hub.stateCode\)/.test(hub)) {
  errors.push('hubs must hide LOA chips when source has no LOAs');
}

const dir = read('app/directory/page.tsx');
if (!/regulatorHasLoaSpecialtyTags/.test(dir)) {
  errors.push('directory must gate specialty chips');
}

const pkg = read('package.json');
if (!/dfs:enrich-places-loop:status/.test(pkg)) {
  errors.push('package.json missing status script');
}
if (!/check:phase25/.test(pkg)) {
  errors.push('package.json missing check:phase25');
}

const passBatch = {
  matchRate: 0.24,
  errorRate: 0.01,
  ambiguousRate: 0.04,
  stats: { processed: 25, authFailures: 0 },
};
const pass = evaluatePlacesBatchGates(passBatch, {
  minMatchRate: 0.18,
  maxErrorRate: 0.05,
  maxAmbiguousRate: 0.1,
});
if (!pass.ok) errors.push(`expected passing batch to clear gates: ${pass.reason}`);

const matchFail = evaluatePlacesBatchGates(
  { ...passBatch, matchRate: 0.1 },
  { minMatchRate: 0.18, maxErrorRate: 0.05, maxAmbiguousRate: 0.1 }
);
if (matchFail.ok || !/match_rate_breach/.test(matchFail.reason ?? '')) {
  errors.push('quality gate must stop on match_rate_breach (forced 0.10 < 0.18)');
}

const errFail = evaluatePlacesBatchGates(
  { ...passBatch, errorRate: 0.2 },
  { minMatchRate: 0.18, maxErrorRate: 0.05, maxAmbiguousRate: 0.1 }
);
if (errFail.ok || !/error_rate_breach/.test(errFail.reason ?? '')) {
  errors.push('quality gate must stop on error_rate_breach');
}

const ambFail = evaluatePlacesBatchGates(
  { ...passBatch, ambiguousRate: 0.2 },
  { minMatchRate: 0.18, maxErrorRate: 0.05, maxAmbiguousRate: 0.1 }
);
if (ambFail.ok || !/ambiguous_rate_breach/.test(ambFail.reason ?? '')) {
  errors.push('quality gate must stop on ambiguous_rate_breach');
}

if (errors.length) {
  console.error('Phase 25 checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 25 checks passed');
console.log('Quality gates: pass + match/error/ambiguous stop OK');
