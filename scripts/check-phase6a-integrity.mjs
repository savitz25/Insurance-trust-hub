/**
 * Phase 6A guardrails — fail CI-style on integrity regressions.
 * node scripts/check-phase6a-integrity.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

// 1. Fallback data must not ship 555 phones or is_verified true
const fallback = read('lib/providers/fallback-data.ts');
if (/\(555\)|555-/.test(fallback)) {
  errors.push('fallback-data.ts still contains 555 placeholder phones');
}
if (/is_verified:\s*true/.test(fallback)) {
  errors.push('fallback-data.ts marks seed rows is_verified: true');
}
if (!/fallback-\$\{/.test(fallback) && !/fallback-/.test(fallback)) {
  warnings.push('fallback-data.ts: confirm seed id prefix fallback-');
}

// 2. Generated agents must not force isVerified true
const agents = read('lib/hubs/agents.ts');
if (/isVerified:\s*true/.test(agents) && /buildAgent/.test(agents)) {
  // allow curated pass-through elsewhere but buildAgent return must be false
  if (/isVerified:\s*true,\s*\n\s*isHealthFeatured/.test(agents)) {
    errors.push('hubs/agents.ts buildAgent still forces isVerified: true');
  }
}

// 3. Public listing module exists
if (!existsSync(join(ROOT, 'lib/provenance/public-listing.ts'))) {
  errors.push('missing lib/provenance/public-listing.ts');
}
if (!existsSync(join(ROOT, 'lib/insurance/verification-levels.ts'))) {
  errors.push('missing lib/insurance/verification-levels.ts');
}

// 4. Sitemap must not map all FALLBACK without filter
const sitemap = read('app/sitemap.ts');
if (/FALLBACK_PROVIDERS\.map\(\(provider\)/.test(sitemap) && !/filter\(/.test(sitemap)) {
  errors.push('sitemap.ts still indexes all FALLBACK_PROVIDERS without filter');
}

// 5. Reviews must not call buildFallbackReviews in public path
const reviews = read('lib/providers/reviews.ts');
if (/return buildFallbackReviews/.test(reviews)) {
  errors.push('reviews.ts still returns synthetic fallback reviews');
}

// 6. Hub copy must not say Top Verified
const hub = read('components/hub-page-view.tsx');
if (/Top Verified Insurance Agents/.test(hub)) {
  errors.push('hub-page-view still uses Top Verified Insurance Agents');
}

// 7. Agent card must not claim NAIC Verified
const card = read('components/agent-card.tsx');
if (/NAIC Verified|DOI Verified/.test(card)) {
  errors.push('agent-card still claims NAIC/DOI Verified theater');
}

if (errors.length) {
  console.error('Phase 6A integrity FAILED:');
  errors.forEach((e) => console.error('  ✗', e));
  process.exit(1);
}
console.log('Phase 6A integrity checks passed');
warnings.forEach((w) => console.warn('  ⚠', w));
