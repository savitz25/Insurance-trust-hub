import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import {
  ASSERTION_HEADER,
  INSURANCE_PRODUCTION_PINS,
  verifyInsuranceAssertion,
  type NonceStore,
} from './insurance-assertion';
import { buildBlockedTopLevelHandoff, recoverParentPending, submitParentHandoff } from './handoff-session';
import { insuranceManifest, manifestDigest } from './manifest';
import { resolveInsuranceProviderIdentity } from './parent-adapter';
import {
  acceptParentAcknowledgement,
  productionParentTransport,
  stageSignedParentHandoff,
} from './signed-handoff';

const BROWSER = 'a'.repeat(43);
const FL = [{ state: 'FL', license_number: 'L106287', status: 'verified' as const }];

function key() {
  const { privateKey } = generateKeyPairSync('ed25519');
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  return { kid: 'insurance-test', pem: typeof pem === 'string' ? pem : pem.toString() };
}

function nonces(): NonceStore {
  const seen = new Set<string>();
  return {
    async claim(nonce) {
      if (seen.has(nonce)) return false;
      seen.add(nonce);
      return true;
    },
  };
}

test('an exact published provider stages a signed identity and does not transmit', async () => {
  const signingKey = key();
  const resolution = resolveInsuranceProviderIdentity({
    publishedId: '7658cca7-1584-4bc4-a2fa-416c50b036ab',
    publishedSlug: 'asfin-llc-l106287',
    licenses: FL,
    statesLicensed: ['FL'],
  });
  const staged = stageSignedParentHandoff({
    resolution,
    intent: 'save',
    pageOpen: true,
    key: signingKey,
    now: 1_700_000_000_000,
    browser: BROWSER,
  });
  assert.equal(staged.ok, true);
  if (!staged.ok) return;
  assert.equal(staged.pending.sourceIdentifier, 'L106287');
  assert.equal(staged.pending.jurisdiction, 'FL');
  assert.equal(staged.pending.identifierNamespace, 'insurance.state_license');
  assert.equal(staged.pending.canonicalReturnPath, '/providers/asfin-llc-l106287');
  assert.equal(staged.pending.transmitted, false);
  assert.equal(staged.pending.createsWatch, false);
  assert.equal(staged.pending.acknowledgement, 'Saved on this device');
  assert.equal(JSON.stringify(staged.pending).includes('7658cca7'), false);
  assert.equal(typeof staged.pending.assertion, 'string');

  const manifest = insuranceManifest(resolution as Extract<typeof resolution, { ok: true }>);
  assert.equal(manifestDigest(manifest), staged.pending.manifestDigest);
  assert.deepEqual(Object.keys(manifest.selected[0].profile).sort(), [
    'canonicalReturnPath',
    'hub',
    'identifierNamespace',
    'jurisdiction',
    'profileClass',
    'sourceIdentifier',
  ]);
  const body = Buffer.from(JSON.stringify(manifest));
  const target = `${INSURANCE_PRODUCTION_PINS.parentOrigin}/api/my-trusthub/profile-save`;
  const request = new Request(target, {
    method: 'POST',
    headers: { [ASSERTION_HEADER]: staged.pending.assertion ?? '' },
  });
  const claims = await verifyInsuranceAssertion(
    request,
    body,
    signingKey,
    'insurance',
    'transfer:stage',
    nonces(),
    1_700_000_000_000,
  );
  assert.equal(claims.scope, 'transfer:stage');
  assert.equal(claims.insurance_origin, INSURANCE_PRODUCTION_PINS.insuranceOrigin);
  await assert.rejects(
    verifyInsuranceAssertion(
      request,
      Buffer.from(JSON.stringify({ ...manifest, audience: 'browser' })),
      signingKey,
      'insurance',
      'transfer:stage',
      nonces(),
      1_700_000_000_000,
    ),
    /unauthorized/,
  );

  const transport = productionParentTransport();
  assert.equal(transport.transmitted, false);
  assert.equal(transport.reason, 'PRODUCTION_PARENT_SYNC_OFF');
  const ack = acceptParentAcknowledgement();
  assert.equal(ack.accepted, false);
});

test('fallback, missing, ambiguous, closed page, and tamper do not stage a parent identity', () => {
  const fallback = stageSignedParentHandoff({
    resolution: resolveInsuranceProviderIdentity({
      publishedId: 'fallback-1',
      publishedSlug: 'summit-insurance-group',
      licenses: FL,
    }),
    intent: 'save',
    pageOpen: true,
    key: key(),
  });
  assert.equal(fallback.ok, false);
  if (fallback.ok) return;
  assert.equal(fallback.reason, 'synthetic');

  const missing = stageSignedParentHandoff({
    resolution: resolveInsuranceProviderIdentity({
      publishedSlug: 'asfin-llc-l106287',
      licenses: [],
    }),
    intent: 'save',
    pageOpen: true,
    key: key(),
  });
  assert.equal(missing.ok, false);

  const ambiguous = stageSignedParentHandoff({
    resolution: resolveInsuranceProviderIdentity({
      publishedSlug: 'asfin-llc-l106287',
      licenses: [...FL, { state: 'OH', license_number: '19068455', status: 'verified' }],
    }),
    intent: 'save',
    pageOpen: true,
    key: key(),
  });
  assert.equal(ambiguous.ok, false);
  if (ambiguous.ok) return;
  assert.equal(ambiguous.reason, 'ambiguous');

  const closed = stageSignedParentHandoff({
    resolution: resolveInsuranceProviderIdentity({
      publishedSlug: 'asfin-llc-l106287',
      licenses: FL,
      statesLicensed: ['FL'],
    }),
    intent: 'save',
    pageOpen: false,
    key: key(),
  });
  assert.equal(closed.ok, false);
  if (closed.ok) return;
  assert.equal(closed.reason, 'page_closed');

  const tampered = stageSignedParentHandoff({
    resolution: resolveInsuranceProviderIdentity({
      publishedSlug: 'asfin-llc-l106287',
      licenses: FL,
      claimedReturnPath: '/providers/asfin-llc-l106287',
    }),
    intent: 'unsave',
    pageOpen: true,
    key: key(),
  });
  assert.equal(tampered.ok, false);
  if (tampered.ok) return;
  assert.equal(tampered.reason, 'tampered');
});

test('a hidden or abandoned handoff is not submitted', () => {
  const resolution = resolveInsuranceProviderIdentity({
    publishedSlug: 'imt-services-llc-1365714',
    licenses: [{ state: 'TX', license_number: '1365714', status: 'verified' }],
    statesLicensed: ['TX'],
  });
  const staged = stageSignedParentHandoff({
    resolution,
    intent: 'save',
    pageOpen: true,
    key: key(),
    now: 1_700_000_000_000,
    browser: BROWSER,
  });
  assert.equal(staged.ok, true);
  if (!staged.ok) return;
  assert.equal(
    recoverParentPending({
      pending: staged.pending,
      now: 1_700_000_000_000,
      pageOpen: false,
      locallySaved: true,
    }),
    'abandon',
  );
  assert.equal(
    recoverParentPending({
      pending: staged.pending,
      now: staged.pending.expiresAt + 1,
      pageOpen: true,
      locallySaved: true,
    }),
    'abandon',
  );
  assert.equal(
    recoverParentPending({
      pending: staged.pending,
      now: 1_700_000_000_000,
      pageOpen: true,
      locallySaved: false,
    }),
    'abandon',
  );
  assert.equal(
    recoverParentPending({
      pending: { ...staged.pending, intent: 'unsave' },
      now: 1_700_000_000_000,
      pageOpen: true,
      locallySaved: false,
    }),
    'hold',
  );
  const form = buildBlockedTopLevelHandoff('save');
  assert.equal(form.method, 'POST');
  assert.equal(form.target, '_top');
  assert.equal(form.submitted, false);
  assert.equal(form.fields.hub, 'insurance');
  assert.equal(form.fields.profileClass, 'insurance_provider');
  assert.equal(submitParentHandoff('save').submitted, false);
  assert.equal(submitParentHandoff('unsave').reason, 'PRODUCTION_PARENT_SYNC_OFF');
});
