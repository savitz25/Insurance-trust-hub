/**
 * 03C: state pages link sitemap-published county/metro hubs, Kansas and Iowa
 * are on the homepage state list, and /states is a self-canonical index.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildSitemapEntries } from '../app/sitemap';
import { metadata as statesMetadata } from '../app/states/page';
import { PUBLISHED_STATES } from '../lib/home/published-states';
import { filterPublishedHubs, isPublishedHub } from '../lib/hubs/published-hub';
import { getAllStateSlugs, getHubsByState } from '../lib/hubs/registry';
import { PUBLISHED_STATEWIDE_SLUGS } from '../lib/seo/published-state-path';

async function main() {
const sitemapUrls = buildSitemapEntries(new Date(), new Map()).map((entry) => entry.url);
const publishedFixture = buildSitemapEntries(
  new Date(),
  new Map([
    ['miami-dade', { hubSlug: 'miami-dade', lookupSucceeded: true, verifiedTotal: 3 }],
    ['fort-lauderdale', { hubSlug: 'fort-lauderdale', lookupSucceeded: true, verifiedTotal: 9 }],
    ['tampa', { hubSlug: 'tampa', lookupSucceeded: true, verifiedTotal: 0 }],
  ])
).map((entry) => entry.url);
const floridaHubUrls = sitemapUrls.filter((url) => /\/hubs\/florida\/[^/]+$/.test(url));
const floridaHubs = getHubsByState('florida');

assert.equal(floridaHubs.length, 8, 'Florida registry hubs');
assert.equal(
  floridaHubs.some((hub) => hub.slug === 'fort-lauderdale'),
  true,
  'fort-lauderdale stays in the Florida registry'
);
assert.equal(
  floridaHubUrls.some((url) => url.endsWith('/hubs/florida/fort-lauderdale')),
  false,
  'fort-lauderdale stays out of the sitemap'
);
assert.equal(
  publishedFixture.some((url) => url.endsWith('/hubs/florida/miami-dade')),
  true,
  'positive launch inventory is published'
);
assert.equal(
  publishedFixture.some((url) => url.endsWith('/hubs/florida/fort-lauderdale')),
  false,
  'fort-lauderdale stays unpublished with a positive count'
);
assert.equal(
  publishedFixture.some((url) => url.endsWith('/hubs/florida/tampa')),
  false,
  'zero inventory stays unpublished'
);
for (const url of floridaHubUrls) {
  const slug = new URL(url).pathname.split('/').pop() ?? '';
  assert.equal(
    isPublishedHub({ hubSlug: slug, lookupSucceeded: true, verifiedTotal: 1 }),
    true,
    url
  );
}
const published = filterPublishedHubs(floridaHubs, [
  { hubSlug: 'miami-dade', lookupSucceeded: true, verifiedTotal: 4 },
  { hubSlug: 'fort-lauderdale', lookupSucceeded: true, verifiedTotal: 9 },
  { hubSlug: 'tampa', lookupSucceeded: true, verifiedTotal: 0 },
  { hubSlug: 'orlando', lookupSucceeded: false, verifiedTotal: 6 },
]);
assert.deepEqual(
  published.map((hub) => hub.slug),
  ['miami-dade']
);

const linkComponent = readFileSync('components/hubs/state-hub-links.tsx', 'utf8');
assert.match(linkComponent, /getHubsByState\(stateSlug\)/);
assert.match(linkComponent, /filterPublishedHubs/);
assert.match(linkComponent, /\$\{stateName\} county and metro hubs/);
assert.match(linkComponent, /href=\{`\/hubs\/\$\{stateSlug\}`\}/);
assert.match(linkComponent, /href=\{`\/hubs\/\$\{stateSlug\}\/\$\{hub\.slug\}`\}/);

const floridaPage = readFileSync('app/florida/page.tsx', 'utf8');
assert.match(floridaPage, /<StateHubLinks stateSlug="florida" \/>/);

const njPage = readFileSync('app/new-jersey/page.tsx', 'utf8');
const njView = readFileSync('components/new-jersey/nj-state-page.tsx', 'utf8');
assert.doesNotMatch(njPage, /StateHubLinks/);
assert.doesNotMatch(njView, /StateHubLinks/);
assert.match(njView, /href="\/hubs\/new-jersey"/);

for (const slug of getAllStateSlugs()) {
  const pagePath = `app/${slug}/page.tsx`;
  if (!existsSync(pagePath)) continue;
  const source = readFileSync(pagePath, 'utf8');
  if (slug === 'new-jersey') continue;
  assert.match(source, new RegExp(`<StateHubLinks stateSlug="${slug}" \\/>`), pagePath);
  assert.ok(getHubsByState(slug).length > 0, pagePath);
}

assert.ok(PUBLISHED_STATEWIDE_SLUGS.includes('kansas'));
assert.equal(
  PUBLISHED_STATES.find((state) => state.slug === 'kansas')?.abbreviation,
  'KS',
);
assert.equal(PUBLISHED_STATES.find((state) => state.slug === 'kansas')?.href, '/kansas');
assert.ok(PUBLISHED_STATEWIDE_SLUGS.includes('iowa'));
assert.equal(
  PUBLISHED_STATES.find((state) => state.slug === 'iowa')?.abbreviation,
  'IA',
);
assert.equal(PUBLISHED_STATES.find((state) => state.slug === 'iowa')?.href, '/iowa');

assert.equal(sitemapUrls.filter((url) => new URL(url).pathname === '/kansas').length, 1);
assert.equal(sitemapUrls.filter((url) => new URL(url).pathname === '/iowa').length, 1);
assert.equal(sitemapUrls.filter((url) => new URL(url).pathname === '/states').length, 1);

const canonical = statesMetadata.alternates && 'canonical' in statesMetadata.alternates
  ? statesMetadata.alternates.canonical
  : null;
assert.equal(canonical, 'https://www.insurancetrusthub.com/states');

const home = readFileSync('components/home/insurance-home-intelligence.tsx', 'utf8');
assert.match(home, /href="\/states"/);
const footer = readFileSync('lib/design/insurance-design-system.ts', 'utf8');
assert.match(footer, /href: '\/states'/);

const statesPage = readFileSync('app/states/page.tsx', 'utf8');
assert.match(statesPage, /path: '\/states'/);
assert.match(statesPage, /PUBLISHED_STATES/);

console.log('03c state hub links: ok');
}

void main();
