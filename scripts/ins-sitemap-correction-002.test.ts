import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildSitemapEntries } from '../app/sitemap';
import { INSURANCE_HUBS } from '../lib/hubs/registry';
import { hubSlugCanCarryVerifiedInventory } from '../lib/hubs/sitemap-eligibility';
import {
  assertAuthoritativeSitemap,
  labelLocalFixtureEntries,
  LOCAL_FIXTURE_ORIGIN,
  missingAuthoritativeHubs,
  selectSitemapMode,
  SitemapPublicationIncomplete,
} from '../lib/hubs/sitemap-publication-mode';
import type { HubPublicationSignal } from '../lib/hubs/published-hub';

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

function signalsFor(total: number, failedSlug?: string): Map<string, HubPublicationSignal> {
  return new Map(
    INSURANCE_HUBS.map((hub) => {
      const failed = hub.slug === failedSlug;
      const signal: HubPublicationSignal = {
        hubSlug: hub.slug,
        lookupSucceeded: !failed,
        verifiedTotal: failed ? 0 : total,
      };
      return [hub.slug, signal] as const;
    })
  );
}

test('a required inventory failure rejects authoritative publication', () => {
  const signals = signalsFor(8, 'orlando');
  assert.deepEqual(missingAuthoritativeHubs(INSURANCE_HUBS, signals), ['orlando']);
  assert.throws(
    () => assertAuthoritativeSitemap(INSURANCE_HUBS, signals),
    (error: unknown) => error instanceof SitemapPublicationIncomplete && error.slugs.includes('orlando')
  );
  const reduced = buildSitemapEntries(new Date('2026-10-29T00:00:00.000Z'), signals);
  assert.equal(reduced.some((entry) => entry.url.endsWith('/hubs/florida/orlando')), false);
  assert.equal(reduced.some((entry) => entry.url === 'https://www.insurancetrusthub.com/florida'), true);
});

test('a successful zero stays unpublished and the rest of the sitemap remains', () => {
  const signals = signalsFor(0);
  assert.deepEqual(missingAuthoritativeHubs(INSURANCE_HUBS, signals), []);
  assert.doesNotThrow(() => assertAuthoritativeSitemap(INSURANCE_HUBS, signals));
  const entries = buildSitemapEntries(new Date('2026-10-29T00:00:00.000Z'), signals);
  const hubUrls = entries.filter((entry) => entry.url.includes('/hubs/florida/'));
  assert.equal(hubUrls.length, 0);
  assert.equal(entries.some((entry) => entry.url === 'https://www.insurancetrusthub.com/florida'), true);
});

test('recovery after a failed snapshot publishes the complete inventory', () => {
  const failed = signalsFor(4, 'miami-dade');
  assert.throws(() => assertAuthoritativeSitemap(INSURANCE_HUBS, failed));
  const recovered = signalsFor(4);
  assert.doesNotThrow(() => assertAuthoritativeSitemap(INSURANCE_HUBS, recovered));
  const entries = buildSitemapEntries(new Date('2026-10-29T00:00:00.000Z'), recovered);
  for (const hub of INSURANCE_HUBS) {
    if (!hubSlugCanCarryVerifiedInventory(hub.slug)) continue;
    assert.equal(entries.some((entry) => entry.url.endsWith(`/hubs/${hub.stateSlug}/${hub.slug}`)), true, hub.slug);
  }
});

test('absent configuration is not a fixture unless the local mode is explicit and off-deploy', () => {
  assert.equal(selectSitemapMode({ configured: false, localFixture: false }), 'credentials-absent');
  assert.equal(
    selectSitemapMode({ configured: false, localFixture: true, vercelEnv: 'production' }),
    'credentials-absent'
  );
  assert.equal(
    selectSitemapMode({ configured: false, localFixture: true, vercelEnv: 'preview' }),
    'credentials-absent'
  );
  assert.equal(selectSitemapMode({ configured: true, localFixture: true, vercelEnv: 'production' }), 'authoritative');
  assert.equal(selectSitemapMode({ configured: false, localFixture: true }), 'local-fixture');
});

test('the explicit local fixture origin is not the production sitemap', () => {
  const entries = labelLocalFixtureEntries(buildSitemapEntries(new Date('2026-10-29T00:00:00.000Z'), new Map()));
  assert.ok(entries.length > 0);
  assert.equal(entries.every((entry) => entry.url.startsWith(LOCAL_FIXTURE_ORIGIN)), true);
  assert.equal(entries.some((entry) => entry.url.includes('insurancetrusthub.com')), false);
});

test('publication column readers stay disabled', () => {
  const sitemap = read('app/sitemap.ts');
  const snapshot = read('lib/hubs/read-hub-publication-signal.ts');
  const counties = read('lib/dfs/providers-by-county.ts');
  const mode = read('lib/hubs/sitemap-publication-mode.ts');
  for (const source of [sitemap, snapshot, counties, mode]) {
    assert.equal(source.includes('publication_county_id'), false);
    assert.equal(source.includes('publication_license_ok'), false);
    assert.equal(source.includes('publication_checked_at'), false);
  }
  assert.match(sitemap, /assertAuthoritativeSitemap/);
  assert.match(sitemap, /SitemapCredentialsAbsent/);
  assert.match(sitemap, /force-dynamic/);
});
