import React from 'react';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProviderStateView } from '@/components/providers/provider-state-view';
import { ProviderLicenseProfileExtras } from '@/components/providers/provider-license-profile';
import { providerMatchesLicensedState } from '@/lib/providers/directory-state';
import { mapRowToProvider } from '@/lib/providers/map-db-provider';
import {
  resolveProviderStateView,
  stateListingLinks,
  stateViewMetadataOptions,
} from '@/lib/providers/state-view';
import { buildMetadata } from '@/lib/seo/metadata';
import { buildInsuranceAgencySchema } from '@/lib/seo/schemas';
import type { Provider } from '@/types/provider';
import type { LicenseEntry, LicenseInfo, Provider as DbProvider } from '@/types/supabase';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const SLUG = 'opero-labs-inc-6020106';
const PROVIDER_ID = 'c5f1e44f-0000-4000-8000-000000000006';
const STATE_PAGE = readFileSync(
  join(process.cwd(), 'app/providers/[slug]/[state]/page.tsx'),
  'utf8'
);
const PARENT_PAGE = readFileSync(join(process.cwd(), 'app/providers/[slug]/page.tsx'), 'utf8');
const QUERIES = readFileSync(join(process.cwd(), 'lib/providers/queries.ts'), 'utf8');

function license(overrides: Partial<LicenseEntry> = {}): LicenseEntry {
  return {
    state: 'CA',
    license_number: '6020106',
    type: 'Casualty, Property, SL Broker',
    verification_url: '',
    source: 'California Department of Insurance',
    checkedAt: '2026-10-24',
    method: 'manual',
    notes: 'NPN 22310566',
    status: 'verified',
    identityMatchAccepted: true,
    expires_at: '2028-08-31',
    residency: 'resident',
    ...overrides,
  };
}

function menloLicenseInfo(): LicenseInfo {
  return {
    licenses: [
      license(),
      license({
        state: 'TX',
        license_number: '3562061',
        type: 'General Lines Agency (P&C)',
        source: 'Texas Department of Insurance',
        checkedAt: '2026-10-23',
        notes: 'TDI open data',
        expires_at: '2028-09-29',
        residency: 'resident',
      }),
      license({
        state: 'ID',
        license_number: '3004512285',
        type: 'Non-resident producer, Casualty + Property',
        source: 'Idaho Department of Insurance',
        checkedAt: '2026-10-24',
        notes: '',
        expires_at: '2028-09-30',
        residency: 'non_resident',
      }),
      license({
        state: 'TX',
        license_number: '1111111',
        type: 'Expired agency',
        expires_at: '2020-01-01',
      }),
      license({
        state: 'TX',
        license_number: '2222222',
        type: 'Pending agency',
        status: 'pending',
        identityMatchAccepted: false,
      }),
    ],
    informational: [
      {
        state: 'TX',
        license_number: '3573111',
        type: 'Surplus Lines Agency',
        issued_at: '2026-10-20',
        source: 'TDI open data',
        notes: 'info only',
      },
    ],
  };
}

function menloContact(jurisdiction = true): DbProvider['contact'] {
  return {
    address: {
      street: '406 Utah St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94110',
    },
    business_supplied: {
      source: 'BUSINESS_SUPPLIED',
      supplied_at: '2026-10-24',
      supplied_via: 'listing forms',
      lines: ['Home', 'Auto'],
      offices: [
        {
          label: 'Austin',
          address: '5900 Balcones Dr Ste 100, Austin TX 78731',
          verified: false,
          ...(jurisdiction ? { jurisdiction: 'tx' } : {}),
        },
        {
          label: 'Post Falls',
          address: '784 S. Clearwater Loop Ste B, Post Falls ID 83854',
          verified: false,
          ...(jurisdiction ? { jurisdiction: 'ID' } : {}),
        },
      ],
    },
  };
}

function menloRow(contact: DbProvider['contact'] = menloContact()): DbProvider {
  return {
    id: PROVIDER_ID,
    slug: SLUG,
    name: 'Opero Labs Inc. DBA Menlo Insurance Services',
    provider_type: 'brokerage',
    categories: ['homeowners', 'auto'],
    states_licensed: ['CA', 'TX', 'ID'],
    cities: ['San Francisco'],
    license_info: menloLicenseInfo(),
    specialties: [],
    rating: 0,
    review_count: 0,
    years_in_business: null,
    relocation_experience: false,
    verified: true,
    description: null,
    short_description: 'Research listing',
    contact,
    created_at: '2026-10-24T00:00:00.000Z',
    updated_at: '2026-10-24T00:00:00.000Z',
  };
}

function menloProvider(contact?: DbProvider['contact']): Provider {
  return mapRowToProvider(menloRow(contact));
}

function badgeNumbers(html: string): string[] {
  return [...html.matchAll(/data-license-number="([^"]+)"/g)].map((match) => match[1]);
}

function officeSlice(html: string, label: string): string {
  const marker = `data-office="${label}"`;
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, `missing office ${label}`);
  return html.slice(start, start + 700);
}

test('unlicensed and informational-only states 404', () => {
  const provider = menloProvider();
  for (const state of ['FL', 'fl', 'NY', 'texas', '', '3573111']) {
    assert.equal(resolveProviderStateView(provider, state, NOW), null, state);
  }
  const informationalOnly = mapRowToProvider(
    menloRow({
      ...menloContact(false),
      address: menloContact().address,
    })
  );
  informationalOnly.licenses = [license()];
  informationalOnly.license_state = 'CA';
  informationalOnly.informational_licenses = menloLicenseInfo().informational;
  assert.equal(resolveProviderStateView(informationalOnly, 'tx', NOW), null);
  assert.match(STATE_PAGE, /if \(!view\) notFound\(\)/);
  assert.match(STATE_PAGE, /if \(!provider\) notFound\(\)/);
});

test('a state view shows only that state badge and the parent link', () => {
  const provider = menloProvider();
  const tx = renderToStaticMarkup(
    <ProviderStateView provider={provider} stateCode="tx" now={NOW} />
  );
  assert.deepEqual(badgeNumbers(tx), ['3562061']);
  assert.match(tx, /General Lines Agency \(P&amp;C\)|General Lines Agency \(P&C\)/);
  assert.match(tx, /2028-09-29/);
  assert.match(tx, /resident/);
  assert.match(tx, /Texas Department of Insurance/);
  assert.match(tx, /2026-10-23/);
  assert.match(tx, /Re-check with Texas Department of Insurance/);
  assert.match(tx, /https:\/\/www\.tdi\.texas\.gov\/agent\/index\.html/);
  assert.equal(tx.includes('data-stored-verification-url'), false);
  assert.equal(tx.includes('data-license-number="6020106"'), false);
  assert.equal(tx.includes('data-license-number="3004512285"'), false);
  assert.equal(tx.includes('data-license-number="3573111"'), false);
  assert.equal(tx.includes('data-license-number="1111111"'), false);
  assert.equal(tx.includes('data-license-number="2222222"'), false);
  assert.equal(tx.includes('3573111'), false);
  assert.match(tx, /href="\/providers\/opero-labs-inc-6020106"/);
  assert.match(tx, /data-parent-profile="true"/);
  assert.match(tx, /data-state-view="TX"/);
  assert.match(tx, new RegExp(`data-provider-id="${PROVIDER_ID}"`));
  const austin = officeSlice(tx, 'Austin');
  assert.match(austin, /unverified/);
  assert.match(austin, /BUSINESS-SUPPLIED/);
  assert.equal(/(?<!un)verified/i.test(austin), false);
  assert.equal(tx.includes('Post Falls'), false);
  assert.equal(tx.includes('Clearwater'), false);

  const id = renderToStaticMarkup(
    <ProviderStateView provider={provider} stateCode="ID" now={NOW} />
  );
  assert.deepEqual(badgeNumbers(id), ['3004512285']);
  assert.match(id, /Non-resident producer, Casualty \+ Property/);
  assert.match(id, /2028-09-30/);
  assert.match(id, /non-resident/);
  assert.match(id, /Source:<\/span> Idaho Department of Insurance/);
  assert.match(id, /Checked:<\/span> 2026-10-24/);
  assert.equal(id.includes('data-stored-verification-url'), false);
  assert.equal(id.includes('3573111'), false);
  assert.equal(id.includes('3562061'), false);
  const postFalls = officeSlice(id, 'Post Falls');
  assert.match(postFalls, /unverified/);
  assert.match(postFalls, /BUSINESS-SUPPLIED/);
  assert.match(postFalls, /784 S\. Clearwater Loop/);
  assert.equal(/(?<!un)verified/i.test(postFalls), false);
  assert.equal(id.includes('Austin'), false);
  assert.equal(id.includes('Balcones'), false);
});

test('Post Falls stays unverified and contact.address is not overwritten', () => {
  const contact = menloContact(true);
  const addressBefore = structuredClone(contact.address);
  const row = menloRow(contact);
  const provider = mapRowToProvider(row);
  assert.deepEqual(row.contact.address, addressBefore);
  assert.equal(provider.city, 'San Francisco');
  assert.equal(provider.state, 'CA');
  assert.equal(provider.zip, '94110');
  const postFalls = provider.business_supplied?.offices.find((office) => office.label === 'Post Falls');
  assert.equal(postFalls?.verified, false);
  assert.equal(postFalls?.jurisdiction, 'ID');
  assert.equal(
    provider.business_supplied?.offices.find((office) => office.label === 'Austin')?.jurisdiction,
    'TX'
  );

  const parent = renderToStaticMarkup(
    <ProviderLicenseProfileExtras provider={provider} now={NOW} />
  );
  const parentOffice = officeSlice(parent, 'Post Falls');
  assert.match(parentOffice, /unverified/);
  assert.match(parentOffice, /BUSINESS-SUPPLIED/);
  assert.equal(/(?<!un)verified/i.test(parentOffice), false);

  const untagged = menloProvider(menloContact(false));
  assert.equal(
    untagged.business_supplied?.offices.every((office) => office.jurisdiction === null),
    true
  );
  const id = renderToStaticMarkup(
    <ProviderStateView provider={untagged} stateCode="id" now={NOW} />
  );
  assert.equal(id.includes('Post Falls'), false);
  assert.equal(id.includes('Clearwater'), false);
  assert.deepEqual(row.contact.address, addressBefore);
});

test('single-license parents are unchanged and multi-state parents link TX and ID', () => {
  const singleRow = menloRow();
  singleRow.license_info = { licenses: [license()] };
  singleRow.states_licensed = ['CA'];
  singleRow.contact = {
    phone: '(415) 555-0100',
    address: {
      street: '406 Utah St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94110',
    },
  };
  const single = mapRowToProvider(singleRow);
  const extras = renderToStaticMarkup(
    <ProviderLicenseProfileExtras provider={single} now={NOW} />
  );
  assert.equal(extras, '');
  assert.deepEqual(stateListingLinks(single, NOW), []);
  assert.match(PARENT_PAGE, /ProviderLicenseCredentialBadges/);
  assert.match(PARENT_PAGE, /ProviderInformationalLicenses/);
  assert.match(PARENT_PAGE, /BusinessSuppliedCard/);
  assert.match(PARENT_PAGE, /ProviderStateListings/);
  assert.match(PARENT_PAGE, /noIndex: !verified/);

  const provider = menloProvider();
  const links = stateListingLinks(provider, NOW);
  assert.deepEqual(
    links.map((link) => link.code),
    ['TX', 'ID']
  );
  assert.deepEqual(
    links.map((link) => link.href),
    [`/providers/${SLUG}/tx`, `/providers/${SLUG}/id`]
  );
  const html = renderToStaticMarkup(
    <ProviderLicenseProfileExtras provider={provider} now={NOW} />
  );
  const start = html.indexOf('data-state-listings');
  assert.notEqual(start, -1);
  const listings = html.slice(start, html.indexOf('data-informational-licenses'));
  assert.match(listings, /State listings:/);
  assert.match(listings, /href="\/providers\/opero-labs-inc-6020106\/tx"/);
  assert.match(listings, />TX<\/a>/);
  assert.match(listings, /href="\/providers\/opero-labs-inc-6020106\/id"/);
  assert.match(listings, />ID<\/a>/);
  assert.match(listings, / · /);
  assert.equal(listings.includes('/ca'), false);
  assert.equal(listings.includes('3573111'), false);
});

test('state views reuse the same provider and canonical points at the parent', () => {
  const provider = menloProvider();
  const view = resolveProviderStateView(provider, 'tx', NOW);
  assert.ok(view);
  assert.equal(view.providerId, provider.id);
  assert.equal(view.slug, provider.slug);
  assert.equal(view.parentPath, `/providers/${SLUG}`);
  assert.equal(String(view.jsonLd['@id']).endsWith(`/providers/${SLUG}/#agency`), true);
  assert.equal(provider.licenses?.length, 5);

  const options = stateViewMetadataOptions(provider, 'tx', NOW);
  assert.ok(options);
  assert.equal(options.path, `/providers/${SLUG}`);
  const meta = buildMetadata(options);
  const canonical =
    meta.alternates && typeof meta.alternates === 'object' && 'canonical' in meta.alternates
      ? String(meta.alternates.canonical)
      : '';
  assert.match(canonical, /\/providers\/opero-labs-inc-6020106$/);
  assert.equal(canonical.endsWith('/tx'), false);
  assert.equal(canonical.endsWith('/id'), false);
  assert.equal(stateViewMetadataOptions(provider, 'fl', NOW), null);

  assert.match(STATE_PAGE, /stateViewMetadataOptions/);
  assert.match(STATE_PAGE, /getProviderBySlug/);
  assert.equal(STATE_PAGE.includes('.insert('), false);
  assert.equal(STATE_PAGE.includes('.update('), false);
  assert.equal(STATE_PAGE.includes('.upsert('), false);
  assert.equal(STATE_PAGE.includes('agency_listing_requests'), false);
  assert.equal(STATE_PAGE.includes('supabase/migrations'), false);
});

test('JSON-LD excludes informational license 3573111 and does not invent verification URLs', () => {
  const provider = menloProvider();
  const parent = JSON.stringify(buildInsuranceAgencySchema(provider, { now: NOW }));
  assert.equal(parent.includes('3573111'), false);
  assert.equal(parent.includes('1111111'), false);
  assert.equal(parent.includes('2222222'), false);
  assert.equal(parent.includes('https://www.tdi.texas.gov/agent/index.html'), false);
  assert.equal(parent.includes('https://doi.idaho.gov/public/licensing/'), false);
  assert.match(parent, /3562061/);
  assert.match(parent, /3004512285/);
  assert.equal(parent.includes('Post Falls'), false);

  const tx = resolveProviderStateView(provider, 'tx', NOW);
  assert.ok(tx);
  const txJson = JSON.stringify(tx.jsonLd);
  const credentials = tx.jsonLd.hasCredential as Array<{ identifier: string; recognizedBy?: { url?: string } }>;
  assert.deepEqual(
    credentials.map((credential) => credential.identifier),
    ['3562061']
  );
  assert.equal(credentials.some((credential) => credential.recognizedBy?.url), false);
  assert.match(txJson, /3562061/);
  assert.equal(txJson.includes('3573111'), false);
  assert.equal(txJson.includes('3004512285'), false);
  assert.equal(txJson.includes('Post Falls'), false);
  assert.equal(txJson.includes('https://www.tdi.texas.gov/agent/index.html'), false);

  const recorded = mapRowToProvider(
    menloRow({
      ...menloContact(true),
      address: menloContact().address,
    })
  );
  recorded.licenses = [
    license({
      state: 'TX',
      license_number: '3562061',
      type: 'General Lines Agency (P&C)',
      source: 'Texas Department of Insurance',
      checkedAt: '2026-10-23',
      verification_url: 'https://example.test/tx-3562061',
    }),
    license(),
  ];
  const recordedView = resolveProviderStateView(recorded, 'TX', NOW);
  assert.ok(recordedView);
  const recordedJson = JSON.stringify(recordedView.jsonLd);
  assert.match(recordedJson, /https:\/\/example\.test\/tx-3562061/);
  assert.equal(recordedJson.includes('3573111'), false);
  const html = renderToStaticMarkup(
    <ProviderStateView provider={recorded} stateCode="tx" now={NOW} />
  );
  assert.match(html, /data-stored-verification-url="https:\/\/example\.test\/tx-3562061"/);
});

test('directory state filter keeps multi-state Menlo for TX and ID', () => {
  const provider = menloProvider();
  assert.equal(provider.license_state, 'CA');
  assert.equal(provider.state, 'CA');
  assert.deepEqual(provider.states_licensed, ['CA', 'TX', 'ID']);

  const legacyDirectoryState = (candidate: Provider, stateCode: string) =>
    (candidate.license_state || candidate.state || '').toUpperCase() === stateCode;
  assert.equal(legacyDirectoryState(provider, 'TX'), false);
  assert.equal(legacyDirectoryState(provider, 'ID'), false);
  assert.equal(providerMatchesLicensedState(provider, 'TX'), true);
  assert.equal(providerMatchesLicensedState(provider, 'ID'), true);
  assert.equal(providerMatchesLicensedState(provider, 'CA'), true);
  assert.equal(providerMatchesLicensedState(provider, 'FL'), false);

  const single = mapRowToProvider({
    ...menloRow(),
    states_licensed: ['CA'],
    license_info: { licenses: [license()] },
  });
  assert.equal(providerMatchesLicensedState(single, 'CA'), true);
  assert.equal(providerMatchesLicensedState(single, 'TX'), false);
  assert.equal(providerMatchesLicensedState(single, 'ID'), false);

  const texasOnly = mapRowToProvider({
    ...menloRow(),
    states_licensed: ['TX'],
    license_info: {
      licenses: [
        license({
          state: 'TX',
          license_number: '3562061',
          type: 'General Lines Agency (P&C)',
        }),
      ],
    },
  });
  assert.equal(texasOnly.state, 'CA');
  assert.equal(providerMatchesLicensedState(texasOnly, 'TX'), true);
  assert.equal(providerMatchesLicensedState(texasOnly, 'CA'), false);

  assert.match(QUERIES, /providerMatchesLicensedState/);
  assert.equal(QUERIES.includes('p.license_state || p.state'), false);
  assert.match(QUERIES, /contains\('states_licensed', \[stateCode\]\)/);
});
