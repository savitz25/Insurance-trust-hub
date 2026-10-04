import assert from 'node:assert/strict';
import { test } from 'node:test';
import { productionParentGate, releaseAdmits, type ReleaseEnv } from './production-gate';

const ASFIN = 'asfin-llc-l106287';
const IMT = 'imt-services-llc-1365714';
const SANDOVAL = 'j-a-sandoval-llc-19068455';
const CANARY_LIST = `${ASFIN},${IMT},${SANDOVAL}`;

const CANARY_ENV: ReleaseEnv = {
  NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED: '1',
  MTH_INSURANCE_PARENT_SAVE_MODE: 'production',
  NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: CANARY_LIST,
};

test('A absent flags stay off and admit nobody', () => {
  const gate = productionParentGate({});
  assert.equal(gate.enabled, false);
  assert.equal(gate.parentSync, 'off');
  assert.equal(gate.canary, false);
  assert.equal(gate.broad, false);
  assert.deepEqual([...gate.slugs], []);
  assert.equal(releaseAdmits(ASFIN, gate), false);
  assert.equal(releaseAdmits(IMT, gate), false);
  assert.equal(releaseAdmits(SANDOVAL, gate), false);
});

test('B three-slug production config is canary and not broad', () => {
  const gate = productionParentGate(CANARY_ENV);
  assert.equal(gate.enabled, true);
  assert.equal(gate.parentSync, 'production');
  assert.equal(gate.canary, true);
  assert.equal(gate.broad, false);
  assert.deepEqual([...gate.slugs], [ASFIN, IMT, SANDOVAL]);
});

test('C the three initial canaries are admitted by slug only', () => {
  const gate = productionParentGate(CANARY_ENV);
  assert.equal(releaseAdmits(ASFIN, gate), true);
  assert.equal(releaseAdmits(IMT, gate), true);
  assert.equal(releaseAdmits(SANDOVAL, gate), true);
});

test('D an unrelated provider slug is denied', () => {
  const gate = productionParentGate(CANARY_ENV);
  assert.equal(releaseAdmits('summit-insurance-group', gate), false);
  assert.equal(releaseAdmits('other-agency-1', gate), false);
  assert.equal(releaseAdmits('ASFIN-LLC-L106287', gate), false);
});

test('E an empty slug list with production enabled is broad', () => {
  for (const slugs of ['', '   ', undefined]) {
    const gate = productionParentGate({
      NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED: '1',
      MTH_INSURANCE_PARENT_SAVE_MODE: 'production',
      NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: slugs,
    });
    assert.equal(gate.parentSync, 'production');
    assert.equal(gate.canary, false);
    assert.equal(gate.broad, true);
    assert.equal(releaseAdmits('other-agency-1', gate), true);
    assert.equal(releaseAdmits('ASFIN LLC', gate), false);
  }
});

test('F malformed config fails closed', () => {
  const cases: ReleaseEnv[] = [
    { NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED: '1', MTH_INSURANCE_PARENT_SAVE_MODE: 'preview', NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: ASFIN },
    { NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED: '1', MTH_INSURANCE_PARENT_SAVE_MODE: 'Production', NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: ASFIN },
    { NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED: 'true', MTH_INSURANCE_PARENT_SAVE_MODE: 'production', NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: ASFIN },
    { NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED: '1', MTH_INSURANCE_PARENT_SAVE_MODE: 'production', NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: 'asfin llc' },
    { NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED: '1', MTH_INSURANCE_PARENT_SAVE_MODE: 'production', NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: `${ASFIN},${ASFIN}` },
    { NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED: '1', MTH_INSURANCE_PARENT_SAVE_MODE: 'production', NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: '../asfin-llc-l106287' },
    { NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED: '1', NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: CANARY_LIST },
    { MTH_INSURANCE_PARENT_SAVE_MODE: 'production', NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: CANARY_LIST },
  ];
  for (const env of cases) {
    const gate = productionParentGate(env);
    assert.equal(gate.enabled, false, JSON.stringify(env));
    assert.equal(gate.parentSync, 'off', JSON.stringify(env));
    assert.equal(gate.canary, false);
    assert.equal(gate.broad, false);
    assert.equal(releaseAdmits(ASFIN, gate), false);
  }
});
