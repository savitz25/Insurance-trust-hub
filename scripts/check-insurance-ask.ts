/**
 * Insurance Ask interpreter + contract gates. Run: npx tsx scripts/check-insurance-ask.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { detectRequestedConsumerProducts } from '../lib/insurance-ask/product-intent';
import {
  INSURANCE_ASK_CAPABILITY,
  INSURANCE_ASK_CONTRACT,
  INSURANCE_ASK_PAGE_SIZE,
  LOCKED_CENSUS,
} from '../lib/insurance-ask/contract';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

assert(INSURANCE_ASK_CONTRACT === 'insurance-ask-v1', 'contract');
assert(INSURANCE_ASK_CAPABILITY.federatedExecution === 'execute', 'execute capability');
assert(INSURANCE_ASK_CAPABILITY.askStatus === 'live', 'ask live');
assert(INSURANCE_ASK_PAGE_SIZE >= 20 && INSURANCE_ASK_PAGE_SIZE <= 25, 'page size 20–25');
assert(!JSON.stringify(INSURANCE_ASK_CAPABILITY).toLowerCase().includes('best insurer'), 'no ranking in manifest');
assert(LOCKED_CENSUS.agencies === 82071, 'locked agency census');
assert(LOCKED_CENSUS.persons === 1029860, 'locked person census');
assert(LOCKED_CENSUS.legalInsurers === 6185, 'locked insurer census');
assert(LOCKED_CENSUS.flDistinctAgencies === 56939, 'locked FL agency distinct');
assert(LOCKED_CENSUS.flAgencyCredentialRows === 59189, 'locked FL agency credential rows remain a separate grain from 56939 distinct agencies');
assert(LOCKED_CENSUS.publicPeople === 0, 'public people 0');
assert(LOCKED_CENSUS.publicGraphAgencies === 0, 'public graph agencies 0');

function q(text: string) {
  return interpretInsuranceAskQuery(text);
}

// IDENTITY
const fl = q('Show insurance agencies credentialed in Florida.');
assert(fl.query.mode === 'entity', 'FL agencies entity');
assert(fl.query.entityClass === 'agency', 'entity class agency');
assert(fl.query.jurisdiction?.state === 'FL', 'FL');
assert(fl.query.jurisdiction?.meaning === 'credential_jurisdiction', 'credential jurisdiction not office');
assert(JSON.stringify(fl.interpretation).includes('credential jurisdiction'), 'named geography dimension');

const npn = q('Find NPN 1234567.');
assert(npn.query.mode === 'identifier', 'NPN identifier');
assert(npn.query.identifier?.type === 'npn' && npn.query.identifier.value === '1234567', 'NPN value');
assert(!npn.query.entityClass, 'NPN does not assume class');

const unknown = q('Find NPN 0000001.');
assert(unknown.query.mode === 'identifier' && unknown.query.identifier?.value === '0000001', 'unknown NPN still labeled lookup');

const bare = q('1234567');
assert(bare.query.mode === 'fail_closed', 'bare digits fail closed');

const nameOnly = q('Who is John Smith');
assert(nameOnly.query.mode === 'fail_closed', 'name-only identity does not overclaim');

const findName = q('Find Acme Insurance Brokers');
assert(findName.query.mode === 'entity' && findName.query.intent === 'NAME_IDENTITY' && findName.query.coverageState === 'PARTIAL', 'explicit firm name produces candidates, not exact identity');

// AGENCY + LOA
const loa = q('Show Florida-credentialed agencies with Property and Casualty authority.');
assert(loa.query.entityClass === 'agency', 'P+C agency');
assert(JSON.stringify(loa.query.linesOfAuthority) === JSON.stringify(['Property', 'Casualty']), 'P+C LOAs');
assert(loa.query.jurisdiction?.meaning === 'credential_jurisdiction', 'P+C still credential jurisdiction');
assert(loa.query.loaMatch === 'all', 'Property and Casualty is AND');
assert(loa.query.loaAsOfficialObservation === false, 'FL is not official LOA codebook');

const loaExact = q('Show insurance agencies credentialed in Florida with Property and Casualty lines of authority.');
assert(loaExact.query.mode === 'entity' && loaExact.query.entityClass === 'agency', 'success-standard P+C is agency entity');
assert(loaExact.query.jurisdiction?.state === 'FL' && loaExact.query.jurisdiction?.meaning === 'credential_jurisdiction', 'success-standard geo');
assert(JSON.stringify(loaExact.query.linesOfAuthority) === JSON.stringify(['Property', 'Casualty']), 'success-standard LOAs');

const prop = q('Show insurance agencies credentialed in Florida with Property authority.');
assert(prop.query.linesOfAuthority?.[0] === 'Property', 'Property LOA');

const cas = q('Show insurance agencies credentialed in Florida with Casualty authority.');
assert(cas.query.linesOfAuthority?.[0] === 'Casualty', 'Casualty LOA');

const life = q('Show insurance agencies credentialed in Florida with Life authority.');
assert(life.query.linesOfAuthority?.[0] === 'Life', 'Life LOA');

const health = q('Show insurance agencies credentialed in Florida with Health authority.');
assert(health.query.linesOfAuthority?.[0] === 'Health', 'Health LOA');

const ah = q('Show Florida-credentialed agencies with Accident & Health.');
assert(ah.query.linesOfAuthority?.includes('Health'), 'A&H → Health');

// SQA-009 closeout: detector must not treat official LOA / census language as consumer product.
assert(detectRequestedConsumerProducts('insurance agencies in Florida').length === 0, 'CTRL_CENSUS is not a consumer product');
assert(detectRequestedConsumerProducts('life insurance agencies in Texas').length === 0, 'Life LOA is not a consumer product');
assert(detectRequestedConsumerProducts('Florida agencies with Property and Casualty authority').length === 0, 'authority is not auto');
assert(detectRequestedConsumerProducts('Florida Property & Casualty authority').length === 0, 'CTRL_FL_PC phrasing is not auto');
assert(detectRequestedConsumerProducts('Show insurance agencies credentialed in Florida.').length === 0, 'credentialed census is not auto');
assert(detectRequestedConsumerProducts('authority').length === 0, 'bare authority is not auto');
assert(detectRequestedConsumerProducts('casualty').length === 0, 'bare casualty is not a consumer product');
assert(JSON.stringify(detectRequestedConsumerProducts('homeowners insurance agencies in Florida')) === JSON.stringify(['homeowners']), 'homeowners detected');
assert(JSON.stringify(detectRequestedConsumerProducts('auto insurance agencies in Florida')) === JSON.stringify(['auto']), 'auto insurance detected');
assert(detectRequestedConsumerProducts('automobile insurance agencies in Florida').includes('auto'), 'automobile insurance detected');
assert(!detectRequestedConsumerProducts('auto agencies in Florida').includes('auto'), 'bare auto without insurance is not product-intent');

// SQA-009 / TH-DISCOVERY-PARITY-001B: product intent is retained and never claimed as a satisfied
// LOA, but (per TH-DISCOVERY-PARITY-001B, which supersedes SQA-009's original hard dead end) an
// unambiguous provider-category + geography request still EXECUTES as a normal entity query so
// real agencies are returned, honestly disclosed as not product-qualified -- never a zero result
// for a request this source can otherwise answer, and never a false product-match claim either.
const homeownersFl = q('homeowners insurance agencies in Florida');
assert(homeownersFl.query.mode === 'entity', 'homeowners still executes as a real FL agency query, not a dead end');
assert(homeownersFl.query.entityClass === 'agency', 'homeowners still names agency class');
assert(homeownersFl.query.jurisdiction?.state === 'FL', 'homeowners retains FL');
assert(JSON.stringify(homeownersFl.query.requestedProduct) === JSON.stringify(['homeowners']), 'homeowners product retained');
assert(homeownersFl.query.conditions?.some((c) => c.value === 'homeowners' && c.outcome === 'UNSUPPORTED'), 'homeowners condition unsupported');
assert(!homeownersFl.query.linesOfAuthority?.length, 'do not invent a homeowners LOA');
assert(JSON.stringify(homeownersFl.interpretation).toLowerCase().includes('homeowners'), 'homeowners visible in interpretation');
assert(/not established/i.test(JSON.stringify(homeownersFl.interpretation)), 'interpretation discloses product not established, not a silent match');

const homeownersAlt = q('Florida homeowners insurance agencies');
assert(homeownersAlt.query.mode === 'entity', 'word-order homeowners still executes');
assert(homeownersAlt.query.requestedProduct?.includes('homeowners'), 'word-order homeowners retained');

const autoFl = q('auto insurance agencies in Florida');
assert(autoFl.query.mode === 'entity', 'auto still executes the real FL agency query');
assert(autoFl.query.requestedProduct?.includes('auto'), 'auto product retained');
assert(!autoFl.query.linesOfAuthority?.length, 'do not invent an auto LOA');

const homeownersCount = q('how many homeowners insurance agencies in Florida');
assert(homeownersCount.query.mode === 'count', 'homeowners count still executes (the real FL count, not the 56939 census pretending to be homeowners-specific)');
assert(homeownersCount.query.requestedProduct?.includes('homeowners'), 'count retains homeowners');

// A bare product mention with no other category word (e.g. "cheap car insurance", no location) is
// still an implicit request for a provider -- it must not dead-end into "Clarification required."
const bareProduct = q('cheap car insurance');
assert(bareProduct.query.mode === 'entity', 'bare product mention still executes as a real (nationwide) agency query');
assert(bareProduct.query.entityClass === 'agency', 'bare product mention defaults to the agency class this source can honestly browse');
assert(bareProduct.query.requestedProduct?.includes('auto'), 'bare product retained for disclosure');
assert(!bareProduct.query.jurisdiction, 'no location was given, so none is invented');

const homeownersPa = q('homeowners insurance agencies Pennsylvania');
assert(homeownersPa.query.mode === 'fail_closed', 'PA homeowners does not execute a PA agency census');
assert(homeownersPa.query.requestedProduct?.includes('homeowners'), 'PA homeowners product retained');
assert(homeownersPa.query.jurisdiction?.state === 'PA', 'PA homeowners retains Pennsylvania');
assert(!homeownersPa.query.linesOfAuthority?.length, 'do not invent a PA homeowners LOA');
const autoPa = q('auto insurance agencies Pennsylvania');
assert(autoPa.query.mode === 'fail_closed', 'PA auto does not execute a PA agency census');
assert(autoPa.query.requestedProduct?.includes('auto'), 'PA auto product retained');
const agenciesPa = q('insurance agencies Pennsylvania');
assert(agenciesPa.query.mode === 'fail_closed', 'PA agencies search-only fail closed');
assert(!agenciesPa.query.requestedProduct?.length, 'generic PA agencies carry no product');
assert(homeownersPa.query.failReason !== agenciesPa.query.failReason, 'SQA-009: homeowners PA must not silently become generic PA agencies');
assert(autoPa.query.failReason !== agenciesPa.query.failReason, 'SQA-009: auto PA must not silently become generic PA agencies');

const unspecifiedFl = q('Show insurance agencies credentialed in Florida.');
assert(unspecifiedFl.query.mode === 'entity' && unspecifiedFl.query.entityClass === 'agency', 'unspecified product remains FL agency cohort');
assert(!unspecifiedFl.query.requestedProduct?.length, 'unspecified product has no unresolved product');
assert(!unspecifiedFl.query.linesOfAuthority?.length, 'unspecified product is not an LOA filter');

const ctrlCensus = q('insurance agencies in Florida');
assert(ctrlCensus.query.mode === 'entity' && ctrlCensus.query.entityClass === 'agency', 'CTRL_CENSUS remains FL agency cohort');
assert(ctrlCensus.query.jurisdiction?.state === 'FL', 'CTRL_CENSUS jurisdiction FL');
assert(ctrlCensus.query.coverageState === 'KNOWN', 'CTRL_CENSUS is not unresolved product');
assert(!ctrlCensus.query.requestedProduct?.length, 'CTRL_CENSUS has no unresolved product');
assert(!ctrlCensus.query.linesOfAuthority?.length, 'CTRL_CENSUS is unspecified-product, not an LOA filter');

const lifeTx = q('life insurance agencies in Texas');
assert(lifeTx.query.mode === 'entity' && lifeTx.query.entityClass === 'agency', 'CTRL_TX_LIFE stays executable LOA');
assert(lifeTx.query.linesOfAuthority?.[0] === 'Life', 'CTRL_TX_LIFE is official Life LOA');
assert(lifeTx.query.jurisdiction?.state === 'TX', 'CTRL_TX_LIFE jurisdiction');
assert(lifeTx.query.coverageState !== 'UNSUPPORTED', 'CTRL_TX_LIFE is not unresolved product');
assert(!lifeTx.query.requestedProduct?.length, 'life is LOA-supported, not unresolved product');

const flPcAgencies = q('Florida agencies with Property and Casualty authority');
assert(flPcAgencies.query.mode === 'entity' && flPcAgencies.query.entityClass === 'agency', 'CTRL_FL_PC agencies phrasing stays executable');
assert(JSON.stringify(flPcAgencies.query.linesOfAuthority) === JSON.stringify(['Property', 'Casualty']), 'CTRL_FL_PC official Property + Casualty');
assert(flPcAgencies.query.jurisdiction?.state === 'FL', 'CTRL_FL_PC Florida');
assert(flPcAgencies.query.coverageState === 'PARTIAL', 'CTRL_FL_PC FL official LOA rows = 0 is PARTIAL, not product UNSUPPORTED');
assert(!flPcAgencies.query.requestedProduct?.length, 'CTRL_FL_PC is not unresolved product');

const flPcBare = q('Florida Property & Casualty authority');
assert(flPcBare.query.mode === 'entity' && flPcBare.query.entityClass === 'agency', 'CTRL_FL_PC bare authority phrasing stays official LOA path');
assert(JSON.stringify(flPcBare.query.linesOfAuthority) === JSON.stringify(['Property', 'Casualty']), 'CTRL_FL_PC bare keeps Property + Casualty');
assert(flPcBare.query.jurisdiction?.state === 'FL', 'CTRL_FL_PC bare Florida');
assert(flPcBare.query.coverageState === 'PARTIAL', 'CTRL_FL_PC bare is PARTIAL, not class-clarification UNSUPPORTED');
assert(!flPcBare.query.requestedProduct?.length, 'CTRL_FL_PC bare is not unresolved product');
assert(flPcBare.query.refinement !== 'class', 'CTRL_FL_PC does not demand a class restatement');

const loaCountNoClass = q('how many with Property and Casualty authority in Florida');
assert(loaCountNoClass.query.mode === 'fail_closed', 'official LOA count still requires an entity class');
assert(/entity class/i.test(loaCountNoClass.query.failReason ?? ''), 'count without class is not injected as agency');
assert(loaCountNoClass.query.entityClass === undefined, 'do not invent agency class for a classless count');

const zipHomeowners = q('homeowners insurance agency in ZIP 33441');
assert(zipHomeowners.query.mode === 'directory', 'ZIP homeowners remains directory');
assert(JSON.stringify(zipHomeowners.query).toLowerCase().includes('homeowners'), 'ZIP homeowners retains product');

// GEOGRAPHY
const serving = q('Show agencies serving Florida.');
assert(serving.query.mode === 'fail_closed', 'serving ≠ credential');

const located = q('Show agencies located in Florida.');
assert(located.query.mode === 'fail_closed', 'office geography not national Ask filter');

const domicileQ = q('Show insurers domiciled in Florida.');
assert(domicileQ.query.entityClass === 'insurer', 'domicile entity insurer');
assert(domicileQ.query.jurisdiction?.meaning === 'regulatory_domicile', 'domicile dimension');

// PERSON
// TH-DISCOVERY-GEN-001: a bare producer/agent request is a provider-category phrase, not a
// parse-time dead end -- it now parses as a normal entity-mode query (mode: 'entity'), and
// execute.ts's listPersons broadens the unsupported mass-producer cohort to real agencies at
// execution time instead of interpret.ts stonewalling it here with zero providers.
const personList = q('Show insurance producers credentialed in Florida.');
assert(personList.query.mode === 'entity' && personList.query.entityClass === 'person', 'person list parses as entity mode, broadened at execution time');

const personCount = q('How many individual producers are credentialed in Florida?');
assert(personCount.query.mode === 'count' && personCount.query.entityClass === 'person', 'person count');

// APPOINTMENT
const appt = q("Is this agency authorized to sell every insurer's products?");
assert(appt.query.mode === 'fail_closed', 'LOA ≠ every appointment');

const apptNamed = q('Is this producer allowed to sell policies for XYZ Insurance Company?');
assert(apptNamed.query.mode === 'fail_closed', 'appointment without NPN fail closed');

const apptNpn = q('Is NPN 1234567 appointed to sell policies for XYZ Insurance Company?');
assert(apptNpn.query.mode === 'evidence', 'labeled NPN appointment is evidence mode');
assert(apptNpn.query.evidenceFamily === 'appointment', 'appointment family');

const county = q('Is this producer authorized to write insurance in Broward County?');
assert(county.query.mode === 'fail_closed', 'county appointment ≠ service area');

// MARKETPLACE
const mkt = q('Show Marketplace evidence for NPN 1234567 plan year 2026.');
assert(mkt.query.mode === 'evidence', 'marketplace evidence');
assert(mkt.query.evidenceFamily === 'marketplace', 'marketplace family');
assert(mkt.query.marketplacePlanYear === '2026', 'plan year preserved');
assert(mkt.query.identifier?.value === '1234567', 'marketplace NPN');

const mktBare = q('Show Marketplace producers in Florida.');
assert(mktBare.query.mode === 'fail_closed', 'marketplace is not a public directory');

// INSURER
const naic = q('Find insurer NAIC code 10064.');
assert(naic.query.mode === 'identifier' && naic.query.identifier?.value === '10064', 'NAIC lookup');
assert(naic.query.entityClass === 'insurer', 'NAIC is legal insurer');

// COUNTS
const count = q('How many agencies are credentialed in Florida?');
assert(count.query.mode === 'count' && count.query.entityClass === 'agency', 'agency count');
assert(count.query.jurisdiction?.meaning === 'credential_jurisdiction', 'count geo is credential jurisdiction');

const mixed = q('How many insurance providers are in Florida?');
assert(mixed.query.mode === 'fail_closed', 'no class sum');

const howManyProviders = q('How many insurance providers');
assert(howManyProviders.query.mode === 'fail_closed', 'providers total rejected');

const insurerCount = q('How many legal insurers are in the graph?');
assert(insurerCount.query.mode === 'count' && insurerCount.query.entityClass === 'insurer', 'insurer count class');

// DEFINITIONS
const def = q('What is a line of authority?');
assert(def.query.mode === 'definition' && def.query.definitionId === 'loa', 'LOA definition');

const defIns = q('What is an insurance line of authority?');
assert(defIns.query.definitionId === 'loa', 'insurance line of authority');

const vs = q('What is the difference between an insurance agency and insurer?');
assert(vs.query.definitionId === 'agency_vs_insurer', 'agency vs insurer');

const vs2 = q('What is the difference between an agency and an insurer?');
assert(vs2.query.definitionId === 'agency_vs_insurer', 'agency vs insurer short');

const npnDef = q('What is an NPN?');
assert(npnDef.query.definitionId === 'npn', 'NPN definition');

const apptDef = q('What is an insurance appointment?');
assert(apptDef.query.definitionId === 'appointment', 'appointment definition');

const domDef = q('What does insurer domicile mean?');
assert(domDef.query.definitionId === 'domicile', 'domicile definition');

// FAIL CLOSED
const best = q('Which insurance agency is the best in Florida?');
assert(best.query.mode === 'fail_closed', 'best agency fail closed');

const best2 = q('Which is the best insurance agency in Florida?');
assert(best2.query.mode === 'fail_closed', 'best agency alt fail closed');

const safest = q('Which is the safest insurer in Florida?');
assert(safest.query.mode === 'fail_closed', 'safest insurer fail closed');

const trust = q('Which is the most trustworthy agency in Florida?');
assert(trust.query.mode === 'fail_closed', 'most trustworthy fail closed');

const cheapest = q('Who has the cheapest homeowners insurance?');
assert(cheapest.query.mode === 'fail_closed', 'quotes fail closed');

const cheapestHo = q('cheapest homeowners policy in Florida');
assert(cheapestHo.query.mode === 'fail_closed', 'cheapest policy fail closed');

const bestAgent = q('Who is the best insurance agent in Florida?');
assert(bestAgent.query.mode === 'fail_closed', 'best agent fail closed');

const clean = q('Does this agency have a clean record?');
assert(clean.query.mode === 'fail_closed', 'clean record fail closed');

const unauthorized = q('Is this agency unauthorized because it is missing from the database?');
assert(unauthorized.query.mode === 'fail_closed', 'missing ≠ unauthorized');

const advice = q('How much homeowners insurance should I buy?');
assert(advice.query.mode === 'fail_closed', 'advice fail closed');

const root = join(__dirname, '..');
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const robots = readFileSync(join(root, 'app/robots.ts'), 'utf8');
const askPage = readFileSync(join(root, 'app/ask/page.tsx'), 'utf8');
const home = readFileSync(join(root, 'components/home/insurance-home-intelligence.tsx'), 'utf8');
const nav = readFileSync(join(root, 'lib/design/insurance-design-system.ts'), 'utf8');

assert(sitemap.includes("'/directory'"), 'sitemap directory');
assert(sitemap.includes("'/florida'"), 'sitemap florida');
assert(sitemap.includes("'/methodology'"), 'sitemap methodology');
assert(sitemap.includes("'/providers'"), 'sitemap providers');
assert(!sitemap.includes("'/ask'"), 'ask stays noindex (not in sitemap)');
assert(robots.includes("allow: '/'"), 'robots allow root');
assert(askPage.includes('noIndex: true') || askPage.includes("index: false"), 'ask noindex');
assert(home.includes('InsuranceSpecialistSearchShell') && readFileSync('components/specialist-search/insurance-specialist-search-shell.tsx','utf8').includes('action="/ask"'), 'homepage mounts the actual Ask search form');
assert(nav.includes("href: '/ask'"), 'header Ask link');
assert(nav.includes("href: '/directory'"), 'header directory retained');
assert(nav.includes("href: '/methodology'"), 'header methodology retained');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('check-insurance-ask PASS', 0);
