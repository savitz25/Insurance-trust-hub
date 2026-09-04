/**
 * INS-DIR-BAIL-001 — bail-bond consumer-directory firewall.
 *   npm run check:ins-dir-bail-001
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { CANONICAL_SNAPSHOT_FINGERPRINT } from '../lib/national/fl-state-intel';
import { buildFloridaStateView } from '../lib/national/fl-state-display';
import { buildInsuranceHomeIntelV1, fingerprintHomeIntel } from '../lib/national/home-intel';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { evaluatePromotionGates } from '../lib/provenance/promotion';
import { canShowAsVerified, resolveProviderTrustState } from '../lib/insurance/trust/provider-trust-state';
import { evaluatePromotionEligibility } from '../lib/dfs/promote';
import { INS_INSURER_006_WAVE1_SIZE, publishedProfileSitemapPaths } from '../lib/national/legal-insurer-pilot';
import {
  classifyBailBondDirectoryPublication,
  hasAuthoritativeBailBondLicenseEvidence,
  hasClearBailBondBusinessName,
  mayAssignPublicInsuranceCategory,
  mayAssignPublicInsuranceSpecialty,
  mayPublishAsConsumerInsuranceAgency,
  maySetDirectoryVerified,
  usedRawBailSubstringClassifier,
} from '../lib/directory/bail-bond-publication';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}
const root = join(__dirname, '..');
function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const HOME_FP = '7474172a3996c574e26058be24b6af5149765f801660ddedba9d5508ef332fc1';
const FL_FP = '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93';
const home = buildInsuranceHomeIntelV1();
assert(home.fingerprint === HOME_FP && home.fingerprint === fingerprintHomeIntel(home), 'homepage fingerprint unchanged');
assert(home.publicAvailability.publicPeople === 0, 'public people 0');
assert(home.publicAvailability.publicGraphAgencies === 0, 'public graph agencies 0');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people unpublished');
assert(mayPublishEntityKind('legal_insurer') === false, 'legal insurer kind flag unchanged');
assert(INS_INSURER_006_WAVE1_SIZE === 26 && publishedProfileSitemapPaths().length === 26, '26 /insurers profiles unchanged');

assert(usedRawBailSubstringClassifier() === false, 'no raw substring classification');
assert(hasAuthoritativeBailBondLicenseEvidence(['BAIL BOND AGENCY LICENSE']) === true, 'authoritative bail license');
assert(hasAuthoritativeBailBondLicenseEvidence(['General Lines Agency']) === false, 'generic agency not bail license');
assert(hasClearBailBondBusinessName('!!!! 007 BAIL BONDS') === true, '007 bail bonds name');
assert(hasClearBailBondBusinessName('1 2 3 ASAP BAIL LLC') === true, 'ASAP BAIL name');
assert(hasClearBailBondBusinessName("BOB'S BAIL BONDS, LLC") === true, "Bob's Bail Bonds");
assert(hasClearBailBondBusinessName('BAILEY INSURANCE GROUP') === false, 'Bailey false positive not excluded');
assert(hasClearBailBondBusinessName('COHEN-BAILIE INSURANCE') === false, 'Bailie false positive not excluded');

const licensed = classifyBailBondDirectoryPublication({
  businessNames: ['!!!! 007 BAIL BONDS'],
  licenseEvidence: ['BAIL BOND AGENCY LICENSE'],
});
assert(licensed.excludeFromConsumerDirectory && licensed.reason === 'authoritative_bail_license', 'authoritative bail license excluded');
assert(!mayPublishAsConsumerInsuranceAgency(licensed), 'bail-only cannot become verified/public');
assert(!mayAssignPublicInsuranceCategory('health', licensed), 'bail-only cannot receive Health');
assert(!mayAssignPublicInsuranceCategory('life', licensed), 'bail-only cannot receive Life');
assert(!mayAssignPublicInsuranceCategory('auto', licensed), 'bail-only cannot receive P&C/auto');
assert(!mayAssignPublicInsuranceSpecialty('Health', licensed), 'bail-only cannot receive Health specialty');
assert(!maySetDirectoryVerified(licensed), 'bail-only cannot set verified');

const nameOnly = classifyBailBondDirectoryPublication({
  businessNames: ['1 2 3 ASAP BAIL LLC'],
  licenseEvidence: ['AGENCY LICENSE'],
});
assert(nameOnly.excludeFromConsumerDirectory && nameOnly.reason === 'defensive_bail_business_name', 'clear standalone bail business excluded');

const bailey = classifyBailBondDirectoryPublication({
  businessNames: ['BAILEY INSURANCE GROUP'],
  licenseEvidence: ['AGENCY LICENSE'],
});
assert(!bailey.excludeFromConsumerDirectory, 'Bailey not excluded by name alone');

const promo = evaluatePromotionGates({
  id: 'prov-1',
  licenseNumber: 'L123456',
  licenseState: 'FL',
  source: 'Florida DFS',
  checkedAt: new Date().toISOString(),
  isVerified: true,
  identityMatchAccepted: true,
  businessName: "BOB'S BAIL BONDS, LLC",
  licenseEvidence: ['AGENCY LICENSE'],
});
assert(promo.ok === false && promo.canShowHardVerifiedBadge === false, 'promotion gate blocks bail name');

const dfs = evaluatePromotionEligibility({
  id: 'dfs-1',
  entity_type: 'business',
  license_number: 'L999',
  npn: '123',
  legal_name: '!!!! 007 BAIL BONDS',
  display_name: '!!!! 007 BAIL BONDS',
  license_status: 'valid',
  lines_of_authority: ['BAIL BOND AGENCY LICENSE'],
  city: 'Miami',
  county: 'Miami-Dade',
  county_normalized: 'MIAMI-DADE',
  state: 'FL',
  zip: '33101',
  phone: '3055550100',
  email: null,
  source_checked_at: new Date().toISOString(),
});
assert(!dfs.ok && /bail_bond_directory/.test(dfs.reason), 'future promotion uses central firewall');

const trust = resolveProviderTrustState({
  id: 'p1',
  slug: 'bobs-bail-bonds',
  name: "BOB'S BAIL BONDS, LLC",
  city: 'Miami',
  state: 'FL',
  insurance_types: ['health'],
  specialties: ['Health'],
  rating: 0,
  review_count: 0,
  is_verified: true,
  license_number: 'L1',
  license_state: 'FL',
  license_source: 'Florida DFS',
  license_checked_at: new Date().toISOString(),
  license_identity_match_accepted: true,
});
assert(!canShowAsVerified(trust), 'bail-only direct slug fails closed');

assert(src('lib/dfs/promote.ts').includes('rejectBailBondDirectoryPromotion'), 'FL promote uses central firewall');
assert(src('lib/nc/promote.ts').includes('rejectBailBondDirectoryPromotion'), 'NC promote uses central firewall');
assert(src('lib/tdi/promote.ts').includes('rejectBailBondDirectoryPromotion'), 'TX promote uses central firewall');
assert(src('lib/odi/promote.ts').includes('rejectBailBondDirectoryPromotion'), 'OH promote uses central firewall');
assert(src('lib/nj/promote.ts').includes('rejectBailBondDirectoryPromotion'), 'NJ promote uses central firewall');
assert(src('lib/nv/promote.ts').includes('rejectBailBondDirectoryPromotion'), 'NV promote uses central firewall');
assert(src('lib/vt/promote.ts').includes('rejectBailBondDirectoryPromotion'), 'VT promote uses central firewall');
assert(src('lib/ma/promote.ts').includes('rejectBailBondDirectoryPromotion'), 'MA promote uses central firewall');
assert(src('lib/ms/promote.ts').includes('rejectBailBondDirectoryPromotion'), 'MS promote uses central firewall');
assert(src('lib/provenance/promotion.ts').includes('classifyBailBondDirectoryPublication'), 'shared promotion gate');
assert(src('lib/directory/bail-bond-publication.ts').includes('retain'), 'source evidence retained in policy');
assert(src('app/sitemap.ts').includes("const providers: MetadataRoute.Sitemap = []"), 'bail-only absent from sitemap (provider sitemap empty)');
assert(src('app/sitemap.ts').includes('/carriers'), '/carriers unchanged');
assert(!src('lib/national/home-intel.ts').includes('INS-DIR-BAIL'), 'homepage untouched');
assert(!src('lib/national/fl-state-intel.ts').includes('INS-DIR-BAIL'), 'florida untouched');
assert(existsSync(join(root, 'app/insurers/page.tsx')), '/insurers remains');
assert(MIXED_DOCUMENTED(), 'mixed credentials handled explicitly');

function MIXED_DOCUMENTED(): boolean {
  return src('lib/directory/bail-bond-publication.ts').includes('MIXED_BAIL_AND_INSURANCE_POLICY');
}

const snap = JSON.parse(src('data/reports/fl-ins-006-state-snapshot.json'));
const ready = JSON.parse(src('data/reports/fl-ins-006-profile-readiness.json'));
const view = buildFloridaStateView(snap, ready);
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT && view.fingerprint === FL_FP, 'Florida fingerprint unchanged');

if (errors.length) {
  console.error(`INS-DIR-BAIL-001 FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-DIR-BAIL-001 PASS');
console.log('homepage', home.fingerprint);
console.log('florida', view.fingerprint);
console.log('insurerProfiles', publishedProfileSitemapPaths().length);
