/**
 * Phase 23 Massachusetts DOI inventory guards.
 *   npm run check:phase23-ma
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseMaCsvSync } from '../lib/ma/parse-workbook';
import { mergeMaProducers, normalizeMaLicenseRow, normalizeMaZip } from '../lib/ma/normalize';
import { matchMaLaunchMarket } from '../lib/ma/launch-markets';
import { evaluateMaPromotionEligibility } from '../lib/ma/promote';
import {
  isCarrierCompanyType,
  isLicensedCompanyRecord,
  isMassachusettsFirm,
  isPromoteLicenseType,
} from '../lib/ma/firm-heuristic';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}
function must(rel: string) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

must('supabase/migrations/20260819120000_massachusetts_doi_inventory.sql');
must('lib/ma/launch-markets.ts');
must('lib/ma/normalize.ts');
must('lib/ma/promote.ts');
must('lib/ma/firm-heuristic.ts');
must('scripts/ma/import-agencies.ts');
must('scripts/ma/promote-launch-markets.ts');
must('scripts/ma/fixtures/ma-agencies-sample.csv');
must('scripts/ma/fixtures/ma-licensed-companies-sample.csv');
must('docs/MASSACHUSETTS-DOI-INVENTORY.md');
must('data/ma-raw/README.md');

const sql = read('supabase/migrations/20260819120000_massachusetts_doi_inventory.sql');
if (!/ma_producers/.test(sql)) errors.push('migration missing ma_producers');
if (!/ENABLE ROW LEVEL SECURITY/.test(sql)) errors.push('migration should enable RLS');
if (!/individual/.test(sql)) errors.push('schema should allow staging individuals');

const dir = read('app/directory/page.tsx');
if (!/maTotal > 0/.test(dir) || !/state=MA&verified=true/.test(dir)) {
  errors.push('directory must gate MA chip on live verified count');
}

const hub = read('lib/dfs/providers-by-county.ts');
if (!/isMaLaunchHub|getMaHubInventory/.test(hub)) {
  errors.push('hub inventory must support Massachusetts launch hubs');
}

const pkg = read('package.json');
if (!/ma:import/.test(pkg) || !/ma:promote/.test(pkg) || !/check:phase23-ma/.test(pkg)) {
  errors.push('package.json missing ma npm scripts');
}

const gitignore = read('.gitignore');
if (!/data\/ma-raw/.test(gitignore)) {
  errors.push('.gitignore must ignore /data/ma-raw/**');
}

if (!isMassachusettsFirm({ name: 'HUB AGENCY LLC' })) {
  errors.push('agency LLC name must be a firm');
}
if (isMassachusettsFirm({ name: 'JANE SMITH' })) {
  errors.push('person name must not be treated as a firm');
}
if (isPromoteLicenseType('Accredited Reinsurer')) {
  errors.push('reinsurer must not be a promote license type');
}
if (isPromoteLicenseType('Life Insurance Company')) {
  errors.push('life insurance company (carrier) must not be a promote type');
}
if (!isCarrierCompanyType('Health Maintenance Organization')) {
  errors.push('HMO must be classified as a carrier');
}
if (!isPromoteLicenseType('Accident and Health')) {
  errors.push('A&H agency class must be promote-eligible');
}
if (normalizeMaZip('2108', 'MA') !== '02108') {
  errors.push('MA zip 2108 should pad to 02108');
}

const bos = matchMaLaunchMarket({ city: 'Boston', hqState: 'MA', zip: '02108' });
if (bos?.id !== 'boston') errors.push('Boston must map to boston');
const wor = matchMaLaunchMarket({ city: 'Worcester', hqState: 'MA', zip: '01608' });
if (wor?.id !== 'worcester') errors.push('Worcester city match failed');
const spr = matchMaLaunchMarket({ city: 'Chicopee', hqState: 'MA', zip: '01020' });
if (spr?.id !== 'springfield') errors.push('Chicopee must map to springfield');
const tx = matchMaLaunchMarket({ city: 'Austin', hqState: 'TX', zip: '78701' });
if (tx) errors.push('out-of-state HQ must not get a MA hub');

const companies = parseMaCsvSync(
  resolve(root, 'scripts/ma/fixtures/ma-licensed-companies-sample.csv')
);
if (companies.length < 3) errors.push('company fixture parse too short');
if (!companies.every((r) => r.recordKind === 'licensed_company')) {
  errors.push('company fixture rows must be licensed_company');
}
for (const row of companies) {
  const n = normalizeMaLicenseRow(row);
  if (n.promoteEligible || n.skipReason !== 'carrier_company_not_agency') {
    errors.push(`company row must fail closed: ${row.name}`);
  }
  if (!isLicensedCompanyRecord(row)) {
    errors.push(`company row not detected as licensed company: ${row.name}`);
  }
}

const agencies = parseMaCsvSync(resolve(root, 'scripts/ma/fixtures/ma-agencies-sample.csv'));
if (agencies.length < 6) errors.push('agency fixture parse too short');

const firm = normalizeMaLicenseRow({
  name: 'HUB AGENCY LLC',
  dba: '',
  licenseNo: 'MA100001',
  licenseType: 'Accident and Health',
  licenseStatus: 'Active',
  npn: '111111',
  phone: '',
  address1: '1 Beacon St',
  city: 'BOSTON',
  state: 'MA',
  zip: '02108',
  county: 'Suffolk',
  issueDate: '2024-04-01',
  expirationDate: '2027-03-31',
  sourceFile: 'ma-agencies-sample.csv',
  recordKind: 'agency',
});
if (!firm.promoteEligible || firm.entityType !== 'business' || firm.launchMarketId !== 'boston') {
  errors.push('MA agency firm should be promote-eligible in boston');
}

const person = normalizeMaLicenseRow({
  ...firm,
  name: 'JANE SMITH',
  licenseNo: 'MA100004',
});
if (person.promoteEligible || person.entityType !== 'individual') {
  errors.push('named individual must not be promote-eligible');
}

const carrierAsAgency = normalizeMaLicenseRow({
  ...firm,
  name: 'EXAMPLE LIFE INSURANCE COMPANY',
  licenseNo: '60054',
  licenseType: 'Life Insurance Company',
  recordKind: 'licensed_company',
});
if (carrierAsAgency.promoteEligible || carrierAsAgency.skipReason !== 'carrier_company_not_agency') {
  errors.push('carrier masquerading as row must not promote');
}

const merged = mergeMaProducers([
  firm,
  { ...firm, qualifications: ['Life'] },
]);
if (!merged?.qualifications.includes('Accident and Health') || !merged.qualifications.includes('Life')) {
  errors.push('LOA merge failed');
}

const elig = evaluateMaPromotionEligibility({
  id: 'ma-test-1',
  entity_type: 'business',
  license_number: 'MA100001',
  npn: '111111',
  legal_name: 'HUB AGENCY LLC',
  display_name: 'HUB AGENCY LLC',
  license_types: ['Accident and Health'],
  qualifications: ['Accident and Health', 'Life'],
  license_status: 'active',
  issue_date: '2024-04-01',
  expiration_date: '2027-03-31',
  address: '1 Beacon St',
  city: 'BOSTON',
  hq_state: 'MA',
  zip: '02108',
  county: 'Suffolk',
  phone: null,
  ma_address: true,
  launch_market_id: 'boston',
  source_checked_at: new Date().toISOString(),
});
if (!elig.ok) errors.push(`promote eligibility failed: ${'reason' in elig ? elig.reason : ''}`);
if (elig.ok && elig.providerInsert.specialties.some((s) => /medicare/i.test(s))) {
  errors.push('must not invent Medicare specialty');
}

const carrierElig = evaluateMaPromotionEligibility({
  id: 'ma-test-carrier',
  entity_type: 'business',
  license_number: '60054',
  npn: null,
  legal_name: 'Example Life Insurance Company',
  display_name: 'Example Life Insurance Company',
  license_types: ['Life Insurance Company'],
  qualifications: [],
  license_status: 'active',
  issue_date: null,
  expiration_date: null,
  address: '1 Federal Street',
  city: 'BOSTON',
  hq_state: 'MA',
  zip: '02110',
  county: 'Suffolk',
  phone: null,
  ma_address: true,
  launch_market_id: 'boston',
  source_checked_at: new Date().toISOString(),
});
if (carrierElig.ok) errors.push('carrier must not be promote-eligible');
if (!carrierElig.ok && carrierElig.reason !== 'carrier_company_not_agency') {
  errors.push(`carrier reject reason should be carrier_company_not_agency, got ${carrierElig.reason}`);
}

const labels = read('lib/regulators/labels.ts');
if (!/allowsLeadForm: false/.test(labels) || !/Massachusetts Division of Insurance/.test(labels)) {
  errors.push('MA regulator profile missing or must not allow lead forms');
}

if (errors.length) {
  console.error('Phase 23 MA DOI checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 23 MA DOI checks passed');
