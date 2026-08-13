/**
 * Phase 20 — research profile depth guards.
 *   npm run check:phase20-profiles
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { resolveLicenseFreshness } from '../lib/providers/license-freshness';
import { continueClusterForProvider } from '../lib/providers/continue-cluster';
import { loaPlainLanguageForTags } from '../lib/dfs/agency-display';
import { allowsRegulatorLeadForm } from '../lib/regulators/labels';
import type { Provider } from '../types/provider';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

for (const rel of [
  'lib/providers/license-freshness.ts',
  'lib/providers/continue-cluster.ts',
  'components/profile/continue-cluster-research.tsx',
  'docs/PHASE-20-PROFILE-DEPTH.md',
]) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

const unknown = resolveLicenseFreshness(null);
if (unknown.kind !== 'unknown' || unknown.badge !== null) {
  errors.push('missing date must be unknown freshness');
}
const fresh = resolveLicenseFreshness(new Date().toISOString());
if (fresh.kind !== 'fresh') errors.push('today should be fresh');
const stale = resolveLicenseFreshness(new Date(Date.now() - 120 * 86400000).toISOString());
if (stale.kind !== 'stale') errors.push('120 days should be stale');

const blurbs = loaPlainLanguageForTags(['Health', 'ObscureLoaTag']);
if (!blurbs[0]?.mapped || blurbs[1]?.mapped) {
  errors.push('LOA helper must mark mapped vs regulator-tag-only');
}
if (/medicare advantage/i.test(blurbs.map((b) => b.blurb).join(' '))) {
  errors.push('LOA blurbs must not invent Medicare Advantage');
}

const probe = {
  state: 'VT',
  city: 'Burlington',
  zip: '05401',
} as Provider;
const vtLinks = continueClusterForProvider(probe);
if (!vtLinks.links.some((l) => l.href.includes('vermont/burlington'))) {
  errors.push('Burlington profile should continue to Burlington hub');
}
if (!vtLinks.links.some((l) => l.href.includes('marketplace-plan-research'))) {
  errors.push('cluster strip must include Marketplace research');
}

if (allowsRegulatorLeadForm('NV') || allowsRegulatorLeadForm('VT')) {
  errors.push('NV/VT must remain lead-form free');
}

const profile = read('app/providers/[slug]/page.tsx');
if (!/How verified/.test(profile)) errors.push('profile missing How verified heading');
if (!/resolveLicenseFreshness/.test(profile)) errors.push('profile must render freshness');
if (!/ContinueClusterResearch/.test(profile)) errors.push('profile missing cluster strip');
if (!/allowsRegulatorLeadForm/.test(profile)) errors.push('profile must keep lead-form gate');

const FORBIDDEN = [/get quotes/i, /free quotes/i, /illustrative seed/i, /best cheap/i];
for (const rel of [
  'app/providers/[slug]/page.tsx',
  'lib/providers/license-freshness.ts',
  'lib/providers/continue-cluster.ts',
  'components/profile/continue-cluster-research.tsx',
]) {
  const text = read(rel);
  for (const re of FORBIDDEN) {
    if (re.test(text)) errors.push(`${rel} matches ${re}`);
  }
}

const pkg = read('package.json');
if (!/check:phase20-profiles/.test(pkg)) {
  errors.push('package.json missing check:phase20-profiles');
}

if (errors.length) {
  console.error('Phase 20 profile checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 20 research profile checks passed');
