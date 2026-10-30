import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  nfcReleasePreconditionAllowsSwitch,
  type NfcReleasePrecondition,
} from './ins-nfc-release-precondition';

const root = process.cwd();

function approved(): NfcReleasePrecondition {
  return {
    computedFieldExistsOnTarget: true,
    privilegesReviewedBySupabaseSecurity: true,
    targetPostgrestOrderingSucceeded: true,
    applicationSwitchApproved: true,
    targetOrderHttpStatus: 200,
    securityReviewRef: 'supabase-security-rereview',
    vercelPreviewIsRuntimeCertification: false,
    prDescriptionIsRuntimeCertification: false,
    githubMergeableIsApproval: false,
    disposableProofIsTargetCertification: false,
  };
}

test('the committed release precondition does not approve the switch', () => {
  const committed = JSON.parse(
    readFileSync(join(root, 'lib/dfs/ins-nfc-release-precondition.json'), 'utf8')
  ) as NfcReleasePrecondition;
  assert.equal(nfcReleasePreconditionAllowsSwitch(committed), false);
  assert.equal(committed.computedFieldExistsOnTarget, false);
  assert.equal(committed.privilegesReviewedBySupabaseSecurity, false);
  assert.equal(committed.targetPostgrestOrderingSucceeded, false);
  assert.equal(committed.applicationSwitchApproved, false);
  assert.equal(committed.targetOrderHttpStatus, null);
  assert.equal(committed.securityReviewRef, '');
  assert.equal(committed.vercelPreviewIsRuntimeCertification, false);
  assert.equal(committed.prDescriptionIsRuntimeCertification, false);
  assert.equal(committed.githubMergeableIsApproval, false);
  assert.equal(committed.disposableProofIsTargetCertification, false);
});

test('approval requires the field, the privilege review, and target ordering', () => {
  assert.equal(nfcReleasePreconditionAllowsSwitch(approved()), true);
  for (const key of [
    'computedFieldExistsOnTarget',
    'privilegesReviewedBySupabaseSecurity',
    'targetPostgrestOrderingSucceeded',
    'applicationSwitchApproved',
  ] as const) {
    const blocked = approved();
    blocked[key] = false;
    assert.equal(nfcReleasePreconditionAllowsSwitch(blocked), false, key);
  }
  const wrongStatus = approved();
  wrongStatus.targetOrderHttpStatus = 400;
  assert.equal(nfcReleasePreconditionAllowsSwitch(wrongStatus), false);
  const missingReview = approved();
  missingReview.securityReviewRef = '   ';
  assert.equal(nfcReleasePreconditionAllowsSwitch(missingReview), false);
});

test('a description, a skipped preview, mergeable, and the disposable proof are not certification', () => {
  for (const key of [
    'vercelPreviewIsRuntimeCertification',
    'prDescriptionIsRuntimeCertification',
    'githubMergeableIsApproval',
    'disposableProofIsTargetCertification',
  ] as const) {
    const blocked = approved();
    blocked[key] = true;
    assert.equal(nfcReleasePreconditionAllowsSwitch(blocked), false, key);
  }
});
