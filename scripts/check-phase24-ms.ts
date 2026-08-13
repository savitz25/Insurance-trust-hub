/**
 * Phase 24 Mississippi MID inventory guards.
 *   npm run check:phase24-ms
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseMsCsvSync } from '../lib/ms/parse-workbook';
import {
  decodeMsHtmlName,
  mergeMsProducers,
  normalizeMsLicenseRow,
  normalizeMsZip,
} from '../lib/ms/normalize';
import { matchMsLaunchMarket } from '../lib/ms/launch-markets';
import { evaluateMsPromotionEligibility } from '../lib/ms/promote';
import { isMississippiFirm, isPromoteLicenseType } from '../lib/ms/firm-heuristic';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}
function must(rel: string) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

must('supabase/migrations/20260820120000_mississippi_mid_inventory.sql');
must('lib/ms/launch-markets.ts');
must('lib/ms/normalize.ts');
must('lib/ms/promote.ts');
must('lib/ms/firm-heuristic.ts');
must('scripts/ms/import-ms-entity-list.ts');
must('scripts/ms/promote-launch-markets.ts');
must('scripts/ms/fixtures/ms-entities-sample.csv');
must('docs/MS-MID-INVENTORY.md');
must('data/ms-raw/README.md');

const sql = read('supabase/migrations/20260820120000_mississippi_mid_inventory.sql');
if (!/ms_producers/.test(sql)) errors.push('migration missing ms_producers');
if (!/ENABLE ROW LEVEL SECURITY/.test(sql)) errors.push('migration should enable RLS');

const dir = read('app/directory/page.tsx');
if (!/msTotal > 0/.test(dir) || !/state=MS&verified=true/.test(dir)) {
  errors.push('directory must gate MS chip on live verified count');
}

const hub = read('lib/dfs/providers-by-county.ts');
if (!/isMsLaunchHub|getMsHubInventory/.test(hub)) {
  errors.push('hub inventory must support Mississippi launch hubs');
}

const pkg = read('package.json');
if (!/ms:import/.test(pkg) || !/ms:promote/.test(pkg) || !/check:phase24-ms/.test(pkg)) {
  errors.push('package.json missing ms npm scripts');
}

const gitignore = read('.gitignore');
if (!/data\/ms-raw/.test(gitignore)) {
  errors.push('.gitignore must ignore /data/ms-raw/**');
}

if (!isMississippiFirm({ name: 'GULF COAST AGENCY LLC', entityTypeRaw: 'Insurance Producer Entity' })) {
  errors.push('producer entity + agency name must be a firm');
}
if (isMississippiFirm({ name: 'JANE SMITH', entityTypeRaw: 'Individual Producer' })) {
  errors.push('named individual must not be treated as a firm');
}
if (!isPromoteLicenseType('Insurance Producer Entity')) {
  errors.push('Insurance Producer Entity must be promote-eligible');
}
if (isPromoteLicenseType('Public Adjuster')) {
  errors.push('public adjuster must not promote');
}
if (decodeMsHtmlName("INSURANCE &#39;N YOU LLC") !== "INSURANCE 'N YOU LLC") {
  errors.push('HTML entity in agency name must decode');
}
if (normalizeMsZip('39110-4875', 'MS') !== '39110') {
  errors.push('MS zip+4 should become 39110');
}

const jax = matchMsLaunchMarket({ city: 'Madison', hqState: 'MS', zip: '39110' });
if (jax?.id !== 'jackson') errors.push('Madison must map to jackson');
const gulf = matchMsLaunchMarket({ city: 'Biloxi', hqState: 'MS', zip: '39530' });
if (gulf?.id !== 'gulfport-biloxi') errors.push('Biloxi must map to gulfport-biloxi');
const htt = matchMsLaunchMarket({ city: 'Hattiesburg', hqState: 'MS', zip: '39401' });
if (htt?.id !== 'hattiesburg') errors.push('Hattiesburg city match failed');
const des = matchMsLaunchMarket({ city: 'Olive Branch', hqState: 'MS', zip: '38654' });
if (des?.id !== 'southaven') errors.push('Olive Branch must map to southaven');
const tx = matchMsLaunchMarket({ city: 'Austin', hqState: 'TX', zip: '78701' });
if (tx) errors.push('out-of-state HQ must not get an MS hub');
const oxford = matchMsLaunchMarket({ city: 'Oxford', hqState: 'MS', zip: '38655' });
if (oxford) errors.push('Oxford is not a Wave-1 hub');

const parsed = parseMsCsvSync(resolve(root, 'scripts/ms/fixtures/ms-entities-sample.csv'));
if (parsed.length < 10) errors.push('fixture parse too short');

const firm = normalizeMsLicenseRow({
  name: '1921 CONSULTANTS OF MISSISSIPPI LLC',
  dba: '',
  licenseNo: '15040918',
  licenseType: 'Insurance Producer Entity',
  licenseStatus: 'active',
  npn: '',
  phone: '601-624-3455',
  address1: '139 LOUIS LEFLEUR BLVD',
  city: 'MADISON',
  state: 'MS',
  zip: '39110',
  county: '',
  issueDate: '',
  expirationDate: '5/31/2027',
  sourceFile: 'ms-entities-sample.csv',
});
if (!firm.promoteEligible || firm.entityType !== 'business' || firm.launchMarketId !== 'jackson') {
  errors.push('MS entity firm should be promote-eligible in jackson');
}

const person = normalizeMsLicenseRow({
  ...firm,
  name: 'JANE SMITH',
  licenseNo: '15010006',
  licenseType: 'Individual Producer',
  city: 'JACKSON',
});
if (person.promoteEligible || person.entityType !== 'individual') {
  errors.push('named individual must not be promote-eligible');
}

const merged = mergeMsProducers([firm, { ...firm, qualifications: ['Insurance Producer Entity'] }]);
if (!merged?.licenseNumber) errors.push('merge failed');

const elig = evaluateMsPromotionEligibility({
  id: 'ms-test-1',
  entity_type: 'business',
  license_number: '15040918',
  npn: null,
  legal_name: '1921 CONSULTANTS OF MISSISSIPPI LLC',
  display_name: '1921 CONSULTANTS OF MISSISSIPPI LLC',
  license_types: ['Insurance Producer Entity'],
  qualifications: ['Insurance Producer Entity'],
  license_status: 'active',
  issue_date: null,
  expiration_date: '2027-05-31',
  address: '139 LOUIS LEFLEUR BLVD',
  city: 'MADISON',
  hq_state: 'MS',
  zip: '39110',
  county: 'Madison',
  phone: '6016243455',
  ms_address: true,
  launch_market_id: 'jackson',
  source_checked_at: new Date().toISOString(),
});
if (!elig.ok) errors.push(`promote eligibility failed: ${'reason' in elig ? elig.reason : ''}`);
if (elig.ok && elig.providerInsert.specialties.some((s) => /medicare/i.test(s))) {
  errors.push('must not invent Medicare specialty');
}

const labels = read('lib/regulators/labels.ts');
if (!/Mississippi Insurance Department/.test(labels) || !/allowsLeadForm: false/.test(labels)) {
  errors.push('MS regulator profile missing or must not allow lead forms');
}

if (errors.length) {
  console.error('Phase 24 MS MID checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 24 MS MID checks passed');
