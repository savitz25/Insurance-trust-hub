/**
 * NV-INS-001 (state sprint): Nevada Division of Insurance routing for Ask.
 *
 * Runs in the early state block. Labeled NAIC / NPN intent is excluded first, so exact identifier intent always
 * reaches the identifier path. Answers come only from the accepted NDOI snapshot: NDOI-stated licensee and
 * company figures (quoted, never summed), company-authority instruments, the one current Enforcements & Orders
 * posting, the MHPAEA company-report index and 2022-2024 complaint-data aggregates. Company, agency and producer
 * bulk rosters were not acquired. A city is geography only.
 */
import type { InsuranceResearchQuery, ParsedInsuranceAsk } from './contract';
import { resolveAllPlaceCodes } from './us-cities';
import { NEVADA_SNAPSHOT as S, fmtInt } from '../nevada-intelligence/snapshot';

const ALT = 'Open Nevada insurance research.';
const CONFIRM = 'Confirm /nevada.';
const CENSUS = S.market_report_census;
const LIC = CENSUS.licensees;
const CO = CENSUS.companies;
const AS_OF = 'as of October 2024';
const ORDER = S.enforcement.orders[0];
const C = S.complaint_data;
const Y24 = C.years['2024'];
const NV = { state: 'NV', meaning: 'credential_jurisdiction' as const };
const NV_INSURER = { entityClass: 'insurer' as const, jurisdiction: NV };

function answer(
  raw: string,
  reason: string,
  coverage: NonNullable<InsuranceResearchQuery['coverageState']>,
  label: string,
  extra: Partial<InsuranceResearchQuery> = {},
  alternatives: string[] = [ALT],
): ParsedInsuranceAsk {
  const query: InsuranceResearchQuery = { mode: 'fail_closed', page: 1, failReason: reason, alternatives, coverageState: coverage, ...extra };
  return { raw, query, interpretation: [{ label: 'Coverage', value: `${coverage} — ${label}` }] };
}

/** Nevada named, the uppercase NV state code, or NDOI. */
export function mentionsNevada(q: string): boolean {
  return /\bnevada\b/i.test(q) || /\bNV\b/.test(q) || /\bndoi\b/i.test(q) || /\bnev\.(?=\s|$)/i.test(q);
}

// Cities that route without a state only when the name is essentially Nevada-only.
const NV_ONLY_CITIES = /\b(las vegas|north las vegas|carson city|summerlin|pahrump|mesquite nv|elko|winnemucca)\b/i;
// Shared city names route only when Nevada is named in the same request.
const NV_SHARED_CITIES = /\b(reno|henderson|sparks|boulder city|fernley|fallon|ely|minden|gardnerville|laughlin)\b/i;
const INSURANCE_WORDS = /\b(insurance|agenc|agents?|insurers?|compan(?:y|ies)|producers?|brokers?|carriers?)\b/i;

function localCity(q: string, nv: boolean): string | null {
  const unique = q.match(NV_ONLY_CITIES);
  if (unique) return unique[1];
  // A shared city name routes when Nevada is named or the shared place resolver already maps the request to NV.
  const shared = nv || resolveAllPlaceCodes(q)[0] === 'NV' ? q.match(NV_SHARED_CITIES) : null;
  return shared ? shared[1] : null;
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function companySentence(): string {
  return `NDOI's 2025 Insurance Market Report states (${AS_OF}) that Nevada has ${fmtInt(CO.licensed_domestic_and_foreign_insurers)} licensed domestic and foreign insurers, ${fmtInt(CO.captive_insurers)} captive insurers, ${fmtInt(CO.sponsored_captive_cells)} sponsored captive cells, ${fmtInt(CO.self_insured_employers)} self-insured employers and ${fmtInt(CO.self_insured_groups_active)} active self-insured groups, plus about ${fmtInt(CO.surplus_lines_insurers_approximate)} non-admitted surplus-lines insurers. Those are NDOI's figures, not a company list InsuranceTrustHub holds, and they are never added together.`;
}

const NO_COMPANY_LIST =
  "No downloadable NDOI company list was found, so there is no Nevada company roster here and no NAIC crosswalk was run. Verify a company in NDOI's company lookup (it does not show surplus-lines insurers). A national NAIC identity is not proof of Nevada authority.";

/** Nevada named, or a place the shared resolver maps to NV. */
export function resolvesToNevada(q: string): boolean {
  if (mentionsNevada(q)) return true;
  return resolveAllPlaceCodes(q)[0] === 'NV';
}

export function interpretNevadaEarly(raw: string): ParsedInsuranceAsk | null {
  const q = raw.trim();
  const nv = mentionsNevada(q);
  if (/\b(npn|naic)\b/i.test(q)) return null; // exact identifier intent outranks state routing

  const city = INSURANCE_WORDS.test(q) ? localCity(q, nv) : null;
  if (city) {
    return answer(
      raw,
      `This statewide Nevada insurance page does not publish ${titleCase(city)} or other local insurance intelligence routes. A city is geography, not a licensing regime: NDOI licenses companies, agencies and producers statewide, and an office address is not where a company is authorized or where it sells. InsuranceTrustHub's Las Vegas, Reno and Carson City hubs are directory pathways built from an earlier NDOI firm export, not an NDOI license census. ${CONFIRM}`,
      'UNSUPPORTED',
      'no Nevada local intelligence',
      { jurisdiction: { state: 'NV', meaning: 'recorded_address_state' }, requestedCity: titleCase(city) },
      [ALT, 'Browse /hubs/nevada/las-vegas.'],
    );
  }
  if (!nv) return null;

  if (/\b(best|safest|most trustworthy|cheapest|top[- ]?rated|most trusted|recommended|trust score|worst|fewest complaints|most complaints)\b/i.test(q)) {
    return answer(
      raw,
      'InsuranceTrustHub does not rank Nevada insurers, agencies or agents and does not publish a Trust Score. NDOI complaint rows are not a quality score and are not attached to companies. Research NDOI licensing, orders and complaint data instead. ' + CONFIRM,
      'UNSUPPORTED',
      'no ranking',
    );
  }

  const agency = /\bagenc/i.test(q);
  const producer = /\b(insurance agents?|agents?|producers?|brokers?|adjusters?)\b/i.test(q);
  const insurer = /\b(insurers?|insurance compan(?:y|ies)|carriers?|underwriters?|companies)\b/i.test(q);

  if (/complaint/i.test(q)) {
    const top = Object.entries(Y24.coverage_type).slice(0, 3).map(([k, n]) => `${k} ${fmtInt(n)}`).join(', ');
    return answer(
      raw,
      `NDOI's Consumer Services section takes complaints online and assigns an investigator. NDOI states it investigated ${fmtInt(CENSUS.consumer_services_fy2024.complaints_investigated)} complaints in fiscal year 2024; that is workload, not a count for any company. NDOI's calendar-year complaint data files show ${fmtInt(Y24.complaint_reason_rows)} complaint-reason rows opened in 2024 (top coverage types: ${top}), ${fmtInt(C.years['2023'].complaint_reason_rows)} in 2023 and ${fmtInt(C.years['2022'].complaint_reason_rows)} in 2022. One complaint can print several reason rows, so rows are not complaints. The respondent field is truncated, prints no NAIC or NPN and names individuals, so no respondent is published or attached to a company. A complaint is not an enforcement finding, and a complaint count is not a quality score. ${CONFIRM}`,
      'PARTIAL',
      'Nevada complaint data (aggregates)',
    );
  }

  if (/\bserff\b|rate filings?|form filings?|rates?,? rules|filed rates?/i.test(q)) {
    return answer(
      raw,
      `NDOI states that life, health, property and casualty rates, rules and forms filed with the Division are public through SERFF Filing Access for Nevada. InsuranceTrustHub links to that access and ingested no filings. A filing is not a price quote, a rating or a recommendation. ${CONFIRM}`,
      'KNOWN',
      'Nevada SERFF filing access',
      {},
      [ALT, 'Open SERFF Filing Access for Nevada.'],
    );
  }

  if ((producer || /\blicensee/i.test(q)) && /disciplin|revoc|revoked|suspen|enforcement|actions?\b|orders?\b/i.test(q) && !insurer) {
    return answer(
      raw,
      `NDOI's Enforcements & Orders page lists one current posting (Cause No. ${ORDER.cause_number}, a ${ORDER.order_type_as_printed} with a business entity) and no archive. No producer discipline list was acquired, the order prints no NPN, and nothing is attached to a producer or agency by name. Older orders are available only by public records request. ${CONFIRM}`,
      'PARTIAL',
      'Nevada producer discipline',
      { entityClass: 'person', jurisdiction: NV },
    );
  }

  if (/\b(mhpaea|mental health parity|parity)\b/i.test(q)) {
    return answer(
      raw,
      `NDOI's Publications page lists ${S.mhpaea_reports.company_reports} company draft reports under the Mental Health Parity and Addiction Equity Act. The list is kept as an index only: the reports were not parsed, a draft report is not a finding, and no NAIC code is attached. ${CONFIRM}`,
      'PARTIAL',
      'Nevada MHPAEA company-report index',
      { entityClass: 'insurer' },
    );
  }

  if (/enforcement|consent (?:order|agreement)|cease and desist|\borders?\b|disciplin|revocation|revoked|suspension|suspended|\bfines?\b|penalt|sanction|regulatory action|receivership|liquidat/i.test(q)) {
    return answer(
      raw,
      `NDOI's Enforcements & Orders page lists one current posting and no archive: In the Matter of ${ORDER.respondent_as_listed}, Cause No. ${ORDER.cause_number}, ${ORDER.order_type_as_printed}, listed ${ORDER.listed_date}. The order says the respondent does not hold a Nevada third-party administrator certificate of registration; it is a business entity, not an insurer. It prints no NAIC code, NPN or Nevada license number, so it is attached to no company, agency or producer, and nothing is attached by name. Orders before the current posting were not acquired; older orders are available by public records request. ${CONFIRM}`,
      'PARTIAL',
      'Nevada Enforcements & Orders',
    );
  }

  if (/\b(exam(?:ination)?s?|market conduct|financial exam)\b/i.test(q)) {
    const e = CENSUS.examinations_2022_2023;
    return answer(
      raw,
      `NDOI states that in calendar years 2022 and 2023 it participated in ${fmtInt(e.financial_examinations_of_domestic_insurers)} financial examinations of domestic insurers and conducted ${fmtInt(e.regulatory_examinations_of_non_traditional_insurers)} regulatory examinations of "non-traditional" insurers. No examination report list was acquired, companies are not named here, and an examination is not a score. ${CONFIRM}`,
      'PARTIAL',
      'Nevada examinations (NDOI-stated counts)',
      { entityClass: 'insurer' },
    );
  }

  if (agency && (producer || insurer)) {
    return answer(
      raw,
      `Nevada agencies, individual licensees and insurance companies are different grains and are never added into one Nevada insurance total. NDOI states ${fmtInt(LIC.agency_licensees)} agency licensees and ${fmtInt(LIC.individual_licensees)} individual licensees (${AS_OF}); its report's combined licensee figure leaves out the captives it lists, so it is not republished. ${CONFIRM}`,
      'NOT_ACQUIRED',
      'Nevada grains stay separate',
    );
  }
  if (producer && !agency) {
    return answer(
      raw,
      `NDOI states ${fmtInt(LIC.individual_licensees)} individual licensees (${fmtInt(LIC.individual_resident)} resident, ${fmtInt(LIC.individual_non_resident)} non-resident, ${AS_OF}); not every individual licensee is a producer. NDOI's self-serve producer lists rejected automated access and no protection was bypassed, so there is no Nevada producer roster here and no producer names are published. Verify an individual in NDOI's agent lookup or by NPN. A producer is not an agency or an insurer, and an NPN is not an NAIC code. Search-only is not zero. ${CONFIRM}`,
      'NOT_ACQUIRED',
      'Nevada producer roster',
      { entityClass: 'person', jurisdiction: NV },
      [ALT, 'Find NPN 10391484.'],
    );
  }
  if (agency) {
    return answer(
      raw,
      `NDOI states ${fmtInt(LIC.agency_licensees)} agency licensees (${fmtInt(LIC.agency_resident)} resident, ${fmtInt(LIC.agency_non_resident)} non-resident firms, ${AS_OF}). NDOI's self-serve agency lists rejected automated access, so no new agency list was acquired. InsuranceTrustHub's existing Nevada agency directory comes from an earlier NDOI firm export on a different clock; it is not NDOI's census and is not added to or compared with that figure. An agency is not an insurer and not an individual producer. ${CONFIRM}`,
      'NOT_ACQUIRED',
      'Nevada agency roster',
      { entityClass: 'agency', jurisdiction: NV },
      [ALT, 'Browse /directory?state=NV.'],
    );
  }
  if (/\blicen[cs]e\b/i.test(q) && /\b(verify|lookup|look up|check|status)\b/i.test(q) && !insurer) {
    return answer(
      raw,
      `Nevada license status for companies, agencies and agents is checked in NDOI's lookup, which has separate company, agency and agent searches. InsuranceTrustHub does not mirror it. Surplus-lines insurers are not visible there. ${CONFIRM}`,
      'NOT_ACQUIRED',
      'Nevada license verification is search-only',
    );
  }

  const companyIntent =
    insurer || /\b(surplus lines|reinsur|risk retention|domestic|domiciled|hmo|health maintenance|fraternal|captive|self[- ]insured|title|workers'? ?comp)/i.test(q);
  if (!companyIntent) {
    if (!/\binsurance\b/i.test(q)) return null;
    return answer(
      raw,
      `Nevada insurance research is organized by grain. Companies: ${companySentence()} Agencies: NDOI states ${fmtInt(LIC.agency_licensees)} agency licensees. Individuals: NDOI states ${fmtInt(LIC.individual_licensees)} individual licensees (${AS_OF}). These are never added into one Nevada insurance total. Company, agency and producer bulk rosters were not acquired. ${CONFIRM}`,
      'PARTIAL',
      'Nevada insurance overview',
      {},
      [ALT, 'Find insurer NAIC code 10064 Nevada.'],
    );
  }

  if (/surplus lines|excess and surplus|\be&s\b|non-?admitted/i.test(q)) {
    return answer(
      raw,
      `NDOI states about ${fmtInt(CO.surplus_lines_insurers_approximate)} insurers make up Nevada's non-admitted surplus-lines market (${AS_OF}). Surplus-lines eligibility is not admitted status, and NDOI's company lookup does not show surplus-lines insurers. No surplus-lines list was acquired. ${CONFIRM}`,
      'PARTIAL',
      'Nevada surplus-lines insurers (NDOI-stated)',
      NV_INSURER,
    );
  }
  if (/workers'?\s*comp/i.test(q)) {
    return answer(
      raw,
      `No Nevada workers' compensation insurer lookup or list was acquired. A property and casualty company type is not proof of workers' compensation authority, so no workers' compensation insurer count is shown. Self-insured employers (${fmtInt(CO.self_insured_employers)}) and self-insured groups (${fmtInt(CO.self_insured_groups_active)}) are NDOI-stated figures, not insurers. ${CONFIRM}`,
      'NOT_ACQUIRED',
      "no Nevada workers' compensation insurer cohort",
      NV_INSURER,
    );
  }
  if (/captive/i.test(q)) {
    return answer(
      raw,
      `NDOI states ${fmtInt(CO.captive_insurers)} captive insurers and ${fmtInt(CO.sponsored_captive_cells)} sponsored captive cells in Nevada (${AS_OF}). A captive insures its parent and affiliates; it is not a traditional insurer license or a consumer product, and captives are not added to licensed insurers. No captive list was acquired. ${CONFIRM}`,
      'PARTIAL',
      'Nevada captives (NDOI-stated)',
      NV_INSURER,
    );
  }
  if (/self[- ]insured/i.test(q)) {
    return answer(
      raw,
      `NDOI states ${fmtInt(CO.self_insured_employers)} self-insured employers and ${fmtInt(CO.self_insured_groups_active)} active self-insured groups in Nevada (${AS_OF}). Self-insurers are not insurance companies and are not added to them. ${CONFIRM}`,
      'PARTIAL',
      'Nevada self-insurers (NDOI-stated)',
    );
  }
  if (/risk retention|\b(hmo|health maintenance)\b|fraternal|\btitle\b|reinsur/i.test(q)) {
    const kind = /risk retention/i.test(q)
      ? 'A foreign risk retention group registers with NDOI under a Certificate of Registration, which is not a Certificate of Authority.'
      : /reinsur/i.test(q)
        ? 'An accredited or certified reinsurer approval is not direct-writing authority.'
        : 'That company type is legal authority, not a product offer or a quote.';
    return answer(
      raw,
      `${kind} NDOI keeps each authority instrument separate (Certificate of Authority, Registration, Approval, License), and so does InsuranceTrustHub. No Nevada company list by type was acquired, so there is no count of this type. ${NO_COMPANY_LIST} ${CONFIRM}`,
      'NOT_ACQUIRED',
      'Nevada company type list',
      NV_INSURER,
      [ALT, 'Find insurer NAIC code 10064 Nevada.'],
    );
  }
  if (/\b(homeowners?|home insurance|renters?|condo|flood|umbrella|pet|travel|annuit|long[- ]term care|medicare|auto|automobile|car)\b/i.test(q)) {
    return answer(
      raw,
      "No Nevada product-authority source was acquired. A company type is not proof a product is offered to you, so InsuranceTrustHub will not build a product-qualified Nevada insurer cohort. NDOI's consumer guides and SERFF filing access are the official product references. " + CONFIRM,
      'UNSUPPORTED',
      'no Nevada product-qualified insurer cohort',
      { entityClass: 'insurer' },
    );
  }

  return answer(
    raw,
    `${companySentence()} ${NO_COMPANY_LIST} A legal insurer is not an agency, and NAIC is not NPN. ${CONFIRM}`,
    'PARTIAL',
    'Nevada licensed insurers (NDOI-stated)',
    NV_INSURER,
    [ALT, 'Find insurer NAIC code 10064 Nevada.'],
  );
}

/** Adds the Nevada boundary to a labeled NAIC / NPN lookup that names Nevada. */
export function withNevadaNaicContext(parsed: ParsedInsuranceAsk): ParsedInsuranceAsk {
  const id = parsed.query.identifier;
  if (!mentionsNevada(parsed.raw)) return parsed;
  if (id?.type === 'npn') {
    const value = "Nevada producer and agency licenses are verified in NDOI's agent and agency lookup. This extract holds no Nevada producer roster, so the NPN result above is not Nevada license status. NPN is not an NAIC code.";
    return { ...parsed, interpretation: [...parsed.interpretation, { label: 'Nevada NDOI', value }] };
  }
  if (id?.type !== 'naic_company_code') return parsed;
  const value = `No NDOI company list was acquired, so this NAIC identity is not checked against Nevada authority here. Verify it in NDOI's company lookup; surplus-lines insurers do not appear there. NDOI states ${fmtInt(CO.licensed_domestic_and_foreign_insurers)} licensed domestic and foreign insurers (${AS_OF}).`;
  return { ...parsed, interpretation: [...parsed.interpretation, { label: 'Nevada NDOI', value }] };
}
