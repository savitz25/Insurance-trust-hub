/**
 * INS-ASK-BRIDGE-001 — certified exact-NPN agency card projection.
 * Fixture source only. Synthetic agencies. No network and no production names.
 *   npm run check:ins-ask-bridge-001
 */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AskInsuranceResultView } from '../components/ask-insurance-result';
import {
  BRIDGES_PER_ENTITY,
  isCertifiedExactNpnBridge,
  projectCertifiedAgency,
  recordedPlaceLabel,
  selectDisplayCredentials,
  type CredentialRow,
} from '../lib/insurance-ask/agency-card-projection';
import { executeInsuranceRequest, publicAskPayload, withInsuranceSource, type InsuranceAskResult } from '../lib/insurance-ask/execute';
import { fixtureSource, insurerFixture } from './fixtures/insurance-r13';

const harbor = '10000000-0000-4000-8000-0000000000a1';
const west = '10000000-0000-4000-8000-0000000000a2';
const north = '10000000-0000-4000-8000-0000000000a3';
const south = '10000000-0000-4000-8000-0000000000a4';
const producer = '10000000-0000-4000-8000-0000000000a5';
const providerBad = '20000000-0000-4000-8000-0000000000b0';
const providerHarbor = '20000000-0000-4000-8000-0000000000b1';
const providerNorth = '20000000-0000-4000-8000-0000000000b2';
const providerSouth = '20000000-0000-4000-8000-0000000000b3';
const providerProducer = '20000000-0000-4000-8000-0000000000b4';

const HARBOR_NPN = '88001001';
const HARBOR_LICENSE = 'MA-ACT-4400';
const PUBLIC_PHONE = '7275550100';
const PRIVATE_PHONE = '7275550199';
const WEST_PHONE = '2035550148';
const NORTH_PHONE = '2145550172';
const SOUTH_PHONE = '3055550166';
const PUBLIC_EMAIL = 'hello@harbor-estate.example';
const PRIVATE_EMAIL = 'secret@harbor-estate.example';
const HARBOR_SLUG = 'harbor-estate-planning';

let pass = 0, fail = 0;
async function check(name: string, fn: () => unknown | Promise<unknown>) {
  try { await fn(); pass += 1; console.log('PASS', name); }
  catch (e) { fail += 1; console.error('FAIL', name, e instanceof Error ? e.message : e); }
}

function cred(entityId: string, jurisdiction: string, status: string, licenseClass: string | null, license = `LIC-${jurisdiction}`): CredentialRow & { entity_id: string } {
  return {
    entity_id: entityId,
    jurisdiction,
    regulatory_status: status,
    license_number: license,
    license_class: licenseClass,
    source_dataset: 'fixture-bridge',
    source_observed_at: '2026-02-02',
  };
}

function world() {
  const src = fixtureSource();
  const entities = src.tables.national_entities!;
  const add = (id: string, name: string, npn: string, kind = 'agency') => entities.push({
    id, entity_kind: kind, npn, display_name: name, legal_name: name.toUpperCase(),
  });
  add(harbor, 'Harbor Estate Planning LLC', HARBOR_NPN);
  add(west, 'Harbor Estate Planning West LLC', '88001002');
  add(north, 'Harbor Estate Planning North LLC', '88001003');
  add(south, 'Harbor Estate Planning South LLC', '88001004');
  add(producer, 'Harbor Estate Planning Person', '88001005', 'person');
  const flood = Array.from({ length: 12 }, (_, i) => cred(harbor, 'FL', 'unknown', null, `FL-UNK-${i}`));
  src.tables.license_credentials!.push(
    ...flood,
    cred(harbor, 'FL', 'unknown', 'AGENCY LICENSE', 'FL-UNK-LABELED'),
    cred(harbor, 'TX', 'inactive', 'General Lines Agency', 'TX-GLA-1'),
    cred(harbor, 'MA', 'active', 'AGENCY LICENSE', HARBOR_LICENSE),
    cred(west, 'FL', 'unknown', 'AGENCY LICENSE', 'FL-WEST'),
    cred(west, 'MA', 'active', 'AGENCY LICENSE', 'MA-WEST'),
  );
  src.tables.provider_entity_bridges = [
    { provider_id: providerBad, entity_id: harbor, confidence: 'CONFIRMED', match_method: 'exact_npn' },
    { provider_id: providerHarbor, entity_id: harbor, confidence: 'CONFIRMED', match_method: 'exact_npn' },
    { provider_id: providerNorth, entity_id: north, confidence: 'CONFIRMED', match_method: 'normalized_name' },
    { provider_id: providerSouth, entity_id: south, confidence: 'HIGH_CONFIDENCE', match_method: 'exact_npn' },
    { provider_id: providerProducer, entity_id: producer, confidence: 'CONFIRMED', match_method: 'exact_npn' },
  ];
  src.tables.providers = [
    { id: providerBad, slug: 'Not A Slug' },
    { id: providerHarbor, slug: HARBOR_SLUG },
    { id: providerNorth, slug: 'harbor-north-lookalike' },
    { id: providerSouth, slug: 'harbor-south-lookalike' },
    { id: providerProducer, slug: 'producer-should-not-link' },
  ];
  const contact = (entityId: string, kind: string, value: string, publicEligible: boolean) => ({ entity_id: entityId, contact_kind: kind, value, public_eligible: publicEligible });
  src.tables.contact_observations = [
    contact(harbor, 'physical_address', '100 MAIN STREET, CLEARWATER, FL, 33755', true),
    contact(harbor, 'phone', PUBLIC_PHONE, true),
    contact(harbor, 'email', PUBLIC_EMAIL, true),
    contact(harbor, 'phone', PRIVATE_PHONE, false),
    contact(harbor, 'email', PRIVATE_EMAIL, false),
    contact(west, 'physical_address', '9 OAK STREET, WALLINGFORD, CT, 06492', true),
    contact(west, 'phone', WEST_PHONE, true),
    contact(north, 'phone', NORTH_PHONE, true),
    contact(south, 'phone', SOUTH_PHONE, true),
  ];
  return { ...src, run: <T,>(task: () => Promise<T>) => withInsuranceSource(src.db, task, insurerFixture) };
}

const ask = (w: ReturnType<typeof world>, params: Record<string, string>) => w.run(() => executeInsuranceRequest(new URLSearchParams(params)));
const cardBy = (result: InsuranceAskResult, id: string) => result.results.find((row) => row.entityId === id);

async function main() {
  await check('predicate rejects name similarity, weaker confidence, and a different entity', () => {
    const row = { provider_id: providerHarbor, entity_id: harbor, confidence: 'CONFIRMED', match_method: 'exact_npn' };
    assert.equal(isCertifiedExactNpnBridge(row, harbor), true);
    assert.equal(isCertifiedExactNpnBridge({ ...row, match_method: 'normalized_name' }, harbor), false);
    assert.equal(isCertifiedExactNpnBridge({ ...row, confidence: 'HIGH_CONFIDENCE' }, harbor), false);
    assert.equal(isCertifiedExactNpnBridge(row, west), false);
    assert.equal(projectCertifiedAgency({ entityId: harbor, bridges: [{ ...row, match_method: 'normalized_name' }], providers: [{ id: providerHarbor, slug: HARBOR_SLUG }], credentials: [], contacts: [] }), null);
  });

  await check('ACTIVE credential leads an alphabetically earlier UNKNOWN row, and states stay separate', () => {
    const rows = [
      cred(harbor, 'FL', 'unknown', null, 'FL-1'),
      cred(harbor, 'TX', 'inactive', 'General Lines Agency', 'TX-1'),
      cred(harbor, 'MA', 'active', 'AGENCY LICENSE', HARBOR_LICENSE),
    ];
    const shown = selectDisplayCredentials(rows);
    assert.equal(shown[0]?.jurisdiction, 'MA');
    assert.notEqual(shown[0]?.regulatory_status.toLowerCase(), 'unknown');
    const lines = shown.map((row) => {
      const projected = projectCertifiedAgency({
        entityId: harbor,
        bridges: [{ provider_id: providerHarbor, entity_id: harbor, confidence: 'CONFIRMED', match_method: 'exact_npn' }],
        providers: [{ id: providerHarbor, slug: HARBOR_SLUG }],
        credentials: [row],
        contacts: [],
      });
      return projected!.credentialFacts[0]!;
    });
    assert.deepEqual(lines, ['Massachusetts credential: Active', 'Texas General Lines Agency', 'Florida agency credential']);
    assert.ok(lines.every((line) => !/Active everywhere| and /.test(line)));
    assert.equal(recordedPlaceLabel('100 MAIN STREET, CLEARWATER, FL, 33755'), 'Clearwater, FL');
  });

  await check('certified exact-NPN bridge enriches the agency card and only that profile href', async () => {
    const w = world();
    const result = await ask(w, { q: 'Find Harbor Estate Planning' });
    const found = cardBy(result, harbor);
    assert.ok(found);
    assert.equal(found!.entityClass, 'agency');
    assert.equal(found!.npn, HARBOR_NPN);
    assert.equal(found!.href, `/providers/${HARBOR_SLUG}`);
    assert.equal(found!.recordedPlace, 'Clearwater, FL');
    assert.equal(found!.publicPhone, '(727) 555-0100');
    assert.equal(found!.publicEmail, PUBLIC_EMAIL);
    assert.equal(found!.credentialJurisdiction, 'MA');
    assert.equal(found!.licenseNumber, HARBOR_LICENSE);
    assert.notEqual(found!.npn, found!.licenseNumber);
    assert.deepEqual(found!.credentialFacts, [
      'Massachusetts credential: Active',
      'Texas General Lines Agency',
      'Florida agency credential',
    ]);
    assert.equal(found!.publicationNote, null);
    assert.match(found!.selectionHref ?? '', /selected=/);
    const windowHtml = renderToStaticMarkup(createElement(AskInsuranceResultView, { result }));
    assert.match(windowHtml, /Select this identity and continue/);
    assert.match(windowHtml, /View company profile →/);
    const payload = JSON.stringify(publicAskPayload(result));
    assert.match(payload, /Clearwater, FL/);
    assert.doesNotMatch(payload, new RegExp(PRIVATE_PHONE));
    assert.doesNotMatch(payload, new RegExp(PRIVATE_EMAIL.replace('.', '\\.')));
    assert.doesNotMatch(payload, /Wallingford/);
    assert.doesNotMatch(payload, new RegExp(WEST_PHONE));
    assert.doesNotMatch(payload, new RegExp(NORTH_PHONE));
    assert.doesNotMatch(payload, new RegExp(SOUTH_PHONE));
    assert.doesNotMatch(payload, /harbor-north-lookalike|harbor-south-lookalike|producer-should-not-link|Not A Slug/);
    assert.doesNotMatch(payload, /Active everywhere/);
  });

  await check('unbridged, name-similar, and weaker bridges stay unlinked', async () => {
    const w = world();
    const result = await ask(w, { q: 'Find Harbor Estate Planning' });
    for (const id of [west, north, south]) {
      const row = cardBy(result, id);
      assert.ok(row, id);
      assert.equal(row!.href, null, id);
      assert.equal(row!.publicPhone ?? null, null, id);
      assert.equal(row!.publicEmail ?? null, null, id);
      assert.equal(row!.recordedPlace ?? null, null, id);
      assert.equal(row!.credentialFacts, undefined, id);
    }
    assert.equal(result.results.some((row) => row.entityId === producer), false);
    assert.ok(result.results.every((row) => row.entityClass === 'agency'));
    const bridgeCalls = w.calls.filter((call) => call.table === 'provider_entity_bridges');
    assert.equal(bridgeCalls.length, 1);
    const filters = bridgeCalls[0]!.filters;
    assert.ok(filters.some(([op, key, value]) => op === 'eq' && key === 'confidence' && value === 'CONFIRMED'));
    assert.ok(filters.some(([op, key, value]) => op === 'eq' && key === 'match_method' && value === 'exact_npn'));
    const scoped = filters.find(([op, key]) => op === 'in' && key === 'entity_id')?.[2] as string[];
    assert.ok(scoped.includes(harbor) && scoped.includes(west) && scoped.includes(north));
    assert.equal(scoped.includes(producer), false);
    assert.ok(filters.every(([op]) => op !== 'ilike'));
    assert.equal(bridgeCalls[0]!.limit, scoped.length * BRIDGES_PER_ENTITY);
    assert.equal(w.calls.filter((call) => call.table === 'providers').length, 1);
    assert.equal(w.calls.filter((call) => call.table === 'contact_observations').length, 1);
    assert.equal(w.calls.filter((call) => call.table === 'license_credentials').length, 3);
    const contactCall = w.calls.find((call) => call.table === 'contact_observations')!;
    assert.ok(contactCall.filters.some(([op, key, value]) => op === 'eq' && key === 'public_eligible' && value === true));
    assert.ok(w.calls.filter((call) => call.table === 'providers' || call.table === 'contact_observations' || call.table === 'provider_entity_bridges').every((call) => call.filters.every(([op]) => op !== 'ilike')));
  });

  await check('selected bridged card keeps the profile link, public contact, and active credential', async () => {
    const w = world();
    const result = await ask(w, { q: 'Find Harbor Estate Planning', selected: harbor });
    assert.equal(result.terminalState, 'IDENTITY_FOUND');
    assert.equal(result.results.length, 1);
    const row = result.results[0]!;
    assert.equal(row.entityClass, 'agency');
    assert.equal(row.href, `/providers/${HARBOR_SLUG}`);
    assert.equal(row.credentialJurisdiction, 'MA');
    assert.notEqual(row.credentialJurisdiction, 'FL');
    assert.equal(row.recordedPlace, 'Clearwater, FL');
    assert.equal(row.npn, HARBOR_NPN);
    assert.notEqual(row.licenseNumber, row.npn);
    const html = renderToStaticMarkup(createElement(AskInsuranceResultView, { result }));
    assert.match(html, /Harbor Estate Planning LLC/);
    assert.match(html, />\s*Agency\s*</);
    assert.match(html, /Clearwater, FL/);
    assert.match(html, new RegExp(`NPN[\\s\\S]*${HARBOR_NPN}`));
    assert.match(html, /Credential evidence/);
    assert.match(html, /Massachusetts credential: Active/);
    assert.match(html, /Texas General Lines Agency/);
    assert.match(html, /Florida agency credential/);
    assert.match(html, /Phone:[\s\S]*\(727\) 555-0100/);
    assert.match(html, new RegExp(PUBLIC_EMAIL));
    assert.match(html, new RegExp(`href="/providers/${HARBOR_SLUG}"`));
    assert.match(html, /View company profile →/);
    assert.match(html, /How we matched this result/);
    assert.ok(html.indexOf('How we matched this result') < html.indexOf('Trace this result'));
    assert.ok(html.indexOf('Trace this result') < html.indexOf('Why this matched'));
    assert.doesNotMatch(html, /We interpreted your question as/);
    assert.doesNotMatch(html, /Coverage:/);
    assert.doesNotMatch(html, /<h2[^>]*>Count<\/h2>/);
    assert.match(html, /data-ask-card-nav="profile"/);
    assert.match(html, /cursor-pointer/);
    assert.match(html, /not office or service territory/);
    assert.match(html, /Recorded address Clearwater, FL is not a service area/);
    assert.doesNotMatch(html, /Active everywhere/);
    assert.doesNotMatch(html, /Wallingford|service territory:|serves Clearwater/i);
    assert.doesNotMatch(html, new RegExp(`${PRIVATE_PHONE}|${PRIVATE_EMAIL}|${WEST_PHONE}`));
    assert.equal(w.calls.filter((call) => call.table === 'provider_entity_bridges').length, 1);
  });

  await check('selected unbridged agency gets the active credential and no profile or contact', async () => {
    const w = world();
    const result = await ask(w, { q: 'Find Harbor Estate Planning', selected: west });
    const row = result.results[0]!;
    assert.equal(row.entityId, west);
    assert.equal(row.href, null);
    assert.equal(row.credentialJurisdiction, 'MA');
    assert.equal(row.credentialStatus?.toLowerCase(), 'active');
    assert.equal(row.recordedPlace ?? null, null);
    assert.equal(row.publicPhone ?? null, null);
    assert.equal(row.credentialFacts, undefined);
    const html = renderToStaticMarkup(createElement(AskInsuranceResultView, { result }));
    assert.match(html, /How we matched this result/);
    assert.match(html, /Why this matched/);
    assert.ok(html.indexOf('How we matched this result') < html.indexOf('Trace this result'));
    assert.ok(html.indexOf('Trace this result') < html.indexOf('Why this matched'));
    assert.match(html, /data-ask-card-nav="none"/);
    assert.doesNotMatch(html.match(/<article[^>]*>/)?.[0] ?? '', /cursor-pointer|hover:shadow-md/);
    assert.doesNotMatch(html, /View company profile|\/providers\/|Wallingford|203\) 555-0148|2035550148/);
    assert.equal(w.calls.filter((call) => call.table === 'provider_entity_bridges').length, 1);
    assert.equal(w.calls.filter((call) => call.table === 'providers').length, 0);
    assert.equal(w.calls.filter((call) => call.table === 'contact_observations').length, 0);
  });

  await check('agency, insurer, and producer stay different identities', async () => {
    const w = world();
    const agencies = await ask(w, { q: 'Find Harbor Estate Planning' });
    assert.ok(agencies.results.length > 0);
    assert.ok(agencies.results.every((row) => row.entityClass === 'agency' && row.naicCode == null && row.npn));
    const insurer = await ask(w, { q: 'Research ACME INSURANCE COMPANY' });
    const legal = insurer.results.find((row) => row.entityClass === 'insurer');
    assert.ok(legal);
    assert.equal(legal!.naicCode, '10064');
    assert.equal(legal!.npn, null);
    assert.equal(legal!.href, '/insurers/acme-insurance-company');
    assert.notEqual(legal!.entityClass, 'agency');
    assert.equal(agencies.results.some((row) => row.entityClass === 'person' || row.entityId === producer), false);
  });

  console.log({ pass, fail });
  if (fail) process.exit(1);
}

main().catch((error) => { console.error(error); process.exit(1); });
