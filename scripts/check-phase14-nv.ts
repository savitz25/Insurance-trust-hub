/**
 * Phase 14 Nevada DOI firm inventory guards.
 *   npm run check:phase14-nv
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { extractFirmLicenseType, parseNvFirmsCsvSync, rowFromCells } from '../lib/nv/parse-workbook';
import { mergeNvProducers, normalizeNvFirmRow } from '../lib/nv/normalize';
import { matchNvLaunchMarket } from '../lib/nv/launch-markets';
import { evaluateNvPromotionEligibility } from '../lib/nv/promote';
import { isPromoteEligibleFirmType } from '../lib/nv/firm-types';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}
function must(rel: string) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

must('supabase/migrations/20260816120000_nevada_doi_inventory.sql');
must('lib/nv/launch-markets.ts');
must('lib/nv/normalize.ts');
must('lib/nv/promote.ts');
must('lib/nv/parse-workbook.ts');
must('lib/nv/firm-types.ts');
must('scripts/nv/import-agencies.ts');
must('scripts/nv/promote-launch-markets.ts');
must('scripts/nv/fixtures/nv-firms-sample.csv');
must('docs/NEVADA-DOI-INVENTORY.md');

const sql = read('supabase/migrations/20260816120000_nevada_doi_inventory.sql');
if (!/nv_producers/.test(sql)) errors.push('migration missing nv_producers');
if (!/nv_provider_promotions/.test(sql)) errors.push('migration missing promotions');
if (!/ENABLE ROW LEVEL SECURITY/.test(sql)) errors.push('migration should enable RLS');
if (!/firm_license_type/.test(sql)) errors.push('producers must store firm license type');

const imp = read('scripts/nv/import-agencies.ts');
if (!/launch-markets-only/.test(imp)) errors.push('import must support launch-markets-only');
if (!/dry-run|dryRun/.test(imp)) errors.push('import must support dry-run');

const prom = read('scripts/nv/promote-launch-markets.ts');
if (!/--market|marketArg/.test(prom)) errors.push('promote must support --market');

const hub = read('lib/dfs/providers-by-county.ts');
if (!/isNvLaunchHub|getNvHubInventory/.test(hub)) {
  errors.push('hub inventory must support Nevada launch hubs');
}

const dir = read('app/directory/page.tsx');
if (!/nvTotal > 0/.test(dir) || !/state=NV&verified=true/.test(dir)) {
  errors.push('directory must gate NV chip on live verified count');
}

const pkg = read('package.json');
if (!/nv:import/.test(pkg) || !/nv:promote/.test(pkg)) {
  errors.push('package.json missing nv npm scripts');
}

if (extractFirmLicenseType('Firm License Type : Independent Adjuster') !== 'Independent Adjuster') {
  errors.push('section header parse failed');
}
if (isPromoteEligibleFirmType('Independent Adjuster')) {
  errors.push('Independent Adjuster must not default-promote');
}
if (isPromoteEligibleFirmType('External Review Organization')) {
  errors.push('ERO must not default-promote');
}
if (!isPromoteEligibleFirmType('Resident Producer Firm')) {
  errors.push('Resident Producer Firm must be promote-eligible');
}

const lv = matchNvLaunchMarket({ city: 'Henderson', hqState: 'NV', zip: '89012' });
if (lv?.id !== 'las-vegas') errors.push('Henderson must map to las-vegas');
const reno = matchNvLaunchMarket({ city: 'Reno', hqState: 'NV', zip: '89501' });
if (reno?.id !== 'reno') errors.push('Reno city match failed');
const pahrump = matchNvLaunchMarket({ city: 'Pahrump', hqState: 'NV', zip: '89048' });
if (pahrump) errors.push('Pahrump must not map into Las Vegas via ZIP 890');
const caHq = matchNvLaunchMarket({ city: 'San Francisco', hqState: 'CA', zip: '94105' });
if (caHq) errors.push('out-of-state HQ must not receive a local hub');

const parsed = parseNvFirmsCsvSync(
  resolve(root, 'scripts/nv/fixtures/nv-firms-sample.csv')
);
if (!parsed.some((r) => r.firmLicenseType === 'Resident Producer Firm')) {
  errors.push('fixture parser missed Resident Producer Firm section');
}
if (!parsed.some((r) => r.phone && r.email)) {
  errors.push('fixture should preserve phone/email');
}

const firm = normalizeNvFirmRow({
  license: '3264218',
  name: '1 Stop Insurance & Multiservices',
  address: '123 Sahara Ave',
  city: 'Las Vegas',
  state: 'Nv',
  zip: '89102',
  phone: '702-635-4354',
  email: 'info@onestoplv.com',
  originalIssueDate: '03/01/2016',
  expirationDate: '03/01/2028',
  firmLicenseType: 'Resident Producer Firm',
  sheet: 'csv',
  rowNumber: 4,
});
if (firm.skipReason) errors.push(`normalize skipped: ${firm.skipReason}`);
if (!firm.promoteEligible || firm.launchMarketId !== 'las-vegas') {
  errors.push('LV producer firm should be promote-eligible in las-vegas');
}
if (firm.phone !== '702-635-4354' || firm.email !== 'info@onestoplv.com') {
  errors.push('phone/email must be preserved');
}

const adjuster = normalizeNvFirmRow({
  ...firm,
  license: '672672',
  name: 'Cell Adjustments Llc',
  firmLicenseType: 'Independent Adjuster',
});
if (adjuster.promoteEligible) errors.push('adjuster must not be promote-eligible');

const outOfState = normalizeNvFirmRow({
  license: '14983001',
  name: 'California HQ Broker Inc',
  address: '1 Market St',
  city: 'San Francisco',
  state: 'Ca',
  zip: '94105',
  phone: '415-555-0909',
  email: 'ca@broker.example',
  originalIssueDate: '01/01/2014',
  expirationDate: '01/01/2028',
  firmLicenseType: 'Non-Resident Producer Firm',
  sheet: 'csv',
  rowNumber: 20,
});
if (outOfState.promoteEligible || outOfState.launchMarketId) {
  errors.push('CA HQ non-resident firm must be staged only');
}

const merged = mergeNvProducers([firm, { ...firm, qualifications: ['Resident Producer Firm'] }]);
if (!merged || merged.licenseNumber !== '3264218') errors.push('merge failed');

const elig = evaluateNvPromotionEligibility({
  id: 'nv-test-1',
  entity_type: 'business',
  license_number: '3264218',
  legal_name: '1 Stop Insurance & Multiservices',
  display_name: '1 Stop Insurance & Multiservices',
  firm_license_type: 'Resident Producer Firm',
  license_types: ['Resident Producer Firm'],
  qualifications: ['Resident Producer Firm'],
  license_status: 'active',
  issue_date: '2016-03-01',
  expiration_date: '2028-03-01',
  address: '123 Sahara Ave',
  city: 'Las Vegas',
  hq_state: 'NV',
  zip: '89102',
  phone: '702-635-4354',
  email: 'info@onestoplv.com',
  nv_address: true,
  launch_market_id: 'las-vegas',
  source_checked_at: new Date().toISOString(),
});
if (!elig.ok) errors.push(`promote eligibility failed: ${'reason' in elig ? elig.reason : ''}`);
if (elig.ok && elig.providerInsert.specialties.some((s) => /medicare/i.test(s))) {
  errors.push('must not invent Medicare specialty');
}
if (elig.ok && elig.providerInsert.contact.phone !== '702-635-4354') {
  errors.push('promoted contact must keep phone');
}

const headerRow = rowFromCells(['License ', 'Name'], 'Resident Producer Firm', 't', 1);
if (headerRow) errors.push('column header must not become a firm row');

if (errors.length) {
  console.error('Phase 14 NV DOI checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 14 NV DOI checks passed');
