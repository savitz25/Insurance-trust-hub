/**
 * Phase 17 — production inventory integrity + trust lock.
 *   npm run check:phase17-inventory
 *
 * Set PHASE17_REQUIRE_LIVE=1 to fail if production fetch is unavailable.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { getRegulatorLabel } from '../lib/regulators/labels';

const root = resolve(process.cwd());
const errors: string[] = [];
const PROD = 'https://www.insurancetrusthub.com';

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

const CONSUMER_FILES = [
  'app/directory/page.tsx',
  'app/page.tsx',
  'app/hubs/page.tsx',
  'app/hubs/browse/page.tsx',
  'app/hubs/[state]/[slug]/page.tsx',
  'app/hubs/south-florida/page.tsx',
  'app/providers/[slug]/page.tsx',
  'app/tools/license-verification/page.tsx',
  'components/hub-page-view.tsx',
  'components/hub-browser.tsx',
  'components/insurance-hero.tsx',
  'components/insurance-landing-sections.tsx',
  'components/zip-search.tsx',
  'components/directory-live-counts.tsx',
];

const FORBIDDEN = [
  /illustrative seed listing/i,
  /850\+\s*Verified Agents/i,
  /Reviews Analyzed/i,
  /get quotes/i,
  /CMS Data Verified/i,
  /health insurance specialists in every/i,
  /verified market hubs featuring/i,
  /2,000\+\s*Google ratings/i,
  /shop 80\+\s*carriers/i,
];

for (const rel of CONSUMER_FILES) {
  if (!existsSync(resolve(root, rel))) {
    errors.push(`missing ${rel}`);
    continue;
  }
  const text = read(rel);
  for (const re of FORBIDDEN) {
    if (re.test(text)) errors.push(`${rel} matches ${re}`);
  }
}

const expected: Record<string, string> = {
  FL: 'Florida Department of Financial Services (DFS)',
  TX: 'Texas Department of Insurance (TDI)',
  OH: 'Ohio Department of Insurance (ODI)',
  NV: 'Nevada Division of Insurance (NV DOI)',
  VT: 'Vermont Department of Financial Regulation (VT DFR)',
};
for (const [code, label] of Object.entries(expected)) {
  if (getRegulatorLabel(code) !== label) {
    errors.push(`regulator label ${code}`);
  }
}

const hubPage = read('app/hubs/[state]/[slug]/page.tsx');
if (!/getHubInventory/.test(hubPage) || !/force-dynamic/.test(hubPage)) {
  errors.push('hub page must load live inventory dynamically');
}
if (/insurance_types\?\.includes\('health'\)/.test(hubPage)) {
  errors.push('hub metadata must not use page-scoped health counts');
}

const hubView = read('components/hub-page-view.tsx');
if (!/verifiedCountLabel/.test(hubView) || /verifiedCountWithHealth/.test(hubView)) {
  errors.push('hub view must not mix page-scoped health counts into market totals');
}

const healthApi = read('app/api/inventory/health/route.ts');
if (!/verifiedTxCount/.test(healthApi) || !/byState/.test(healthApi)) {
  errors.push('health endpoint should report FL/TX/OH/NV/VT');
}

const pkg = read('package.json');
if (!/check:phase17-inventory/.test(pkg)) {
  errors.push('package.json missing check:phase17-inventory');
}

if (!existsSync(resolve(root, 'docs/PHASE-17-INVENTORY-INTEGRITY.md'))) {
  errors.push('missing docs/PHASE-17-INVENTORY-INTEGRITY.md');
}

async function fetchText(url: string, ms = 20000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function liveChecks() {
  const requireLive = process.env.PHASE17_REQUIRE_LIVE === '1';
  const healthRaw = await fetchText(`${PROD}/api/inventory/health`);
  if (!healthRaw) {
    if (requireLive) errors.push('production health fetch failed');
    else console.log('Phase 17 live fetch skipped (health unreachable)');
    return;
  }
  let health: {
    ok?: boolean;
    hubTotals?: Record<string, number>;
    byState?: Record<string, number>;
    supabaseHost?: string;
  };
  try {
    health = JSON.parse(healthRaw) as typeof health;
  } catch {
    errors.push('production health JSON parse failed');
    return;
  }
  if (health.supabaseHost && !/gojyhmbojbwbpiamoktq/.test(health.supabaseHost)) {
    errors.push(`production health host is not inventory project: ${health.supabaseHost}`);
  }
  const jax = health.hubTotals?.jacksonville ?? 0;
  if (health.ok && jax > 100) {
    const html = await fetchText(`${PROD}/hubs/florida/jacksonville`);
    if (!html) {
      if (requireLive) errors.push('jacksonville live fetch failed');
    } else if (/No verified listings are shown yet/i.test(html) && !/\d[\d,]* verified research/i.test(html)) {
      errors.push('jacksonville hub empty while health reports inventory');
    }
  }
  const home = await fetchText(`${PROD}/`);
  if (home && /850\+\s*Verified Agents/i.test(home)) {
    errors.push('homepage still has inflated agent marketing stats');
  }
}

async function main() {
  await liveChecks();
  if (errors.length) {
    console.error('Phase 17 inventory integrity checks FAILED:');
    errors.forEach((e) => console.error(' ', e));
    process.exit(1);
  }
  console.log('Phase 17 inventory integrity checks passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
