/**
 * INS-NAT-011 CMS Marketplace evidence tests (no production writes).
 *   npm run check:ins-nat-011
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  CMS_CURRENT_PLAN_YEAR,
  assisterOrNavigatorIsProducer,
  cmsJoinExactNpn,
  cmsPersonProfilesStayPrivate,
  cmsRegistrationCreatesStateLicense,
  cmsTerminationMutatesStateCredential,
  findLocalHelpHasNpn,
  healthLoaImpliesCmsRegistration,
  marketplaceTypeFromDates,
  observationDedupeKey,
  portalAccountImpliesRegistered,
  rtlStatusToEvidence,
  trackerImpliesRegistrationCompleted,
} from '../lib/national/cms-marketplace';
import { PUBLIC_PERSON_PROFILES_ENABLED } from '../lib/national/publication';
import { healthLoaImpliesMarketplace, healthOrLifeLoaImpliesMedicare } from '../lib/national/loa';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const script = join(root, 'scripts/national/backfill-cms-marketplace.ts');
assert(existsSync(script), 'backfill script');
const src = readFileSync(script, 'utf8');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'CMS15 no provider writes');
assert(src.includes('providerWritesPredicted: 0') || src.includes('providerWritesPredicted:0'), 'CMS15 predicted 0');
assert(!/compareLegalNames|normalizeEmail|parsePhone/.test(src), 'CMS11 no name/email/phone join');
assert(src.includes('normalizeNpn'), 'CMS1 exact NPN');
assert(!/national_entities['"]\s*\)\.(insert|update|upsert)/i.test(src), 'CMS2 no person insert');
assert(!/license_credentials['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'CMS4 no credential writes');

// CMS1 exact NPN → existing person
{
  const j = cmsJoinExactNpn({ npn: '55555', personId: 'person-1' });
  assert(j.attachment === 'ATTACHED' && j.entityId === 'person-1' && j.confidence === 'CONFIRMED', 'CMS1');
  assert(j.createPerson === false, 'CMS1 no create');
}

// CMS2 unmatched NPN → staged, no person
{
  const j = cmsJoinExactNpn({ npn: '99999' });
  assert(j.attachment === 'UNATTACHED' && j.entityId == null, 'CMS2 unattached');
  assert(j.createPerson === false, 'CMS2 no invent');
}

// CMS3 Health LOA alone → no Marketplace
assert(healthLoaImpliesCmsRegistration('HEALTH') === false, 'CMS3');
assert(healthLoaImpliesMarketplace('LIFE INCL VAR ANNUITY & HEALTH') === false, 'CMS3 loa');

// CMS4 registration does not create state license
assert(cmsRegistrationCreatesStateLicense() === false, 'CMS4');

// CMS5 plan-year specific
{
  const a = observationDedupeKey('cms_ffm_rcl', '2025', 'FFM_REGISTRATION_COMPLETED', '111');
  const b = observationDedupeKey('cms_ffm_rcl', '2026', 'FFM_REGISTRATION_COMPLETED', '111');
  assert(a !== b, 'CMS5 years distinct');
  assert(CMS_CURRENT_PLAN_YEAR === '2026', 'CMS5 current year');
}

// CMS6 RTL is Marketplace-program specific
assert(rtlStatusToEvidence('T3') === 'FFM_REGISTRATION_TERMINATED', 'CMS6 T');
assert(rtlStatusToEvidence('R1') === 'FFM_REGISTRATION_REINSTATED', 'CMS6 R');

// CMS7 termination does not mutate state credential
assert(cmsTerminationMutatesStateCredential() === false, 'CMS7');

// CMS8 SHOP vs Individual
assert(marketplaceTypeFromDates('01/01/2026', '') === 'INDIVIDUAL', 'CMS8 ind');
assert(marketplaceTypeFromDates('', '01/01/2026') === 'SHOP', 'CMS8 shop');
assert(marketplaceTypeFromDates('01/01/2026', '02/01/2026') === 'BOTH', 'CMS8 both');

// CMS9 tracker ≠ completed
assert(trackerImpliesRegistrationCompleted({ PORTAL_ACCOUNT_ACTIVE: 'Yes' }) === false, 'CMS9');
assert(portalAccountImpliesRegistered() === false, 'CMS9 portal');

// CMS10 assister/navigator not producer
assert(assisterOrNavigatorIsProducer('Navigator (NAV)') === false, 'CMS10 nav');
assert(assisterOrNavigatorIsProducer('Certified Application Counselor (CAC)') === false, 'CMS10 cac');
assert(assisterOrNavigatorIsProducer('Agent/Broker (ABA)') === true, 'CMS10 aba is ab');
assert(findLocalHelpHasNpn({ location_name: 'Jane', email_address: 'a@b.com' }) === false, 'CMS10 no npn');

// CMS11 — script-level, checked above
{
  const kind = cmsJoinExactNpn({ npn: '12345', agencyOwnsNpn: true });
  assert(kind.attachment === 'KIND_CONFLICT', 'CMS11 kind conflict not name match');
}

// CMS12 publication
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'CMS12 flag');
assert(cmsPersonProfilesStayPrivate() === true, 'CMS12 private');

// CMS13 display preference preserved (script stores raw preference)
assert(src.includes('FIND_LOCAL_HELP_PREFERENCE') || src.includes('find_local_help'), 'CMS13 preference field');

// CMS14 idempotent key
{
  const a = observationDedupeKey('cms_ffm_rcl', '2026', 'FFM_REGISTRATION_COMPLETED', '1');
  const b = observationDedupeKey('cms_ffm_rcl', '2026', 'FFM_REGISTRATION_COMPLETED', '1');
  assert(a === b, 'CMS14');
}

assert(healthOrLifeLoaImpliesMedicare('Health') === false, 'medicare still false');

const sql = join(root, 'supabase/migrations/20260826180000_cms_marketplace_observations.sql');
assert(existsSync(sql), 'migration');
const sqlText = readFileSync(sql, 'utf8');
assert(sqlText.includes('entity_id') && sqlText.includes('REFERENCES national_entities'), 'fk');
assert(/entity_id\s+UUID REFERENCES/.test(sqlText), 'nullable entity_id');
assert(!/entity_id\s+UUID NOT NULL/.test(sqlText), 'unmatched allowed');
assert(!/DROP TABLE providers/i.test(sqlText), 'no drop providers');

if (errors.length) {
  console.error('INS-NAT-011 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-011 PASS CMS1–CMS15');
