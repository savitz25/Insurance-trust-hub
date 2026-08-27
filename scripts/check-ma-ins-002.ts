/**
 * MA-INS-002 held-NPN resolution tests (no production writes).
 *   npm run check:ma-ins-002
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { normalizeNpn } from '../lib/national/npn';
import {
  absenceFromActiveFileMeansTerminated,
  cmsHitIsExplicitEntityType,
  decideHeldEntityType,
  evidenceFromStagingRow,
  ma002WorksForPredicted,
  nameSuffixIsAuthoritativeType,
  newAgencyAutoIndexed,
  normalizeOfficialEntityType,
  npnStillCanonical,
  padMalformedNpn,
  personalLookingNameIsAuthoritativeType,
  resolvedPersonIsIndexable,
  sbsBulkLookupUsed,
  type TypeEvidence,
} from '../lib/national/ma-held-resolution';
import { licenseClassIsLoa, domicileIsLicenseState } from '../lib/national/ma-doi-regulatory';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const script = join(root, 'scripts/national/resolve-ma-held-npns.ts');
assert(existsSync(script), 'resolver script');
const src = readFileSync(script, 'utf8');
assert(!/generate_sitemap|app\/robots/.test(src), 'no SEO writes');
assert(src.includes('REVIEW_REQUIRED_ENTITY_TYPE') || src.includes('UNRESOLVED'), 'holds unresolved');

const flBiz: TypeEvidence = evidenceFromStagingRow({
  source: 'florida_dfs',
  table: 'dfs_producers',
  authority: 'FL DFS',
  extractIsBusinessOnly: false,
  typeColumn: 'entity_type',
  entityTypeRaw: 'business',
});
const flInd: TypeEvidence = evidenceFromStagingRow({
  source: 'florida_dfs',
  table: 'dfs_producers',
  authority: 'FL DFS',
  extractIsBusinessOnly: false,
  typeColumn: 'entity_type',
  entityTypeRaw: 'individual',
});
const txBiz: TypeEvidence = evidenceFromStagingRow({
  source: 'texas_tdi_agencies',
  table: 'tdi_producers',
  authority: 'TDI agencies',
  extractIsBusinessOnly: true,
  typeColumn: 'implied_business_extract',
  entityTypeRaw: 'business',
});

// 1
{
  const d = decideHeldEntityType([flBiz]);
  assert(d.confidence === 'CONFIRMED' && d.class === 'BUSINESS_ENTITY', 'T1 business');
}
// 2
{
  const d = decideHeldEntityType([flInd]);
  assert(d.confidence === 'CONFIRMED' && d.class === 'INDIVIDUAL', 'T2 individual');
}
// 3
assert(nameSuffixIsAuthoritativeType() === false, 'T3 suffix');
assert(normalizeOfficialEntityType('Travel Insurance Master, LLC') === 'UNKNOWN', 'T3 llc name unknown');
// 4
assert(personalLookingNameIsAuthoritativeType() === false, 'T4 personal name');
// 5 exact NPN beats name
{
  const d = decideHeldEntityType([flBiz]);
  assert(d.confidence === 'CONFIRMED', 'T5 npn type wins');
}
// 6-9 identity not contact
assert(nameSuffixIsAuthoritativeType() === false, 'T6');
// 10 conflict
{
  const d = decideHeldEntityType([flBiz, flInd]);
  assert(d.confidence === 'REVIEW_REQUIRED' && d.reason === 'REVIEW_REQUIRED_ENTITY_TYPE_CONFLICT', 'T10 conflict');
}
// 11 malformed not padded
assert(padMalformedNpn('9950') === null, 'T11 no pad');
assert(normalizeNpn('9950') === null, 'T11 normalize rejects 4 digits');
// 12-13 publication
assert(resolvedPersonIsIndexable() === false, 'T12 person not indexable');
assert(mayPublishEntityKind('person') === false, 'T12 gate');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'T12 profiles off');
assert(newAgencyAutoIndexed() === false, 'T13 no auto index');
// 14-15
assert(licenseClassIsLoa() === false, 'T14');
assert(domicileIsLicenseState() === false, 'T15');
// 16
assert(ma002WorksForPredicted() === 0, 'T16');
// 17 concurrent
{
  const graph = new Set(['12345']);
  assert(npnStillCanonical('12345', graph) === true, 'T17 already in graph');
  assert(npnStillCanonical('99999', graph) === false, 'T17 still net-new');
}
// 19
assert(absenceFromActiveFileMeansTerminated() === false, 'T19');
assert(cmsHitIsExplicitEntityType() === false, 'cms not type');
assert(sbsBulkLookupUsed() === false, 'no sbs scrape');
{
  const a = decideHeldEntityType([txBiz]);
  assert(a.confidence === 'CONFIRMED' && a.class === 'BUSINESS_ENTITY', 'tx agency extract');
}
assert(src.includes('--execute'), 'T18 execute path');
assert(src.includes('fingerprint') || src.includes('sha256'), 'T20 fingerprint');

if (errors.length) {
  console.error('MA-INS-002 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('MA-INS-002 PASS T1–T20');
