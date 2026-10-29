import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildSitemapEntries } from '../app/sitemap';
import { metadata as acaMetadata } from '../app/hubs/aca/page';
import { metadata as healthMetadata } from '../app/hubs/health-insurance/page';
import { metadata as medicareMetadata } from '../app/hubs/medicare/page';
import { buildHubMetadata } from '../lib/hubs/hub-seo';
import { getHubBySlug, INSURANCE_HUBS } from '../lib/hubs/registry';
import { filterPublishedHubs, isPublishedHub } from '../lib/hubs/published-hub';
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
  const signals = new Map(
    INSURANCE_HUBS.map((hub) => {
      const signal =
        hub.slug === 'miami-dade'
          ? { hubSlug: hub.slug, lookupSucceeded: true as const, verifiedTotal: 8 }
          : hub.slug === 'orlando'
            ? { hubSlug: hub.slug, lookupSucceeded: false as const, verifiedTotal: 4 }
            : hub.slug === 'fort-lauderdale'
              ? { hubSlug: hub.slug, lookupSucceeded: true as const, verifiedTotal: 12 }
              : { hubSlug: hub.slug, lookupSucceeded: true as const, verifiedTotal: 0 };
      return [hub.slug, signal] as const;
    })
  );
  const entries = buildSitemapEntries(new Date(), signals);
  const paths = entries.map(({ url }) => new URL(url).pathname);
  const unique = new Set(paths);

  assert.equal(paths.length, unique.size, `duplicate sitemap paths: ${paths.filter((path, index) => paths.indexOf(path) !== index).join(', ')}`);
  assert.equal(paths.filter((path) => path === '/about').length, 1);

  for (const hub of INSURANCE_HUBS) {
    const path = `/hubs/${hub.stateSlug}/${hub.slug}`;
    const signal = signals.get(hub.slug);
    assert.ok(signal);
    assert.equal(unique.has(path), isPublishedHub(signal), path);
  }

  const fortLauderdale = getHubBySlug('florida', 'fort-lauderdale');
  assert.ok(fortLauderdale);
  assert.equal(
    isPublishedHub({ hubSlug: 'fort-lauderdale', lookupSucceeded: true, verifiedTotal: 12 }),
    false
  );
  assert.equal(
    filterPublishedHubs([fortLauderdale], [
      { hubSlug: 'fort-lauderdale', lookupSucceeded: true, verifiedTotal: 12 },
    ]).length,
    0
  );
  const miamiDade = getHubBySlug('florida', 'miami-dade');
  assert.ok(miamiDade);
  assert.equal(
    isPublishedHub({ hubSlug: 'miami-dade', lookupSucceeded: true, verifiedTotal: 0 }),
    false
  );
  assert.equal(
    isPublishedHub({ hubSlug: 'miami-dade', lookupSucceeded: false, verifiedTotal: 8 }),
    false
  );
  assert.equal(
    isPublishedHub({ hubSlug: 'miami-dade', lookupSucceeded: true, verifiedTotal: 8 }),
    true
  );
  assert.equal(robotsIndex(buildHubMetadata(miamiDade, '/hubs/florida/miami-dade', {
    total: 0,
    lookupSucceeded: true,
  })), false);
  assert.equal(robotsIndex(buildHubMetadata(miamiDade, '/hubs/florida/miami-dade', {
    total: 8,
    lookupSucceeded: false,
  })), false);
  assert.equal(robotsIndex(buildHubMetadata(miamiDade, '/hubs/florida/miami-dade', {
    total: 8,
    lookupSucceeded: true,
  })), true);
  assert.equal(robotsIndex(buildHubMetadata(fortLauderdale, '/hubs/florida/fort-lauderdale', {
    total: 8,
    lookupSucceeded: true,
  })), false);

  for (const topic of SPECIALTY_TOPICS) {
    assert.equal(unique.has(topic.path), isSpecialtyTopicIndexable(topic), topic.path);
  }

  for (const redirect of PERMANENT_REDIRECTS) {
    assert.equal(unique.has(redirect.source), false, redirect.source);
  }

  assert.equal(unique.has('/tools/coverage-compass'), true);
  const southFloridaSignal = signals.get('miami-fort-lauderdale');
  assert.ok(southFloridaSignal);
  assert.equal(unique.has('/hubs/south-florida'), isPublishedHub(southFloridaSignal));
  assert.equal(
    unique.has('/hubs/florida/miami-dade'),
    isPublishedHub(signals.get('miami-dade')!)
  );
  assert.equal(
    unique.has('/hubs/florida/miami-fort-lauderdale'),
    isPublishedHub(southFloridaSignal)
  );
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
  const links = read('components/hubs/state-hub-links.tsx');

  assert.match(directory, /\breadFloridaNavigation\b/);
  assert.match(directory, /\breadNewJerseyNavigation\b/);
  assert.doesNotMatch(directory, /flTotal > 0 \? (read|getCached|Promise)/);
  assert.doesNotMatch(directory, /\bgetLaunchCountyLiveTotals\b/);
  assert.doesNotMatch(directory, /\bcountVerifiedNewJerseyProviders\b/);
  assert.match(directory, /const launchRows = flNav\?\.rows/);
  assert.match(directory, /const flTotal = flNav\?\.total/);
  assert.doesNotMatch(directory, /const flTotal = flNav\?\.total \?\? 0/);

  assert.match(stateHub, /\breadFloridaNavigation\b/);
  assert.match(stateHub, /const flTotal = flNav\?\.total/);
  assert.doesNotMatch(stateHub, /const flTotal = flNav\?\.total \?\? 0/);
  assert.match(stateHub, /const launchRows = flNav\?\.rows/);
  assert.doesNotMatch(stateHub, /\bcountVerifiedFloridaProviders\b/);
  assert.doesNotMatch(stateHub, /\bgetLaunchCountyLiveTotals\b/);

  assert.match(counts, /LAUNCH_COUNT_REVALIDATE_SECONDS = 300/);
  assert.match(counts, /requireSuccessfulLookup: true/);
  assert.doesNotMatch(counts, /catch \{[\s\S]*return \{ fl: 0/);
  assert.doesNotMatch(counts, /ZERO_LAUNCH_COUNTS/);
  assert.match(counts, /async function loadVerifiedLaunchCounts/);
  const cachedLoader = counts.slice(
    counts.indexOf('async function loadVerifiedLaunchCounts'),
    counts.indexOf('export const LAUNCH_COUNT_REVALIDATE_SECONDS')
  );
  assert.doesNotMatch(cachedLoader, /\bcatch\b/);
  assert.match(counts, /export async function readVerifiedLaunchCounts/);

  assert.match(sitemapSource, /isPublishedHub/);
  assert.match(sitemapSource, /readHubPublicationSnapshot/);
  assert.match(sitemapSource, /buildSitemapEntries/);
  assert.doesNotMatch(sitemapSource, /Promise\.all\(\s*INSURANCE_HUBS\.map/);
  assert.doesNotMatch(sitemapSource, /createPublicClient|unstable_cache/);
  assert.match(hubPage, /\bgetHubInventory\b/);
  assert.match(hubPage, /lookupSucceeded: inventory\.lookupSucceeded === true/);
  assert.doesNotMatch(hubPage, /unstable_cache|readFloridaNavigation/);
  assert.match(links, /filterPublishedHubs/);
  assert.match(links, /readHubPublicationSnapshot/);
  assert.doesNotMatch(links, /Promise\.all\(hubs\.map/);

  const snapshot = read('lib/hubs/read-hub-publication-signal.ts');
  assert.match(snapshot, /PUBLICATION_DB_CONCURRENCY/);
  assert.match(snapshot, /mapWithConcurrency/);
  assert.match(snapshot, /publicationCountTasks/);
  assert.equal((snapshot.match(/return await countTaskOnce/g) || []).length, 2);
});
