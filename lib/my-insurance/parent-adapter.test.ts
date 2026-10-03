import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  INSURANCE_PARENT_SYNC,
  PROFILE_CLASS_CONTRACTS,
  SAVE_ACKNOWLEDGEMENT,
  SAVE_CONTROL_OFF,
  SAVE_CONTROL_ON,
  UNSAVE_ACKNOWLEDGEMENT,
  parentSaveReady,
  profileSaveControl,
  resolveInsuranceProviderIdentity,
  stageParentHandoff,
  transmitParentSync,
} from './parent-adapter';

const PROVIDER_ID = 'a1000001-0001-4000-8000-000000000001';
const OTHER_ID = 'a1000001-0001-4000-8000-000000000002';

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

test('a published agency id is the only parent identity and the return path is server-shaped', () => {
  const resolved = resolveInsuranceProviderIdentity({
    publishedId: PROVIDER_ID.toUpperCase(),
    publishedSlug: 'sunshine-coast-insurance-group',
    licenseState: 'fl',
  });
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.nativeIdentity, PROVIDER_ID);
  assert.equal(resolved.identifierNamespace, 'insurance.providers.id');
  assert.equal(resolved.publicationSource, 'insurance.providers');
  assert.equal(resolved.publicationGrain, 'agency_provider');
  assert.equal(resolved.jurisdiction, 'FL');
  assert.equal(resolved.returnPath, '/providers/sunshine-coast-insurance-group');
  assert.equal(resolved.createsWatch, false);

  const pending = stageParentHandoff(resolved);
  assert.equal(pending.ok, true);
  if (!pending.ok) return;
  assert.equal(pending.pending.transmitted, false);
  assert.equal(pending.pending.createsWatch, false);
  assert.equal(pending.pending.status, 'pending');

  const sent = transmitParentSync(pending.pending);
  assert.equal(sent.ok, false);
  assert.equal(sent.reason, 'PRODUCTION_PARENT_SYNC_OFF');
  assert.equal(sent.transmitted, false);
  assert.equal(INSURANCE_PARENT_SYNC, 'OFF');
  assert.equal(pending.pending.transmitted, false);
});

test('identity fails closed for slug-only, synthetic, missing, and mismatched ids', () => {
  assert.equal(
    resolveInsuranceProviderIdentity({
      publishedId: null,
      publishedSlug: 'sunshine-coast-insurance-group',
    }).ok,
    false,
  );
  assert.equal(
    resolveInsuranceProviderIdentity({
      publishedId: null,
      publishedSlug: 'sunshine-coast-insurance-group',
    }).ok
      ? ''
      : (
          resolveInsuranceProviderIdentity({
            publishedId: null,
            publishedSlug: 'sunshine-coast-insurance-group',
          }) as { reason: string }
        ).reason,
    'slug_only',
  );
  assert.equal(
    (
      resolveInsuranceProviderIdentity({
        publishedId: 'fallback-1',
        publishedSlug: 'summit-insurance-group',
      }) as { reason: string }
    ).reason,
    'synthetic',
  );
  assert.equal(
    (
      resolveInsuranceProviderIdentity({
        publishedId: null,
        publishedSlug: null,
        clientSuppliedId: 'fallback-4',
      }) as { reason: string }
    ).reason,
    'synthetic',
  );
  assert.equal(
    (
      resolveInsuranceProviderIdentity({
        publishedId: PROVIDER_ID,
        publishedSlug: 'sunshine-coast-insurance-group',
        clientSuppliedId: OTHER_ID,
      }) as { reason: string }
    ).reason,
    'ambiguous',
  );
  assert.equal(
    (
      resolveInsuranceProviderIdentity({
        publishedId: '00000000-0000-0000-0000-000000000000',
        publishedSlug: 'sunshine-coast-insurance-group',
      }) as { reason: string }
    ).reason,
    'unresolved',
  );
  assert.equal(
    (
      resolveInsuranceProviderIdentity({
        publishedId: PROVIDER_ID,
        publishedSlug: '../ask',
      }) as { reason: string }
    ).reason,
    'unresolved',
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

test('the profile control has one Save toggle and does not call Ask', () => {
  const root = process.cwd();
  const button = readFileSync(
    join(root, 'components/my-insurance/save-provider-button.tsx'),
    'utf8',
  );
  const adapter = readFileSync(join(root, 'lib/my-insurance/parent-adapter.ts'), 'utf8');
  const handoff = readFileSync(join(root, 'actions/insurance-parent-handoff.ts'), 'utf8');
  const navbar = readFileSync(join(root, 'components/navbar.tsx'), 'utf8');

  assert.match(button, /SAVE_CONTROL_OFF/);
  assert.match(button, /SAVE_CONTROL_ON/);
  assert.doesNotMatch(button, /Unsave/);
  assert.doesNotMatch(button, />\s*Remove\s*</);
  assert.doesNotMatch(button, /createWatch|startWatch|watchAction/);
  assert.doesNotMatch(adapter, /asktrusthub\.com/);
  assert.doesNotMatch(adapter, /fetch\(/);
  assert.doesNotMatch(handoff, /asktrusthub\.com/);
  assert.doesNotMatch(handoff, /\.from\(/);
  assert.match(navbar, /My TrustHub/);
  assert.match(navbar, /href="\/my-trusthub"/);
  assert.doesNotMatch(navbar, /aria-label=\{showBadge \? `My Insurance/);
});
