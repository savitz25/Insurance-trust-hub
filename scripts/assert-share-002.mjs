/**
 * SHARE-002 metadata contract — Insurance Trust Hub.
 * Run: node scripts/assert-share-002.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const readBin = (rel) => readFileSync(join(root, rel));

const failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function pngSize(rel) {
  const buf = readBin(rel);
  if (buf.subarray(0, 8).toString('binary') !== '\x89PNG\r\n\x1a\n') {
    throw new Error(`${rel} is not a PNG`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const shareHub = read('lib/seo/share-hub.ts');
const metadata = read('lib/seo/metadata.ts');
const constants = read('lib/constants.ts');
const layout = read('app/layout.tsx');
const tools = read('app/tools/coverage-compass/page.tsx');
const carriers = read('app/carriers/page.tsx');

assert(shareHub.includes("id: 'insurance'"), 'SHARE_HUB.id is insurance');
assert(shareHub.includes("host: 'www.insurancetrusthub.com'"), 'SHARE_HUB.host');
assert(
  shareHub.includes("origin: 'https://www.insurancetrusthub.com'"),
  'SHARE_HUB.origin',
);
assert(
  shareHub.includes("ogImagePath: '/brand/insurance-trust-hub-og.png'"),
  'OG path is PNG not a logo strip',
);
assert(shareHub.includes('ogWidth: 1200'), '1200 width');
assert(shareHub.includes('ogHeight: 630'), '630 height');
assert(shareHub.includes("twitterCard: 'summary_large_image'"), 'twitter large');
assert(shareHub.includes('asktrusthub.com'), 'foreign host list includes Ask');
assert(shareHub.includes('movetrusthub.com'), 'foreign host list includes Move');
assert(constants.includes("SITE_URL = 'https://www.insurancetrusthub.com'"), 'SITE_URL matches Insurance');
assert(metadata.includes("from '@/lib/seo/share-hub'"), 'metadata imports SHARE_HUB');
assert(metadata.includes('resolveShareOrigin'), 'origin is pinned');
assert(metadata.includes('SHARE_HUB.twitterCard'), 'twitter card from SHARE_HUB');
assert(!metadata.includes('localhost'), 'no localhost in metadata');
assert(!metadata.includes('127.0.0.1'), 'no 127.0.0.1 in metadata');
assert(!metadata.includes('.vercel.app'), 'no vercel.app in metadata');
assert(!/https:\/\/www\.(ask|move|lender|contractor|senior|investor)trusthub\.com/.test(metadata), 'no other Hub origin in metadata');
assert(layout.includes('rootLayoutMetadata'), 'layout uses root metadata');
assert(tools.includes('buildMetadata'), 'coverage compass uses buildMetadata fallback card');
assert(carriers.includes('buildMetadata'), 'carriers research page uses buildMetadata fallback card');

const card = pngSize('public/brand/insurance-trust-hub-og.png');
assert(card.width === 1200 && card.height === 630, `OG PNG is 1200×630, got ${card.width}×${card.height}`);

if (failures.length) {
  console.error('SHARE-002 Insurance assertions failed:');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('SHARE-002 Insurance assertions passed (host, 1200×630 PNG, twitter large, no localhost, no cross-Hub).');
