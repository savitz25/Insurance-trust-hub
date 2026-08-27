/**
 * INS-NAT-FINAL-002 national carrier identity foundation tests.
 *   npm run check:ins-nat-final-002
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { CARRIER_REGISTRY } from '../lib/carriers/registry';
import {
  brandEqualsLegalInsurer,
  classifyCmsOrganization,
  classifyFlAppointingToNational,
  classifyTxAppointingToNational,
  consumerBrandProvisionalKey,
  decideInsuranceGroupIdentity,
  decideLegalInsurerIdentity,
  flDfsNumberEqualsNaic,
  fuzzyMergeAllowed,
  groupEqualsLegalInsurer,
  insuranceGroupProvisionalKey,
  legalInsurerProvisionalKey,
  mayTraverseRegulatoryEvidence,
  nameOnlyMatchIsConfirmed,
  normalizeNaicCompanyCode,
  normalizeNaicGroupCode,
  PUBLIC_COPY,
  FORBIDDEN_PUBLIC_PHRASES,
  appointerEqualsLegalInsurerUntilResolved,
  txNamespaceAssumedCoCode,
} from '../lib/national/legal-insurer-identity';
import {
  parseNaicListingDir,
  predictedLegalInsurerEntities,
  predictedInsuranceGroupEntities,
} from '../lib/national/naic-listing';
import { carrierProvisionalKey } from '../lib/national/carrier-identity';
import { txAppointingEntityKey } from '../lib/national/tx-individual-appointments';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');

assert(existsSync(join(root, 'lib/national/legal-insurer-identity.ts')), 'identity lib');
assert(existsSync(join(root, 'lib/national/naic-listing.ts')), 'naic listing parser');
assert(existsSync(join(root, 'scripts/national/audit-carrier-identity.ts')), 'dry-run script');
assert(
  existsSync(join(root, 'supabase/migrations/20260827120000_insurance_carrier_identity.sql')),
  'migration prepared'
);

const auditSrc = readFileSync(join(root, 'scripts/national/audit-carrier-identity.ts'), 'utf8');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(auditSrc), 'T15 no provider writes');
assert(!auditSrc.includes('--execute'), 'dry-run has no execute gate');
assert(/excluded/i.test(auditSrc), 'T16 Florida sources listed as excluded');
assert(!/FL-INS-000\+/.test(auditSrc) || /excluded/.test(auditSrc), 'T16 no Florida rollout');
assert(auditSrc.includes('productionWrites: 0'), 'no production writes predicted');

const mig = readFileSync(
  join(root, 'supabase/migrations/20260827120000_insurance_carrier_identity.sql'),
  'utf8'
);
assert(!/^\s*DROP TABLE/im.test(mig), 'no destructive drop');
assert(!/ALTER TABLE\s+providers/i.test(mig), 'no provider alter');
assert(!/CREATE TRIGGER/i.test(mig), 'no provider trigger');
assert(!/sitemap\.ts|robots\.ts/.test(mig), 'no sitemap in migration');
assert(/CREATE TABLE IF NOT EXISTS national_entity_identifiers/i.test(mig), 'identifiers table');
assert(/legal_insurer/.test(mig) && /insurance_group/.test(mig) && /consumer_brand/.test(mig), 'kinds');

const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
assert(!/legal-insurer:naic:/.test(sitemap), 'T15 sitemap not graph carriers');
assert(!/national_entities/.test(sitemap), 'T15 sitemap ignores graph');

assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'T20 person profiles off');
assert(mayPublishEntityKind('carrier') === false, 'T15 carrier unpublished');
assert(mayPublishEntityKind('legal_insurer') === false, 'T15 legal unpublished');
assert(mayPublishEntityKind('insurance_group') === false, 'T15 group unpublished');
assert(mayPublishEntityKind('consumer_brand') === false, 'T15 brand unpublished');
assert(mayPublishEntityKind('agency') === true, 'T20 agency publication unchanged');

const fixture = join(root, 'scripts/national/fixtures/naic-loc-sample');
assert(existsSync(join(fixture, 'PROP.csv')), 'fixture PROP');
const p1 = parseNaicListingDir(fixture);
const p2 = parseNaicListingDir(fixture);
assert(p1.fingerprint === p2.fingerprint, 'T18 idempotent parser');
assert(p1.distinctCoCodes.length >= 8, 'fixture cocodes');

const legal = predictedLegalInsurerEntities(p1);
const groups = predictedInsuranceGroupEntities(p1);
const coSet = new Set(p1.distinctCoCodes);
const groupSet = new Set(p1.distinctGroupCodes);

// T1 same NAIC CoCode → same legal insurer
{
  const a = decideLegalInsurerIdentity({
    cocode: '19232',
    names: ['ALLSTATE INS CO'],
  });
  const b = decideLegalInsurerIdentity({
    cocode: '19232',
    names: ['ALLSTATE INSURANCE COMPANY'],
  });
  assert(a.confidence === 'CONFIRMED' && b.confidence === 'CONFIRMED', 'T1 confirmed');
  assert(
    a.confidence === 'CONFIRMED' &&
      b.confidence === 'CONFIRMED' &&
      a.key === b.key &&
      a.key === legalInsurerProvisionalKey('19232'),
    'T1 same key'
  );
}

// T2 different CoCodes → different legal insurers even if names match
{
  const a = decideLegalInsurerIdentity({
    cocode: '19232',
    names: ['ALLSTATE INS CO'],
  });
  const b = decideLegalInsurerIdentity({
    cocode: '19240',
    names: ['ALLSTATE INS CO'],
  });
  assert(
    a.confidence === 'CONFIRMED' &&
      b.confidence === 'CONFIRMED' &&
      a.key !== b.key,
    'T2 different insurers'
  );
}

// T3 brand ≠ legal insurer
assert(brandEqualsLegalInsurer() === false, 'T3 helper');
assert(
  consumerBrandProvisionalKey('allstate') !== legalInsurerProvisionalKey('19232'),
  'T3 keys'
);
assert(
  CARRIER_REGISTRY.every((c) => consumerBrandProvisionalKey(c.slug).startsWith('consumer-brand:')),
  'T3 registry is brands'
);

// T4 group ≠ legal insurer
assert(groupEqualsLegalInsurer() === false, 'T4 helper');
assert(insuranceGroupProvisionalKey('8') !== legalInsurerProvisionalKey('19232'), 'T4 keys');
const allstateGroup = groups.find((g) => g.groupCode === '8');
assert(allstateGroup && allstateGroup.memberCount >= 2, 'T4/T9 group has members');

// T5 appointer ≠ legal insurer until resolved
assert(appointerEqualsLegalInsurerUntilResolved() === false, 'T5');
assert(carrierProvisionalKey('19232') !== legalInsurerProvisionalKey('19232'), 'T5 fl key');
assert(txAppointingEntityKey('19232') !== legalInsurerProvisionalKey('19232'), 'T5 tx key');

// T6 FL DFS number ≠ NAIC
assert(flDfsNumberEqualsNaic() === false, 'T6 helper');
assert(normalizeNaicCompanyCode('389230') === null, 'T6 six digit');
{
  const m = classifyFlAppointingToNational({
    appointingEntityNumber: '389230',
    officialCoCodes: coSet,
  });
  assert(m.confidence === 'UNRESOLVED', 'T6 six-digit unresolved');
}
{
  const m = classifyFlAppointingToNational({
    appointingEntityNumber: '19232',
    officialCoCodes: coSet,
  });
  assert(m.confidence === 'REVIEW_REQUIRED', 'T6 coincidence is review');
  assert(m.targetKey === null, 'T6 no legal merge');
}

// T7 TX namespace validated before use
assert(txNamespaceAssumedCoCode() === false, 'T7 helper');
{
  const confirmed = classifyTxAppointingToNational({
    txNaicId: '19232',
    officialCoCodes: coSet,
    officialGroupCodes: groupSet,
  });
  assert(
    confirmed.confidence === 'CONFIRMED' && confirmed.targetKind === 'legal_insurer',
    'T7 five-digit CoCode confirmed'
  );
  const six = classifyTxAppointingToNational({
    txNaicId: '192320',
    officialCoCodes: coSet,
    officialGroupCodes: groupSet,
  });
  assert(six.confidence === 'UNRESOLVED', 'T7 six-digit not CoCode');
  const fourGroup = classifyTxAppointingToNational({
    txNaicId: '0008',
    officialCoCodes: coSet,
    officialGroupCodes: groupSet,
  });
  assert(fourGroup.confidence !== 'CONFIRMED' || fourGroup.targetKind !== 'legal_insurer', 'T7 0008 not forced CoCode');
}

// T8 same brand can map to multiple legal insurers
{
  const a = legalInsurerProvisionalKey('19232');
  const b = legalInsurerProvisionalKey('19240');
  const brand = consumerBrandProvisionalKey('allstate');
  assert(a !== b && brand !== a && brand !== b, 'T8 brand covers two insurers');
}

// T9 one group can contain multiple legal insurers
assert((allstateGroup?.memberCoCodes || []).includes('19232'), 'T9 member 19232');
assert((allstateGroup?.memberCoCodes || []).includes('19240'), 'T9 member 19240');

// T10 legal-name history does not create duplicate entity
{
  const d = decideLegalInsurerIdentity({
    cocode: '19232',
    names: ['ALLSTATE INS CO', 'ALLSTATE INSURANCE COMPANY'],
  });
  assert(d.confidence === 'CONFIRMED' && d.key === legalInsurerProvisionalKey('19232'), 'T10');
}

// T11 name-only match ≠ CONFIRMED
assert(nameOnlyMatchIsConfirmed() === false, 'T11 helper');
{
  const d = decideLegalInsurerIdentity({
    cocode: null,
    names: ['ALLSTATE INS CO'],
  });
  assert(d.confidence === 'UNRESOLVED' && d.reason === 'name_only_not_confirmed', 'T11');
}

// T12 no fuzzy merge
assert(fuzzyMergeAllowed() === false, 'T12');

// T13 unresolved remains unresolved
{
  const d = decideLegalInsurerIdentity({ cocode: '', names: [] });
  assert(d.confidence === 'UNRESOLVED', 'T13');
}

// T14 regulatory evidence cannot traverse REVIEW_REQUIRED bridge
assert(mayTraverseRegulatoryEvidence('REVIEW_REQUIRED') === false, 'T14 review');
assert(mayTraverseRegulatoryEvidence('UNRESOLVED') === false, 'T14 unresolved');
assert(mayTraverseRegulatoryEvidence('HIGH_CONFIDENCE') === false, 'T14 high');
assert(mayTraverseRegulatoryEvidence('CONFIRMED') === true, 'T14 confirmed only');

// T17 deterministic dry-run fingerprint (parser)
assert(/^[a-f0-9]{64}$/.test(p1.fingerprint), 'T17 fingerprint shape');

// T19 raw identifiers preserved
assert(normalizeNaicCompanyCode(' 19232 ') === '19232', 'T19 cocode');
assert(normalizeNaicGroupCode('0008') === '8', 'T19 group strips zeros');
assert(normalizeNaicCompanyCode('8') === null, 'T19 unpadded not CoCode');

// public copy
assert(PUBLIC_COPY.legalInsurer === 'Legal regulated insurer', 'copy legal');
assert(PUBLIC_COPY.naic === 'NAIC company code', 'copy naic');
assert(PUBLIC_COPY.group === 'Insurance group', 'copy group');
assert(PUBLIC_COPY.brand === 'Consumer brand', 'copy brand');
assert(PUBLIC_COPY.appointer === 'Appointing entity reported by state regulator', 'copy appointer');
assert(FORBIDDEN_PUBLIC_PHRASES.includes('parent company'), 'forbid parent');
assert(FORBIDDEN_PUBLIC_PHRASES.includes('same company'), 'forbid same');

// CMS: no force to legal insurer
{
  const m = classifyCmsOrganization({
    contractId: 'H1036',
    organizationName: 'Humana Medical Plan, Inc.',
  });
  assert(m.class === 'brand_only' || m.class === 'organization_name_only', 'CMS not forced legal');
  assert(m.confidence !== 'CONFIRMED', 'CMS name not confirmed legal');
  const exact = classifyCmsOrganization({
    contractId: 'H1036',
    organizationName: 'Humana',
    naicCoCode: '73288',
  });
  assert(exact.class === 'exact_naic' && exact.confidence === 'CONFIRMED', 'CMS exact NAIC');
}

// T20 person/agency identity untouched: no NPN functions changed by this module
assert(!/normalizeNpn/.test(readFileSync(join(root, 'lib/national/legal-insurer-identity.ts'), 'utf8')), 'T20 no npn merge');

const docs = [
  'docs/national/carriers/INS-NAT-FINAL-002-source-inventory.md',
  'docs/national/carriers/INS-NAT-FINAL-002-identity-contract.md',
  'docs/national/carriers/INS-NAT-FINAL-002-group-brand-contract.md',
  'docs/national/carriers/INS-NAT-FINAL-002-public-copy-contract.md',
];
for (const d of docs) assert(existsSync(join(root, d)), `doc ${d}`);

if (errors.length) {
  console.error('INS-NAT-FINAL-002 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log(
  `INS-NAT-FINAL-002 PASS T1–T20 parser=${p1.fingerprint.slice(0, 12)} legal=${legal.length} groups=${groups.length}`
);
