import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  IDENTIFIER_NAMESPACE,
  INSURANCE_PARENT_SYNC,
  PROFILE_CLASS_CONTRACTS,
  PROVIDERS_ID_DURABLE,
  SAVE_ACKNOWLEDGEMENT,
  SAVE_CONTROL_OFF,
  SAVE_CONTROL_ON,
  UNSAVE_ACKNOWLEDGEMENT,
  parentSaveReady,
  profileSaveControl,
  resolveInsuranceProviderIdentity,
  transmitParentSync,
  type PendingParentSync,
} from './parent-adapter';

const ONE_LICENSE = [{ state: 'FL', license_number: 'L106287', status: 'verified' as const }];

test('profile Save toggles Save then Saved then Save and does not create a watch', () => {
  const saved = profileSaveControl(false);
  assert.equal(saved.saved, true);
  assert.equal(saved.label, SAVE_CONTROL_ON);
  assert.equal(saved.label, '♥ Saved');
  assert.equal(saved.acknowledgement, SAVE_ACKNOWLEDGEMENT);
  assert.equal(saved.createsWatch, false);

  const removed = profileSaveControl(true);
  assert.equal(removed.saved, false);
  assert.equal(removed.label, SAVE_CONTROL_OFF);
  assert.equal(removed.label, '♡ Save');
  assert.equal(removed.acknowledgement, UNSAVE_ACKNOWLEDGEMENT);
  assert.equal(removed.createsWatch, false);

  const again = profileSaveControl(removed.saved);
  assert.equal(again.label, '♥ Saved');
});

test('one state license is the parent identity and providers.id is not', () => {
  const resolved = resolveInsuranceProviderIdentity({
    publishedId: 'A1000001-0001-4000-8000-000000000001',
    publishedSlug: 'asfin-llc-l106287',
    licenses: ONE_LICENSE,
    statesLicensed: ['fl'],
  });
  assert.equal(PROVIDERS_ID_DURABLE, false);
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.sourceIdentifier, 'L106287');
  assert.equal(resolved.identifierNamespace, IDENTIFIER_NAMESPACE);
  assert.equal(resolved.identifierNamespace, 'insurance.state_license');
  assert.equal(resolved.publicationSource, 'insurance.providers');
  assert.equal(resolved.publicationGrain, 'agency_provider');
  assert.equal(resolved.jurisdiction, 'FL');
  assert.equal(resolved.canonicalReturnPath, '/providers/asfin-llc-l106287');
  assert.equal(resolved.createsWatch, false);
  assert.equal(JSON.stringify(resolved).includes('A1000001'), false);

  const pending: PendingParentSync = {
    version: 'insurance-parent-prep/2',
    intent: 'save',
    profileClass: 'insurance_provider',
    identifierNamespace: resolved.identifierNamespace,
    sourceIdentifier: resolved.sourceIdentifier,
    jurisdiction: resolved.jurisdiction,
    canonicalReturnPath: resolved.canonicalReturnPath,
    manifestDigest: 'abc',
    assertion: null,
    status: 'pending',
    transmitted: false,
    createsWatch: false,
    pageOpen: true,
    expiresAt: Date.now() + 1000,
    acknowledgement: SAVE_ACKNOWLEDGEMENT,
  };
  const sent = transmitParentSync(pending, {});
  assert.equal(sent.ok, false);
  assert.equal(sent.reason, 'PRODUCTION_PARENT_SYNC_OFF');
  assert.equal(sent.transmitted, false);
  assert.equal(INSURANCE_PARENT_SYNC, 'OFF');
});

test('identity fails closed for slug-only, synthetic, missing, tampered, and multi-license rows', () => {
  const reason = (input: Parameters<typeof resolveInsuranceProviderIdentity>[0]) => {
    const resolved = resolveInsuranceProviderIdentity(input);
    assert.equal(resolved.ok, false);
    if (resolved.ok) return '';
    return resolved.reason;
  };
  assert.equal(
    reason({ publishedSlug: 'asfin-llc-l106287' }),
    'slug_only',
  );
  assert.equal(
    reason({ publishedId: 'fallback-1', publishedSlug: 'summit-insurance-group', licenses: ONE_LICENSE }),
    'synthetic',
  );
  assert.equal(
    reason({ claimedProviderId: 'fallback-4' }),
    'synthetic',
  );
  assert.equal(
    reason({
      publishedSlug: 'asfin-llc-l106287',
      licenses: ONE_LICENSE,
      claimedProviderId: 'a1000001-0001-4000-8000-000000000002',
    }),
    'tampered',
  );
  assert.equal(
    reason({
      publishedSlug: 'asfin-llc-l106287',
      licenses: ONE_LICENSE,
      claimedSourceIdentifier: 'L106287',
    }),
    'tampered',
  );
  assert.equal(
    reason({
      publishedSlug: 'asfin-llc-l106287',
      licenses: ONE_LICENSE,
      claimedJurisdiction: 'FL',
    }),
    'tampered',
  );
  assert.equal(
    reason({
      publishedSlug: 'asfin-llc-l106287',
      licenses: ONE_LICENSE,
      claimedName: 'ASFIN LLC',
    }),
    'tampered',
  );
  assert.equal(reason({ publishedSlug: null, publishedId: null }), 'unresolved');
  assert.equal(
    reason({ publishedSlug: '../ask', licenses: ONE_LICENSE }),
    'unresolved',
  );
  assert.equal(
    reason({
      publishedSlug: 'asfin-llc-l106287',
      licenses: [
        ...ONE_LICENSE,
        { state: 'TX', license_number: '1365714', status: 'verified' },
      ],
    }),
    'ambiguous',
  );
  assert.equal(
    reason({
      publishedSlug: 'asfin-llc-l106287',
      licenses: ONE_LICENSE,
      statesLicensed: ['FL', 'TX'],
    }),
    'ambiguous',
  );
  assert.equal(
    reason({
      publishedSlug: 'asfin-llc-l106287',
      licenses: [{ state: 'FL', license_number: 'pending', status: 'verified' }],
    }),
    'slug_only',
  );
});

test('carrier and legal insurer are not parent Save classes', () => {
  assert.equal(parentSaveReady('insurance_provider'), true);
  assert.equal(parentSaveReady('legal_insurer'), false);
  assert.equal(parentSaveReady('carrier'), false);
  const carrier = PROFILE_CLASS_CONTRACTS.find((row) => row.profileClass === 'carrier');
  assert.equal(carrier?.nativeIdentity, 'none');
  assert.match(carrier?.reason ?? '', /Slug-only/);
});

test('device save then unsave stores one agency and creates no watch record', async () => {
  const store = new Map<string, string>();
  const memoryStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.assign(globalThis, {
    localStorage: memoryStorage,
    window: {
      localStorage: memoryStorage,
      dispatchEvent: () => true,
    },
  });

  const storage = await import('./storage');
  const first = storage.upsertSavedProvider({
    providerSlug: 'sunshine-coast-insurance-group',
    providerName: 'Sunshine Coast Insurance Group',
    status: 'researching',
  });
  const second = storage.upsertSavedProvider({
    providerSlug: 'sunshine-coast-insurance-group',
    providerName: 'Sunshine Coast Insurance Group',
    status: 'researching',
  });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.alreadySaved, true);

  const plan = storage.getActivePlan();
  assert.ok(plan);
  const rows = storage.getProvidersForPlan(plan.id);
  assert.equal(rows.filter((row) => row.providerSlug === 'sunshine-coast-insurance-group').length, 1);

  storage.removeProviderFromPlan('sunshine-coast-insurance-group');
  const afterRemove = storage.getProvidersForPlan(plan.id);
  assert.equal(
    afterRemove.filter((row) => row.providerSlug === 'sunshine-coast-insurance-group').length,
    0,
  );

  const restored = storage.upsertSavedProvider({
    providerSlug: 'sunshine-coast-insurance-group',
    providerName: 'Sunshine Coast Insurance Group',
    status: 'researching',
  });
  assert.equal(restored.ok, true);
  if (!restored.ok) return;
  assert.equal(restored.created, true);
  const keys = [...store.keys()].join(' ');
  assert.doesNotMatch(keys, /watch/i);
  const blob = [...store.values()].join('\n');
  assert.doesNotMatch(blob, /"watch"/i);
});

test('the profile control has one Save toggle and the browser does not fetch Ask', () => {
  const root = process.cwd();
  const button = readFileSync(
    join(root, 'components/my-insurance/save-provider-button.tsx'),
    'utf8',
  );
  const adapter = readFileSync(join(root, 'lib/my-insurance/parent-adapter.ts'), 'utf8');
  const handoff = readFileSync(join(root, 'actions/insurance-parent-handoff.ts'), 'utf8');
  const signed = readFileSync(join(root, 'lib/my-insurance/signed-handoff.ts'), 'utf8');
  const session = readFileSync(join(root, 'lib/my-insurance/handoff-session.ts'), 'utf8');
  const card = readFileSync(join(root, 'components/provider-card.tsx'), 'utf8');
  const navbar = readFileSync(join(root, 'components/navbar.tsx'), 'utf8');

  assert.match(button, /SAVE_CONTROL_OFF/);
  assert.match(button, /SAVE_CONTROL_ON/);
  assert.doesNotMatch(button, /Unsave/);
  assert.doesNotMatch(button, />\s*Remove\s*</);
  assert.doesNotMatch(button, /createWatch|startWatch|watchAction/);
  assert.doesNotMatch(button, /clientSuppliedId/);
  assert.doesNotMatch(button, /asktrusthub\.com/);
  assert.doesNotMatch(button, /fetch\(/);
  assert.doesNotMatch(adapter, /asktrusthub\.com/);
  assert.doesNotMatch(adapter, /fetch\(/);
  assert.doesNotMatch(handoff, /asktrusthub\.com/);
  assert.doesNotMatch(handoff, /\.from\(/);
  assert.doesNotMatch(handoff, /fetch\(/);
  assert.match(handoff, /key: null/);
  assert.equal(signed.match(/fetch\(/g)?.length, 1);
  assert.match(signed, /fetch\(INSURANCE_PRODUCTION_PINS\.parentOrigin \+ PARENT_API_PATH/);
  assert.match(button, /element\.submit\(\)/);
  assert.doesNotMatch(session, /asktrusthub\.com/);
  assert.doesNotMatch(session, /location\.assign|window\.open/);
  assert.match(card, /SaveProviderButtonLazy/);
  assert.match(card, /providerId=\{provider\.id\}/);
  assert.match(card, /defaultStatus="researching"/);
  assert.match(navbar, /My TrustHub/);
  assert.match(navbar, /href="\/my-trusthub"/);
  assert.doesNotMatch(navbar, /aria-label=\{showBadge \? `My Insurance/);
});
