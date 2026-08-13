/**
 * Phase 15 Vermont DFR inventory guards.
 *   npm run check:phase15-vt
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseVtCsvSync } from '../lib/vt/parse-workbook';
import { mergeVtProducers, normalizeVtLicenseRow, normalizeVtZip } from '../lib/vt/normalize';
import { matchVtLaunchMarket } from '../lib/vt/launch-markets';
import { evaluateVtPromotionEligibility } from '../lib/vt/promote';
import { isVermontFirm, isPromoteLicenseClass } from '../lib/vt/firm-heuristic';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}
function must(rel: string) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

must('supabase/migrations/20260817120000_vermont_dfr_inventory.sql');
must('lib/vt/launch-markets.ts');
must('lib/vt/normalize.ts');
must('lib/vt/promote.ts');
must('lib/vt/firm-heuristic.ts');
must('scripts/vt/import-agencies.ts');
must('scripts/vt/promote-launch-markets.ts');
must('scripts/vt/xlsx-to-csv.py');
must('scripts/vt/fixtures/vt-licensees-sample.csv');
must('docs/VERMONT-DFR-INVENTORY.md');

const sql = read('supabase/migrations/20260817120000_vermont_dfr_inventory.sql');
if (!/vt_producers/.test(sql)) errors.push('migration missing vt_producers');
if (!/ENABLE ROW LEVEL SECURITY/.test(sql)) errors.push('migration should enable RLS');
if (!/individual/.test(sql)) errors.push('schema should allow staging individuals');

const dir = read('app/directory/page.tsx');
if (!/vtTotal > 0/.test(dir) || !/state=VT&verified=true/.test(dir)) {
  errors.push('directory must gate VT chip on live verified count');
}

const hub = read('lib/dfs/providers-by-county.ts');
if (!/isVtLaunchHub|getVtHubInventory/.test(hub)) {
  errors.push('hub inventory must support Vermont launch hubs');
}

const pkg = read('package.json');
if (!/vt:import/.test(pkg) || !/vt:promote/.test(pkg)) {
  errors.push('package.json missing vt npm scripts');
}

if (!isVermontFirm({ firstName: '', lastOrBusinessName: 'HIBBARD INSURANCE AGENCY INC' })) {
  errors.push('blank first name + agency name must be a firm');
}
if (isVermontFirm({ firstName: 'JANE', lastOrBusinessName: 'SMITH' })) {
  errors.push('person name must not be treated as a firm');
}
if (isPromoteLicenseClass('Adjuster-Property and Casualty')) {
  errors.push('adjuster class must not be promote class');
}
if (normalizeVtZip('5468', 'VT') !== '05468') {
  errors.push('VT zip 5468 should pad to 05468');
}
if (normalizeVtZip('57015901', 'VT') !== '05701') {
  errors.push('VT smashed zip+4 should become 05701');
}

const btv = matchVtLaunchMarket({ city: 'Williston', hqState: 'VT', zip: '05495' });
if (btv?.id !== 'burlington') errors.push('Williston must map to burlington');
const rut = matchVtLaunchMarket({ city: 'Rutland', hqState: 'VT', zip: '05701' });
if (rut?.id !== 'rutland') errors.push('Rutland city match failed');
const mtp = matchVtLaunchMarket({ city: 'Barre', hqState: 'VT', zip: '05641' });
if (mtp?.id !== 'montpelier') errors.push('Barre must map to montpelier');
const tx = matchVtLaunchMarket({ city: 'Austin', hqState: 'TX', zip: '78701' });
if (tx) errors.push('out-of-state HQ must not get a VT hub');

const parsed = parseVtCsvSync(resolve(root, 'scripts/vt/fixtures/vt-licensees-sample.csv'));
if (parsed.length < 8) errors.push('fixture parse too short');

const firm = normalizeVtLicenseRow({
  firstName: '',
  lastOrBusinessName: 'HIBBARD INSURANCE AGENCY INC',
  npn: '111111',
  resState: 'Vermont',
  licenseNo: '3668358',
  licenseStatus: 'Active',
  licenseClass: 'Insurance Producer',
  licenseEffectiveDate: '2024-04-01',
  licenseExpirationDate: '2027-03-31',
  loaName: 'Life',
  loaStatus: 'Approved',
  address1: '100 WILLISTON RD',
  address2: '',
  city: 'WILLISTON',
  businessStateAbbr: 'VT',
  zip: '05495',
  county: 'Chittenden',
});
if (!firm.promoteEligible || firm.entityType !== 'business' || firm.launchMarketId !== 'burlington') {
  errors.push('VT producer firm should be promote-eligible in burlington');
}

const person = normalizeVtLicenseRow({
  ...firm,
  firstName: 'JANE',
  lastOrBusinessName: 'SMITH',
  licenseNo: '999888777',
  city: 'BURLINGTON',
});
if (person.promoteEligible || person.entityType !== 'individual') {
  errors.push('named individual must not be promote-eligible');
}

const merged = mergeVtProducers([
  firm,
  { ...firm, qualifications: ['Accident and Health or Sickness'] },
]);
if (!merged?.qualifications.includes('Life') || !merged.qualifications.includes('Accident and Health or Sickness')) {
  errors.push('LOA merge failed');
}

const elig = evaluateVtPromotionEligibility({
  id: 'vt-test-1',
  entity_type: 'business',
  license_number: '3668358',
  npn: '111111',
  legal_name: 'HIBBARD INSURANCE AGENCY INC',
  display_name: 'HIBBARD INSURANCE AGENCY INC',
  license_types: ['Insurance Producer'],
  qualifications: ['Life', 'Accident and Health or Sickness'],
  license_status: 'active',
  issue_date: '2024-04-01',
  expiration_date: '2027-03-31',
  address: '100 WILLISTON RD',
  city: 'WILLISTON',
  hq_state: 'VT',
  zip: '05495',
  county: 'Chittenden',
  vt_address: true,
  launch_market_id: 'burlington',
  source_checked_at: new Date().toISOString(),
});
if (!elig.ok) errors.push(`promote eligibility failed: ${'reason' in elig ? elig.reason : ''}`);
if (elig.ok && elig.providerInsert.specialties.some((s) => /medicare/i.test(s))) {
  errors.push('must not invent Medicare specialty');
}

if (errors.length) {
  console.error('Phase 15 VT DFR checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 15 VT DFR checks passed');
