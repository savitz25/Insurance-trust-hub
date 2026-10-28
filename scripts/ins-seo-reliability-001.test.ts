import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import sitemap from '../app/sitemap';
import { metadata as acaMetadata } from '../app/hubs/aca/page';
import { metadata as healthMetadata } from '../app/hubs/health-insurance/page';
import { metadata as medicareMetadata } from '../app/hubs/medicare/page';
import { INSURANCE_HUBS } from '../lib/hubs/registry';
import { hubSlugCanCarryVerifiedInventory } from '../lib/hubs/sitemap-eligibility';
import {
  isSpecialtyTopicIndexable,
  SPECIALTY_TOPICS,
} from '../lib/hubs/specialty-topics';
import { PERMANENT_REDIRECTS } from '../lib/seo/permanent-redirects';
import nextConfig from '../next.config';

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

function robotsIndex(metadata: { robots?: unknown }): boolean | undefined {
  const robots = metadata.robots;
  if (!robots || typeof robots !== 'object' || !('index' in robots)) return undefined;
  return Boolean((robots as { index: unknown }).index);
}

test('sitemap lists only launch hubs, indexable specialties, and non-redirect URLs', async () => {
  const entries = await sitemap();
  const paths = entries.map(({ url }) => new URL(url).pathname);
  const unique = new Set(paths);

  assert.equal(paths.length, unique.size, `duplicate sitemap paths: ${paths.filter((path, index) => paths.indexOf(path) !== index).join(', ')}`);
  assert.equal(paths.filter((path) => path === '/about').length, 1);

  for (const hub of INSURANCE_HUBS) {
    const path = `/hubs/${hub.stateSlug}/${hub.slug}`;
    assert.equal(unique.has(path), hubSlugCanCarryVerifiedInventory(hub.slug), path);
  }

  for (const topic of SPECIALTY_TOPICS) {
    assert.equal(unique.has(topic.path), isSpecialtyTopicIndexable(topic), topic.path);
  }

  for (const redirect of PERMANENT_REDIRECTS) {
    assert.equal(unique.has(redirect.source), false, redirect.source);
  }

  assert.equal(unique.has('/tools/coverage-compass'), true);
  assert.equal(unique.has('/hubs/south-florida'), true);
  assert.equal(unique.has('/hubs/florida/miami-dade'), true);
  assert.equal(unique.has('/hubs/florida/miami-fort-lauderdale'), true);
  assert.equal(unique.has('/hubs/florida/fort-lauderdale'), false);
  assert.equal(unique.has('/hubs/california/los-angeles'), false);
  assert.equal(unique.has('/tools/needs-assessment'), false);

  const redirects = await nextConfig.redirects();
  assert.deepEqual(
    redirects.map(({ source, destination, permanent }) => ({ source, destination, permanent })),
    PERMANENT_REDIRECTS.map((redirect) => ({ ...redirect, permanent: true }))
  );

  for (const [path, metadata, topic] of [
    ['/hubs/aca', acaMetadata, SPECIALTY_TOPICS.find((item) => item.path === '/hubs/aca')],
    ['/hubs/medicare', medicareMetadata, SPECIALTY_TOPICS.find((item) => item.path === '/hubs/medicare')],
    ['/hubs/health-insurance', healthMetadata, SPECIALTY_TOPICS.find((item) => item.path === '/hubs/health-insurance')],
  ] as const) {
    assert.ok(topic);
    assert.equal(robotsIndex(metadata), isSpecialtyTopicIndexable(topic), path);
    assert.equal(metadata.alternates?.canonical, `https://www.insurancetrusthub.com${path}`);
  }
});

test('navigation totals are cached and hub inventory failures stay uncached', () => {
  const directory = read('app/directory/page.tsx');
  const stateHub = read('app/hubs/[state]/page.tsx');
  const counts = read('lib/directory/live-counts.ts');
  const sitemapSource = read('app/sitemap.ts');
  const hubPage = read('app/hubs/[state]/[slug]/page.tsx');

  for (const name of [
    'getCachedLaunchCountyLiveTotals',
    'getCachedTxLaunchMarketLiveTotals',
    'getCachedNjLaunchRegionLiveTotals',
    'getCachedVerifiedNewJerseyCount',
  ]) {
    assert.match(directory, new RegExp(`\\b${name}\\b`));
  }
  assert.doesNotMatch(directory, /\bgetLaunchCountyLiveTotals\b/);
  assert.doesNotMatch(directory, /\bcountVerifiedNewJerseyProviders\b/);

  assert.match(stateHub, /\bgetCachedLaunchCountyLiveTotals\b/);
  assert.doesNotMatch(stateHub, /\bgetLaunchCountyLiveTotals\b/);

  assert.match(counts, /LAUNCH_COUNT_REVALIDATE_SECONDS = 300/);
  assert.match(counts, /revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS/);
  assert.match(counts, /ith-launch-county-live-totals-v1/);

  assert.doesNotMatch(sitemapSource, /providers-by-county|createPublicClient|unstable_cache|supabase/);
  assert.match(hubPage, /\bgetHubInventory\b/);
  assert.doesNotMatch(hubPage, /unstable_cache|getCachedLaunchCountyLiveTotals/);
});
