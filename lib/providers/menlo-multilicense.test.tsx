import React from 'react';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProviderLicenseProfileExtras } from '@/components/providers/provider-license-profile';
import { canShowAsVerified, resolveProviderTrustState } from '@/lib/insurance/trust/provider-trust-state';
import { BUSINESS_SUPPLIED_TITLE } from '@/lib/providers/business-supplied';
import {
  badgeEligibleLicenses,
  informationalLicenseSentence,
  primaryLicenseEntry,
} from '@/lib/providers/license-entries';
import { mapRowToProvider } from '@/lib/providers/map-db-provider';
import { getRegulatorProfile, regulatorHasLoaSpecialtyTags } from '@/lib/regulators/labels';
import { buildMetadata } from '@/lib/seo/metadata';
import { buildInsuranceAgencySchema } from '@/lib/seo/schemas';
import { getLicenseDepartment } from '@/lib/tools/license-verification';
import type { Provider } from '@/types/provider';
import type { LicenseEntry, LicenseInfo, Provider as DbProvider } from '@/types/supabase';

const NOW = new Date('2026-11-10T15:00:00.000Z');
const PAGE = readFileSync(join(process.cwd(), 'app/providers/[slug]/page.tsx'), 'utf8');

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

function dbProvider(licenseInfo: LicenseInfo, contact: DbProvider['contact'] = {}, verified = true): DbProvider {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'opero-labs-inc-6020106',
    name: 'Opero Labs Inc. DBA Menlo Insurance Services',
    provider_type: 'brokerage',
    categories: ['homeowners', 'auto'],
    states_licensed: ['CA'],
    cities: ['San Francisco'],
    license_info: licenseInfo,
    specialties: [],
    rating: 0,
    review_count: 0,
    years_in_business: null,
    relocation_experience: false,
    verified,
    description: null,
    short_description: 'Research listing',
    contact: {
      phone: '(415) 555-0100',
      website: 'https://www.menloinsurance.com/',
      address: {
        street: '406 Utah St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94110',
      },
      ...contact,
    },
    created_at: '2026-10-24T00:00:00.000Z',
    updated_at: '2026-10-24T00:00:00.000Z',
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

function menloContact(): DbProvider['contact'] {
  return {
    business_supplied: {
      source: 'BUSINESS_SUPPLIED',
      supplied_at: '2026-10-24',
      supplied_via: 'listing forms',
      lines: ['Home', 'Auto', 'Business P&C'],
      hours: ['Mon–Fri 9–5'],
      offices: [
        {
          label: 'Austin',
          address: '5900 Balcones Dr Ste 100, Austin TX 78731',
          verified: false,
        },
        {
          label: 'Post Falls',
          address: '784 S. Clearwater Loop Ste B, Post Falls ID 83854',
          verified: false,
        },
      ],
      phone: '(628) 285-5140',
      email: 'support@menloinsurance.com',
    },
  };
}

function renderProfile(provider: Provider): string {
  const verified = canShowAsVerified(resolveProviderTrustState(provider));
  const meta = buildMetadata({
    title: provider.name,
    description: provider.short_description || provider.name,
    path: `/providers/${provider.slug}`,
    noIndex: !verified,
  });
  const robots = meta.robots && typeof meta.robots === 'object' ? meta.robots : {};
  const legacy = [
    provider.license_state,
    provider.license_number,
    provider.license_notes ?? '',
  ].join(' ');
  return [
    `<meta name="robots" content="${robots.index ? 'index' : 'noindex'}" />`,
    `<script type="application/ld+json">${JSON.stringify(buildInsuranceAgencySchema(provider))}</script>`,
    `<p data-legacy-license="true">${legacy}</p>`,
    renderToStaticMarkup(<ProviderLicenseProfileExtras provider={provider} now={NOW} />),
  ].join('');
}

function badgeBlocks(html: string): string[] {
  return [...html.matchAll(/<li[^>]*data-license-badge="true"[\s\S]*?<\/li>/g)].map((match) => match[0]);
}

function officeBlock(html: string, label: string): string {
  const marker = `data-office="${label}"`;
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, `missing office ${label}`);
  const next = html.indexOf('data-office=', start + marker.length);
  return html.slice(start, next === -1 ? html.length : next);
}

test('Idaho regulator lookup is the Department of Insurance', () => {
  const department = getLicenseDepartment('ID');
  assert.equal(department?.department, 'Idaho Department of Insurance');
  assert.equal(department?.lookupUrl, 'https://doi.idaho.gov/public/licensing/');
  const profile = getRegulatorProfile('ID');
  assert.equal(profile?.label, 'Idaho Department of Insurance');
  assert.equal(profile?.lookupUrl, 'https://doi.idaho.gov/public/licensing/');
  assert.equal(profile?.allowsLeadForm, false);
  assert.equal(regulatorHasLoaSpecialtyTags('ID'), false);
});

test('badge filter keeps verified licenses and drops informational and expired', () => {
  const info = menloLicenseInfo();
  const eligible = badgeEligibleLicenses(info, NOW);
  assert.deepEqual(
    eligible.map((entry) => entry.license_number),
    ['6020106', '3562061', '3004512285']
  );
  assert.equal(primaryLicenseEntry(info)?.license_number, '6020106');
  assert.equal(
    informationalLicenseSentence(info.informational![0]),
    'Also on the TX record (informational, not badged): Surplus Lines Agency 3573111'
  );

  const dropped = [
    license({ status: 'pending' }),
    license({ identityMatchAccepted: false }),
    license({ source: '  ' }),
    license({ checkedAt: '' }),
    license({ expires_at: '2026-11-09' }),
    license({ expires_at: 'not-a-date' }),
  ];
  for (const entry of dropped) {
    assert.equal(badgeEligibleLicenses({ licenses: [license(), entry] }, NOW).length, 1);
  }
  assert.equal(
    badgeEligibleLicenses({ licenses: [license({ expires_at: null })] }, NOW).length,
    1
  );
  assert.equal(
    badgeEligibleLicenses({ licenses: [license({ expires_at: '2026-11-10' })] }, NOW).length,
    1
  );
});

test('business-supplied card labels every field and marks unverified offices', () => {
  const provider = mapRowToProvider(dbProvider(menloLicenseInfo(), menloContact()));
  const html = renderToStaticMarkup(
    <ProviderLicenseProfileExtras provider={provider} now={NOW} />
  );
  assert.match(html, new RegExp(BUSINESS_SUPPLIED_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const field of ['Supplied at', 'Supplied via', 'Lines', 'Hours', 'Austin', 'Post Falls', 'Phone', 'Email']) {
    const block = html.slice(html.indexOf(`data-business-field="${field}"`));
    assert.match(block, /BUSINESS-SUPPLIED/);
  }
  assert.match(html, /Home, Auto, Business P&amp;C|Home, Auto, Business P&C/);
  assert.match(html, /Mon–Fri 9–5/);
  assert.match(html, /href="mailto:support@menloinsurance.com"/);
  assert.match(html, /support@menloinsurance.com \(business-supplied\)/);
  const postFalls = officeBlock(html, 'Post Falls');
  assert.match(postFalls, /unverified/);
  assert.match(postFalls, /BUSINESS-SUPPLIED/);
  assert.match(postFalls, /784 S\. Clearwater Loop/);
  const austin = officeBlock(html, 'Austin');
  assert.match(austin, /unverified/);

  const verifiedOffice = mapRowToProvider(
    dbProvider(
      { licenses: [license()] },
      {
        business_supplied: {
          source: 'BUSINESS_SUPPLIED',
          lines: ['Home'],
          offices: [{ label: 'San Francisco', address: '406 Utah St', verified: true }],
          email: 'desk@example.com',
        },
      }
    )
  );
  const verifiedHtml = renderToStaticMarkup(
    <ProviderLicenseProfileExtras provider={verifiedOffice} now={NOW} />
  );
  const sf = officeBlock(verifiedHtml, 'San Francisco');
  assert.equal(sf.includes('unverified'), false);
  assert.match(sf, /BUSINESS-SUPPLIED/);
});

test('multi-license profile badges CA, TX, and ID and keeps informational out of badges and JSON-LD', () => {
  const provider = mapRowToProvider(dbProvider(menloLicenseInfo(), menloContact()));
  assert.equal(provider.license_number, '6020106');
  assert.equal(provider.license_state, 'CA');
  assert.match(provider.license_notes || '', /NPN 22310566/);
  assert.equal(provider.phone, '(415) 555-0100');
  assert.equal(
    provider.licenses?.some((entry) => entry.license_number === '3573111'),
    false
  );
  assert.equal(provider.informational_licenses?.[0]?.license_number, '3573111');

  const html = renderProfile(provider);
  const badges = badgeBlocks(html);
  assert.deepEqual(
    badges.map((block) => block.match(/data-license-number="([^"]+)"/)?.[1]),
    ['6020106', '3562061', '3004512285']
  );
  assert.equal(badges.some((block) => block.includes('3573111')), false);
  assert.equal(badges.some((block) => block.includes('1111111')), false);
  assert.equal(badges.some((block) => block.includes('2222222')), false);
  const idaho = badges[2];
  assert.match(idaho, /Non-resident producer, Casualty \+ Property/);
  assert.match(idaho, /2028-09-30/);
  assert.match(idaho, /non-resident/);
  assert.match(idaho, /https:\/\/doi\.idaho\.gov\/public\/licensing\//);
  assert.match(idaho, /Idaho Department of Insurance/);
  assert.match(html, /Also on the TX record \(informational, not badged\): Surplus Lines Agency 3573111/);
  assert.match(html, /data-legacy-license="true"[^>]*>CA 6020106/);
  assert.match(html, /NPN 22310566/);

  const schema = JSON.stringify(buildInsuranceAgencySchema(provider));
  assert.match(schema, /6020106/);
  assert.match(schema, /3562061/);
  assert.match(schema, /3004512285/);
  assert.equal(schema.includes('3573111'), false);
  assert.equal(schema.includes('1111111'), false);
  assert.equal(schema.includes('support@menloinsurance.com'), false);
  assert.equal(schema.includes('Post Falls'), false);
  assert.equal(schema.includes('BUSINESS-SUPPLIED'), false);
  assert.equal(canShowAsVerified(resolveProviderTrustState(provider)), true);
  assert.match(html, /content="index"/);
});

test('single-license profiles render unchanged', () => {
  const singleInfo: LicenseInfo = { licenses: [license()] };
  const single = mapRowToProvider(dbProvider(singleInfo));
  const extras = renderToStaticMarkup(
    <ProviderLicenseProfileExtras provider={single} now={NOW} />
  );
  assert.equal(extras, '');
  const schema = buildInsuranceAgencySchema(single);
  assert.equal('hasCredential' in schema, false);
  assert.equal(JSON.stringify(schema).includes('3573111'), false);
  assert.equal(single.license_number, '6020106');
  assert.equal(single.license_state, 'CA');
  assert.equal(single.informational_licenses?.length ?? 0, 0);
  assert.equal(single.business_supplied, null);
  assert.equal(canShowAsVerified(resolveProviderTrustState(single)), true);

  const withInformational = mapRowToProvider(
    dbProvider({
      licenses: [license()],
      informational: menloLicenseInfo().informational,
    })
  );
  assert.equal(canShowAsVerified(resolveProviderTrustState(withInformational)), true);
  assert.equal(withInformational.license_number, single.license_number);
  const infoHtml = renderToStaticMarkup(
    <ProviderLicenseProfileExtras provider={withInformational} now={NOW} />
  );
  assert.equal(infoHtml.includes('data-license-badge'), false);
  assert.match(infoHtml, /informational, not badged/);
  assert.equal(JSON.stringify(buildInsuranceAgencySchema(withInformational)).includes('3573111'), false);

  const unverified = mapRowToProvider(dbProvider(singleInfo, {}, false));
  assert.equal(canShowAsVerified(resolveProviderTrustState(unverified)), false);
  const unverifiedHtml = renderProfile(unverified);
  assert.match(unverifiedHtml, /content="noindex"/);
  const verifiedHtml = renderProfile(single);
  assert.match(verifiedHtml, /content="index"/);

  assert.match(PAGE, /noIndex: !verified/);
  assert.match(PAGE, /InsuranceVerificationBadge/);
  assert.match(PAGE, /ProviderLicenseCredentialBadges/);
  assert.match(PAGE, /ProviderInformationalLicenses/);
  assert.match(PAGE, /BusinessSuppliedCard/);
  assert.equal(PAGE.includes('informational_licenses') && PAGE.includes('noIndex: provider.informational'), false);
});
