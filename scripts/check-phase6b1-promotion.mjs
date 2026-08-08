/**
 * Phase 6B1 promotion gate unit checks (no network).
 * node scripts/check-phase6b1-promotion.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

const promo = readFileSync(join(ROOT, 'lib/provenance/promotion.ts'), 'utf8');
assert(promo.includes('identityMatchAccepted'), 'promotion gates lack identityMatchAccepted');
assert(promo.includes('checkedAt'), 'promotion gates lack checkedAt');
assert(promo.includes('indexable_research'), 'promotion lacks indexable_research class');
assert(promo.includes('Cannot promote seed'), 'must block seed promotion');

const levels = readFileSync(join(ROOT, 'lib/insurance/verification-levels.ts'), 'utf8');
assert(
  levels.includes('hasProvenance') || levels.includes('sourceLabel') && levels.includes('lastCheckedLabel'),
  'hard verified badge must require provenance'
);
assert(levels.includes('showLicenseVerifiedBadge: true'), 'hard badge path exists');
// Ensure hard badge is gated by provenance in source
assert(
  /hasProvenance|sourceLabel.*lastCheckedLabel|lastCheckedLabel.*sourceLabel/.test(levels),
  'hard badge should require source + checkedAt'
);

const mapper = readFileSync(join(ROOT, 'lib/admin/provider-mapper.ts'), 'utf8');
assert(mapper.includes('canVerify'), 'formToDbInsert must gate verified writes');
assert(mapper.includes('identityMatchAccepted'), 'mapper must persist identity match');

const form = readFileSync(join(ROOT, 'components/admin/provider-form.tsx'), 'utf8');
assert(form.includes('licenseSource'), 'admin form missing license source field');
assert(form.includes('licenseCheckedAt'), 'admin form missing checkedAt field');

const page = readFileSync(join(ROOT, 'app/admin/license-backfill/page.tsx'), 'utf8');
assert(page.includes('listBackfillCandidates'), 'backfill page missing queue');

const ops = readFileSync(join(ROOT, 'lib/ops/license-backfill.ts'), 'utf8');
assert(ops.includes('applyLicenseBackfill'), 'ops apply helper missing');
assert(ops.includes('promote_indexable'), 'ops intents missing');

if (errors.length) {
  console.error('Phase 6B1 checks FAILED:');
  errors.forEach((e) => console.error('  ✗', e));
  process.exit(1);
}
console.log('Phase 6B1 promotion checks passed');
