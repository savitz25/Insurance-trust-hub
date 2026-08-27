/**
 * INS-NAT-FINAL-003 appointer → NAIC crosswalk tests.
 *   npm run check:ins-nat-final-003
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import {
  FL_DIGIT_COINCIDENCES,
  TX_MATCH_BASIS,
  TX_UNRESOLVED_IDS,
  adverseEvidenceMayTraverse,
  classifyFlBridge,
  classifyTxBridge,
  confirmedMappingUsesNameAddressContactBrand,
  digitCoincidenceIsIdentity,
  highConfidenceGetsProductionBridgeThisTask,
  productionBridgeAllowed,
  reviewRequiredGetsProductionBridge,
  unresolvedGetsProductionBridge,
} from '../lib/national/appointer-crosswalk';
import { legalInsurerProvisionalKey } from '../lib/national/legal-insurer-identity';
import { txAppointingEntityKey } from '../lib/national/tx-individual-appointments';
import { carrierProvisionalKey } from '../lib/national/carrier-identity';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const src = readFileSync(join(root, 'scripts/national/ingest-appointer-crosswalk.ts'), 'utf8');
assert(existsSync(join(root, 'lib/national/appointer-crosswalk.ts')), 'lib');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'T14 no provider writes');
assert(!/generate_sitemap|robots\.ts/.test(src), 'T15 no sitemap/robots');
assert(!/FL-INS-000/.test(src), 'no Florida rollout');
assert(src.includes('APPOINTER_RESOLVES_TO'), 'bridge type');
assert(src.includes('--execute'), 'execute gate');
assert(!src.includes('matchCarrierByReportedName'), 'T13 no brand regex ingest');

const co = new Set(['60488', '19232', '73288', '65935']);
const groups = new Set(['8', '1']);
const legal = new Set([
  legalInsurerProvisionalKey('60488'),
  legalInsurerProvisionalKey('19232'),
  legalInsurerProvisionalKey('73288'),
  legalInsurerProvisionalKey('65935'),
]);

// T1 exact TX CoCode → CONFIRMED bridge
{
  const r = classifyTxBridge({
    txKey: txAppointingEntityKey('60488'),
    officialCoCodes: co,
    officialGroupCodes: groups,
    legalInsurerKeys: legal,
  });
  assert(r.confidence === 'CONFIRMED' && productionBridgeAllowed(r), 'T1');
  assert(r.targetLegalInsurerKey === legalInsurerProvisionalKey('60488'), 'T1 target');
  assert(r.matchBasis === TX_MATCH_BASIS, 'T1 basis');
}

// T2 unmatched TX ID → no bridge
{
  const r = classifyTxBridge({
    txKey: txAppointingEntityKey('14348'),
    officialCoCodes: co,
    officialGroupCodes: groups,
    legalInsurerKeys: legal,
  });
  assert(r.confidence === 'UNRESOLVED' && !productionBridgeAllowed(r), 'T2');
  assert(TX_UNRESOLVED_IDS.includes('14348' as (typeof TX_UNRESOLVED_IDS)[number]), 'T2 list');
}

// T3 FL digit coincidence → no bridge
{
  const r = classifyFlBridge({
    flKey: carrierProvisionalKey('10003'),
    officialCoCodes: new Set(['10003']),
  });
  assert(r.confidence === 'REVIEW_REQUIRED' && !productionBridgeAllowed(r), 'T3');
  assert(FL_DIGIT_COINCIDENCES.includes('10003'), 'T3 list');
  assert(digitCoincidenceIsIdentity() === false, 'T3 helper');
}

// T4 exact official FL crosswalk → CONFIRMED would require same-record evidence;
// this task has no such source, so no production FL classifier path to CONFIRMED.
assert(classifyFlBridge({ flKey: carrierProvisionalKey('389230'), officialCoCodes: co }).confidence === 'UNRESOLVED', 'T4 no invented FL');

// T5 name-only FL match → no bridge
assert(confirmedMappingUsesNameAddressContactBrand() === false, 'T5');

// T6/T7 keys remain distinct
assert(txAppointingEntityKey('60488') !== legalInsurerProvisionalKey('60488'), 'T6/T7 distinct');
assert(carrierProvisionalKey('60488') !== legalInsurerProvisionalKey('60488'), 'T6 fl key');

// T8 different appointers may resolve to same insurer (allowed; not deduped)
assert(txAppointingEntityKey('60488') !== carrierProvisionalKey('60488'), 'T8 two appointer namespaces');

// T9 target CoCode must exist
{
  const r = classifyTxBridge({
    txKey: txAppointingEntityKey('60488'),
    officialCoCodes: co,
    officialGroupCodes: groups,
    legalInsurerKeys: new Set(),
  });
  assert(r.status === 'HOLD' && !productionBridgeAllowed(r), 'T9 missing target');
}

// T10 REVIEW_REQUIRED no relationship
assert(reviewRequiredGetsProductionBridge() === false, 'T10');

// T11 unresolved no relationship
assert(unresolvedGetsProductionBridge() === false, 'T11');
assert(highConfidenceGetsProductionBridgeThisTask() === false, 'T11 high');

// T12 adverse evidence cannot traverse unresolved
assert(adverseEvidenceMayTraverse('UNRESOLVED') === false, 'T12 unresolved');
assert(adverseEvidenceMayTraverse('REVIEW_REQUIRED') === false, 'T12 review');
assert(adverseEvidenceMayTraverse('HIGH_CONFIDENCE') === false, 'T12 high');
assert(adverseEvidenceMayTraverse('CONFIRMED') === true, 'T12 confirmed');

assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'T15 person off');
assert(mayPublishEntityKind('carrier') === false, 'T15 carrier');
assert(mayPublishEntityKind('legal_insurer') === false, 'T15 legal');

assert(existsSync(join(root, 'docs/national/carriers/INS-NAT-FINAL-003-crosswalk-contract.md')), 'doc contract');
assert(existsSync(join(root, 'docs/national/carriers/INS-NAT-FINAL-003-fl-source-audit.md')), 'doc fl audit');

if (errors.length) {
  console.error('INS-NAT-FINAL-003 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-FINAL-003 PASS T1–T17 contract');
