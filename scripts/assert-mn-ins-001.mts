import assert from 'node:assert/strict';
import { buildMinnesotaInsuranceJsonLd, mnJsonLdHasForbiddenRatings } from '../lib/minnesota-intelligence/jsonld';
import { CANONICAL_MN_SNAPSHOT_FINGERPRINT } from '../lib/minnesota-intelligence/publication';
import { MINNESOTA_SNAPSHOT, assertMinnesotaInsurance, minnesotaSnapshotFingerprint } from '../lib/minnesota-intelligence/snapshot';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';

assert.equal(minnesotaSnapshotFingerprint(), CANONICAL_MN_SNAPSHOT_FINGERPRINT);
assertMinnesotaInsurance();
assert.equal(mnJsonLdHasForbiddenRatings(buildMinnesotaInsuranceJsonLd()), false);
assert.equal(MINNESOTA_SNAPSHOT.expansion_ledger.GRAPH_WRITES, 0);
assert.equal(MINNESOTA_SNAPSHOT.expansion_ledger.CLAIM_ELIGIBILITY_BROADENED, false);

function cover(q: string) {
  const parsed = interpretInsuranceAskQuery(q, 1);
  return parsed.query.coverageState;
}

assert.equal(cover('insurance company Minnesota'), 'NOT_ACQUIRED');
assert.equal(cover('insurance producer Minnesota'), 'NOT_ACQUIRED');
assert.equal(cover('insurance agency Minnesota'), 'NOT_ACQUIRED');
assert.equal(cover('Minnesota insurance enforcement'), 'KNOWN');
assert.equal(cover('Minnesota insurance financial examination'), 'KNOWN');
assert.equal(cover('Minnesota SERFF filing'), 'KNOWN');
assert.equal(cover('insurance complaint Minnesota'), 'KNOWN');
assert.equal(cover('best insurance company Minnesota'), 'UNSUPPORTED');
assert.equal(cover('insurance agent Minneapolis'), 'UNSUPPORTED');
assert.equal(cover('insurer Rochester Minnesota'), 'UNSUPPORTED');
assert.equal(cover('123456'), undefined);
const naic = interpretInsuranceAskQuery('NAIC 16862 Minnesota', 1);
assert.equal(naic.query.identifier?.type, 'naic_company_code');
assert.ok(naic.interpretation.some((line) => line.label === 'Minnesota Commerce'));
const npn = interpretInsuranceAskQuery('NPN 10391484 Minnesota', 1);
assert.equal(npn.query.identifier?.type, 'npn');
assert.ok(npn.interpretation.some((line) => line.label === 'Minnesota Commerce'));

console.log('assert:mn-ins-001 PASS');
