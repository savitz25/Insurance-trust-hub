import assert from 'node:assert/strict';
import { createHash, createPrivateKey, generateKeyPairSync, randomBytes } from 'node:crypto';
import { test } from 'node:test';
import {
  ASSERTION_HEADER,
  INSURANCE_PRODUCTION_PINS,
  signInsuranceAssertion,
  verifyInsuranceAssertion,
  type AssertionKey,
  type NonceStore,
} from './insurance-assertion';
import { browserHandoffIntent, handoffForm, markHandoffSent, readHandoff, rememberHandoff, resumeDecision, type TicketStore } from './handoff-form';
import { insuranceManifest, manifestDigest, TRANSFER_VERSION_V3 } from './manifest';
import {
  IDENTIFIER_NAMESPACE,
  INSURANCE_PARENT_SYNC,
  PROFILE_CLASS_CONTRACTS,
  parentSaveReady,
  resolveInsuranceProviderIdentity,
  transmitParentSync,
  type IdentityResolution,
  type PendingParentSync,
} from './parent-adapter';
import { productionParentGate, type ReleaseEnv } from './production-gate';
import { handleInsuranceSource } from './source-callback';
import { productionHandoffDeps, stageProductionHandoff, type ParentCall } from './signed-handoff';

const ASFIN = 'asfin-llc-l106287';
const IMT = 'imt-services-llc-1365714';
const SANDOVAL = 'j-a-sandoval-llc-19068455';
const CANARY_ENV: ReleaseEnv = {
  NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED: '1',
  MTH_INSURANCE_PARENT_SAVE_MODE: 'production',
  NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: `${ASFIN},${IMT},${SANDOVAL}`,
};
const NOW = 1_700_000_000_000;
const BROWSER = 'b'.repeat(43);
const PROFILE_KEYS = ['hub', 'profileClass', 'identifierNamespace', 'sourceIdentifier', 'jurisdiction', 'canonicalReturnPath'] as const;
const STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM',
  'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PARENT_API = 'https://www.asktrusthub.com/api/my-trusthub/profile-save';
const SOURCE_URL = 'https://www.insurancetrusthub.com/api/my-trusthub/profile-save/source';

const realFetch = globalThis.fetch;
test.before(() => {
  globalThis.fetch = async () => {
    throw new Error('live Ask fetch is not allowed in this test');
  };
});
test.after(() => {
  globalThis.fetch = realFetch;
});

function pem(key: ReturnType<typeof generateKeyPairSync>['privateKey'] | ReturnType<typeof generateKeyPairSync>['publicKey'], kind: 'pkcs8' | 'spki'): string {
  const exported = key.export({ type: kind, format: 'pem' });
  return typeof exported === 'string' ? exported : exported.toString();
}

function pair(kid: string) {
  const generated = generateKeyPairSync('ed25519');
  return {
    privateKey: { kid, pem: pem(generated.privateKey, 'pkcs8') },
    publicKey: { kid, pem: pem(generated.publicKey, 'spki') },
  };
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

function memoryStore(): TicketStore & { dump(): Map<string, string> } {
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => { memory.set(key, value); },
    removeItem: (key) => { memory.delete(key); },
    dump: () => memory,
  };
}

type ClosedProfile = {
  hub: 'insurance';
  profileClass: 'insurance_provider';
  identifierNamespace: 'insurance.state_license';
  sourceIdentifier: string;
  jurisdiction: string;
  canonicalReturnPath: string;
};

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return record(value) && Object.keys(value).sort().join() === [...keys].sort().join();
}

function specialistId(jurisdiction: string, license: string): string | null {
  if (!STATES.has(jurisdiction) || !/^[A-Z0-9]{3,32}$/.test(license) || !/[0-9]/.test(license)) return null;
  return `state-license:${jurisdiction}:${license}`;
}

/** Same closed-manifest acceptance Ask SHA 14f50a uses. providers.id is not a field. */
function askAcceptsClosedManifest(value: unknown): value is { selected: [{ localItemId: string; digest: string; profile: ClosedProfile }]; returnTask: { canonicalSlug: string; canonicalReturnPath: string; profile: ClosedProfile } } {
  if (!exact(value, ['version', 'sourceHub', 'audience', 'selected', 'returnTask'])) return false;
  if (value.version !== TRANSFER_VERSION_V3 || value.sourceHub !== 'insurance' || value.audience !== 'ask') return false;
  if (!Array.isArray(value.selected) || value.selected.length !== 1) return false;
  const item: unknown = value.selected[0];
  if (!exact(item, ['localItemId', 'revision', 'digest', 'profile']) || item.revision !== '1') return false;
  if (!exact(item.profile, PROFILE_KEYS) || !exact(value.returnTask, ['kind', 'hub', 'canonicalSlug', 'profile', 'canonicalReturnPath'])) return false;
  if (!exact(value.returnTask.profile, PROFILE_KEYS)) return false;
  const profile = item.profile as Record<string, unknown>;
  const task = value.returnTask;
  const taskProfile = task.profile as Record<string, unknown>;
  if (profile.hub !== 'insurance' || profile.profileClass !== 'insurance_provider') return false;
  if (profile.identifierNamespace !== 'insurance.state_license') return false;
  if (typeof profile.sourceIdentifier !== 'string' || typeof profile.jurisdiction !== 'string' || typeof profile.canonicalReturnPath !== 'string') return false;
  if (UUID.test(profile.sourceIdentifier)) return false;
  const nativeId = specialistId(profile.jurisdiction, profile.sourceIdentifier);
  const slug = profile.canonicalReturnPath.startsWith('/providers/') ? profile.canonicalReturnPath.slice('/providers/'.length) : '';
  if (!nativeId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return false;
  if (item.localItemId !== slug || typeof item.digest !== 'string') return false;
  const digest = createHash('sha256').update(JSON.stringify(PROFILE_KEYS.map((key) => profile[key]))).digest('hex');
  if (item.digest !== digest) return false;
  if (task.kind !== 'profile' || task.hub !== 'insurance' || task.canonicalSlug !== slug) return false;
  if (task.canonicalReturnPath !== profile.canonicalReturnPath) return false;
  if (PROFILE_KEYS.some((key) => taskProfile[key] !== profile[key])) return false;
  return true;
}

function askHarness(verifyKey: AssertionKey, now: number) {
  const saved = new Map<string, { continuationRef: string; transferRef: string }>();
  const calls: Array<{ body: string; assertion: string; guestDigest: string }> = [];
  const seen = nonces();
  return {
    saved,
    calls,
    parent: async (call: ParentCall) => {
      const bytes = Buffer.from(call.body);
      try {
        const request = new Request(PARENT_API, {
          method: 'POST',
          headers: { [ASSERTION_HEADER]: call.assertion, 'content-type': 'application/json' },
          body: call.body,
        });
        await verifyInsuranceAssertion(request, bytes, verifyKey, 'insurance', 'transfer:stage', seen, now);
        const parsed: unknown = JSON.parse(call.body);
        if (!askAcceptsClosedManifest(parsed)) return { ok: false as const };
        const profile = parsed.selected[0].profile;
        const nativeId = specialistId(profile.jurisdiction, profile.sourceIdentifier);
        if (!nativeId) return { ok: false as const };
        const guest = {
          version: TRANSFER_VERSION_V3,
          sourceHub: 'insurance',
          audience: 'ask',
          selected: [{
            localItemId: parsed.selected[0].localItemId,
            revision: '1',
            digest: parsed.selected[0].digest,
            profile: { hub: 'insurance', nativeId, profileClass: 'insurance_provider' },
          }],
          returnTask: {
            kind: 'profile',
            hub: 'insurance',
            canonicalSlug: parsed.returnTask.canonicalSlug,
            profile: { hub: 'insurance', nativeId, profileClass: 'insurance_provider' },
            returnPath: parsed.returnTask.canonicalReturnPath,
          },
        };
        const guestDigest = createHash('sha256').update(JSON.stringify(guest)).digest('hex');
        let row = saved.get(nativeId);
        if (!row) {
          row = {
            continuationRef: randomBytes(32).toString('base64url'),
            transferRef: randomBytes(32).toString('base64url'),
          };
          saved.set(nativeId, row);
        }
        calls.push({ body: call.body, assertion: call.assertion, guestDigest });
        return {
          ok: true as const,
          operation: 'prepareGuestProfileTransfer',
          result: {
            transferRef: row.transferRef,
            manifestDigest: guestDigest,
            continuationRef: row.continuationRef,
            expiresAt: now + 60_000,
          },
        };
      } catch {
        return { ok: false as const };
      }
    },
  };
}

function resolved(slug: string, state: string, license: string, id = '7658cca7-1584-4bc4-a2fa-416c50b036ab'): IdentityResolution {
  return resolveInsuranceProviderIdentity({
    publishedId: id,
    publishedSlug: slug,
    licenses: [{ state, license_number: license, status: 'verified' }],
    statesLicensed: [state],
  });
}

function signingEnv(insurance: ReturnType<typeof pair>, ask: ReturnType<typeof pair>): NodeJS.ProcessEnv {
  const env = {
    MY_TRUSTHUB_V23_INSURANCE_KEY_ID: insurance.privateKey.kid,
    MY_TRUSTHUB_V23_INSURANCE_SIGNING_PRIVATE_KEY_PEM: insurance.privateKey.pem,
    MY_TRUSTHUB_V23_ASK_KEY_ID: ask.publicKey.kid,
    MY_TRUSTHUB_V23_ASK_VERIFY_PUBLIC_KEY_PEM: ask.publicKey.pem,
    MY_TRUSTHUB_V23_PARENT_ORIGIN: INSURANCE_PRODUCTION_PINS.parentOrigin,
  };
  return env as unknown as NodeJS.ProcessEnv;
}

test('G an admitted production profile loads a non-null Ed25519 signing key', () => {
  const insurance = pair('insurance-prod');
  const ask = pair('ask-prod');
  const deps = productionHandoffDeps(signingEnv(insurance, ask));
  assert.ok(deps.key);
  assert.equal(deps.key?.kid, 'insurance-prod');
  assert.notEqual(deps.key?.pem, null);
  assert.equal(createPrivateKey(deps.key!.pem).asymmetricKeyType, 'ed25519');
  assert.equal(typeof deps.parent, 'function');
  const gate = productionParentGate(CANARY_ENV);
  assert.equal(gate.canary, true);
  assert.equal(gate.broad, false);
});

test('H a missing signing key fails closed and does not call Ask', async () => {
  const insurance = pair('insurance-prod');
  const ask = pair('ask-prod');
  const full = signingEnv(insurance, ask);
  for (const key of Object.keys(full)) {
    const env = { ...full };
    delete env[key];
    const deps = productionHandoffDeps(env);
    assert.equal(deps.key, undefined, key);
    assert.equal(deps.parent, undefined, key);
  }
  const mismatched = productionHandoffDeps({
    ...full,
    MY_TRUSTHUB_V23_ASK_KEY_ID: insurance.publicKey.kid,
    MY_TRUSTHUB_V23_ASK_VERIFY_PUBLIC_KEY_PEM: insurance.publicKey.pem,
  });
  assert.equal(mismatched.key, undefined);
  const wrongOrigin = productionHandoffDeps({ ...full, MY_TRUSTHUB_V23_PARENT_ORIGIN: 'https://asktrusthub.com' });
  assert.equal(wrongOrigin.key, undefined);
  let called = false;
  const staged = await stageProductionHandoff({
    resolution: resolved(ASFIN, 'FL', 'L106287'),
    intent: 'save',
    pageOpen: true,
    gate: productionParentGate(CANARY_ENV),
    key: null,
    parent: async () => { called = true; return { ok: false }; },
    now: NOW,
    browser: BROWSER,
  });
  assert.equal(staged.state, 'local_only');
  if (staged.state === 'local_only') assert.equal(staged.reason, 'unsigned');
  assert.equal(staged.watchCreated, false);
  assert.equal(called, false);
});

test('I J K L the signed closed manifest reaches the Ask handler and repeated Save is one identity', async () => {
  const insurance = pair('insurance-prod');
  const harness = askHarness(insurance.publicKey, NOW);
  const gate = productionParentGate(CANARY_ENV);
  const resolution = resolved(ASFIN, 'FL', 'L106287');
  assert.equal(resolution.ok, true);
  const deps = {
    resolution,
    pageOpen: true,
    gate,
    key: insurance.privateKey,
    parent: harness.parent,
    now: NOW,
    browser: BROWSER,
  };
  const first = await stageProductionHandoff({ ...deps, intent: 'save' });
  const second = await stageProductionHandoff({ ...deps, intent: 'save' });
  const removed = await stageProductionHandoff({ ...deps, intent: 'unsave' });
  assert.equal(first.state, 'continue');
  assert.equal(second.state, 'continue');
  assert.equal(removed.state, 'continue');
  if (first.state !== 'continue' || second.state !== 'continue' || removed.state !== 'continue') return;
  assert.equal(first.target, 'https://www.asktrusthub.com/my/profile-save');
  assert.equal(first.intent, 'save_signin');
  assert.equal(removed.intent, 'unsave');
  assert.equal(first.watchCreated, false);
  assert.equal(removed.watchCreated, false);
  assert.equal(first.continuationRef, second.continuationRef);
  assert.equal(harness.saved.size, 1);
  assert.equal(harness.calls.length, 3);
  const posted = JSON.parse(harness.calls[0]!.body) as { selected: [{ profile: ClosedProfile }] };
  assert.equal(askAcceptsClosedManifest(posted), true);
  assert.equal(posted.selected[0].profile.hub, 'insurance');
  assert.equal(posted.selected[0].profile.profileClass, 'insurance_provider');
  assert.equal(posted.selected[0].profile.identifierNamespace, 'insurance.state_license');
  assert.equal(posted.selected[0].profile.sourceIdentifier, 'L106287');
  assert.equal(posted.selected[0].profile.jurisdiction, 'FL');
  assert.equal(posted.selected[0].profile.canonicalReturnPath, '/providers/asfin-llc-l106287');
  assert.equal(harness.calls[0]!.body.includes('7658cca7'), false);
  assert.equal(harness.calls[0]!.body.includes('watch'), false);
  const insuranceDigest = manifestDigest(insuranceManifest(resolution as Extract<IdentityResolution, { ok: true }>));
  assert.notEqual(harness.calls[0]!.guestDigest, insuranceDigest);
  const form = handoffForm(first.target, first.continuationRef, first.intent);
  assert.ok(form);
  assert.equal(form?.action, 'https://www.asktrusthub.com/my/profile-save');
  assert.deepEqual(form ? Object.keys(form).sort() : [], ['action', 'continuationRef', 'intent']);
  assert.equal(form?.intent, 'save_signin');
});

test('C the three canaries post their exact state licenses', async () => {
  const insurance = pair('insurance-prod');
  const gate = productionParentGate(CANARY_ENV);
  const rows = [
    [ASFIN, 'FL', 'L106287'],
    [IMT, 'TX', '1365714'],
    [SANDOVAL, 'OH', '19068455'],
  ] as const;
  for (const [slug, state, license] of rows) {
    const harness = askHarness(insurance.publicKey, NOW);
    const staged = await stageProductionHandoff({
      resolution: resolved(slug, state, license),
      intent: 'save',
      pageOpen: true,
      gate,
      key: insurance.privateKey,
      parent: harness.parent,
      now: NOW,
      browser: BROWSER,
    });
    assert.equal(staged.state, 'continue', slug);
    const profile = JSON.parse(harness.calls[0]!.body).selected[0].profile as ClosedProfile;
    assert.equal(profile.sourceIdentifier, license);
    assert.equal(profile.jurisdiction, state);
    assert.equal(profile.canonicalReturnPath, `/providers/${slug}`);
    assert.equal(profile.identifierNamespace, IDENTIFIER_NAMESPACE);
  }
});

test('D an unrelated provider is not posted', async () => {
  const insurance = pair('insurance-prod');
  let called = false;
  const staged = await stageProductionHandoff({
    resolution: resolved('other-agency-1', 'GA', '123456'),
    intent: 'save',
    pageOpen: true,
    gate: productionParentGate(CANARY_ENV),
    key: insurance.privateKey,
    parent: async () => { called = true; return { ok: false }; },
    now: NOW,
    browser: BROWSER,
  });
  assert.equal(staged.state, 'local_only');
  if (staged.state === 'local_only') assert.equal(staged.reason, 'sync_off');
  assert.equal(called, false);
});

test('E broad mode can stage a provider outside the canary list', async () => {
  const insurance = pair('insurance-prod');
  const harness = askHarness(insurance.publicKey, NOW);
  const gate = productionParentGate({
    NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED: '1',
    MTH_INSURANCE_PARENT_SAVE_MODE: 'production',
    NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: '',
  });
  assert.equal(gate.broad, true);
  const staged = await stageProductionHandoff({
    resolution: resolved('other-agency-1', 'GA', '123456'),
    intent: 'save',
    pageOpen: true,
    gate,
    key: insurance.privateKey,
    parent: harness.parent,
    now: NOW,
    browser: BROWSER,
  });
  assert.equal(staged.state, 'continue');
  const profile = JSON.parse(harness.calls[0]!.body).selected[0].profile as ClosedProfile;
  assert.equal(profile.jurisdiction, 'GA');
  assert.equal(profile.sourceIdentifier, '123456');
});

test('the Ask handler rejects a closed manifest that is not the signed body', async () => {
  const insurance = pair('insurance-prod');
  const harness = askHarness(insurance.publicKey, NOW);
  const resolution = resolved(ASFIN, 'FL', 'L106287');
  assert.equal(resolution.ok, true);
  const manifest = insuranceManifest(resolution as Extract<IdentityResolution, { ok: true }>);
  const mutated = { ...manifest, audience: 'browser' };
  const body = JSON.stringify(mutated);
  const assertion = signInsuranceAssertion(insurance.privateKey, 'insurance', PARENT_API, 'transfer:stage', Buffer.from(body), BROWSER, null, null, NOW);
  const rejected = await harness.parent({ body, assertion });
  assert.equal(rejected.ok, false);
  assert.equal(harness.saved.size, 0);
});

test('J K a signed Ask acknowledgement reports Save and Unsave, and Watch is refused', async () => {
  const ask = pair('ask-ack');
  const seen = nonces();
  async function acknowledge(outcome: string, extra: Record<string, unknown> = {}) {
    const receipt = {
      localCopy: 'keep',
      parent: { outcome },
      requestKey: `${BROWSER}:request`,
      item: { profile: { hub: 'insurance', nativeId: 'state-license:FL:L106287', profileClass: 'insurance_provider' } },
      ...extra,
    };
    const body = JSON.stringify({ action: 'acknowledge', continuationRef: 'c'.repeat(43), receipts: [receipt] });
    const assertion = signInsuranceAssertion(ask.privateKey, 'ask', SOURCE_URL, 'source:ack', Buffer.from(body), BROWSER, null, null, NOW);
    return handleInsuranceSource(new Request(SOURCE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [ASSERTION_HEADER]: assertion },
      body,
    }), { key: ask.publicKey, nonces: seen, now: () => NOW });
  }
  const saved = await acknowledge('saved');
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), { ok: true, result: { acknowledged: 'save', watchCreated: false } });
  const again = await acknowledge('already_saved');
  assert.equal(again.status, 200);
  assert.equal((await again.json()).result.acknowledged, 'save');
  const removed = await acknowledge('local_only');
  assert.equal(removed.status, 200);
  assert.deepEqual(await removed.json(), { ok: true, result: { acknowledged: 'unsave', watchCreated: false } });
  const watch = await acknowledge('saved', { watch: true });
  assert.equal(watch.status, 403);
  const watchCreated = await acknowledge('saved', { watchCreated: true });
  assert.equal(watchCreated.status, 403);
  const missing = await handleInsuranceSource(new Request(SOURCE_URL, { method: 'POST' }), { key: null, nonces: seen, now: () => NOW });
  assert.equal(missing.status, 503);
});

test('N signed-out Save continues as save_signin and resumes without a second click', () => {
  assert.equal(browserHandoffIntent('save'), 'save_signin');
  assert.equal(browserHandoffIntent('unsave'), 'unsave');
  const store = memoryStore();
  const ticket = {
    slug: ASFIN,
    target: 'https://www.asktrusthub.com/my/profile-save',
    continuationRef: 'c'.repeat(43),
    intent: browserHandoffIntent('save'),
    phase: 'staged' as const,
    expiresAt: NOW + 60_000,
  };
  rememberHandoff(store, ticket);
  const pending = readHandoff(store, ASFIN, NOW);
  assert.equal(pending?.intent, 'save_signin');
  assert.equal(resumeDecision(pending, 'visible'), 'submit');
  assert.equal(handoffForm(ticket.target, ticket.continuationRef, 'watch'), null);
});

test('M an abandoned handoff is held while hidden, submitted once, and kept after pagehide', () => {
  const store = memoryStore();
  const ticket = {
    slug: IMT,
    target: 'https://www.asktrusthub.com/my/profile-save',
    continuationRef: 'd'.repeat(43),
    intent: 'save_signin' as const,
    phase: 'staged' as const,
    expiresAt: NOW + 60_000,
  };
  rememberHandoff(store, ticket);
  assert.equal(resumeDecision(readHandoff(store, IMT, NOW), 'hidden'), 'hold');
  assert.equal(resumeDecision(readHandoff(store, IMT, NOW), 'visible'), 'submit');
  markHandoffSent(store, ticket);
  assert.equal(resumeDecision(readHandoff(store, IMT, NOW), 'visible'), 'hold');
  const pendingStore = new Map<string, string>([['ith:insurance-parent-pending:v1:' + IMT, 'marker']]);
  pendingStore.delete('ith:insurance-parent-pending:v1:' + IMT);
  assert.ok(readHandoff(store, IMT, NOW));
  assert.equal(readHandoff(store, IMT, ticket.expiresAt + 1), null);
  assert.equal(handoffForm('https://evil.example/my/profile-save', ticket.continuationRef, 'save_signin'), null);
  assert.equal(handoffForm(ticket.target + '?next=/', ticket.continuationRef, 'save_signin'), null);
});

test('O P Watch stays off and legal_insurer / NAIC is unchanged', async () => {
  assert.equal(INSURANCE_PARENT_SYNC, 'OFF');
  const insurance = pair('insurance-prod');
  const harness = askHarness(insurance.publicKey, NOW);
  const staged = await stageProductionHandoff({
    resolution: resolved(SANDOVAL, 'OH', '19068455'),
    intent: 'save',
    pageOpen: true,
    gate: productionParentGate(CANARY_ENV),
    key: insurance.privateKey,
    parent: harness.parent,
    now: NOW,
    browser: BROWSER,
  });
  assert.equal(staged.watchCreated, false);
  assert.equal(harness.calls.some((call) => call.body.includes('watch') || call.body.includes('naic') || call.body.includes('legal_insurer')), false);
  assert.equal(parentSaveReady('legal_insurer'), false);
  assert.equal(parentSaveReady('carrier'), false);
  assert.equal(parentSaveReady('insurance_provider'), true);
  const legal = PROFILE_CLASS_CONTRACTS.find((row) => row.profileClass === 'legal_insurer');
  assert.equal(legal?.parentSave, 'NOT_READY');
  assert.equal(legal?.identifierNamespace, 'insurance.legal_insurer.entity_id');
  assert.match(legal?.reason ?? '', /NAIC/);
  const pending: PendingParentSync = {
    version: 'insurance-parent-prep/2',
    intent: 'save',
    profileClass: 'insurance_provider',
    identifierNamespace: 'insurance.state_license',
    sourceIdentifier: 'L106287',
    jurisdiction: 'FL',
    canonicalReturnPath: '/providers/asfin-llc-l106287',
    manifestDigest: 'abc',
    assertion: null,
    status: 'pending',
    transmitted: false,
    createsWatch: false,
    pageOpen: true,
    expiresAt: NOW + 1000,
    acknowledgement: 'Saved on this device',
  };
  const off = transmitParentSync(pending, {});
  assert.equal(off.reason, 'PRODUCTION_PARENT_SYNC_OFF');
  assert.equal(off.transmitted, false);
  const admitted = transmitParentSync(pending, CANARY_ENV);
  assert.equal(admitted.reason, 'UNSIGNED');
  assert.equal(admitted.transmitted, false);
});

test('the production poster targets the Ask profile-save path and does not use a live network call here', async () => {
  const insurance = pair('insurance-prod');
  const ask = pair('ask-prod');
  const seen: { current: { url: string; method: string; body: string; assertion: string; contentType: string; cache: string; redirect: string } | null } = { current: null };
  globalThis.fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    seen.current = {
      url: String(input),
      method: String(init?.method),
      body: String(init?.body),
      assertion: headers.get(ASSERTION_HEADER) ?? '',
      contentType: headers.get('content-type') ?? '',
      cache: String(init?.cache),
      redirect: String(init?.redirect),
    };
    return new Response(JSON.stringify({
      ok: true,
      operation: 'prepareGuestProfileTransfer',
      result: {
        transferRef: 't'.repeat(43),
        manifestDigest: 'f'.repeat(64),
        continuationRef: 'c'.repeat(43),
        expiresAt: NOW + 60_000,
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const deps = productionHandoffDeps(signingEnv(insurance, ask));
    const response = await deps.parent?.({ body: '{"closed":true}', assertion: 'header.payload.sig' });
    assert.equal(response?.ok, true);
    const posted = seen.current;
    if (!posted) throw new Error('poster did not run');
    assert.equal(posted.url, PARENT_API);
    assert.equal(posted.method, 'POST');
    assert.equal(posted.body, '{"closed":true}');
    assert.equal(posted.assertion, 'header.payload.sig');
    assert.equal(posted.contentType, 'application/json');
    assert.equal(posted.cache, 'no-store');
    assert.equal(posted.redirect, 'error');
  } finally {
    globalThis.fetch = async () => {
      throw new Error('live Ask fetch is not allowed in this test');
    };
  }
});
