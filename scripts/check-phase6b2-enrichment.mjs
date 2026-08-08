/**
 * Phase 6B2 guardrails.
 * node scripts/check-phase6b2-enrichment.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const assert = (c, m) => {
  if (!c) errors.push(m);
};

const elig = readFileSync(join(ROOT, 'lib/enrichment/eligibility.ts'), 'utf8');
assert(elig.includes('indexable_research'), 'eligibility must require indexable_research');
assert(elig.includes('isSeedProviderId'), 'eligibility must block seed ids');

const match = readFileSync(join(ROOT, 'lib/enrichment/match.ts'), 'utf8');
assert(match.includes('accept = confidence === \'high\''), 'only high confidence accepts');
assert(match.includes('Ambiguous'), 'ambiguous multi-match must skip');

const pipeline = readFileSync(join(ROOT, 'lib/enrichment/pipeline.ts'), 'utf8');
assert(pipeline.includes('isEligibleForSecondaryEnrichment'), 'pipeline must gate eligibility');
assert(pipeline.includes('toPublicSecondarySignals'), 'public secondary signals helper');

const signals = readFileSync(join(ROOT, 'lib/insurance/research-signals.ts'), 'utf8');
assert(signals.includes('secondaryGoogleProvenance'), 'score must gate Google on provenance');
assert(signals.includes('maxPoints: 12'), 'Google weight capped');
assert(signals.includes('maxPoints: 6'), 'BBB weight capped');

const schema = readFileSync(join(ROOT, 'lib/seo/schemas.ts'), 'utf8');
assert(schema.includes('hasFirstPartyReviews'), 'schema must not use Google for AggregateRating');
assert(schema.includes('false'), 'AggregateRating from snapshots disabled');

const page = readFileSync(join(ROOT, 'app/providers/[slug]/page.tsx'), 'utf8');
assert(page.includes('ProviderSecondarySignals'), 'profile must render secondary signals component');
assert(page.includes('toPublicSecondarySignals'), 'profile must load secondary signals');

const levels = readFileSync(join(ROOT, 'lib/insurance/verification-levels.ts'), 'utf8');
assert(
  !levels.includes('google') || levels.includes('re-checkable'),
  'license verified path must stay license-only'
);

if (errors.length) {
  console.error('Phase 6B2 FAILED:');
  errors.forEach((e) => console.error('  ✗', e));
  process.exit(1);
}
console.log('Phase 6B2 enrichment checks passed');
