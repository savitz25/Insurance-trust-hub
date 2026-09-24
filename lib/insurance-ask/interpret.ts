import { interpretIdentityAndLocal, resolveFlCityLaunchCounty } from './research-intent';
import {
  MASSACHUSETTS_AGENCY_COVERAGE_NOTE,
  interpretMassachusettsEarly,
  resolvesToMassachusetts,
  withMassachusettsNaicContext,
} from './massachusetts-routing';
import {
  annotateUnestablishedProduct,
  detectRequestedConsumerProducts,
  hasOfficialExecutableLoa,
  productInterpretationLines,
} from './product-intent';
import { detectRequestedEntityClass } from './entity-class';
import {
  matchAmbiguousCity,
  matchCityForState,
  matchKnownCity,
  resolveAllPlaceCodes,
  titleCasePlace,
} from './us-cities';
import {
  ASK_DEFINITIONS,
  CREDENTIAL_STATES,
  type GeographyDimension,
  type InsuranceEntityClass,
  type InsuranceResearchQuery,
  type ParsedInsuranceAsk,
} from './contract';

// TH-DISCOVERY-PARITY-001B: delegates to the shared, general place resolver (us-cities.ts) so this
// module recognizes the exact same geography as research-intent.ts. The previous ~14-state
// hardcoded name list here never matched a bare city ("Spokane", "Fort Worth", "Miami", "Boulder",
// "Denver", "Trenton", "San Diego") or a trailing state code ("Trenton NJ") at all -- those queries
// carried NO resolved jurisdiction and so could never be geography-filtered or honestly broadened.
// PA-INS-001 added a local STATE_NAMES map here (florida/texas/.../pennsylvania -> code); it is
// superseded by resolveAllPlaceCodes below, which resolves every US_STATES name generically
// (including Pennsylvania), so it is dropped rather than reconciled.
function detectStates(q: string): string[] {
  return resolveAllPlaceCodes(q);
}

// TH-DISCOVERY-PARITY-001B: delegates to the shared classifier (entity-class.ts); see that file's
// doc comment. Adds "broker"/"provider" recognition and fixes divergence from research-intent.ts.
function detectClass(q: string): InsuranceEntityClass | undefined {
  return detectRequestedEntityClass(q);
}

function detectLoas(q: string): string[] {
  const out: string[] = [];
  const add = (v: string) => {
    if (!out.includes(v)) out.push(v);
  };
  if (/\bproperty\b/i.test(q)) add('Property');
  if (/\bcasualty\b/i.test(q)) add('Casualty');
  if (/\blife\b/i.test(q) && !/\bvariable life\b/i.test(q)) add('Life');
  if (/\b(health|accident\s*(&|and)\s*health|a\s*&\s*h)\b/i.test(q)) add('Health');
  if (/\bpersonal lines\b/i.test(q)) add('Personal Lines');
  if (/\bvariable (life|annuit)/i.test(q)) add('Variable Life / Annuity');
  return out;
}

function geographyMeaning(q: string): GeographyDimension {
  if (/\bdomicil/i.test(q)) return 'regulatory_domicile';
  if (/\blocated|office|address|physical\b/i.test(q) && !/\blicensed|credentialed\b/i.test(q)) {
    return 'recorded_address_state';
  }
  return 'credential_jurisdiction';
}

function fail(reason: string, alternatives: string[]): InsuranceResearchQuery {
  return { mode: 'fail_closed', page: 1, failReason: reason, alternatives };
}

function isRanking(q: string): boolean {
  return (
    /\b(best|safest|most trustworthy|cheapest|top[- ]?rated|most trusted|recommended|trust score)\b/i.test(q) &&
    /\b(insurance|insurer|agenc|agent|producer|carrier)/i.test(q)
  );
}

function isQuote(q: string): boolean {
  return /\b(cheapest (homeowners|auto|policy)|what will .+ charge|quote|premium for me)\b/i.test(q);
}

function isAdvice(q: string): boolean {
  return /\b(how much homeowners|should i (buy|choose)|ho-3|ho-5)\b/i.test(q);
}

export type { ParsedInsuranceAsk };

export function interpretInsuranceAskQuery(raw: string, page = 1): ParsedInsuranceAsk {
  const early = raw.trim();
  const georgiaEarly = /\bgeorgia\b/i.test(early);
  const labeledGeorgiaId = /\b(npn|naic)\b/i.test(early);
  if (
    /\b(atlanta|savannah)\b/i.test(early) &&
    /\b(insurance|agenc|agent|insurer|company|producer)\b/i.test(early) &&
    !labeledGeorgiaId
  ) {
    const products = detectRequestedConsumerProducts(early);
    const query = fail(
      products.length
        ? `This statewide Georgia insurance page does not publish Atlanta, Savannah, or other local insurance intelligence routes, and it cannot show a ${products.join(' / ')}-qualified local cohort. Atlanta hub copy is not an OCI license census. License geography is statewide.`
        : 'This statewide Georgia insurance page does not publish Atlanta, Savannah, or other local insurance intelligence routes. Atlanta is geography, not a licensing regime. Atlanta hub copy is not an OCI license census.',
      ['Open Georgia insurance research.'],
    );
    query.coverageState = 'UNSUPPORTED';
    if (products.length) query.requestedProduct = products;
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'UNSUPPORTED — no Georgia local intelligence' }] };
  }
  if (
    georgiaEarly &&
    /\b(augusta|macon|columbus)\b/i.test(early) &&
    /\b(insurance|agenc|agent|insurer|company|producer)\b/i.test(early) &&
    !labeledGeorgiaId
  ) {
    const query = fail(
      'This statewide Georgia insurance page does not publish Augusta, Macon, Columbus, or other local insurance intelligence routes. License geography is statewide.',
      ['Open Georgia insurance research.'],
    );
    query.coverageState = 'UNSUPPORTED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'UNSUPPORTED — no Georgia local intelligence' }] };
  }
  if (georgiaEarly && /complaint/i.test(early) && !labeledGeorgiaId) {
    const query = fail(
      'OCI accepts consumer insurance complaints, but a public complaint dataset was not acquired. Complaint intake is not a bulk census and is not zero. A complaint is not a finding. Confirm /georgia and the OCI consumer complaint portal.',
      ['Open Georgia insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'NOT_ACQUIRED — Georgia complaint dataset' }] };
  }
  if (georgiaEarly && /receivership|liquidat/i.test(early) && !labeledGeorgiaId) {
    const query = fail(
      'OCI receivership index lists 7 companies subject to receivership action since September 2010. Each company page publishes a liquidation-order document; those PDF order dates were not extracted. Friday Health Plans of Georgia, Inc. and Sonder Health Plans, Inc. are later announcements and are not on that index. All nine are insurer-grain events. Exact NAIC attachments: 0. A name is not a join. Confirm /georgia.',
      ['Open Georgia insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    query.entityClass = 'insurer';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — Georgia receivership index' }] };
  }
  if (georgiaEarly && /mental health parity|parity fine|parity violation/i.test(early) && !labeledGeorgiaId) {
    const query = fail(
      'The January 12, 2026 OCI announcement describes market-conduct examinations of twenty-two insurers and nearly $25 million in fines. It does not name the insurers or NAIC codes. Company-level orders were not acquired. The announcement is not a company roster. Confirm /georgia.',
      ['Open Georgia insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — Georgia mental-health parity announcement' }] };
  }
  if (georgiaEarly && /branch agenc|branch licens/i.test(early) && !labeledGeorgiaId) {
    const query = fail(
      'HB410, signed May 14, 2025, eliminated Georgia branch-agency licensing. The current business entity is the principal agency. Historical branch evidence is not a current branch-license census. Confirm /georgia and OCI agency licensing.',
      ['Open Georgia insurance research.'],
    );
    query.coverageState = 'UNSUPPORTED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'UNSUPPORTED — no current Georgia branch-license census' }] };
  }
  if (georgiaEarly && /serff|rate filing/i.test(early) && !labeledGeorgiaId) {
    const query = fail(
      'Georgia SERFF rate and form filings were not acquired. A filing is not a premium and not a license census. Search-only is not zero. Confirm /georgia.',
      ['Open Georgia insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'NOT_ACQUIRED — Georgia SERFF filings' }] };
  }
  if (georgiaEarly && /consent order|market conduct|enforcement action|\bfine/i.test(early) && !labeledGeorgiaId) {
    const query = fail(
      'Company-level Georgia consent orders, market-conduct orders, and fines were not acquired as a catalog. The January 12, 2026 mental-health parity release is an aggregate announcement only. Receivership evidence on /georgia is a separate grain. Search-only is not zero.',
      ['Open Georgia insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'NOT_ACQUIRED — Georgia order catalog' }] };
  }
  if (/\boregon\b/i.test(early) && /receivership|in supervision/i.test(early)) {
    const query = fail(
      'Oregon receivership is official NAIC GRID search-only. DFR supervision orders are a separate grain and are not a receivership census. Historical receivership is not current license status.',
      ['Open Oregon insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'NOT_ACQUIRED — Oregon receivership bulk' }] };
  }
  if (/\boregon\b/i.test(early) && /complaint/i.test(early)) {
    const query = fail(
      'Oregon DFR 2025 insurer complaint tables are name-only line-of-insurance observations (auto, homeowners, health, life, annuities, long-term care). Premium is the published denominator. A complaint is not a violation. The source Complaint Index is Oregon DFR’s metric, not a Trust Score, and is not a ranking. Names are not NAIC attachments. Confirm /oregon and DFR complaint information.',
      ['Open Oregon insurance research.', 'Find insurer NAIC code 10064.'],
    );
    query.coverageState = 'PARTIAL';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — Oregon 2025 complaint tables' }] };
  }
  if (/\boregon\b/i.test(early) && /enforcement|admin(?:istrative)? orders?|dfr case|notices and orders/i.test(early)) {
    const query = fail(
      'Oregon DFR insurance-related administrative orders are document rows in source-native DFRAction classes. Mixed Enforcement/Filing/Mortgage/Securities buckets are not that census. A document is not a unique case. Name-only attachment is unsafe. Confirm the official Notices and orders system and /oregon.',
      ['Open Oregon insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — Oregon DFR insurance orders' }] };
  }
  if (/\boregon\b/i.test(early) && /market conduct/i.test(early)) {
    const query = fail(
      'Oregon DFR market-conduct examination reports are a public index of exam reports, not discipline and not administrative orders. Exam existence is not a negative finding. See /oregon.',
      ['Open Oregon insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — Oregon market-conduct exams' }] };
  }
  if (/\boregon\b/i.test(early) && /financial exam/i.test(early)) {
    const query = fail(
      'Oregon DFR financial examination reports are solvency/financial-compliance reviews, not market-conduct exams and not enforcement. See /oregon.',
      ['Open Oregon insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — Oregon financial exams' }] };
  }
  if (/\b(philadelphia|pittsburgh)\b/i.test(early) && /\b(insurance|agenc|agent|insurer|company|producer)\b/i.test(early)) {
    const query = fail(
      'This statewide Pennsylvania insurance page does not publish Philadelphia, Pittsburgh, or other local insurance intelligence routes. License geography is statewide.',
      ['Open Pennsylvania insurance research.'],
    );
    query.coverageState = 'UNSUPPORTED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'UNSUPPORTED — no Pennsylvania local intelligence' }] };
  }
  if (/\bpennsylvania\b/i.test(early) && /complaint/i.test(early)) {
    const query = fail(
      'Pennsylvania Insurance Department 2025 Complaint Comparison Tool tables are name-only insurer-line observations (Accident and Health, Auto, Homeowners, Life, Annuity, Title): 595 rows / 500 distinct names. Premium is the published denominator. A complaint is not a violation or enforcement action. The source Complaint Index is PID’s metric, not a Trust Score, and is not a ranking. Names are not NAIC attachments. Confirm /pennsylvania and the official comparison tool.',
      ['Open Pennsylvania insurance research.', 'Find insurer NAIC code 13735.'],
    );
    query.coverageState = 'PARTIAL';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — Pennsylvania 2025 complaint tables' }] };
  }
  if (/\bpennsylvania\b/i.test(early) && /liquidat|rehabilitat|discharged estate/i.test(early)) {
    const query = fail(
      'Pennsylvania liquidation/rehab/discharge is a 95-document catalog (62 liquidation, 32 discharged, 1 rehabilitation). It is not the current licensed-company census. Rehabilitation is not liquidation. Discharge is not current license status. Names are not NAIC attachments. See /pennsylvania.',
      ['Open Pennsylvania insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — Pennsylvania liquidation catalog' }] };
  }
  if (/\b(charlotte|raleigh)\b/i.test(early) && /\b(insurance|agenc|agent|insurer|company|producer)\b/i.test(early)) {
    const query = fail(
      'This statewide North Carolina insurance page does not publish Charlotte, Raleigh, Mecklenburg, Wake, or other local insurance intelligence routes. License geography is statewide.',
      ['Open North Carolina insurance research.'],
    );
    query.coverageState = 'UNSUPPORTED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'UNSUPPORTED — no North Carolina local intelligence' }] };
  }
  if (/\bnorth carolina\b/i.test(early) && /complaint/i.test(early)) {
    const query = fail(
      'NCDOI accepts consumer complaints, but a complete public insurer-level complaint census was not acquired. Complaint intake is not a bulk census. Market-exam complaint templates and MCAS ratios are different evidence and are not a Trust Score. Search-only is not zero. Confirm /north-carolina and NCDOI assistance/complaints.',
      ['Open North Carolina insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'NOT_ACQUIRED — North Carolina complaint bulk' }] };
  }
  if (/\bnorth carolina\b/i.test(early) && /licensing action|disciplinary|revocation|fine/i.test(early)) {
    const query = fail(
      'NCDOI Licensing Actions catalog: 2,874 rows (Insurance Producer 1,717; Business Entity 255; adjuster classes 72; other source-native classes 830 including bail-bond and collection-agency). Distinct dockets 404. Unique matters for the whole catalog remain unknown. A licensing action is not a complaint. Name-only attachment is unsafe. Confirm /north-carolina and NCDOI Licensing Actions.',
      ['Open North Carolina insurance research.', 'Find NPN 10391484.'],
    );
    query.coverageState = 'PARTIAL';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — North Carolina licensing actions' }] };
  }
  if (/\bnorth carolina\b/i.test(early) && /market conduct/i.test(early)) {
    const query = fail(
      'NCDOI Market Regulation Examination Reports index: 138 reports / 137 distinct titles. A market exam is not a licensing action, not a complaint, and not a financial exam. Exam existence is not a fine. See /north-carolina.',
      ['Open North Carolina insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — North Carolina market-exam index' }] };
  }
  if (/\bnorth carolina\b/i.test(early) && /financial exam/i.test(early)) {
    const query = fail(
      'NCDOI Financial Examination Reports index: 158 reports / 158 distinct titles. A financial exam is solvency review, not market conduct and not enforcement. Exact NAIC attachments remain 0. See /north-carolina.',
      ['Open North Carolina insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — North Carolina financial exams' }] };
  }
  if (/\bnorth carolina\b/i.test(early) && /receivership|liquidat|rehabilitat/i.test(early)) {
    const query = fail(
      'NCDOI current receivership estate index names 6 legal entities in 3 accordion groups. Rehabilitation is not liquidation. Historic receivership is not current authorization. Name-only attachment is unsafe. See /north-carolina.',
      ['Open North Carolina insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — North Carolina receivership index' }] };
  }
  if (/\bnorth carolina\b/i.test(early) && /surplus lines/i.test(early)) {
    const query = fail(
      'NCDOI eligible surplus-lines insurers are a separate universe from admitted companies. The official eligible list is NAIC external lookup; alien insurers are the NAIC IID quarterly listing. No complete free eligible-list dump was acquired. Search-only is not zero. Confirm /north-carolina.',
      ['Open North Carolina insurance research.', 'Find insurer NAIC code 13735.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.entityClass = 'insurer';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'NOT_ACQUIRED — North Carolina surplus-lines bulk list' }] };
  }
  if (
    /\bnorth carolina\b/i.test(early) &&
    /\b(licensed insurance compan(?:y|ies)|legal insurers?|insurers?|insurance compan(?:y|ies))\b/i.test(early) &&
    !/\bagenc/i.test(early)
  ) {
    const homeowners = /homeowners/i.test(early);
    const flood = /flood/i.test(early);
    const auto = /\bauto\b/i.test(early);
    const workers = /workers?\s*comp/i.test(early);
    const reason = homeowners
      ? 'North Carolina 2025 homeowners multiple peril market-share PDF lists 199 company-line rows / 199 distinct NAIC identities. That is market activity, not a licensed-company census and not an agency product-capability cohort. Complete licensed-company roster remains search-only. Confirm /north-carolina.'
      : flood
        ? 'North Carolina 2025 federal flood market-share PDF lists 25 company-line rows; private flood lists 125. Those are company market-activity grains, not agency flood capability and not the licensed-company census. Confirm /north-carolina.'
        : auto
          ? 'North Carolina 2025 private-passenger auto market-share lists 190 company rows; commercial auto lists 510 company rows. Those grains are not added together and are not agency auto capability. Licensed-company roster remains search-only. Confirm /north-carolina.'
          : workers
            ? 'North Carolina 2025 workers compensation market-share PDF lists 423 company-line rows / 423 distinct NAIC identities. That is market activity, not current authorization and not an agency cohort. Confirm /north-carolina.'
            : 'North Carolina licensed-company bulk roster was not acquired (OPEN_SEARCH_ONLY). Market-share reporters, exam indexes, and receivership estates are different grains. Search-only is not zero. Confirm /north-carolina and NCDOI Company Licensing.';
    const query = fail(reason, ['Open North Carolina insurance research.', 'Find insurer NAIC code 13735.']);
    query.coverageState = homeowners || flood || auto || workers ? 'PARTIAL' : 'NOT_ACQUIRED';
    query.entityClass = 'insurer';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: `${query.coverageState} — North Carolina companies` }] };
  }
  if (/\bohio\b/i.test(early) && isRanking(early)) {
    const query = fail(
      'InsuranceTrustHub does not rank Ohio insurers, agencies, or agents and does not publish a Trust Score.',
      ['Open Ohio insurance research.', 'Find insurer NAIC code 10399.'],
    );
    query.coverageState = 'UNSUPPORTED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'UNSUPPORTED — no ranking' }] };
  }
  if (
    /\b(columbus|cleveland|cincinnati|toledo|dayton|akron)\b/i.test(early) &&
    /\b(insurance|agenc|agent|insurer|company|producer)\b/i.test(early)
  ) {
    const query = fail(
      'This statewide Ohio insurance page does not publish Columbus, Cleveland, Cincinnati, Toledo, Dayton, Akron, or other local insurance intelligence routes. License geography is statewide. Confirm /ohio.',
      ['Open Ohio insurance research.'],
    );
    query.coverageState = 'UNSUPPORTED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'UNSUPPORTED — no Ohio local intelligence' }] };
  }
  if (/\bohio\b/i.test(early) && /complaint/i.test(early)) {
    const query = fail(
      'ODI accepts consumer complaints, but a complete public insurer-level complaint census was not acquired. Complaint intake is not a bulk census. A complaint is not a finding. Search-only is not zero. Confirm /ohio.',
      ['Open Ohio insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'NOT_ACQUIRED — Ohio complaint bulk' }] };
  }
  if (
    /\bohio\b/i.test(early) &&
    /administrative action|disciplinary|journal|revocation|fine|company action/i.test(early)
  ) {
    const query = fail(
      'ODI Administrative Actions Journal bounded past-12-months catalog: 496 documents (383 Order / 113 Notice). ODI warns search results may not be comprehensive and exclude most agent CE noncompliance. A document is not a unique matter. The Journal is not a complete adverse census. Name-only attachment is unsafe. Confirm /ohio.',
      ['Open Ohio insurance research.', 'Find NPN 40000001.'],
    );
    query.coverageState = 'PARTIAL';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — Ohio Administrative Actions Journal' }] };
  }
  if (/\bohio\b/i.test(early) && /financial data|annual financial/i.test(early)) {
    const query = fail(
      'A complete ODI Annual Financial Data export was not acquired. Per-company statement PDFs are supporting evidence, not the authorized-company census. Financial data is not authorization or quality. Search-only is not zero. Confirm /ohio.',
      ['Open Ohio insurance research.', 'Find insurer NAIC code 10399.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'NOT_ACQUIRED — Ohio annual financial bulk' }] };
  }
  if (/\bohio\b/i.test(early) && /surplus lines/i.test(early)) {
    const query = fail(
      'Ohio surplus-lines eligible insurers are a separate universe from ODI admitted authorized companies. No complete free eligible-list dump was acquired. Certified reinsurers (19 name-bearing rows, no NAIC) are not that list. Search-only is not zero. Confirm /ohio.',
      ['Open Ohio insurance research.', 'Find insurer NAIC code 10399.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.entityClass = 'insurer';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'NOT_ACQUIRED — Ohio surplus-lines bulk list' }] };
  }
  if (/\bohio\b/i.test(early) && /receivership|liquidat|rehabilitat/i.test(early)) {
    const query = fail(
      'Ohio receivership/liquidation/rehabilitation estates were not acquired as a complete current catalog. Liquidation is not rehabilitation. Historic insolvent estate is not current authorization. Search-only is not zero. Confirm /ohio.',
      ['Open Ohio insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'NOT_ACQUIRED — Ohio receivership catalog' }] };
  }
  if (/\bohio\b/i.test(early) && /market conduct|financial exam|examination report/i.test(early)) {
    const query = fail(
      'Ohio examination-report catalogs were not acquired as a complete public index in this extract. A market exam is not a financial exam and not a Journal administrative action. Exam existence is not a finding. Search-only is not zero. Confirm /ohio.',
      ['Open Ohio insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'NOT_ACQUIRED — Ohio examination catalogs' }] };
  }
  if (
    /\bohio\b/i.test(early) &&
    /\b(insurance agents?|producers?)\b/i.test(early) &&
    !/\bagenc/i.test(early) &&
    !/credentialed/i.test(early)
  ) {
    const query = fail(
      'ODI individual-producer bulk roster is not mass-published here. Agent / Agency Locator is live search (last name or NPN, captcha). A person is not an agency. NPN is not NAIC. Search-only is not zero. Confirm /ohio and the official locator.',
      ['Open Ohio insurance research.', 'Find NPN 40000001.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.entityClass = 'person';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'NOT_ACQUIRED — Ohio producer bulk census' }] };
  }
  if (/\bohio\b/i.test(early) && /insurance agenc/i.test(early) && !/credentialed/i.test(early)) {
    const products = detectRequestedConsumerProducts(early);
    const life = /\blife\b/i.test(early) && !/\bvariable life\b/i.test(early);
    const health = /\bhealth\b/i.test(early);
    const reason = products.includes('homeowners')
      ? 'ODI mailing-list Line of Authority options have no Homeowners LOA. Property, Casualty, and Personal authority do not prove an agency currently sells homeowners insurance. Licensing authority is not product inventory. Confirm /ohio.'
      : products.includes('auto')
        ? 'ODI mailing-list Line of Authority options have no Auto LOA. Auto Rental is a different limited line. This extract will not treat auto insurance agencies Ohio as generic insurance agencies Ohio. Confirm /ohio.'
        : products.includes('flood')
          ? 'ODI mailing-list Line of Authority options have no Flood LOA. Flood insurance agencies Ohio remain unsupported as a product-qualified cohort. Confirm /ohio.'
          : life
            ? 'ODI Business Entity + Major Lines mailing list filtered to Line of Authority = Life: 16,306 distinct NPNs (resident 5,102 / non-resident 11,204). That is licensing authority, not current life-product inventory. Confirm /ohio.'
            : health
              ? 'ODI Business Entity + Major Lines mailing list filtered to Line of Authority = Accident & Health: 16,132 distinct NPNs (resident 4,910 / non-resident 11,222). That is licensing authority, not current health-product inventory. Confirm /ohio.'
              : 'ODI Agent/Agency Mailing Lists, Business Entity + Major Lines, all source LOA filters: 23,922 distinct NPNs (resident 5,648 / non-resident 18,274; overlap 0). This is not agents, not legal insurers, and not every ODI license type. LOA is the report filter, not an export column. Confirm /ohio.';
    const query = fail(reason, ['Open Ohio insurance research.', 'Find NPN 40000001.']);
    query.coverageState = products.includes('homeowners') || products.includes('auto') || products.includes('flood')
      ? 'UNSUPPORTED'
      : 'PARTIAL';
    query.entityClass = 'agency';
    if (products.length) query.requestedProduct = products;
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: `${query.coverageState} — Ohio agencies` }] };
  }
  if (
    /\bohio\b/i.test(early) &&
    /\b(authorized insurance compan(?:y|ies)|licensed insurance compan(?:y|ies)|legal insurers?|insurers?|insurance compan(?:y|ies))\b/i.test(early) &&
    !/\bagenc/i.test(early)
  ) {
    const query = fail(
      "ODI complete current authorized-company Excel (AuthList091820261205.xls) lists 1,738 distinct NAIC codes / 1,738 rows (0 missing NAIC). Authorized is not domestic (Ohio-domicile 237). NAIC is not NPN. A legal insurer is not an agency. Financial data is not authorization. Confirm /ohio and ODI Company Search.",
      ['Open Ohio insurance research.', 'Find insurer NAIC code 10399.'],
    );
    query.coverageState = 'PARTIAL';
    query.entityClass = 'insurer';
    return { raw: early, query, interpretation: [{ label: 'Coverage', value: 'PARTIAL — Ohio authorized companies' }] };
  }
  const massachusetts = interpretMassachusettsEarly(early);
  if (massachusetts) return massachusetts;
  const typed = interpretIdentityAndLocal(raw, page);
  if (typed) return withMassachusettsNaicContext(typed);
  const q = raw.trim();
  const lines: ParsedInsuranceAsk['interpretation'] = [];
  const push = (label: string, value: string) => lines.push({ label, value });
  const safePage = Math.max(1, Math.min(200, page));

  if (!q) {
    return {
      raw: q,
      query: fail('Enter a research question. InsuranceTrustHub organizes regulatory records; it does not recommend insurance.', [
        'Show insurance agencies credentialed in Florida.',
        'What is an NPN?',
      ]),
      interpretation: [{ label: 'Status', value: 'No question yet' }],
    };
  }

  const zip = q.match(/\b(\d{5})\b/)?.[1];
  if (zip && /\b(near|zip|local|directory|homeowners|auto|life|health)\b/i.test(q) && !/\b(npn|naic|license)\b/i.test(q)) {
    const query: InsuranceResearchQuery = { mode: 'directory', directoryZip: zip, page: 1, coverageState: 'KNOWN' };
    push('Research type', 'Local public directory');
    push('ZIP', zip);
    push('Boundary', 'Directory listing, not canonical regulatory identity or service territory');
    return { raw: q, query, interpretation: lines };
  }

  // TH-DISCOVERY-RESET-001: this used to only recognize the literal phrase "in boca raton" as a
  // trigger, and always fail closed asking for a ZIP even then -- hiding the real local-directory
  // capability behind a handoff. Recognizes any city already resolved to one of this source's
  // existing FL_LAUNCH_COUNTIES ids (not a new dataset, see resolveFlCityLaunchCounty) and runs
  // the real county-grain directory query instead of a bare ZIP request.
  const nearMeLocation = q.match(/\b(?:in|near)\s+(.+?)[?.]?$/i)?.[1]?.replace(/[?.]+$/, '');
  const nearMeLaunchCountyId = nearMeLocation ? resolveFlCityLaunchCounty(nearMeLocation) : undefined;
  if (nearMeLaunchCountyId || /\b(near me|in boca raton|local (insurance|agenc)|homeowners insurance near)\b/i.test(q)) {
    const query: InsuranceResearchQuery = nearMeLaunchCountyId
      ? { mode: 'directory', directoryLaunchCountyId: nearMeLaunchCountyId, page: 1, coverageState: 'PARTIAL' }
      : fail('Local listing discovery needs a ZIP code. The public directory is separate from the regulatory identity graph and does not prove service territory.', ['Insurance agencies in ZIP 33441.', 'Show insurance agencies credentialed in Florida.']);
    query.coverageState = 'PARTIAL';
    push('Research type', nearMeLaunchCountyId ? 'Local public directory (recorded county)' : 'Local directory handoff');
    push('Coverage', nearMeLaunchCountyId ? `Resolved to launch county from "${nearMeLocation}"` : 'PARTIAL — ZIP required');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bhow many insurance providers\b/i.test(q)) {
    const query = fail(
      'Counts require an entity class. Agencies, individual producers, and legal insurers are not added into one “insurance providers” total.',
      [
        'How many agencies are credentialed in Florida?',
        'How many individual producers are credentialed in Florida?',
      ],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (isRanking(q)) {
    const query = fail(
      'InsuranceTrustHub does not rank agencies, agents, or insurers and does not publish a TrustHub insurance score.',
      [
        'Show insurance agencies credentialed in Florida.',
        'What is the difference between an insurance agency and insurer?',
      ],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (isQuote(q)) {
    const query = fail(
      'InsuranceTrustHub is not a quote engine. Regulatory credentials do not establish the premium a carrier would charge you.',
      ['Show insurance agencies credentialed in Florida.', 'Open Marketplace plan research as a federal overlay, not a DOI license.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (isAdvice(q)) {
    const query = fail(
      'Coverage amount and form (HO-3 vs HO-5) are educational/advice questions, not entity-regulatory queries. Structured Ask does not fabricate personalized coverage advice.',
      ['What is a line of authority?', 'Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bclean record\b|\bno complaints\b/i.test(q)) {
    const query = fail(
      'Missing evidence is not a clean record. InsuranceTrustHub does not infer a complaint-free or “clean” status from absence.',
      ['Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(no enforcement|no exams?)\b/i.test(q)) {
    const query = fail('Missing regulatory-event evidence is not a clean history. Coverage varies by source, period, and identity linkage.', ['Show insurers with indexed regulatory evidence.']);
    query.coverageState = 'UNSUPPORTED';
    push('Coverage', 'UNSUPPORTED — absence cannot be established');
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(serv(e|es|ing)|service territory|writes? policies in)\b/i.test(q)) {
    const query = fail('Credential jurisdiction, office location, insurer domicile, appointment county, and ZIP listings do not establish service territory or policy availability.', ['Show insurance agencies credentialed in Florida.', 'Browse public directory listings by ZIP.']);
    query.coverageState = 'UNSUPPORTED';
    query.entityClass = detectClass(q);
    query.intent = 'RECOVERY';
    query.conditions = detectStates(q).map(value=>({value,meaning:'requested service territory',outcome:'UNSUPPORTED'}));
    push('Coverage', 'UNSUPPORTED — service territory');
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(complaints?|market conduct exams?|financial exams?|enforcement|rate filings?)\b/i.test(q) && !/\bwhat (is|are)\b/i.test(q)) {
    const query = fail('This evidence family is source-specific and is not yet executable as a complete cross-state identity list in Specialist Search. An observation is not wrongdoing, and missing evidence is not zero.', ['Research a labeled NPN or NAIC company code.', 'Explore state intelligence.']);
    query.coverageState = 'PARTIAL';
    push('Research type', 'Regulatory evidence');
    push('Coverage', 'PARTIAL — source and identity linkage vary');
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(unlicensed|unauthorized)\b/i.test(q) && !/\bnpn\s*#?\s*\d/i.test(q)) {
    const query = fail(
      'Missing evidence is not unlicensed and not unauthorized. Ask will not infer authorization status from absence in this extract.',
      ['Find NPN 1234567.', 'Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (
    /\b(sell|write|appointed for) (every|all) insurers?|authorized to sell every|every insurer'?s products|all insurers'? products\b/i.test(
      q,
    )
  ) {
    const query = fail(
      'A state credential or line of authority does not establish appointment with every insurer. Ask only answers an appointment when indexed evidence names the person/agency, appointing entity, and jurisdiction.',
      ['What is an insurance appointment?', 'Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  // TH-DISCOVERY-GEN-001: this used to require the county name to appear BEFORE the
  // appointment/authorization phrase (".*" between two capture groups), so "Is this producer
  // authorized to write insurance in Broward County?" (phrase before county) fell through this
  // check entirely once the separate blanket person-class fail_closed (removed above) stopped
  // catching it as a side effect. The two signals are independent of word order.
  if ((/\b(broward|palm beach|miami[-\s]?dade)\b/i.test(q) &&
    /\b(appoint|authorized to write|service (area|territory))\b/i.test(q)) ||
    /\bcounty appointment\b/i.test(q)) {
    const query = fail(
      'Florida county appointment records have specialized regulatory meaning and are not treated as “authorized to write insurance in this county” or as a service-territory map.',
      ['Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bserv(e|es|ing)\b|\bservice territory\b/i.test(q) && /\b(florida|texas|agency|agencies)\b/i.test(q)) {
    const query = fail(
      'Credential jurisdiction is not service territory. Ask can research agencies credentialed in a state, not “agencies that serve” a state.',
      ['Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (/^\d{4,12}$/.test(q)) {
    const query = fail(
      'Bare digits are ambiguous (NPN, NAIC company code, license number, or other network identifiers). Use a labeled identifier such as “Find NPN 1234567.”',
      ['Find NPN 1234567.'],
    );
    push('Mode', 'fail_closed');
    push('Identifier', 'Unlabeled digits');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bwhat is an? npn\b/i.test(q)) return definition(q, 'npn');
  if (
    /\bwhat is an? (insurance )?line of authority\b/i.test(q) ||
    /\bwhat does a line of authority mean\b/i.test(q)
  ) {
    return definition(q, 'loa');
  }
  if (/\bwhat is an insurance appointment\b|\bwhat does an appointment mean\b/i.test(q)) return definition(q, 'appointment');
  if (/\bwhat does (insurer )?domicile mean\b/i.test(q)) return definition(q, 'domicile');
  if (/\bwhat does marketplace registration/i.test(q) || /\bwhat is marketplace registration evidence\b/i.test(q)) {
    return definition(q, 'marketplace');
  }
  if (/\bwhat is a legal insurer\b/i.test(q)) return definition(q, 'legal_insurer');
  if (/\bdifference between an? (insurance )?agency and (an? )?(insurer|carrier)\b/i.test(q)) {
    return definition(q, 'agency_vs_insurer');
  }

  const npn = q.match(/\bnpn\s*#?\s*(\d{4,12})\b/i);
  if (npn?.[1]) {
    const appointment = /\b(appoint(?:ed|ment)?|sell policies for|allowed to sell|authorized to sell)\b/i.test(q);
    const marketplace = /\bmarketplace\b/i.test(q);
    const appointer = q.match(/\bfor\s+(.+?)(?:\?|$)/i)?.[1]?.trim();
    const query: InsuranceResearchQuery = {
      mode: appointment || marketplace ? 'evidence' : 'identifier',
      identifier: { type: 'npn', value: npn[1] },
      marketplacePlanYear: q.match(/\b(20\d{2})\b/)?.[1],
      evidenceFamily: appointment ? 'appointment' : marketplace ? 'marketplace' : undefined,
      appointerName: appointment ? appointer : undefined,
      page: 1,
    };
    push('Mode', query.mode);
    push('Identifier', `NPN ${npn[1]} (labeled)`);
    push('Identity rule', 'NPN may be a person or an organization. Class is not assumed.');
    if (appointment) {
      push('Evidence family', 'appointment (indexed relationship only; LOA is not appointment)');
    }
    if (marketplace) {
      push('Evidence family', 'CMS Marketplace overlay (not a state license, not certification)');
      if (query.marketplacePlanYear) push('Plan year', query.marketplacePlanYear);
    }
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(appoint(?:ed|ment)?|sell policies for|allowed to sell|authorized to sell)\b/i.test(q) && !/\bevery insurer/i.test(q)) {
    const query = fail(
      'Appointment answers require a labeled NPN and indexed appointment evidence naming the producer/agency and the appointing entity. A license or line of authority does not prove an appointment. Missing appointment evidence is not a finding of “unauthorized.”',
      ['What is an insurance appointment?', 'Find NPN 1234567.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  const naic = q.match(/\bnaic(?:\s+company)?(?:\s+code)?\s*#?\s*(\d{3,6})\b/i);
  if (naic?.[1]) {
    const query: InsuranceResearchQuery = {
      mode: 'identifier',
      entityClass: 'insurer',
      identifier: { type: 'naic_company_code', value: naic[1] },
      page: 1,
    };
    push('Mode', 'identifier');
    push('Entity', 'Legal insurer');
    push('Identifier', `NAIC company code ${naic[1]}`);
    return { raw: q, query, interpretation: lines };
  }

  const oregonAsked = /\boregon\b/i.test(q) || detectStates(q)[0] === 'OR';
  if (oregonAsked && /\b(how many|count of)\b/i.test(q) && /\b(agenc|producer|agent|compan|insurer|provider)/i.test(q)) {
    const query = fail(
      'Oregon DFR/SBS current agency, producer, and authorized-insurer bulk rosters were not acquired. Search-only is not zero. Do not answer with InsuranceTrustHub directory rows, complaint tables, examination listings, or DFR order documents as that census. Verify on NAIC SBS and DFR Check a license.',
      ['Open Oregon insurance research.', 'Find NPN 1234567.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.jurisdiction = { state: 'OR', meaning: geographyMeaning(q) };
    push('Coverage', 'NOT_ACQUIRED — Oregon license census');
    return { raw: q, query, interpretation: lines };
  }
  if (oregonAsked && /\blicensed\b/i.test(q) && /\bagenc/i.test(q)) {
    const query = fail(
      'Oregon insurance-agency licensing is DFR/SBS search-only. No bulk agency roster was acquired. An agency is not an individual producer and not an insurer. Sole proprietors are not the agency business-entity license. Search-only is not zero.',
      ['Open Oregon insurance research.', 'Find NPN 1234567.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.entityClass = 'agency';
    push('Coverage', 'NOT_ACQUIRED — Oregon agency roster');
    return { raw: q, query, interpretation: lines };
  }
  if (oregonAsked && /complaint/i.test(q)) {
    const query = fail(
      'Oregon DFR 2025 insurer complaint tables are name-only line-of-insurance observations (auto, homeowners, health, life, annuities, long-term care). Premium is the published denominator. A complaint is not a violation. The source Complaint Index is Oregon DFR’s metric, not a Trust Score, and is not a ranking. Names are not NAIC attachments. Confirm /oregon and DFR complaint information.',
      ['Open Oregon insurance research.', 'Find insurer NAIC code 10064.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — Oregon 2025 complaint tables');
    return { raw: q, query, interpretation: lines };
  }
  if (oregonAsked && /enforcement|admin(?:istrative)? orders?|dfr case|notices and orders/i.test(q)) {
    const query = fail(
      'Oregon DFR insurance-related administrative orders are document rows in source-native DFRAction classes (Producer, Marketplace violations, Financial-*, Workers’ Comp Billing, supervision, acquisition/merger). Mixed Enforcement/Filing/Mortgage/Securities buckets are not that census. A document is not a unique case. Name-only attachment is unsafe. Confirm the official Notices and orders system and /oregon.',
      ['Open Oregon insurance research.', 'Find NPN 1234567.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — Oregon DFR insurance orders');
    return { raw: q, query, interpretation: lines };
  }
  if (oregonAsked && /market conduct/i.test(q)) {
    const query = fail(
      'Oregon DFR market-conduct examination reports are a public index of exam reports, not discipline and not administrative orders. Exam existence is not a negative finding. Names were not attached to profiles. See /oregon and DFR examination reports.',
      ['Open Oregon insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — Oregon market-conduct exams');
    return { raw: q, query, interpretation: lines };
  }
  if (oregonAsked && /financial exam/i.test(q)) {
    const query = fail(
      'Oregon DFR financial examination reports are solvency/financial-compliance reviews, not market-conduct exams and not enforcement. They are not added to order counts. See /oregon.',
      ['Open Oregon insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — Oregon financial exams');
    return { raw: q, query, interpretation: lines };
  }
  if (oregonAsked && /receivership|in supervision/i.test(q)) {
    const query = fail(
      'Oregon receivership is official NAIC GRID search-only. DFR supervision orders are a separate grain and are not a receivership census. Historical receivership is not current license status.',
      ['Open Oregon insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    push('Coverage', 'NOT_ACQUIRED — Oregon receivership bulk');
    return { raw: q, query, interpretation: lines };
  }
  if (oregonAsked && /\b(portland|multnomah)\b/i.test(q)) {
    const query = fail(
      'This statewide Oregon insurance page does not publish Portland, Multnomah County, or other local insurance intelligence routes. License geography is not a city census.',
      ['Open Oregon insurance research.'],
    );
    query.coverageState = 'UNSUPPORTED';
    push('Coverage', 'UNSUPPORTED — no Oregon local intelligence');
    return { raw: q, query, interpretation: lines };
  }

  const pennsylvaniaAsked = /\bpennsylvania\b/i.test(q) || detectStates(q)[0] === 'PA';
  if (/\b(philadelphia|pittsburgh)\b/i.test(q) && /\b(insurance|agenc|agent|insurer|company|producer)\b/i.test(q)) {
    const query = fail(
      'This statewide Pennsylvania insurance page does not publish Philadelphia, Pittsburgh, or other local insurance intelligence routes. License geography is statewide.',
      ['Open Pennsylvania insurance research.'],
    );
    query.coverageState = 'UNSUPPORTED';
    push('Coverage', 'UNSUPPORTED — no Pennsylvania local intelligence');
    return { raw: q, query, interpretation: lines };
  }
  if (pennsylvaniaAsked && /complaint/i.test(q)) {
    const query = fail(
      'Pennsylvania Insurance Department 2025 Complaint Comparison Tool tables are name-only insurer-line observations (Accident and Health, Auto, Homeowners, Life, Annuity, Title): 595 rows / 500 distinct names. Premium is the published denominator. A complaint is not a violation or enforcement action. The source Complaint Index is PID’s metric, not a Trust Score, and is not a ranking. Names are not NAIC attachments. Confirm /pennsylvania and the official comparison tool.',
      ['Open Pennsylvania insurance research.', 'Find insurer NAIC code 13735.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — Pennsylvania 2025 complaint tables');
    return { raw: q, query, interpretation: lines };
  }
  if (pennsylvaniaAsked && /market conduct/i.test(q)) {
    const query = fail(
      'Pennsylvania Market Conduct Actions are 450 documents in the PID regulatory-actions hub. An examination is not discipline and not an Enforcement Actions document. Exam existence is not a negative finding. Name-only attachment is unsafe. See /pennsylvania.',
      ['Open Pennsylvania insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — Pennsylvania market-conduct catalog');
    return { raw: q, query, interpretation: lines };
  }
  if (pennsylvaniaAsked && /financial exam/i.test(q)) {
    const query = fail(
      'Pennsylvania financial examination reports are 494 documents / 367 unique titles. A financial exam is solvency review, not market conduct and not enforcement. NAIC was not populated, so company↔exam exact bridges remain 0. See /pennsylvania.',
      ['Open Pennsylvania insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — Pennsylvania financial exams');
    return { raw: q, query, interpretation: lines };
  }
  if (pennsylvaniaAsked && /enforcement/i.test(q)) {
    const query = fail(
      'Pennsylvania Enforcement Actions are 3,232 documents in the PID regulatory-actions hub. Market Conduct Actions (450) and CCRC Reports (24) are separate grains. A document is not a unique matter. No NAIC or docket was populated. Name-only attachment is unsafe. Confirm /pennsylvania and the official Enforcement Actions Search.',
      ['Open Pennsylvania insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — Pennsylvania Enforcement Actions');
    return { raw: q, query, interpretation: lines };
  }
  if (pennsylvaniaAsked && /liquidat|rehabilitat|discharged estate/i.test(q)) {
    const query = fail(
      'Pennsylvania liquidation/rehab/discharge is a 95-document catalog (62 liquidation, 32 discharged, 1 rehabilitation). It is not the current licensed-company census. Rehabilitation is not liquidation. Discharge is not current license status. Names are not NAIC attachments. See /pennsylvania.',
      ['Open Pennsylvania insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — Pennsylvania liquidation catalog');
    return { raw: q, query, interpretation: lines };
  }
  if (pennsylvaniaAsked && /surplus lines/i.test(q)) {
    const query = fail(
      'Pennsylvania eligible surplus-lines companies are 233 distinct NAIC identities, not the 1,722 licensed-company census and not agencies. Confirm /pennsylvania and PID Eligible Surplus Lines Company Search.',
      ['Open Pennsylvania insurance research.', 'Find insurer NAIC code 13735.'],
    );
    query.coverageState = 'PARTIAL';
    query.entityClass = 'insurer';
    push('Coverage', 'PARTIAL — Pennsylvania surplus lines');
    return { raw: q, query, interpretation: lines };
  }
  if (
    pennsylvaniaAsked &&
    /\b(licensed insurance compan(?:y|ies)|legal insurers?|insurers?|insurance compan(?:y|ies))\b/i.test(q) &&
    !/\bagenc/i.test(q)
  ) {
    const workers = /workers?\s*comp/i.test(q);
    const lifePower = /\blife\b/i.test(q) && !/\bvariable life\b/i.test(q);
    const reason = workers
      ? 'Pennsylvania PID Licensed Company Search lists 674 companies with the source-native Workers Compensation power. That power is not an agency cohort and not a consumer product mapping. Distinct licensed-company NAIC identities overall: 1,722 as of 2026-09-14. Confirm /pennsylvania.'
      : lifePower
        ? 'Pennsylvania PID Licensed Company Search lists 495 companies with the source-native Life and Annuities power. That power is not a consumer life-agency product and not an executable LOA cohort. Distinct licensed-company NAIC identities overall: 1,722 as of 2026-09-14. Confirm /pennsylvania.'
        : 'Pennsylvania PID Licensed Company Search A–Z: 1,722 distinct NAIC identities (1,724 letter rows; 211 Pennsylvania-domicile) current as of 2026-09-14. This is not an agency or producer census, not surplus lines, and not the liquidation catalog. This extract does not auto-publish insurer profiles from that census. Confirm /pennsylvania and PID Licensed Company Search.';
    const query = fail(reason, ['Open Pennsylvania insurance research.', 'Find insurer NAIC code 13735.']);
    query.coverageState = 'PARTIAL';
    query.entityClass = 'insurer';
    query.jurisdiction = { state: 'PA', meaning: geographyMeaning(q) };
    push('Coverage', 'PARTIAL — Pennsylvania licensed companies');
    return { raw: q, query, interpretation: lines };
  }

  const northCarolinaAsked = /\bnorth carolina\b/i.test(q) || detectStates(q)[0] === 'NC';
  if (/\b(charlotte|raleigh|mecklenburg|durham|wake county)\b/i.test(q) && /\b(insurance|agenc|agent|insurer|company|producer)\b/i.test(q)) {
    const query = fail(
      'This statewide North Carolina insurance page does not publish Charlotte, Raleigh, Mecklenburg, Wake, or other local insurance intelligence routes. License geography is statewide.',
      ['Open North Carolina insurance research.'],
    );
    query.coverageState = 'UNSUPPORTED';
    push('Coverage', 'UNSUPPORTED — no North Carolina local intelligence');
    return { raw: q, query, interpretation: lines };
  }
  if (northCarolinaAsked && /complaint/i.test(q)) {
    const query = fail(
      'NCDOI accepts consumer complaints, but a complete public insurer-level complaint census was not acquired. Complaint intake is not a bulk census. Market-exam complaint templates and MCAS ratios are different evidence and are not a Trust Score. Search-only is not zero. Confirm /north-carolina and NCDOI assistance/complaints.',
      ['Open North Carolina insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    push('Coverage', 'NOT_ACQUIRED — North Carolina complaint bulk');
    return { raw: q, query, interpretation: lines };
  }
  if (northCarolinaAsked && /licensing action|disciplinary|revocation|fine/i.test(q)) {
    const query = fail(
      'NCDOI Licensing Actions catalog: 2,874 rows (Insurance Producer 1,717; Business Entity 255; adjuster classes 72; other source-native classes 830 including bail-bond and collection-agency). Distinct dockets 404. Unique matters for the whole catalog remain unknown. A licensing action is not a complaint. Name-only attachment is unsafe. Confirm /north-carolina and NCDOI Licensing Actions.',
      ['Open North Carolina insurance research.', 'Find NPN 10391484.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — North Carolina licensing actions');
    return { raw: q, query, interpretation: lines };
  }
  if (northCarolinaAsked && /market conduct/i.test(q)) {
    const query = fail(
      'NCDOI Market Regulation Examination Reports index: 138 reports / 137 distinct titles. A market exam is not a licensing action, not a complaint, and not a financial exam. Exam existence is not a fine. See /north-carolina.',
      ['Open North Carolina insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — North Carolina market-exam index');
    return { raw: q, query, interpretation: lines };
  }
  if (northCarolinaAsked && /financial exam/i.test(q)) {
    const query = fail(
      'NCDOI Financial Examination Reports index: 158 reports / 158 distinct titles. A financial exam is solvency review, not market conduct and not enforcement. Exact NAIC attachments remain 0. See /north-carolina.',
      ['Open North Carolina insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — North Carolina financial exams');
    return { raw: q, query, interpretation: lines };
  }
  if (northCarolinaAsked && /receivership|liquidat|rehabilitat/i.test(q)) {
    const query = fail(
      'NCDOI current receivership estate index names 6 legal entities in 3 accordion groups. Rehabilitation is not liquidation. Historic receivership is not current authorization. Name-only attachment is unsafe. See /north-carolina.',
      ['Open North Carolina insurance research.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — North Carolina receivership index');
    return { raw: q, query, interpretation: lines };
  }
  if (northCarolinaAsked && /surplus lines/i.test(q)) {
    const query = fail(
      'NCDOI eligible surplus-lines insurers are a separate universe from admitted companies. The official eligible list is NAIC external lookup; alien insurers are the NAIC IID quarterly listing. No complete free eligible-list dump was acquired. Search-only is not zero. Confirm /north-carolina.',
      ['Open North Carolina insurance research.', 'Find insurer NAIC code 13735.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.entityClass = 'insurer';
    push('Coverage', 'NOT_ACQUIRED — North Carolina surplus-lines bulk list');
    return { raw: q, query, interpretation: lines };
  }
  if (
    northCarolinaAsked &&
    /\b(licensed insurance compan(?:y|ies)|legal insurers?|insurers?|insurance compan(?:y|ies))\b/i.test(q) &&
    !/\bagenc/i.test(q)
  ) {
    const homeowners = /homeowners/i.test(q);
    const flood = /flood/i.test(q);
    const auto = /\bauto\b/i.test(q);
    const workers = /workers?\s*comp/i.test(q);
    const reason = homeowners
      ? 'North Carolina 2025 homeowners multiple peril market-share PDF lists 199 company-line rows / 199 distinct NAIC identities. That is market activity, not a licensed-company census and not an agency product-capability cohort. Complete licensed-company roster remains search-only. Confirm /north-carolina.'
      : flood
        ? 'North Carolina 2025 federal flood market-share PDF lists 25 company-line rows; private flood lists 125. Those are company market-activity grains, not agency flood capability and not the licensed-company census. Confirm /north-carolina.'
        : auto
          ? 'North Carolina 2025 private-passenger auto market-share lists 190 company rows; commercial auto lists 510 company rows. Those grains are not added together and are not agency auto capability. Licensed-company roster remains search-only. Confirm /north-carolina.'
          : workers
            ? 'North Carolina 2025 workers compensation market-share PDF lists 423 company-line rows / 423 distinct NAIC identities. That is market activity, not current authorization and not an agency cohort. Confirm /north-carolina.'
            : 'North Carolina licensed-company bulk roster was not acquired (OPEN_SEARCH_ONLY). Market-share reporters, exam indexes, and receivership estates are different grains. Search-only is not zero. Confirm /north-carolina and NCDOI Company Licensing.';
    const query = fail(reason, ['Open North Carolina insurance research.', 'Find insurer NAIC code 13735.']);
    query.coverageState = homeowners || flood || auto || workers ? 'PARTIAL' : 'NOT_ACQUIRED';
    query.entityClass = 'insurer';
    query.jurisdiction = { state: 'NC', meaning: geographyMeaning(q) };
    push('Coverage', `${query.coverageState} — North Carolina companies`);
    return { raw: q, query, interpretation: lines };
  }

  const ohioAsked = /\bohio\b/i.test(q) || detectStates(q)[0] === 'OH';
  if (ohioAsked && isRanking(q)) {
    const query = fail(
      'InsuranceTrustHub does not rank Ohio insurers, agencies, or agents and does not publish a Trust Score.',
      ['Open Ohio insurance research.', 'Find insurer NAIC code 10399.'],
    );
    query.coverageState = 'UNSUPPORTED';
    push('Coverage', 'UNSUPPORTED — no ranking');
    return { raw: q, query, interpretation: lines };
  }
  if (
    /\b(columbus|cleveland|cincinnati|toledo|dayton|akron)\b/i.test(q) &&
    /\b(insurance|agenc|agent|insurer|company|producer)\b/i.test(q)
  ) {
    const query = fail(
      'This statewide Ohio insurance page does not publish Columbus, Cleveland, Cincinnati, Toledo, Dayton, Akron, or other local insurance intelligence routes. License geography is statewide. Confirm /ohio.',
      ['Open Ohio insurance research.'],
    );
    query.coverageState = 'UNSUPPORTED';
    push('Coverage', 'UNSUPPORTED — no Ohio local intelligence');
    return { raw: q, query, interpretation: lines };
  }
  if (ohioAsked && /complaint/i.test(q)) {
    const query = fail(
      'ODI accepts consumer complaints, but a complete public insurer-level complaint census was not acquired. Complaint intake is not a bulk census. A complaint is not a finding. Search-only is not zero. Confirm /ohio.',
      ['Open Ohio insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    push('Coverage', 'NOT_ACQUIRED — Ohio complaint bulk');
    return { raw: q, query, interpretation: lines };
  }
  if (ohioAsked && /administrative action|disciplinary|journal|revocation|fine|company action/i.test(q)) {
    const query = fail(
      'ODI Administrative Actions Journal bounded past-12-months catalog: 496 documents (383 Order / 113 Notice). ODI warns search results may not be comprehensive and exclude most agent CE noncompliance. A document is not a unique matter. The Journal is not a complete adverse census. Name-only attachment is unsafe. Confirm /ohio.',
      ['Open Ohio insurance research.', 'Find NPN 40000001.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — Ohio Administrative Actions Journal');
    return { raw: q, query, interpretation: lines };
  }
  if (ohioAsked && /financial data|annual financial/i.test(q)) {
    const query = fail(
      'A complete ODI Annual Financial Data export was not acquired. Per-company statement PDFs are supporting evidence, not the authorized-company census. Financial data is not authorization or quality. Search-only is not zero. Confirm /ohio.',
      ['Open Ohio insurance research.', 'Find insurer NAIC code 10399.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    push('Coverage', 'NOT_ACQUIRED — Ohio annual financial bulk');
    return { raw: q, query, interpretation: lines };
  }
  if (ohioAsked && /surplus lines/i.test(q)) {
    const query = fail(
      'Ohio surplus-lines eligible insurers are a separate universe from ODI admitted authorized companies. No complete free eligible-list dump was acquired. Certified reinsurers (19 name-bearing rows, no NAIC) are not that list. Search-only is not zero. Confirm /ohio.',
      ['Open Ohio insurance research.', 'Find insurer NAIC code 10399.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.entityClass = 'insurer';
    push('Coverage', 'NOT_ACQUIRED — Ohio surplus-lines bulk list');
    return { raw: q, query, interpretation: lines };
  }
  if (ohioAsked && /receivership|liquidat|rehabilitat/i.test(q)) {
    const query = fail(
      'Ohio receivership/liquidation/rehabilitation estates were not acquired as a complete current catalog. Liquidation is not rehabilitation. Historic insolvent estate is not current authorization. Search-only is not zero. Confirm /ohio.',
      ['Open Ohio insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    push('Coverage', 'NOT_ACQUIRED — Ohio receivership catalog');
    return { raw: q, query, interpretation: lines };
  }
  if (ohioAsked && /market conduct|financial exam|examination report/i.test(q)) {
    const query = fail(
      'Ohio examination-report catalogs were not acquired as a complete public index in this extract. A market exam is not a financial exam and not a Journal administrative action. Exam existence is not a finding. Search-only is not zero. Confirm /ohio.',
      ['Open Ohio insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    push('Coverage', 'NOT_ACQUIRED — Ohio examination catalogs');
    return { raw: q, query, interpretation: lines };
  }
  if (
    ohioAsked &&
    /\b(insurance agents?|producers?)\b/i.test(q) &&
    !/\bagenc/i.test(q) &&
    !/credentialed/i.test(q)
  ) {
    const query = fail(
      'ODI individual-producer bulk roster is not mass-published here. Agent / Agency Locator is live search (last name or NPN, captcha). A person is not an agency. NPN is not NAIC. Search-only is not zero. Confirm /ohio and the official locator.',
      ['Open Ohio insurance research.', 'Find NPN 40000001.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.entityClass = 'person';
    push('Coverage', 'NOT_ACQUIRED — Ohio producer bulk census');
    return { raw: q, query, interpretation: lines };
  }
  if (ohioAsked && /insurance agenc/i.test(q) && !/credentialed/i.test(q)) {
    const products = detectRequestedConsumerProducts(q);
    const life = /\blife\b/i.test(q) && !/\bvariable life\b/i.test(q);
    const health = /\bhealth\b/i.test(q);
    const reason = products.includes('homeowners')
      ? 'ODI mailing-list Line of Authority options have no Homeowners LOA. Property, Casualty, and Personal authority do not prove an agency currently sells homeowners insurance. Licensing authority is not product inventory. Confirm /ohio.'
      : products.includes('auto')
        ? 'ODI mailing-list Line of Authority options have no Auto LOA. Auto Rental is a different limited line. This extract will not treat auto insurance agencies Ohio as generic insurance agencies Ohio. Confirm /ohio.'
        : products.includes('flood')
          ? 'ODI mailing-list Line of Authority options have no Flood LOA. Flood insurance agencies Ohio remain unsupported as a product-qualified cohort. Confirm /ohio.'
          : life
            ? 'ODI Business Entity + Major Lines mailing list filtered to Line of Authority = Life: 16,306 distinct NPNs (resident 5,102 / non-resident 11,204). That is licensing authority, not current life-product inventory. Confirm /ohio.'
            : health
              ? 'ODI Business Entity + Major Lines mailing list filtered to Line of Authority = Accident & Health: 16,132 distinct NPNs (resident 4,910 / non-resident 11,222). That is licensing authority, not current health-product inventory. Confirm /ohio.'
              : 'ODI Agent/Agency Mailing Lists, Business Entity + Major Lines, all source LOA filters: 23,922 distinct NPNs (resident 5,648 / non-resident 18,274; overlap 0). This is not agents, not legal insurers, and not every ODI license type. LOA is the report filter, not an export column. Confirm /ohio.';
    const query = fail(reason, ['Open Ohio insurance research.', 'Find NPN 40000001.']);
    query.coverageState = products.includes('homeowners') || products.includes('auto') || products.includes('flood')
      ? 'UNSUPPORTED'
      : 'PARTIAL';
    query.entityClass = 'agency';
    query.jurisdiction = { state: 'OH', meaning: geographyMeaning(q) };
    if (products.length) query.requestedProduct = products;
    push('Coverage', `${query.coverageState} — Ohio agencies`);
    return { raw: q, query, interpretation: lines };
  }
  if (
    ohioAsked &&
    /\b(authorized insurance compan(?:y|ies)|licensed insurance compan(?:y|ies)|legal insurers?|insurers?|insurance compan(?:y|ies))\b/i.test(q) &&
    !/\bagenc/i.test(q)
  ) {
    const query = fail(
      "ODI complete current authorized-company Excel (AuthList091820261205.xls) lists 1,738 distinct NAIC codes / 1,738 rows (0 missing NAIC). Authorized is not domestic (Ohio-domicile 237). NAIC is not NPN. A legal insurer is not an agency. Financial data is not authorization. Confirm /ohio and ODI Company Search.",
      ['Open Ohio insurance research.', 'Find insurer NAIC code 10399.'],
    );
    query.coverageState = 'PARTIAL';
    query.entityClass = 'insurer';
    query.jurisdiction = { state: 'OH', meaning: geographyMeaning(q) };
    push('Coverage', 'PARTIAL — Ohio authorized companies');
    return { raw: q, query, interpretation: lines };
  }

  if (
    (/\bgeorgia\b/i.test(q) || detectStates(q)[0] === 'GA') &&
    /\bagenc/i.test(q) &&
    /\b(agents?|producers?|insurers?|insurance compan)/i.test(q)
  ) {
    const query = fail(
      'Georgia agency, producer, and insurer counts are different grains and were not acquired as bulk rosters. They are not added into one Georgia insurance-business total. Sircon lookup is search-only. Search-only is not zero. Confirm /georgia.',
      ['Open Georgia insurance research.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.jurisdiction = { state: 'GA', meaning: geographyMeaning(q) };
    push('Coverage', 'NOT_ACQUIRED — Georgia grains stay separate');
    return { raw: q, query, interpretation: lines };
  }
  if (
    (/\bgeorgia\b/i.test(q) || detectStates(q)[0] === 'GA') &&
    /\b(insurance agents?|producers?)\b/i.test(q) &&
    !/\bagenc/i.test(q)
  ) {
    const query = fail(
      'Georgia individual-producer bulk roster was not acquired. A producer is not an agency and not an insurer. NPN is not an NAIC company code. Sircon lookup is search-only. Search-only is not zero. Confirm /georgia.',
      ['Open Georgia insurance research.', 'Find NPN 10391484.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.entityClass = 'person';
    query.jurisdiction = { state: 'GA', meaning: geographyMeaning(q) };
    push('Coverage', 'NOT_ACQUIRED — Georgia producer roster');
    return { raw: q, query, interpretation: lines };
  }
  if ((/\bgeorgia\b/i.test(q) || detectStates(q)[0] === 'GA') && /\bagenc/i.test(q) && !/\b(agents?|producers?)\b/i.test(q)) {
    const products = detectRequestedConsumerProducts(q);
    const query = fail(
      products.length
        ? `Georgia agency bulk roster was not acquired, so this extract cannot show a ${products.join(' / ')}-qualified Georgia agency cohort. An agency is not an insurer and not an individual producer. Sircon lookup is search-only. Search-only is not zero. Confirm /georgia.`
        : 'Georgia agency bulk roster was not acquired. An agency is not an insurer and not an individual producer. Sircon lookup is search-only. Search-only is not zero. Confirm /georgia.',
      ['Open Georgia insurance research.', 'Find NPN 10391484.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.entityClass = 'agency';
    query.jurisdiction = { state: 'GA', meaning: geographyMeaning(q) };
    if (products.length) query.requestedProduct = products;
    push('Coverage', 'NOT_ACQUIRED — Georgia agency roster');
    return { raw: q, query, interpretation: lines };
  }

  if (
    /\b((?:licensed )?insurance agenc(?:y|ies)|insurance agents?|producers?)\b/i.test(q) &&
    /\b(colorado|virginia|new york|illinois|pennsylvania|north carolina)\b/i.test(q)
  ) {
    const state = detectStates(q)[0] ?? 'The requested state';
    // TH-DISCOVERY-PARITY-001B / PA-INS-001 reconciliation: these five states have no acquired
    // agency/producer bulk roster at all (a different grain than TH-DISCOVERY-PARITY-001B's
    // product-disclosure fix, which only applies where real agency inventory exists to browse, e.g.
    // FL). An unresolved consumer-product word (homeowners/auto/...) must not route these states
    // into the generic entity/count builder -- there is no roster to return, so that would produce a
    // silent, misleading zero instead of the honest NOT_ACQUIRED disclosure. The product is still
    // named and given its own reason/failReason (distinct from the bare-agency reason) so a request
    // like "homeowners insurance agencies Pennsylvania" is never indistinguishable from a plain
    // "insurance agencies Pennsylvania" request.
    const unresolvedProducts = detectRequestedConsumerProducts(q);
    const query = fail(
      unresolvedProducts.length
        ? `${state} producer and agency bulk rosters were not acquired, so this extract cannot show a ${unresolvedProducts.join(' / ')}-qualified ${state} agency cohort. There is also no dedicated ${unresolvedProducts.join(' / ')} line of authority in this extract. Official verification remains search-only; search-only is not zero.`
        : `${state} producer and agency bulk rosters were not acquired. Official verification remains search-only. Search-only is not zero, and this extract will not silently resolve those agents to the national person graph.`,
      unresolvedProducts.length
        ? ['Find NPN 10391484.', 'What is a line of authority?']
        : ['Find NPN 10391484.', 'What is an NPN?'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.entityClass = detectClass(q);
    query.jurisdiction = { state, meaning: geographyMeaning(q) };
    if (unresolvedProducts.length) query.requestedProduct = unresolvedProducts;
    push('Coverage', `NOT_ACQUIRED — ${state} agency/producer roster`);
    return { raw: q, query, interpretation: lines };
  }

  if (
    (/\billinois\b/i.test(q) || detectStates(q)[0] === 'IL') &&
    /complaint/i.test(q) &&
    /\b(insurer|company|agent|producer|agency)\b/i.test(q)
  ) {
    const query = fail(
      'Illinois consumer complaints are IDOI Help Center / file-a-complaint search-only. Missing bulk complaints is not zero. A complaint is not a Director’s Order and not a violation.',
      ['Open Illinois insurance research.', 'Find insurer NAIC code 10064.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    push('Coverage', 'NOT_ACQUIRED — Illinois complaint bulk');
    return { raw: q, query, interpretation: lines };
  }

  if (
    (/\billinois\b/i.test(q) || detectStates(q)[0] === 'IL') &&
    /disciplin|director.?s orders|enforcement order|revocation|suspension/i.test(q)
  ) {
    const query = fail(
      'Illinois Director’s Orders are official enforcement observations, not a company census and not consumer complaints. Name-only matching is unsafe. Use the official IDOI Directors Orders search.',
      ['Open Illinois insurance research.', 'Find NPN 10391484.'],
    );
    query.coverageState = 'PARTIAL';
    push('Coverage', 'PARTIAL — Illinois Director’s Orders');
    return { raw: q, query, interpretation: lines };
  }

  if (
    (/\bgeorgia\b/i.test(q) || detectStates(q)[0] === 'GA') &&
    /\b(licensed insurance compan(?:y|ies)|legal insurers?|insurers?|insurance compan(?:y|ies))\b/i.test(q) &&
    !/\bagenc/i.test(q)
  ) {
    const products = detectRequestedConsumerProducts(q);
    const query = fail(
      products.length
        ? `Georgia insurance-company bulk roster was not acquired, so this extract cannot show a ${products.join(' / ')}-qualified Georgia insurer cohort. An insurer is not an agency. Sircon and OCI company licensing remain search-only. Search-only is not zero. Confirm /georgia.`
        : 'Georgia insurance-company bulk roster was not acquired. An insurer is not an agency and not a producer. NAIC is not an NPN. Sircon lookup and OCI company licensing remain search-only. Search-only is not zero. This extract does not answer a company question with the agency roster. Confirm /georgia.',
      ['Open Georgia insurance research.', 'Find insurer NAIC code 10064.'],
    );
    query.coverageState = 'NOT_ACQUIRED';
    query.entityClass = 'insurer';
    query.jurisdiction = { state: 'GA', meaning: geographyMeaning(q) };
    if (products.length) query.requestedProduct = products;
    push('Coverage', 'NOT_ACQUIRED — Georgia company roster');
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(licensed insurance compan(?:y|ies)|legal insurers?|insurers?|insurance compan(?:y|ies))\b/i.test(q) && /\b(texas|new jersey|california|washington|colorado|virginia|new york|illinois|oregon)\b/i.test(q)) {
    const state = detectStates(q)[0];
    const query = fail(`${state ?? 'The requested'} complete authorized/legal-insurer roster is not acquired as a current bulk universe. Missing coverage is not zero.`, ['Find insurer NAIC code 10064.', 'What is a legal insurer?']);
    query.entityClass = 'insurer';
    query.jurisdiction = state ? {state,meaning: geographyMeaning(q)} : undefined;
    query.coverageState = 'NOT_ACQUIRED';
    // TH-DISCOVERY-RESET-001B: a resolved state still has real, labeled insurance agencies one
    // query away (execute.ts's listInsurers now broadens to them instead of stonewalling) -- only
    // route to a bare fail_closed dead end when no state was actually resolved to broaden from, or
    // when the request is a count/aggregate ("how many...") rather than a browse/entity listing --
    // a count has no listing to broaden into and must stay fail_closed exactly as before.
    // coverageState stays NOT_ACQUIRED here as the parse-time record of what was asked for; the
    // executed result's own coverageState (PARTIAL/UNSUPPORTED) is computed independently below.
    if (state && !/\bhow many\b|\bcount of\b/i.test(q)) query.mode = 'entity';
    push('Entity class', 'Legal insurer');
    push('Coverage', 'NOT_ACQUIRED');
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(nfip certified|certified agenc)/i.test(q)) {
    const query = fail('An NFIP registry observation is not Trust Hub or NFIP certification. Search can explain the registry evidence without creating a certification claim.', ['NFIP insurance agents.', 'What is an insurance appointment?']);
    query.coverageState = 'UNSUPPORTED';
    push('Coverage', 'UNSUPPORTED — certification conclusion');
    return { raw: q, query, interpretation: lines };
  }

  if (
    /\bwho is\b/i.test(q) ||
    /\bnamed\b/i.test(q) ||
    (/^\s*find\b/i.test(q) &&
      !/\bagenc/i.test(q) &&
      !/\binsurer/i.test(q) &&
      !/\bproducer/i.test(q) &&
      !/\bagents?\b/i.test(q))
  ) {
    const query = fail(
      'Name is not canonical identity. Ask will not treat a trade name as an NPN, NAIC company code, or unique person/agency. Use a labeled identifier.',
      ['Find NPN 1234567.', 'Find insurer NAIC code 10064.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  let entityClass = detectClass(q);
  const states = detectStates(q);
  const loas = detectLoas(q);
  const geo = geographyMeaning(q);
  const unresolvedProducts = detectRequestedConsumerProducts(q);
  // TH-DISCOVERY-PARITY-001B: when no unambiguous city matched but an explicit state was resolved
  // (e.g. "Newark NJ", "Springfield IL"), that state removes the real-world ambiguity for an
  // otherwise-ambiguous bare city name -- try it before giving up on a city and falling back to
  // state-only geography. See us-cities.ts's matchCityForState doc comment.
  //
  // A resolved state MUST be checked first: matchKnownCity(q) matches ANY known city substring in
  // the whole query with no regard for which state was already resolved (e.g. states[0]), so a
  // query naming an explicit/city-derived state plus an unrelated place name from a DIFFERENT
  // state's gazetteer entry (e.g. "insurance agent Charlotte County FL" -- Charlotte is only
  // mapped to NC here) would attach that other state's city as requestedCity next to this query's
  // actual (different) jurisdiction.state -- a false combined geography claim. Once a state is
  // resolved, only a city consistent with THAT state (matchCityForState) may be attached;
  // matchKnownCity is only reached when no state was resolved at all.
  const cityMatch = states[0] ? matchCityForState(q, states[0]) : matchKnownCity(q);
  const ambiguousCity = !states.length ? matchAmbiguousCity(q) : undefined;
  const requestedCity = cityMatch ? titleCasePlace(cityMatch) : undefined;

  // CTRL_FL_PC: official LOA + jurisdiction without a named class is still the executable
  // authority path, not class clarification and not unresolved product. Do not inject a
  // class onto count queries — counts still require an explicit agency / person / insurer.
  if (
    !entityClass &&
    !unresolvedProducts.length &&
    hasOfficialExecutableLoa(loas) &&
    states[0] &&
    !/\bhow many\b|\bcount of\b/i.test(q)
  ) {
    entityClass = 'agency';
  }

  // TH-DISCOVERY-PARITY-001B: SQA-009 used to dead-end the ENTIRE request to fail_closed the
  // instant an unresolved consumer-product word appeared, even when a real, unambiguous
  // provider-category (+ optional geography) request could otherwise be answered. That is exactly
  // the "zero providers despite plausible inventory" bug this ticket exists to fix. A bare product
  // mention with no other named category (e.g. "cheap car insurance") is still an implicit request
  // for a provider, so it defaults to agency -- the class this source can honestly browse -- and
  // falls through to the SAME entity/count builder every other request uses; product-status
  // disclosure is attached below and again at execution time (execute.ts), never a false LOA claim.
  if (unresolvedProducts.length && !entityClass) entityClass = 'agency';

  if (/\bhow many\b|\bcount of\b/i.test(q)) {
    if (!entityClass) {
      const query = fail(
        'Counts require an entity class. Agencies, persons, and legal insurers stay separate.',
        ['How many agencies are credentialed in Florida?', 'How many individual producers are credentialed in Florida?'],
      );
      push('Mode', 'fail_closed');
      return { raw: q, query, interpretation: lines };
    }
    const query: InsuranceResearchQuery = {
      mode: 'count',
      entityClass,
      jurisdiction: states[0] ? { state: states[0], meaning: geo } : undefined,
      requestedCity,
      linesOfAuthority: loas.length ? loas : undefined,
      loaMatch: loas.length > 1 ? 'all' : 'any',
      page: 1,
    };
    push('Mode', 'count');
    push('Entity', entityLabel(entityClass));
    if (query.jurisdiction) push(dimensionLabel(query.jurisdiction.meaning), query.jurisdiction.state);
    push('Grain', grainLabel(entityClass));
    if (unresolvedProducts.length) {
      annotateUnestablishedProduct(query, unresolvedProducts);
      for (const row of productInterpretationLines(unresolvedProducts, query.jurisdiction?.state)) push(row.label, row.value);
    }
    return { raw: q, query, interpretation: lines };
  }

  if (states.length >= 2 && /\bcompar/i.test(q)) {
    const query: InsuranceResearchQuery = {
      mode: 'comparison',
      entityClass: entityClass ?? 'agency',
      jurisdiction: { state: states[0]!, meaning: 'credential_jurisdiction' },
      compareJurisdiction: { state: states[1]!, meaning: 'credential_jurisdiction' },
      aggregateMetric: 'entity_count',
      page: 1,
    };
    push('Mode', 'comparison');
    push('Entity', entityLabel(query.entityClass!));
    push('Metric', 'Indexed credentials / entities');
    push('credential jurisdiction', `${states[0]} vs ${states[1]}`);
    return { raw: q, query, interpretation: lines };
  }

  if (/\bwhich states have the most indexed agency credentials\b/i.test(q)) {
    const query: InsuranceResearchQuery = {
      mode: 'aggregate',
      entityClass: 'agency',
      aggregateMetric: 'credentials_by_state',
      page: 1,
    };
    push('Mode', 'aggregate');
    push('Entity', 'Agency');
    push('Metric', 'Agency credentials by credential jurisdiction');
    return { raw: q, query, interpretation: lines };
  }

  if (/\balso credentialed in another state\b|\bmulti-?state\b/i.test(q)) {
    const query: InsuranceResearchQuery = {
      mode: 'aggregate',
      entityClass: 'agency',
      jurisdiction: states[0] ? { state: states[0], meaning: 'credential_jurisdiction' } : { state: 'FL', meaning: 'credential_jurisdiction' },
      aggregateMetric: 'multi_state_agencies',
      page: 1,
    };
    push('Mode', 'aggregate');
    push('Entity', 'Agency');
    push('Identity', 'NPN / canonical agency ID only — not name merge');
    return { raw: q, query, interpretation: lines };
  }

  if (geo === 'recorded_address_state') {
    const query = fail(
      'Recorded office/address geography is not a national Ask filter in this extract. Ask currently executes credential jurisdiction and (where sourced) domicile — not physical location or service territory.',
      ['Show insurance agencies credentialed in Florida.'],
    );
    query.entityClass = entityClass;
    query.jurisdiction = states[0] ? { state: states[0], meaning: 'recorded_address_state' } : undefined;
    query.coverageState = 'UNSUPPORTED';
    push('Requested office state', states[0] ?? 'Not specified');
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  // TH-DISCOVERY-GEN-001: "insurance agent"/"insurance producer" is a provider-category phrase,
  // not a company name or a reason to dead-end -- individual producer profiles genuinely cannot
  // be mass-published, but that constraint belongs at execution time (listPersons broadens to
  // real agencies / the national cohort, exactly like listInsurers already does for an unsupported
  // legal-insurer cohort), not as an early parse-time fail_closed with zero providers. Falls
  // through to the generic entity-mode construction below, same as agency/insurer.

  if (/\bmarketplace\b/i.test(q) && !npn) {
    const query = fail(
      'CMS Marketplace observations are a federal overlay and are not a public producer directory. Query a labeled NPN plus plan year, or read the Marketplace limitation. Marketplace evidence is not certification.',
      ['What does Marketplace registration evidence mean?', 'Find NPN 1234567.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (!entityClass) return { raw: q, query: { ...fail('Specify an agency, individual producer, legal insurer, labeled identifier, or local directory question.', []), refinement: 'class', terminalState: 'NEEDS_CLARIFICATION' }, interpretation: [{ label: 'Research task', value: 'Clarification required' }] };

  const query: InsuranceResearchQuery = {
    mode: 'entity',
    entityClass: entityClass ?? 'agency',
    jurisdiction: states[0] ? { state: states[0], meaning: geo } : undefined,
    requestedCity,
    domicile: geo === 'regulatory_domicile' ? states[0] : undefined,
    credentialStatus: 'current_source',
    linesOfAuthority: loas.length ? loas : undefined,
    loaMatch: /\band\b/.test(q) && loas.length > 1 ? 'all' : 'any',
    loaAsOfficialObservation: states[0] !== 'FL',
    coverageState: states[0] === 'FL' && loas.length ? 'PARTIAL' : 'KNOWN',
    sort: 'name',
    page: safePage,
  };

  push('Mode', 'entity');
  push('Entity', entityLabel(query.entityClass!));
  if (query.jurisdiction) push(dimensionLabel(query.jurisdiction.meaning), query.jurisdiction.state);
  if (requestedCity) push('Requested city', requestedCity);
  if (ambiguousCity) {
    push(
      'Geography',
      `"${ambiguousCity}" matches more than one state in this source and is not attached to a single one -- showing broader results, not narrowed by an unstated state.`,
    );
  }
  if (unresolvedProducts.length) {
    annotateUnestablishedProduct(query, unresolvedProducts);
    for (const row of productInterpretationLines(unresolvedProducts, query.jurisdiction?.state)) push(row.label, row.value);
  }
  if (loas.length) {
    push('LOA / credential class', loas.join(' + '));
    if (states[0] === 'FL') {
      push(
        'LOA taxonomy',
        'Official LOA observation rows for Florida DFS = 0. Ask may match Florida DFS license-class text as credential class, not a national LOA codebook, and not appointment.',
      );
    } else {
      push('LOA taxonomy', 'Official source LOA observation text where indexed (not appointment).');
    }
  }
  push('Credential status', 'As reported by the source (not TrustHub endorsement)');
  push('Sort', 'Display name, then NPN, then canonical id');
  if (!CREDENTIAL_STATES.includes((states[0] ?? '') as (typeof CREDENTIAL_STATES)[number]) && states[0] && query.entityClass === 'agency') {
    push('Coverage', `${states[0]} may have 0 credential rows in this extract — missing is not “no market.”`);
  }
  if (states[0] === 'MA' && query.entityClass === 'agency' && resolvesToMassachusetts(q)) {
    query.coverageState = 'PARTIAL';
    push('Coverage', MASSACHUSETTS_AGENCY_COVERAGE_NOTE);
  }
  return { raw: q, query, interpretation: lines };
}

function definition(raw: string, definitionId: string): ParsedInsuranceAsk {
  const def = ASK_DEFINITIONS[definitionId];
  return {
    raw,
    query: { mode: 'definition', definitionId, page: 1 },
    interpretation: [
      { label: 'Mode', value: 'definition' },
      { label: 'Term', value: def?.title ?? definitionId },
    ],
  };
}

function entityLabel(cls: InsuranceEntityClass): string {
  if (cls === 'person') return 'Producer / individual';
  if (cls === 'insurer') return 'Legal insurer';
  return 'Agency';
}

function dimensionLabel(dim: GeographyDimension): string {
  switch (dim) {
    case 'credential_jurisdiction':
      return 'credential jurisdiction';
    case 'recorded_address_state':
      return 'recorded office state';
    case 'regulatory_domicile':
      return 'regulatory domicile';
    default:
      return 'insurer market geography';
  }
}

function grainLabel(cls: InsuranceEntityClass): string {
  if (cls === 'person') return 'canonical person entities with attached credentials';
  if (cls === 'insurer') return 'canonical legal_insurer entities';
  return 'canonical agency entities with attached state credentials';
}
