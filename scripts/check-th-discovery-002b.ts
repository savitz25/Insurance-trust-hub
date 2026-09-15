/**
 * TH-DISCOVERY-002B regression guard.
 *
 * Wires InsuranceTrustHub's real, already-live public-directory query
 * (`getProviders`/`searchProviders`, the same source that backs /directory
 * and was live-verified via `curl /directory?zip=33431` returning real
 * Boca Raton-area agencies) into specialist-execution/v2's OFFICE_LOCATION
 * geography intent, instead of the old `mode:'directory'` stub that always
 * collapsed to UNSUPPORTED_CAPABILITY regardless of real evidence.
 *
 * lib/specialist-execution/v2.ts transitively imports Supabase client code
 * guarded by the `server-only` package (already true before this ticket, via
 * insurance-ask/execute.ts), so it cannot be exercised by directly importing
 * it into a plain tsx script the way most `check-*.ts` scripts here do --
 * that only works inside Next's own server runtime. This guard therefore
 * follows the same source-pattern-assertion convention already used by
 * check-th-p0-insurance-01.ts for the same reason, and was additionally
 * verified behaviorally against a real `next dev` server during development
 * (see the TH-DISCOVERY-002B closeout report for the request/response pairs):
 *  - a recognized FL launch county (Palm Beach) with OFFICE_LOCATION intent
 *    returned a real (zero-with-no-credential-locally, real rows live)
 *    directory search, never UNSUPPORTED_CAPABILITY;
 *  - a supplied ZIP appeared in appliedFilters and, with no Supabase
 *    credential configured, failed CLOSED (BACKEND_UNAVAILABLE, total 0),
 *    never substituting a fabricated statewide total;
 *  - an unrecognized county with no ZIP failed closed as
 *    UNSUPPORTED_CAPABILITY (HTTP 422), never inventing a match;
 *  - producer/legal_insurer requests were never routed into the agency-only
 *    directory;
 *  - the schema/contract fingerprints were identical with and without
 *    geography.zip present.
 *
 *   npx tsx scripts/check-th-discovery-002b.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const errors: string[] = [];
function assert(cond: unknown, msg: string) {
  if (!cond) errors.push(msg);
}

const root = join(__dirname, '..');
const v2 = readFileSync(join(root, 'lib/specialist-execution/v2.ts'), 'utf8');
const contract = readFileSync(join(root, 'lib/specialist-execution/contract.ts'), 'utf8');

// --- Reuses the existing, already-live directory query -- no second matcher ---
assert(
  /from ['"]@\/lib\/providers\/queries['"]/.test(v2),
  'v2.ts must delegate to the existing lib/providers/queries getProviders/searchProviders implementation, not build a second city/ZIP matcher'
);
assert(!/new\s+Map\s*\(\s*\[\s*\['?\d{5}/.test(v2), 'no hardcoded ZIP-to-result table may be invented in v2.ts');

// --- FL launch-county resolution reuses the existing authoritative crosswalk, not a new one ---
assert(
  /matchLaunchCounty/.test(v2) && /from ['"]@\/lib\/dfs\/launch-counties['"]/.test(v2),
  'county resolution must reuse the existing FL_LAUNCH_COUNTIES/matchLaunchCounty crosswalk, not a newly invented county mapping'
);

// --- Fail-closed safety: an unrecognized geography (no zip, no matching county) never silently
// substitutes a broader/statewide result ---
assert(
  /if\s*\(\s*!zip\s*&&\s*!county\s*\)\s*\{[\s\S]{0,500}UNSUPPORTED_CAPABILITY/.test(v2),
  'a ZIP/county the directory does not recognize must fail closed as UNSUPPORTED_CAPABILITY, never silently broadened or fabricated'
);

// --- The directory-source query failure (e.g. no Supabase credential, or a real backend error)
// must surface as a genuine failure state, never a fabricated success ---
assert(
  /catch\s*\{[\s\S]{0,200}BACKEND_UNAVAILABLE/.test(v2),
  'a failed directory lookup must surface as BACKEND_UNAVAILABLE, never a substituted SUPPORTED_RESULTS'
);

// --- Entity-class integrity: only 'agency' (or unset, which defaults to agency for local intent)
// may be routed into the local directory -- producer and legal_insurer keep their own, separately
// scoped and unaffected capability gaps ---
assert(
  /req\.entityClass\s*===\s*['"]agency['"]/.test(v2) && /!req\.entityClass\s*\|\|\s*req\.entityClass\s*===\s*['"]agency['"]/.test(v2),
  'the local-directory branch must be gated to agency-class requests only'
);

// --- Narrow locality claims: whyMatched language must disclose "recorded address", never claim a
// countywide/citywide service area ---
assert(
  /Recorded public-directory address/.test(v2),
  'local-directory rows must disclose "recorded public-directory address" rather than implying countywide service coverage'
);
assert(
  /is not a confirmed service area/.test(v2),
  'local-directory results must explicitly disclose that a recorded address is not a confirmed service area'
);
// --- Canonical profile destination on every local-directory row ---
assert(/destination:\s*`\/providers\/\$\{p\.slug\}`/.test(v2), 'every local-directory row must carry a canonical /providers/[slug] profile destination');

// --- Bounded pagination: the real backend total is exposed, but rows returned stay bounded to
// the requested/limited page size (never "first page equals full universe") ---
assert(/out\.pagination\s*=\s*\{\s*page,\s*limit,\s*total,\s*hasMore/.test(v2), 'local-directory results must expose real pagination (page/limit/total/hasMore), not a flat unbounded dump');

// --- Additive, backward-compatible contract change: geography.zip is a nested field, and
// SCHEMA_SHAPE only lists top-level request keys, so adding it must not change the fingerprint ---
assert(/zip\?:\s*string;/.test(contract), 'contract.ts must declare an optional geography.zip field');
const schemaShapeMatch = contract.match(/request:\s*\[([^\]]*)\]/);
assert(schemaShapeMatch && !schemaShapeMatch[1].includes("'zip'"), "SCHEMA_SHAPE.request must list only top-level field names -- 'zip' (a geography sub-field) must not appear there, or the contract fingerprint would change on this additive edit");
assert(schemaShapeMatch != null && schemaShapeMatch[1].includes("'geography'"), 'SCHEMA_SHAPE.request must still list the top-level geography field');

if (errors.length) {
  console.error(`TH-DISCOVERY-002B: ${errors.length} failure(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('TH-DISCOVERY-002B: all checks passed.');
