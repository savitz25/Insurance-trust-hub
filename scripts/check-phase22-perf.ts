/**
 * Phase 22 — performance + crawl hygiene guards.
 *   npm run check:phase22-perf
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

if (!existsSync(resolve(root, 'docs/PHASE-22-PERFORMANCE.md'))) {
  errors.push('missing docs/PHASE-22-PERFORMANCE.md');
}

const layout = read('app/layout.tsx');
if (!/display:\s*'swap'/.test(layout)) errors.push('Inter must use font-display swap');
if (!/InsurancePwaProvider/.test(layout) || !/ssr:\s*false/.test(layout)) {
  errors.push('PWA provider should load after first paint');
}

const nextConfig = read('next.config.ts');
if (!/optimizePackageImports/.test(nextConfig)) {
  errors.push('next.config should optimize lucide-react imports');
}

const hub = read('components/hub-page-view.tsx');
if (/healthProviders\.map\(\(p\) => \(\s*<ProviderCard/.test(hub)) {
  errors.push('hubs must not duplicate the full card list in the health section');
}
if (!/force-dynamic/.test(read('app/hubs/[state]/[slug]/page.tsx'))) {
  errors.push('hub pages must stay force-dynamic for live inventory');
}

const cards = read('components/provider-card.tsx');
if (!/SaveProviderButtonLazy/.test(cards)) {
  errors.push('directory/hub cards should lazy-hydrate Save');
}

const flagship = read('components/marketplace/flagship-plan-research.tsx');
if (!/FlagshipPlanResults/.test(flagship) || !/dynamic\(/.test(flagship)) {
  errors.push('Marketplace ZIP form should defer result/planner chunk');
}

const robots = read('app/robots.ts');
if (!/sitemap/.test(robots) || !/my-insurance/.test(robots)) {
  errors.push('robots should point at sitemap and block wallet/admin');
}
if (/movetrusthub/i.test(robots)) errors.push('robots must not reference MoveTrustHub');

const sitemap = read('app/sitemap.ts');
if (/movetrusthub\.com/.test(sitemap) && !/never emit/.test(sitemap)) {
  errors.push('sitemap source should not emit Move URLs');
}
if (!/isPrioritySitemapPath/.test(sitemap) || !/clusterCanonicals/.test(sitemap)) {
  errors.push('sitemap must keep live-cluster priority including canonical hub paths');
}

const FORBIDDEN = [/get quotes/i, /illustrative seed/i];
for (const rel of ['components/hub-page-view.tsx', 'app/layout.tsx']) {
  const text = read(rel);
  for (const re of FORBIDDEN) {
    if (re.test(text)) errors.push(`${rel} matches ${re}`);
  }
}

const pkg = read('package.json');
if (!/check:phase22-perf/.test(pkg)) errors.push('package.json missing check:phase22-perf');

if (errors.length) {
  console.error('Phase 22 performance checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 22 performance and crawl checks passed');
