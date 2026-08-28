/**
 * FL-INS-000 forensic baseline tests.
 *   npm run check:fl-ins-000
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { PUBLIC_REGULATORY_EVIDENCE_ENABLED } from '../lib/national/regulatory-evidence';
import { LEGAL_INSURER_DISPLAY_DECISION } from '../lib/national/regulatory-display';
import { flDfsNumberIsNaic } from '../lib/national/appointer-crosswalk';
import { FL_DIGIT_COINCIDENCES } from '../lib/national/appointer-crosswalk';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const src = readFileSync(join(root, 'scripts/national/run-fl-ins-000.ts'), 'utf8');
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const inv = readFileSync(join(root, 'docs/florida/FL-INS-000-source-inventory.md'), 'utf8');
const reg = readFileSync(join(root, 'docs/florida/FL-INS-000-regulatory-source-map.md'), 'utf8');
const idmap = readFileSync(join(root, 'docs/florida/FL-INS-000-carrier-identity-map.md'), 'utf8');
const intel = readFileSync(join(root, 'docs/florida/FL-INS-000-state-intelligence-map.md'), 'utf8');

assert(existsSync(join(root, 'docs/florida/FL-INS-000-baseline.md')), 'baseline');
assert(existsSync(join(root, 'docs/florida/FL-INS-000-source-inventory.md')), 'inventory');
assert(existsSync(join(root, 'docs/florida/FL-INS-000-carrier-identity-map.md')), 'identity');
assert(existsSync(join(root, 'docs/florida/FL-INS-000-publication-baseline.md')), 'pub');
assert(existsSync(join(root, 'docs/florida/FL-INS-000-regulatory-source-map.md')), 'reg');
assert(existsSync(join(root, 'docs/florida/FL-INS-000-market-intelligence-map.md')), 'market');
assert(existsSync(join(root, 'docs/florida/FL-INS-000-state-intelligence-map.md')), 'intel');
assert(existsSync(join(root, 'data/reports/fl-ins-000-denominator-dictionary.json')), 'denoms');
assert(existsSync(join(root, 'data/reports/fl-ins-000-overlap-matrix.json')), 'overlap');
assert(existsSync(join(root, 'data/reports/fl-ins-000-source-manifest.json')), 'manifest');
assert(existsSync(join(root, 'data/reports/fl-ins-000-publication-readiness.json')), 'readiness');

assert(!/\.from\([^)]+\)\.(insert|update|upsert|delete)/i.test(src), 'read-only');
assert(/No mass publication/i.test(src), 'no mass pub');
assert(/No Trust Scores/i.test(intel) && /No “best insurer.”/i.test(intel), 'no scores');
assert(/No route|Design only/i.test(intel), 'no /florida route');
assert((sitemap.match(/['"`]\/florida['"`]/g) || []).length <= 1, '007 /florida only');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people off');
assert(PUBLIC_REGULATORY_EVIDENCE_ENABLED === false, 'evidence off');
assert(LEGAL_INSURER_DISPLAY_DECISION === 'INTERNAL_ONLY', 'legal off');
assert(mayPublishEntityKind('person') === false, 'person gate');
assert(flDfsNumberIsNaic() === false, 'DFS ≠ NAIC');
assert(FL_DIGIT_COINCIDENCES.length === 17, '17 coincidences');
assert(/CRN ≠ finding/i.test(reg) || /CRN ≠ FINDING/i.test(reg), 'CRN rule');
assert(/not admitted/i.test(idmap) || /not admitted/i.test(inv), 'surplus ≠ admitted');
assert(/Listed in FEMA\/NFIP Agency Registry/.test(inv), 'NFIP wording');
assert(/NFIP certified/.test(inv) && /Do NOT|not/.test(inv), 'not certified');
assert(/county appointment/i.test(readFileSync(join(root, 'docs/florida/FL-INS-000-publication-baseline.md'), 'utf8')), 'county rule');

if (errors.length) {
  console.error('FL-INS-000 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('FL-INS-000 PASS inventory semantics publication-safe');
