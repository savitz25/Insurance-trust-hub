/**
 * INS-NAT-FINAL-002B production-ingest tests.
 *   npm run check:ins-nat-final-002b
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import {
  CARRIER_RELATIONSHIP_TYPE,
  IDENTIFIER_SCHEME,
  consumerBrandProvisionalKey,
  insuranceGroupProvisionalKey,
  legalInsurerProvisionalKey,
} from '../lib/national/legal-insurer-identity';
import { parseNaicListingDir, predictedLegalInsurerEntities } from '../lib/national/naic-listing';
import { APPROVED, SOURCE_DATASET, TASK } from './national/ingest-carrier-identity';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const ingestPath = join(root, 'scripts/national/ingest-carrier-identity.ts');
assert(existsSync(ingestPath), 'ingest script');
const src = readFileSync(ingestPath, 'utf8');

assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'no provider writes');
assert(!/generate_sitemap|app\/robots|sitemap\.ts/.test(src), 'no sitemap/robots');
assert(!/FL-INS-000/.test(src) || /Do not start Florida|no Florida/i.test(src), 'no Florida rollout');
assert(!src.includes(`relationship_type: '${CARRIER_RELATIONSHIP_TYPE.APPOINTER_RESOLVES_TO}'`), 'no APPOINTER_RESOLVES_TO insert');
assert(!src.includes(`relationship_type: '${CARRIER_RELATIONSHIP_TYPE.USES_BRAND}'`), 'no USES_BRAND insert');
assert(src.includes('appointerResolvesTo: 0'), 'predicted bridges 0');
assert(src.includes('--execute'), 'execute gate');
assert(src.includes('SCHEMA_MISSING_NO_DATABASE_URL') || src.includes('applyCarrierIdentityMigration'), 'schema apply path');

const mig = readFileSync(
  join(root, 'supabase/migrations/20260827120000_insurance_carrier_identity.sql'),
  'utf8'
);
assert(!/^\s*DROP TABLE/im.test(mig), 'no destructive drop');
assert(!/ALTER TABLE\s+providers/i.test(mig), 'no provider alter');
assert(!/CREATE TRIGGER/i.test(mig), 'no trigger');

assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'person profiles off');
assert(mayPublishEntityKind('legal_insurer') === false, 'legal unpublished');
assert(mayPublishEntityKind('insurance_group') === false, 'group unpublished');
assert(mayPublishEntityKind('consumer_brand') === false, 'brand unpublished');
assert(mayPublishEntityKind('carrier') === false, 'carrier unpublished');
assert(mayPublishEntityKind('agency') === true, 'agency unchanged');

const fixture = join(root, 'scripts/national/fixtures/naic-loc-sample');
const p1 = parseNaicListingDir(fixture);
const p2 = parseNaicListingDir(fixture);
assert(p1.fingerprint === p2.fingerprint, 'parser idempotent');
const legal = predictedLegalInsurerEntities(p1);
const a = legal.find((e) => e.cocode === '19232');
const b = legal.find((e) => e.cocode === '19240');
assert(a && b && a.provisionalKey !== b.provisionalKey, 'same-name/group members stay separate');
assert(legalInsurerProvisionalKey('19232') !== insuranceGroupProvisionalKey('8'), 'group != legal');
assert(consumerBrandProvisionalKey('allstate') !== legalInsurerProvisionalKey('19232'), 'brand != legal');
assert(IDENTIFIER_SCHEME.NAIC_COCODE === 'naic_cocode', 'cocode scheme');
assert(IDENTIFIER_SCHEME.NAIC_GROUP_CODE === 'naic_group_code', 'group scheme');
assert(SOURCE_DATASET === 'naic_loc_jun_2026', 'source dataset');
assert(TASK === 'INS-NAT-FINAL-002B', 'task');
assert(APPROVED.legalInsurers === 6185, 'approved legal');
assert(APPROVED.groups === 720, 'approved groups');
assert(APPROVED.memberships === 3845, 'approved memberships');
assert(APPROVED.txUnresolved.length === 7, 'tx unresolved list');
assert(APPROVED.parserFingerprint.length === 64, 'parser fp');
assert(src.includes("entity_kind: 'legal_insurer'"), 'inserts legal_insurer kind');
assert(src.includes("entity_kind: 'insurance_group'"), 'inserts insurance_group kind');
assert(src.includes('internalOnly: true'), 'brands internal only');
assert(!/matchCarrierByReportedName/.test(src) || src.includes('REVIEW_REQUIRED'), 'no name merge to legal');

if (errors.length) {
  console.error('INS-NAT-FINAL-002B FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-FINAL-002B PASS ingest-gates T-migration T-identity T-publication');
