/**
 * Phase 10 Ohio ODI guards.
 *   npm run check:phase10-odi
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { normalizeOdiAgencyRow, mergeOdiProducers } from '../lib/odi/normalize';
import { matchOhLaunchMarket } from '../lib/odi/launch-markets';
import { evaluateOdiPromotionEligibility } from '../lib/odi/promote';
import { looksLikeIndividualEntity } from '../lib/odi/qualifications';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}
function must(rel: string) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

must('supabase/migrations/20260814120000_ohio_odi_inventory.sql');
must('lib/odi/launch-markets.ts');
must('lib/odi/normalize.ts');
must('lib/odi/promote.ts');
must('lib/odi/qualifications.ts');
must('scripts/odi/import-agencies.ts');
must('scripts/odi/promote-launch-markets.ts');
must('scripts/odi/fixtures/odi-agencies-sample.csv');
must('docs/OHIO-ODI-INVENTORY.md');

const sql = read('supabase/migrations/20260814120000_ohio_odi_inventory.sql');
if (!/odi_producers/.test(sql)) errors.push('migration missing odi_producers');
if (!/odi_provider_promotions/.test(sql)) errors.push('migration missing promotions');
if (!/ENABLE ROW LEVEL SECURITY/.test(sql)) errors.push('migration should enable RLS');
if (!/entity_type = 'business'/.test(sql)) errors.push('producers must constrain business only');

const imp = read('scripts/odi/import-agencies.ts');
if (!/launch-markets-only/.test(imp)) errors.push('import must support launch-markets-only');
if (!/dry-run|dryRun/.test(imp)) errors.push('import must support dry-run');

const prom = read('scripts/odi/promote-launch-markets.ts');
if (!/--market|marketArg/.test(prom)) errors.push('promote must support --market');

const hub = read('lib/dfs/providers-by-county.ts');
if (!/isOhLaunchHub|getOhHubInventory/.test(hub)) {
  errors.push('hub inventory must support Ohio launch hubs');
}

const pkg = read('package.json');
if (!/odi:import/.test(pkg) || !/odi:promote/.test(pkg)) {
  errors.push('package.json missing odi npm scripts');
}

if (looksLikeIndividualEntity('Individual')) {
  /* ok */
} else {
  errors.push('individual entity filter failed');
}

const columbus = matchOhLaunchMarket({ city: 'Columbus', zip: '43215' });
if (columbus?.id !== 'columbus') errors.push('columbus city match failed');
const cleveland = matchOhLaunchMarket({ county: 'Cuyahoga' });
if (cleveland?.id !== 'cleveland') errors.push('cuyahoga county match failed');

const fixtureRow = normalizeOdiAgencyRow({
  'License Number': 'OH100001',
  NPN: '40000001',
  'Business Name': 'COLUMBUS RESEARCH AGENCY LLC',
  'Entity Type': 'Business Entity',
  'License Type': 'Major Lines',
  'Line of Authority': 'Health',
  Status: 'Active',
  City: 'COLUMBUS',
  County: 'FRANKLIN',
  State: 'OH',
  Zip: '43215',
});
if (fixtureRow.skipReason) errors.push(`fixture normalize skipped: ${fixtureRow.skipReason}`);
if (fixtureRow.launchMarketId !== 'columbus') {
  errors.push(`expected columbus market, got ${fixtureRow.launchMarketId}`);
}

const individual = normalizeOdiAgencyRow({
  'License Number': 'OH199999',
  'Business Name': 'SKIP ME',
  'Entity Type': 'Individual',
  State: 'OH',
  City: 'COLUMBUS',
});
if (individual.skipReason !== 'individual_excluded') {
  errors.push('individual rows must be skipped');
}

const merged = mergeOdiProducers([
  fixtureRow,
  normalizeOdiAgencyRow({
    'License Number': 'OH100001',
    'Business Name': 'COLUMBUS RESEARCH AGENCY LLC',
    'Entity Type': 'Business Entity',
    'Line of Authority': 'Life',
    City: 'COLUMBUS',
    State: 'OH',
    Zip: '43215',
  }),
]);
if (!merged?.qualifications.includes('Health') || !merged.qualifications.includes('Life')) {
  errors.push('LOA merge failed');
}

const elig = evaluateOdiPromotionEligibility({
  id: 'odi-test-1',
  entity_type: 'business',
  license_number: 'OH100001',
  npn: '40000001',
  legal_name: 'COLUMBUS RESEARCH AGENCY LLC',
  display_name: 'COLUMBUS RESEARCH AGENCY LLC',
  org_type: 'LLC',
  license_types: ['Major Lines'],
  qualifications: ['Health', 'Life'],
  license_status: 'active',
  issue_date: '2016-03-01',
  expiration_date: '2028-03-01',
  city: 'COLUMBUS',
  county: 'FRANKLIN',
  county_normalized: 'FRANKLIN',
  state: 'OH',
  zip: '43215',
  launch_market_id: 'columbus',
  source_checked_at: new Date().toISOString(),
});
if (!elig.ok) errors.push(`promote eligibility failed: ${'reason' in elig ? elig.reason : ''}`);
if (elig.ok && !elig.providerInsert.specialties.includes('Health')) {
  errors.push('promoted specialties missing Health');
}
if (elig.ok && elig.providerInsert.specialties.some((s) => /medicare/i.test(s))) {
  errors.push('must not invent Medicare specialty');
}

if (errors.length) {
  console.error('Phase 10 ODI checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 10 ODI checks passed');
