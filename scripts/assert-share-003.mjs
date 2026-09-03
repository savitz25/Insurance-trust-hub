/**
 * SHARE-003 metadata contract — Insurance Trust Hub.
 * Run: node scripts/assert-share-003.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const failures = [];
const assert = (cond, msg) => {
  if (!cond) failures.push(msg);
};

const routes = [
  'app/carriers/[slug]/share-og/route.tsx',
  'app/providers/[slug]/share-og/route.tsx',
  'app/guides/[slug]/share-og/route.tsx',
  'app/destinations/[state]/share-og/route.tsx',
  'app/destinations/[state]/[city]/share-og/route.tsx',
];
for (const rel of routes) {
  assert(existsSync(join(root, rel)), `${rel} exists`);
}

const helper = read('lib/og/insurance-share-og.ts');
const model = read('lib/seo/share-card-model.ts');
const card = read('lib/og/insurance-share-card.tsx');
const networkCard = read('lib/og/network-share-card.tsx');
const carrierPage = read('app/carriers/[slug]/page.tsx');
const providerPage = read('app/providers/[slug]/page.tsx');
const providerRoute = read('app/providers/[slug]/share-og/route.tsx');

assert(helper.includes('insuranceFallbackPng'), 'PNG fallback');
assert(helper.includes('insurance-trust-hub-og.png'), 'SHARE-002 PNG path');
assert(helper.includes('canShowAsVerified'), 'provider OG is fail-closed');
assert(!/google|places\.googleapis|GooglePlaces/i.test(helper), 'no Google Places in share helper');
assert(!helper.includes('trustScore'), 'no trust score on OG helper');
assert(!helper.includes('phone'), 'no phone on OG helper');
assert(!/cms endorsed|medicare approved|cms certified/i.test(model), 'no CMS endorsement copy');
assert(!/no complaints|fully verified|trusted|approved/i.test(model), 'no endorsement copy');
assert(model.includes('Coverage · company information · public research'), 'carrier research label');
assert(carrierPage.includes('shareRouteOgImage'), 'carrier metadata uses share-og');
assert(providerPage.includes('shareRouteOgImage'), 'provider metadata uses share-og');
assert(providerPage.includes('canShowAsVerified'), 'unverified providers stay fail-closed');
assert(providerRoute.includes('resolveInsuranceProviderCard'), 'provider share-og uses public gate');
assert(card.includes('insurancetrusthub.com'), 'card domain');
assert(!card.includes('lendertrusthub.com'), 'no foreign hub domain');
assert(networkCard.includes('1200') && networkCard.includes('630'), '1200×630');
assert(!existsSync(join(root, 'app/medicare/contracts/[contractId]/share-og/route.tsx')), 'no medicare contract OG');
assert(!existsSync(join(root, 'app/my-insurance/share-og/route.tsx')), 'no private account OG');

if (failures.length) {
  console.error('SHARE-003 Insurance assertions failed:');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('SHARE-003 Insurance assertions passed.');
