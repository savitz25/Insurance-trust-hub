/**
 * Phase 3 Coverage Compass routing guards.
 *   npx tsx scripts/check-phase3-compass.ts
 */

import {
  COMPASS_SITUATIONS,
  buildCompassResult,
  getCompassPrimaryStep,
  type CompassSituationId,
} from '../lib/product/coverage-compass-paths';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const ids: CompassSituationId[] = [
  'medicare',
  'aca_health',
  'subsidies_costs',
  'moved',
  'doctor',
  'verify_claim',
  'researching',
];

assert(COMPASS_SITUATIONS.length === 7, 'expected 7 situations');
assert(
  COMPASS_SITUATIONS.every((s) => ids.includes(s.id)),
  'situation ids mismatch'
);

for (const id of ids) {
  const r = buildCompassResult(id, null);
  assert(r.version === 1, `${id}: version`);
  assert(r.situationKey === id, `${id}: key`);
  assert(r.steps.length >= 3 && r.steps.length <= 5, `${id}: step count ${r.steps.length}`);
  assert(r.recommendedPathIds.length === r.steps.length, `${id}: path ids`);
  assert(Boolean(r.createdAt), `${id}: timestamp`);
  const primary = getCompassPrimaryStep(r);
  assert(primary.href.startsWith('/'), `${id}: primary href`);
  // No lead-gen language in titles
  for (const s of r.steps) {
    assert(!/get quote|free quote|lead/i.test(s.title + s.description), `${id}: lead jargon`);
  }
}

const withZip = buildCompassResult('aca_health', '33101');
assert(withZip.zip === '33101', 'zip preserved');
assert(
  withZip.steps.some((s) => s.href.includes('zip=33101')),
  'zip deep-linked into marketplace or planners'
);

const skip = buildCompassResult('moved', '12');
assert(skip.zip === null, 'invalid zip ignored');

if (errors.length) {
  console.error('Phase 3 compass checks FAILED:');
  errors.forEach((e) => console.error('  ✗', e));
  process.exit(1);
}
console.log('Phase 3 Coverage Compass checks passed');
console.log(`  situations: ${COMPASS_SITUATIONS.length}`);
console.log('  zip deep-link ok; invalid zip ignored');
