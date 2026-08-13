/**
 * Phase 19 — SEO compounding guards.
 *   npm run check:phase19-seo
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  SEO_CLUSTERS,
  clusterForHubSlug,
  marketplaceClusterChips,
} from '../lib/seo/seo-clusters';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

if (!existsSync(resolve(root, 'docs/PHASE-19-SEO-COMPOUNDING.md'))) {
  errors.push('missing docs/PHASE-19-SEO-COMPOUNDING.md');
}

const requiredIds = ['south-florida', 'jacksonville', 'houston', 'las-vegas', 'burlington'];
for (const id of requiredIds) {
  if (!SEO_CLUSTERS.some((c) => c.id === id)) errors.push(`missing cluster ${id}`);
}

if (!clusterForHubSlug('jacksonville') || !clusterForHubSlug('las-vegas')) {
  errors.push('cluster slug lookup failed');
}

if (clusterForHubSlug('miami-dade')?.id === 'south-florida') {
  errors.push('county hubs must not inherit the South Florida aggregate title');
}

const hubSeo = read('lib/hubs/hub-seo.ts');
if (!/clusterForPath/.test(hubSeo)) errors.push('hub SEO must use cluster titles');

const hubView = read('components/hub-page-view.tsx');
if (!/ResearchThisMarket/.test(hubView)) errors.push('hubs need Research this market module');
if (!/BreadcrumbList|buildBreadcrumbListJsonLd/.test(hubView)) {
  errors.push('hubs need breadcrumb schema');
}
if (!/ItemList/.test(hubView)) errors.push('hubs should emit ItemList only with cards');
if (!/jacksonville/.test(hubView) || !/las-vegas/.test(hubView) || !/burlington/.test(hubView)) {
  errors.push('priority hubs missing guide/tool link rows');
}

const market = read('app/tools/marketplace-plan-research/page.tsx');
if (!/marketplaceClusterChips/.test(market)) {
  errors.push('Marketplace page must chip live hubs');
}

const sitemap = read('app/sitemap.ts');
if (!/isPrioritySitemapPath/.test(sitemap) || !/clusterCanonicals/.test(sitemap)) {
  errors.push('sitemap must boost priority clusters and include /hubs/south-florida');
}

const chips = marketplaceClusterChips();
if (!chips.some((c) => c.href.includes('las-vegas'))) {
  errors.push('marketplace chips missing Las Vegas');
}

const FORBIDDEN = [/best cheap quotes/i, /get quotes/i, /free quotes/i, /illustrative seed/i];
for (const rel of [
  'lib/seo/seo-clusters.ts',
  'components/research-this-market.tsx',
  'components/hub-page-view.tsx',
]) {
  const text = read(rel);
  for (const re of FORBIDDEN) {
    if (re.test(text)) errors.push(`${rel} matches ${re}`);
  }
}

const pkg = read('package.json');
if (!/check:phase19-seo/.test(pkg)) errors.push('package.json missing check:phase19-seo');

if (errors.length) {
  console.error('Phase 19 SEO checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 19 SEO compounding checks passed');
