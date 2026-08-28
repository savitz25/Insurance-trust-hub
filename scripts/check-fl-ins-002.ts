/**
 * FL-INS-002 OIR company / NAIC tests.
 *   npm run check:fl-ins-002
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { IDENTIFIER_SCHEME } from '../lib/national/legal-insurer-identity';
import { FL_DIGIT_COINCIDENCES, flDfsNumberIsNaic } from '../lib/national/appointer-crosswalk';
import {
  decideOirNaicJoin,
  normalizeFlOirCompanyCode,
  classifyOirCompanyType,
  flCompanyCodeIsCanonicalIdentity,
  oirCompanyUsesNameMatch,
  dfsAppointingNumberEqualsNaic,
  companyStatusIsEnforcement,
  surplusLinesEqualsAdmitted,
  brandEqualsInsurer,
  groupEqualsInsurer,
  titleAgentEqualsTitleInsurer,
  mayBridgeAppointerWithoutSameRecord,
  MATCH_BASIS_EXACT_NAIC,
  FL_OIR_COMPANY_CODE_SCHEME,
} from '../lib/national/fl-oir-company';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const reports = join(root, 'data/reports');
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const py = readFileSync(join(root, 'scripts/national/fl-ins-002.py'), 'utf8');

function load(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(reports, name), 'utf8')) as Record<string, unknown>;
}

assert(existsSync(join(root, 'docs/florida/FL-INS-002-oir-source-audit.md')), 'audit');
assert(existsSync(join(root, 'docs/florida/FL-INS-002-company-identity-contract.md')), 'identity');
assert(existsSync(join(root, 'docs/florida/FL-INS-002-company-type-taxonomy.md')), 'taxonomy');
assert(existsSync(join(root, 'docs/florida/FL-INS-002-authorization-status.md')), 'status');
assert(existsSync(join(root, 'docs/florida/FL-INS-002-appointer-nonbridge.md')), 'nonbridge');
assert(existsSync(join(root, 'docs/florida/FL-INS-002-SQL-EDITOR.md')), 'sql');
assert(existsSync(join(reports, 'fl-ins-002-source-census.json')), 'census');
assert(existsSync(join(reports, 'fl-ins-002-naic-crosswalk.json')), 'crosswalk');
assert(existsSync(join(reports, 'fl-ins-002-publication-regression.json')), 'pub');

const keys = new Set(['legal-insurer:naic:50004']);
const ok = decideOirNaicJoin({
  naicCode: '50004',
  flCompanyCode: '42136',
  existingLegalInsurerKeys: keys,
});
assert(ok.action === 'attach' && ok.matchBasis === MATCH_BASIS_EXACT_NAIC, '1 exact naic');
assert(FL_OIR_COMPANY_CODE_SCHEME === 'fl_oir_company_code', 'scheme');
assert(IDENTIFIER_SCHEME.FL_OIR_COMPANY_CODE === 'fl_oir_company_code', 'scheme const');
assert(flCompanyCodeIsCanonicalIdentity() === false, '2 fl code not canonical');
assert(oirCompanyUsesNameMatch() === false, '3 no name merge');
assert(dfsAppointingNumberEqualsNaic() === false, '4 dfs != naic');
assert(flDfsNumberIsNaic() === false, '4b');
assert(decideOirNaicJoin({ naicCode: '50004', flCompanyCode: '42136', existingLegalInsurerKeys: keys }).action === 'attach', '5 dup cocode join still exact');
assert(normalizeFlOirCompanyCode('42136') === '42136', '6 fl code normalize');
assert(
  decideOirNaicJoin({ naicCode: null, flCompanyCode: '42136', existingLegalInsurerKeys: keys }).confidence ===
    'HIGH_CONFIDENCE_CANDIDATE',
  '7 no naic held'
);
assert(
  decideOirNaicJoin({ naicCode: '99999', flCompanyCode: '11111', existingLegalInsurerKeys: keys }).confidence ===
    'REVIEW_REQUIRED',
  '8 new naic held'
);
assert(companyStatusIsEnforcement() === false, '9 status != enforcement');
assert(brandEqualsInsurer() === false, '10 brand');
assert(groupEqualsInsurer() === false, '11 group');
assert(titleAgentEqualsTitleInsurer() === false, '12 title');
assert(classifyOirCompanyType('HEALTH MAINTENANCE ORGANIZATION (HMO)').healthMarketCandidate, '13 hmo');
assert(surplusLinesEqualsAdmitted() === false, '14 surplus');
assert(mayBridgeAppointerWithoutSameRecord() === false, '17 appointer fail closed');
assert(FL_DIGIT_COINCIDENCES.length === 17, '17 coincidences');
assert(!/APPOINTER_RESOLVES_TO/.test(py) || /remains 0/.test(py), 'no appointer write');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people');
assert(mayPublishEntityKind('legal_insurer') === false, '16 legal public 0');
assert(!/\/florida['"`]/.test(sitemap), '20 no sitemap florida');
assert(py.includes('--execute'), 'execute gate');

const census = load('fl-ins-002-source-census.json');
const xw = load('fl-ins-002-naic-crosswalk.json');
const pub = load('fl-ins-002-publication-regression.json');
const verd = load('fl-ins-002-verdict.json');
assert(census.total_companies === 3972, '3972 companies');
assert(xw.exact_national_matches === 1959, '1959 matches');
assert(xw.new_proven_legal_insurers === 0, 'no mint');
assert(pub.pass === true, 'pub pass');
assert(verd.appointer_resolves_to_fl === 0, 'resolves 0');
assert(verd.started_003 === false, '003 not started');

if (errors.length) {
  console.error('FL-INS-002 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('FL-INS-002 PASS oir-naic identity publication-safe tests=20');
