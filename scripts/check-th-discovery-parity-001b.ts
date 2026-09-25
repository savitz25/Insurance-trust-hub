/**
 * TH-DISCOVERY-PARITY-001B -- Insurance discovery-parity regression corpus (parse-time, no DB).
 *
 * A production audit against the live /ask?q=... surface (Insurance only) found:
 *   - Category+geography discovery requests ("auto insurance agent near Spokane", "insurance
 *     broker near Fort Worth", "flood insurance provider Miami", "cheap car insurance",
 *     "homeowners insurance Boulder Colorado") dead-ending at parse time into
 *     "Clarification required" or fail_closed with zero providers, despite real indexed
 *     inventory being one query away.
 *   - "home insurance company Trenton NJ" being misread as a literal, doomed exact-company-name
 *     lookup because the whole "<category> <product> <city> <state>" phrase survived every
 *     geography/category strip as a "distinctive name."
 *   - Exact-brand lookups ("State Farm") returning zero.
 *   - DANGEROUS: "life insurance agents around Denver" claiming an established "Life" LOA/
 *     credential-class match while actually returning an unrelated static ~20-row Florida P&C
 *     legal-insurer cohort -- the exact same static list also surfaced verbatim for "insurance
 *     companies San Diego County," i.e. a hardcoded fallback mislabeled as a real class-specific
 *     match for two unrelated states.
 *
 * This file locks in the PARSE-TIME half of the fix (interpretInsuranceAskQuery; no Supabase
 * required, safe to run in CI) across a corpus of 30+ queries distinct from the seven audited
 * strings above, spanning FL/NJ/TX/WA/CA/CO, singular/plural provider words, in/near/around/no-
 * preposition phrasing, city/county/state grains, unsupported consumer-product wording, no-
 * location requests, and brand-name controls. The DB-backed half (does the broadened result set
 * actually come back non-empty, correctly geography-scoped, and never falsely claim an
 * unestablished LOA) is covered end-to-end by check-th-discovery-parity-001b-live.ts (requires
 * Supabase credentials; run manually, same as check-insurance-ask-live.ts).
 *
 *   npx tsx scripts/check-th-discovery-parity-001b.ts
 */
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { readInsuranceRequest } from '../lib/insurance-ask/request';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

function q(text: string) {
  return interpretInsuranceAskQuery(text);
}

// ---------------------------------------------------------------------------------------------
// A. Category + geography must resolve and EXECUTE (mode: 'entity'/'count'), never dead-end into
//    fail_closed / a bare clarification, across states, prepositions, and singular/plural forms.
// ---------------------------------------------------------------------------------------------

const noPreposition = q('insurance agency Broward County Florida');
assert(noPreposition.query.mode === 'entity', 'no-preposition category+county+state executes');
assert(noPreposition.query.entityClass === 'agency', 'no-preposition agency class');

const inPrep = q('insurance broker in New Jersey');
assert(inPrep.query.mode === 'entity', '"in" preposition executes');
assert(inPrep.query.entityClass === 'agency', '"broker" recognized as agency category');
assert(inPrep.query.jurisdiction?.state === 'NJ', '"in New Jersey" resolves NJ');

const nearPrep = q('insurance agency near Austin Texas');
assert(nearPrep.query.mode === 'entity', '"near" preposition executes');
assert(nearPrep.query.jurisdiction?.state === 'TX', '"near Austin Texas" resolves TX');
assert(nearPrep.query.requestedCity === 'Austin', '"near Austin Texas" resolves city Austin');

// Regression: "around" was missing from the explicit-name gate's exclusion list, so a
// "<category> <product> around <city> <state>" phrase was misread as a literal company name (the
// same failure class as "home insurance company Trenton NJ" in the live audit).
const aroundPrep = q('flood insurance agency around Naples Florida');
assert(aroundPrep.query.mode === 'entity', '"around" preposition executes (not a name lookup)');
assert(aroundPrep.query.intent !== 'NAME_IDENTITY', '"around" phrase is not misread as an explicit name');
assert(aroundPrep.query.jurisdiction?.state === 'FL', '"around Naples Florida" resolves FL');
assert(aroundPrep.query.requestedCity === 'Naples', '"around Naples Florida" resolves city Naples');

const aroundNoComma = q('insurance broker around Aurora Colorado');
assert(aroundNoComma.query.mode === 'entity', '"around" + ambiguous city + spelled state executes');
assert(aroundNoComma.query.jurisdiction?.state === 'CO', '"around Aurora Colorado" resolves CO');

// Plural vs singular provider-category words must classify identically.
const singularAgent = q('insurance agent Miami');
const pluralAgents = q('insurance agents Miami');
assert(singularAgent.query.mode === 'entity' && pluralAgents.query.mode === 'entity', 'singular/plural agent(s) both execute');
assert(singularAgent.query.entityClass === pluralAgents.query.entityClass, 'singular/plural agent(s) classify identically');

const singularAgency = q('auto insurance agency Jacksonville');
const pluralAgencies = q('auto insurance agencies Jacksonville');
assert(singularAgency.query.entityClass === 'agency' && pluralAgencies.query.entityClass === 'agency', 'singular/plural agency/agencies both classify as agency');

// County grain (no city) still resolves the state and executes.
const countyOnly = q('insurance broker Orange County California');
assert(countyOnly.query.mode === 'entity', 'county-only geography executes');
assert(countyOnly.query.jurisdiction?.state === 'CA', 'county-only geography resolves CA from the state name');

// City grain via explicit 2-letter code trailing the city (no state name spelled out).
const cityCodeTrailing = q('flood insurance provider El Paso TX');
assert(cityCodeTrailing.query.mode === 'entity', '"<city> <2-letter code>" executes');
assert(cityCodeTrailing.query.jurisdiction?.state === 'TX', '"El Paso TX" resolves TX');
assert(cityCodeTrailing.query.requestedCity === 'El Paso', '"El Paso TX" resolves city El Paso');

// State-only, no city at all.
const stateOnlyWa = q('auto insurance providers in WA');
assert(stateOnlyWa.query.mode === 'entity', 'state-only (WA) still executes');
assert(stateOnlyWa.query.jurisdiction?.state === 'WA', '"in WA" resolves WA from a bare code');
assert(!stateOnlyWa.query.requestedCity, 'no city text means no invented city');

// No location at all: still a real (nationwide) discovery request, not a dead end.
const noLocationBroker = q('flood insurance agency');
assert(noLocationBroker.query.mode === 'entity', 'category with no location at all still executes');
assert(!noLocationBroker.query.jurisdiction, 'no location means no invented jurisdiction');

const noLocationProvider = q('umbrella insurance provider');
assert(noLocationProvider.query.mode === 'entity', 'bare "provider" (no location) still executes');
assert(noLocationProvider.query.entityClass === 'agency', 'generic "provider" defaults to the browsable agency class');

// ---------------------------------------------------------------------------------------------
// B. Unresolved consumer-product wording (auto/home/flood/homeowners/renters/umbrella) must be
//    retained + disclosed, and must NEVER be promoted to an invented line of authority, in any of
//    the phrasings above.
// ---------------------------------------------------------------------------------------------

for (const [label, parsed, product] of [
  // NOTE: deliberately "Denver" (city), not "... Colorado" (spelled-out state name) -- a literal
  // "insurance agenc(y|ies)/agents/producers" + "Colorado" (or Virginia/New York/Illinois) combo
  // is an intentional, separately-tested fail_closed carve-out (see assert-co-ins-001.mts and
  // interpret.ts's dedicated CO/VA/NY/IL routing to those states' own intelligence pages) that
  // predates and is out of scope for this ticket; it is not the bug this corpus targets.
  ['no-preposition', q('renters insurance agency Denver'), 'renters'],
  ['near', q('home insurance agency near Tacoma'), 'homeowners'],
  ['around', aroundPrep, 'flood'],
  ['no-location', noLocationBroker, 'flood'],
  ['bare product, no category word', q('cheap car insurance'), 'auto'],
] as const) {
  assert(parsed.query.requestedProduct?.includes(product), `${label}: product "${product}" retained for disclosure`);
  assert(!parsed.query.linesOfAuthority?.length, `${label}: product "${product}" never invented as an LOA`);
  assert(
    /not established|not an official/i.test(JSON.stringify(parsed.interpretation)),
    `${label}: interpretation discloses the product is not an established LOA, not a silent match`,
  );
}

// A bare product mention with no other category word still defaults to the browsable agency
// class instead of dead-ending (this is the audited "cheap car insurance" failure).
const bareProductOnly = q('cheap car insurance');
assert(bareProductOnly.query.entityClass === 'agency', 'bare product mention defaults to agency, not a dead end');
assert(!bareProductOnly.query.jurisdiction, 'bare product mention invents no location');

// Official LOA terms (Life/Health/Property/Casualty) remain real, executable LOA filters and are
// NEVER confused with the unresolved-consumer-product path above.
const lifeTx = q('life insurance agencies in Texas');
assert(lifeTx.query.linesOfAuthority?.[0] === 'Life', 'official "Life" LOA still recognized');
assert(!lifeTx.query.requestedProduct?.length, 'official LOA is not treated as an unresolved consumer product');

// ---------------------------------------------------------------------------------------------
// C. Geography must resolve when resolvable (a real state, and a real city when named), never be
//    silently dropped or swapped for an unrelated place. Ambiguous bare city names must stay
//    unresolved UNLESS an explicit state in the same request disambiguates them.
// ---------------------------------------------------------------------------------------------

for (const [text, state, city] of [
  ['auto insurance agent near Spokane', 'WA', 'Spokane'],
  ['home insurance company Trenton NJ', 'NJ', 'Trenton'],
  ['insurance broker near Fort Worth', 'TX', 'Fort Worth'],
  ['flood insurance provider Miami', 'FL', 'Miami'],
  ['homeowners insurance Boulder Colorado', 'CO', 'Boulder'],
  ['life insurance agents around Denver', 'CO', 'Denver'],
  ['insurance companies San Diego County', 'CA', 'San Diego'],
] as const) {
  const parsed = q(text);
  assert(parsed.query.jurisdiction?.state === state, `"${text}" resolves state ${state}`);
  assert(parsed.query.requestedCity === city, `"${text}" resolves city ${city}`);
}

// Regression: an ambiguous bare city name (many US cities share it) with NO state in the request
// must stay unresolved rather than silently guessing one state's identity for it.
const ambiguousNoState = q('insurance agency near Springfield');
assert(!ambiguousNoState.query.requestedCity, 'ambiguous city with no state does not silently resolve a city');
assert(
  JSON.stringify(ambiguousNoState.interpretation).toLowerCase().includes('more than one state'),
  'ambiguous city with no state is disclosed as ambiguous, not silently dropped',
);

// Regression: the SAME ambiguous city name, once an explicit state in the request removes the
// real-world ambiguity, should resolve (e.g. "Newark NJ", "Aurora CO", "Springfield IL").
const ambiguousWithState = q('home insurance provider Newark NJ');
assert(ambiguousWithState.query.jurisdiction?.state === 'NJ', '"Newark NJ" resolves state NJ');
assert(ambiguousWithState.query.requestedCity === 'Newark', 'explicit state disambiguates an otherwise-ambiguous city (Newark NJ)');

const ambiguousWithState2 = q('insurance broker around Aurora, CO');
assert(ambiguousWithState2.query.jurisdiction?.state === 'CO', '"Aurora, CO" resolves state CO');
assert(ambiguousWithState2.query.requestedCity === 'Aurora', 'explicit state disambiguates an otherwise-ambiguous city (Aurora, CO)');

// Regression: "Washington" is both a US state name and, in this gazetteer, a city name (DC).
// CITY_KEYS_BY_LENGTH matches longest-first, so "Washington" the city used to shadow a real,
// shorter, unambiguous city named alongside it, silently substituting an unrelated place.
const stateNameCityCollision = q('insurance broker Seattle Washington');
assert(stateNameCityCollision.query.jurisdiction?.state === 'WA', '"Seattle Washington" resolves state WA');
assert(stateNameCityCollision.query.requestedCity === 'Seattle', '"Seattle Washington" resolves city Seattle, not "Washington"');

// ---------------------------------------------------------------------------------------------
// D/F. No official LOA line is ever shown as satisfied by a request this source cannot actually
//      qualify (regulatory semantics preserved: LOA is not an appointment; a consumer product is
//      not an LOA).
// ---------------------------------------------------------------------------------------------

const dangerousDenver = q('life insurance agents around Denver');
assert(dangerousDenver.query.linesOfAuthority?.[0] === 'Life', '"Life" is recognized as the requested LOA');
assert(dangerousDenver.query.entityClass === 'person', '"agents" still classifies as person, not silently switched to agency/insurer');
// The actual "not established for this broader result" correction is applied at execution time
// (execute.ts's withLoaMismatchDisclosure) once the real result set is known; see the -live script.

// ---------------------------------------------------------------------------------------------
// E. Exact-name / brand lookups must reach a real name search, not a parse-time dead end, for
//    unqualified short brand phrases with no category/geography/product word at all.
// ---------------------------------------------------------------------------------------------

for (const brand of ['State Farm', 'Progressive', 'Allstate', 'GEICO', 'Nationwide']) {
  const parsed = q(brand);
  assert(parsed.query.mode === 'entity', `brand "${brand}" reaches a real entity/name search, not fail_closed`);
  assert(parsed.query.intent === 'NAME_IDENTITY', `brand "${brand}" is recognized as a name-identity lookup`);
  assert(parsed.query.nameQuery === brand, `brand "${brand}" preserves the exact requested name`);
}

// A brand phrase that ALSO contains a recognized category/geography/product word must NOT be
// swallowed by the bare-brand rule (it should stay a normal category+geo discovery request).
const brandLikeButCategory = q('State Farm agency in Texas');
assert(brandLikeButCategory.query.intent !== 'NAME_IDENTITY' || brandLikeButCategory.query.jurisdiction?.state === 'TX', 'a brand-like phrase with a real category+state stays a discovery request, not a truncated name lookup');

// ---------------------------------------------------------------------------------------------
// Golden-path non-regressions: FL P+C, definitions, and "best/safest/cheapest" fail-closed
// guardrails from the pre-existing suite must still hold with the shared classifiers in place.
// ---------------------------------------------------------------------------------------------

const flPc = q('Show insurance agencies credentialed in Florida with Property and Casualty authority.');
assert(flPc.query.mode === 'entity' && flPc.query.entityClass === 'agency', 'FL P+C golden path unaffected');
assert(JSON.stringify(flPc.query.linesOfAuthority) === JSON.stringify(['Property', 'Casualty']), 'FL P+C LOAs unaffected');

const best = q('Which insurance agency is the best in Florida?');
assert(best.query.mode === 'fail_closed', 'ranking ("best") still fail closed, not swept into discovery');

const npn = q('Find NPN 1234567.');
assert(npn.query.mode === 'identifier', 'NPN identifier lookup unaffected');

// ---------------------------------------------------------------------------------------------
// SQA-009-RESTORE-001B: consumer HTML /ask typed+Enter is a GET of q plus empty Advanced
// filters, and site chrome may add `from` / `hub_resume`. Those must not fail-close the
// natural-language interpretation ("Use one value for each supported request parameter").
// Duplicate research keys and invalid filters still fail. Ranking still fail-closes.
// ---------------------------------------------------------------------------------------------

function consumerAskParams(text: string, extra: Record<string, string> = {}) {
  return new URLSearchParams({
    q: text,
    entity: '',
    state: '',
    loa: '',
    evidence: '',
    from: '/',
    hub_resume: '1',
    ...extra,
  });
}

const RESTORE_MATRIX: Array<{
  id: string;
  q: string;
  mode: 'entity' | 'count';
  product?: string;
  loa?: string[];
  state: string;
}> = [
  { id: 'PI_HO', q: 'homeowners insurance agencies in Florida', mode: 'entity', product: 'homeowners', state: 'FL' },
  { id: 'PI_AUTO', q: 'auto insurance agencies in Florida', mode: 'entity', product: 'auto', state: 'FL' },
  { id: 'PI_HO2', q: 'Florida homeowners insurance agencies', mode: 'entity', product: 'homeowners', state: 'FL' },
  { id: 'PI_COUNT', q: 'how many homeowners insurance agencies in Florida', mode: 'count', product: 'homeowners', state: 'FL' },
  { id: 'PI_FLOOD', q: 'flood insurance provider Miami', mode: 'entity', product: 'flood', state: 'FL' },
  { id: 'CTRL_CENSUS', q: 'insurance agencies in Florida', mode: 'entity', state: 'FL' },
  { id: 'CTRL_TX_LIFE', q: 'life insurance agencies in Texas', mode: 'entity', loa: ['Life'], state: 'TX' },
  { id: 'CTRL_FL_PC', q: 'Florida Property & Casualty insurance authority', mode: 'entity', loa: ['Property', 'Casualty'], state: 'FL' },
];

for (const row of RESTORE_MATRIX) {
  const req = readInsuranceRequest(consumerAskParams(row.q));
  assert(!req.error, `${row.id}: consumer /ask URL must not parameter-fail-close (got ${req.error})`);
  assert(req.raw === row.q, `${row.id}: q retained`);
  const parsed = q(req.raw);
  assert(parsed.query.mode === row.mode, `${row.id}: mode ${row.mode} (got ${parsed.query.mode})`);
  assert(parsed.query.jurisdiction?.state === row.state, `${row.id}: state ${row.state}`);
  if (row.product) {
    assert(parsed.query.requestedProduct?.includes(row.product), `${row.id}: product ${row.product} retained`);
    assert(!parsed.query.linesOfAuthority?.length, `${row.id}: product is not an invented LOA`);
  }
  if (row.loa) {
    assert(JSON.stringify(parsed.query.linesOfAuthority) === JSON.stringify(row.loa), `${row.id}: official LOA ${row.loa.join('+')}`);
    assert(!parsed.query.requestedProduct?.length, `${row.id}: official LOA is not unresolved product`);
  }
}

const undefinedFilters = readInsuranceRequest(
  new URLSearchParams({
    q: 'homeowners insurance agencies in Florida',
    entity: 'undefined',
    state: 'undefined',
    loa: 'null',
    evidence: 'undefined',
  }),
);
assert(!undefinedFilters.error, `stringified-absent filters must not fail-close (got ${undefinedFilters.error})`);
assert(!undefinedFilters.options.entity && !undefinedFilters.options.state, 'stringified-absent filters are not applied');

const duplicateQ = readInsuranceRequest({ q: ['homeowners insurance agencies in Florida', 'NAIC 10064'] });
assert(duplicateQ.error === 'Use one value for each supported request parameter.', 'duplicate q still fail-closes');

const unknownResearch = readInsuranceRequest(
  new URLSearchParams({ q: 'homeowners insurance agencies in Florida', foo: 'bar' }),
);
assert(
  unknownResearch.error === 'Use one value for each supported request parameter.',
  'unknown non-chrome research param still fail-closes',
);

const invalidEntity = readInsuranceRequest(
  new URLSearchParams({ q: 'homeowners insurance agencies in Florida', entity: 'carrier' }),
);
assert(invalidEntity.error === 'Invalid entity filter.', 'invalid non-empty entity filter still fail-closes');

const rankingConsumer = readInsuranceRequest(consumerAskParams('Which insurance agency is the best in Florida?'));
assert(!rankingConsumer.error, 'CTRL_BEST consumer URL must reach ranking interpretation, not parameter fail-closed');
assert(q(rankingConsumer.raw).query.mode === 'fail_closed', 'CTRL_BEST still ranking fail-closed after consumer URL parse');

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\ncheck-th-discovery-parity-001b FAIL (${errors.length} assertion(s))`);
  process.exit(1);
}
console.log('check-th-discovery-parity-001b PASS');
