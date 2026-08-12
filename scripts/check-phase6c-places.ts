/**
 * Phase 6C Places pilot guards.
 *   npm run check:phase6c-places
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}
function must(rel: string) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

must('lib/enrichment/google-places.ts');
must('lib/enrichment/places-pilot.ts');
must('scripts/dfs/enrich-places-south-florida.ts');
must('docs/PHASE-6C-PLACES-ENRICHMENT.md');

const places = read('lib/enrichment/google-places.ts');
if (!/isDirectoryOrSocialWebsite/.test(places)) {
  errors.push('directory website soft-reject missing');
}
if (!/fetchWithRetry|429/.test(places)) {
  errors.push('Places client should retry on 429/5xx');
}

const pilot = read('lib/enrichment/places-pilot.ts');
if (!/miami_dade|broward|palm_beach/.test(pilot)) {
  errors.push('SFL county pilot list missing');
}
if (!/applyPlacesMatchToContact/.test(pilot)) {
  errors.push('contact merge helper missing');
}

const script = read('scripts/dfs/enrich-places-south-florida.ts');
if (!/--confirm/.test(script) && !/confirm/.test(script)) {
  errors.push('pilot script must require --confirm for writes');
}
if (!/dry-run|dryRun/.test(script)) {
  errors.push('pilot script must support dry-run');
}

const sec = read('components/provider-secondary-signals.tsx');
if (!/third-party|Not an InsuranceTrustHub ranking/i.test(sec)) {
  errors.push('UI must label Google as third-party / not ranking');
}

if (errors.length) {
  console.error('Phase 6C Places checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 6C Places checks passed');
