/**
 * 03C: state pages link sitemap-published county/metro hubs, Kansas is on the
 * homepage state list, and /states is a self-canonical index.
 * Iowa publication is intentionally undecided.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import sitemap from '../app/sitemap';
import { metadata as statesMetadata } from '../app/states/page';
import { PUBLISHED_STATES } from '../lib/home/published-states';
import { getAllStateSlugs, getHubsByState } from '../lib/hubs/registry';
import { PUBLISHED_STATEWIDE_SLUGS } from '../lib/seo/published-state-path';

const sitemapUrls = sitemap().map((entry) => entry.url);
const floridaHubUrls = sitemapUrls.filter((url) => /\/hubs\/florida\/[^/]+$/.test(url));
const floridaHubs = getHubsByState('florida');

assert.equal(floridaHubs.length, 8, 'Florida registry hubs');
assert.equal(floridaHubUrls.length, 8, 'Florida sitemap hub URLs');

const linkComponent = readFileSync('components/hubs/state-hub-links.tsx', 'utf8');
assert.match(linkComponent, /getHubsByState\(stateSlug\)/);
assert.match(linkComponent, /\$\{stateName\} county and metro hubs/);
assert.match(linkComponent, /href=\{`\/hubs\/\$\{stateSlug\}`\}/);
assert.match(linkComponent, /href=\{`\/hubs\/\$\{stateSlug\}\/\$\{hub\.slug\}`\}/);
for (const hub of floridaHubs) {
  const href = `/hubs/florida/${hub.slug}`;
  assert.ok(floridaHubUrls.some((url) => url.endsWith(href)), href);
}

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
assert.equal(PUBLISHED_STATES.some((state) => state.slug === 'iowa'), false);
assert.equal(PUBLISHED_STATEWIDE_SLUGS.includes('iowa' as (typeof PUBLISHED_STATEWIDE_SLUGS)[number]), false);

assert.equal(sitemapUrls.filter((url) => new URL(url).pathname === '/kansas').length, 1);
assert.equal(sitemapUrls.filter((url) => new URL(url).pathname === '/states').length, 1);
assert.equal(sitemapUrls.some((url) => new URL(url).pathname === '/iowa'), false);

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
