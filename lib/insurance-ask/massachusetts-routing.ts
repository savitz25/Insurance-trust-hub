/**
 * MA-INS-001 (state sprint): Massachusetts Division of Insurance routing for Ask.
 *
 * Runs in the early state block, after labeled NAIC/NPN detection is excluded, so exact identifier
 * intent always reaches the identifier path first. Answers come from the accepted DOI snapshot:
 * company lists keyed by NAIC (never summed), designation lists, and DOI administrative actions
 * (standalone events; never joined by name, never republishing licensee names).
 */
import type { InsuranceResearchQuery, ParsedInsuranceAsk } from './contract';
import { resolveAllPlaceCodes } from './us-cities';
import { MASSACHUSETTS_SNAPSHOT as S, fmtInt } from '../massachusetts-intelligence/snapshot';
import {
  lookupMassachusettsLicenseActions,
  lookupMassachusettsNaic,
  massachusettsActionSummary,
  massachusettsCompanyLabel,
  searchMassachusettsCompanyName,
} from '../massachusetts-intelligence/lookup';

const ALT = 'Open Massachusetts insurance research.';
const CONFIRM = 'Confirm /massachusetts.';
const LIST = S.licensed_or_approved;
const D = S.designations;
const AA = S.administrative_actions;
const AS_OF = LIST.source_printed_date;

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

/** Massachusetts named, or the uppercase MA state code. */
export function mentionsMassachusetts(q: string): boolean {
  if (/\bmassachusetts\b/i.test(q) || /\bmass\.?\s+doi\b/i.test(q)) return true;
  // Uppercase MA is the state code, except in Medicare Advantage wording ("MA plan", "MA-PD").
  return /\bMA\b(?![- ]?(?:PD|plans?)\b)/.test(q) && !/\bmedicare\b/i.test(q);
}

// Cities that route without a state only when the name is essentially Massachusetts-only.
const MA_ONLY_CITIES = /\b(boston|worcester|framingham|brockton|new bedford|fall river|haverhill|waltham|hyannis)\b/i;
// Shared city names route only when Massachusetts is named in the same request.
const MA_SHARED_CITIES = /\b(springfield|cambridge|lowell|quincy|lynn|newton|somerville|malden|pittsfield|plymouth|barnstable)\b/i;
const INSURANCE_WORDS = /\b(insurance|agenc|agents?|insurers?|compan(?:y|ies)|producers?|brokers?|carriers?)\b/i;

function localCity(q: string, ma: boolean): string | null {
  const unique = q.match(MA_ONLY_CITIES);
  if (unique) return unique[1];
  const shared = ma ? q.match(MA_SHARED_CITIES) : null;
  return shared ? shared[1] : null;
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function listSentence(): string {
  return `DOI's Licensed or Approved Companies list (${AS_OF}) has ${fmtInt(LIST.rows)} rows across ${Object.keys(LIST.company_types).length} company types, carrying ${fmtInt(LIST.distinct_naic)} distinct NAIC company codes; ${fmtInt(LIST.rows_missing_naic)} rows (third-party administrators, risk purchasing groups, service contract providers and similar) print no NAIC and are not counted as insurers.`;
}

function designationAnswer(raw: string, key: keyof typeof D, product: string, caveat: string): ParsedInsuranceAsk {
  const layer = D[key];
  return answer(
    raw,
    `${layer.list_page_label} (${AS_OF}): ${fmtInt(layer.distinct_naic)} companies by distinct NAIC code, all on the Licensed or Approved Companies list. ${caveat} Designation lists overlap and are never added together. ${CONFIRM}`,
    'PARTIAL',
    `Massachusetts ${product} list`,
    { entityClass: 'insurer', jurisdiction: { state: 'MA', meaning: 'credential_jurisdiction' } },
    [ALT, 'Find insurer NAIC code 36404.'],
  );
}

const TYPE_QUERIES: Array<[RegExp, string]> = [
  [/risk retention/i, 'Risk Retention Group'],
  [/risk purchasing/i, 'Risk Purchasing Group'],
  [/third[- ]party administrator|\btpa\b/i, 'Third Party Administrator'],
  [/pharmacy benefit|\bpbm\b/i, 'Pharmacy Benefit Manager'],
  [/service contract/i, 'Service Contract Providers'],
  [/fraternal/i, 'Fraternal'],
  [/\bhmo\b|health maintenance/i, 'Health Maintenance Organization'],
  [/\btitle\b/i, 'Title'],
  [/life settlement/i, 'Life Settlement Provider'],
  [/self[- ]insurance group/i, 'Self Insurance Group'],
];

function typeAnswer(raw: string, type: string): ParsedInsuranceAsk {
  const types = LIST.company_types as Record<string, number>;
  const withNaic = LIST.rows_with_naic_by_type as Record<string, number>;
  return answer(
    raw,
    `DOI's Licensed or Approved Companies list (${AS_OF}) has ${fmtInt(types[type] ?? 0)} rows with Company Type "${type}"; ${fmtInt(withNaic[type] ?? 0)} of them print an NAIC code. Company Type is a list relationship, not a separate insurer universe, and company types are not added together. ${CONFIRM}`,
    'PARTIAL',
    `Massachusetts ${type} rows`,
    { entityClass: 'insurer', jurisdiction: { state: 'MA', meaning: 'credential_jurisdiction' } },
  );
}

/** Massachusetts named, or a place the shared resolver maps to MA (never Medicare Advantage wording). */
export function resolvesToMassachusetts(q: string): boolean {
  if (mentionsMassachusetts(q)) return true;
  return resolveAllPlaceCodes(q)[0] === 'MA' && !/\bmedicare\b|\bMA[- ]?PD\b|\bMA plans?\b/i.test(q);
}

export function interpretMassachusettsEarly(raw: string): ParsedInsuranceAsk | null {
  const q = raw.trim();
  const ma = resolvesToMassachusetts(q);
  if (/\b(npn|naic)\b/i.test(q)) return null; // exact identifier intent outranks state routing

  const city = INSURANCE_WORDS.test(q) ? localCity(q, ma) : null;
  if (city) {
    return answer(
      raw,
      `This statewide Massachusetts insurance page does not publish ${titleCase(city)} or other local insurance intelligence routes. A city is geography, not a licensing regime, and the DOI company lists record a mailing address, not where a company sells. Boston hub copy is not a DOI license census. ${CONFIRM}`,
      'UNSUPPORTED',
      'no Massachusetts local intelligence',
      { jurisdiction: { state: 'MA', meaning: 'recorded_address_state' }, requestedCity: titleCase(city) },
    );
  }
  // A bare ambiguous city (e.g. Springfield with no state) stays with the shared resolver's disclosure.
  if (!ma) return null;

  if (/\b(best|safest|most trustworthy|cheapest|top[- ]?rated|most trusted|recommended|trust score|worst)\b/i.test(q)) {
    return answer(
      raw,
      'InsuranceTrustHub does not rank Massachusetts insurers, agencies, or agents and does not publish a Trust Score. Research the DOI company lists, designation lists and administrative actions instead. ' + CONFIRM,
      'UNSUPPORTED',
      'no ranking',
    );
  }

  const licenseNumber = /\blicen[cs]e\b/i.test(q) ? q.match(/\b(\d{5,9})\b/)?.[1] : undefined;
  if (licenseNumber) {
    const hits = lookupMassachusettsLicenseActions(licenseNumber);
    const reason = hits.length
      ? `Massachusetts license number ${licenseNumber} is printed on ${hits.length} DOI administrative-action row(s): ${hits.map(massachusettsActionSummary).join(' | ')}. A primary allegation is not a finding, and a Settlement Agreement is an informal resolution. This is not license status: verify the license through SBS. Licensee names are on the official DOI table and are not republished here. ${CONFIRM}`
      : `No DOI administrative-action row from ${AA.window_years[0]} to ${AA.window_years[1]} prints Massachusetts license number ${licenseNumber}. That is not a clean record and not license verification; actions before 2015 need a public record request. Verify the license through SBS. ${CONFIRM}`;
    return answer(raw, reason, 'PARTIAL', 'Massachusetts license number on DOI administrative actions', {
      identifier: { type: 'state_license', value: licenseNumber },
      jurisdiction: { state: 'MA', meaning: 'credential_jurisdiction' },
    });
  }

  if (/complaint/i.test(q)) {
    return answer(
      raw,
      'The DOI Consumer Services Unit takes written complaints against insurers, producers and other licensees and says it typically resolves over 2,000 written complaints each year. That is program context, not a count for any company. Examiners can provide complaint numbers on request; no public company-level complaint dataset was acquired. A complaint is not an enforcement action and not a finding. ' + CONFIRM,
      'REQUEST_ONLY',
      'Massachusetts company-level complaints',
    );
  }

  if (/hearing decision|public hearing|\bdocket\b/i.test(q)) {
    const h = S.hearing_decisions;
    return answer(
      raw,
      `The DOI Public Hearing Decisions page lists ${fmtInt(h.listing_rows)} decisions from ${h.list_years[0]} to ${h.list_years[1]} (rate cases, enforcement matters, control of domestic insurers, appeals). They are indexed by docket and issue date only; the PDFs were not parsed and the DOI notes they are not official copies. ${fmtInt(h.exact_docket_matches_with_administrative_actions.length)} dockets also appear on the administrative-action table; the two stay separate records. ${CONFIRM}`,
      'PARTIAL',
      'Massachusetts hearing-decision index',
    );
  }

  if (/market conduct|examination report|exam report/i.test(q)) {
    const m = S.market_conduct;
    return answer(
      raw,
      `The DOI Market Conduct Examination Reports page lists ${fmtInt(m.listing_rows)} report and adoption-order documents, posted under the year examined. They print no NAIC code, so none is attached to an insurer by name, and examination findings are not converted into scores. ${CONFIRM}`,
      'PARTIAL',
      'Massachusetts market-conduct index',
      { entityClass: 'insurer' },
    );
  }

  if (/receivership|liquidat|insolven|solvency|financial (exam|data|statement)/i.test(q)) {
    return answer(
      raw,
      'Massachusetts receivership, solvency and financial-examination data were not acquired in this extract. Company-list presence is not financial strength. Search-only is not zero. ' + CONFIRM,
      'NOT_ACQUIRED',
      'Massachusetts financial and receivership data',
      { entityClass: 'insurer' },
    );
  }

  if (
    /administrative action|enforcement|disciplin|cease (and|&) desist|revocation|revoked|suspension|\bfine[sd]?\b|penalt|sanction|settlement agreement|consent agreement|order to show cause/i.test(q)
  ) {
    const cd = /cease (and|&) desist/i.test(q);
    const classes = AA.disposition_classes;
    return answer(
      raw,
      `DOI Administrative Actions, ${AA.window_years[0]}–${AA.window_years[1]}: ${fmtInt(AA.observation_rows)} rows (effective ${AA.period_start} to ${AA.period_end}). As listed: Settlement Agreement ${fmtInt(classes.SETTLEMENT_AGREEMENT)}, Hearing Officer Decision ${fmtInt(classes.HEARING_OFFICER_DECISION)}, Order to Show Cause ${fmtInt(classes.ORDER_TO_SHOW_CAUSE)}, Consent Agreement ${fmtInt(classes.CONSENT_AGREEMENT)}.${cd ? ` ${fmtInt(AA.licensing_action_mentions.cease_and_desist)} rows mention a cease and desist (one row can also mention a revocation).` : ''} A primary allegation is not a finding, and a Settlement Agreement is an informal resolution, not a hearing decision. The table prints no NAIC code; every row is a standalone DOI event, never attached by name. Actions before 2015 require a public record request. ${CONFIRM}`,
      'PARTIAL',
      'Massachusetts DOI administrative actions since 2015',
    );
  }

  const agency = /\bagenc/i.test(q);
  const producer = /\b(insurance agents?|agents?|producers?|brokers?|adjusters?)\b/i.test(q);
  const insurer = /\b(insurers?|insurance compan(?:y|ies)|carriers?|underwriters?|companies)\b/i.test(q);
  if (agency && (producer || insurer)) {
    return answer(
      raw,
      'Massachusetts agencies, individual producers and insurance companies are different grains and are never added into one Massachusetts insurance total. Agency and producer bulk rosters were not acquired; the DOI company list counts companies only. ' + CONFIRM,
      'NOT_ACQUIRED',
      'Massachusetts grains stay separate',
    );
  }
  if (producer && !agency) {
    return answer(
      raw,
      'Massachusetts verifies individual producers (agents), adjusters and other licensees through State Based Systems (SBS). A bulk producer roster comes only from the paid SBS Report Generator (fee assessed by the NAIC) or a DOI public record request, and neither was acquired, so there is no Massachusetts producer census here. A producer is not an agency or an insurer, and an NPN is not an NAIC code. Search-only is not zero. ' + CONFIRM,
      'NOT_ACQUIRED',
      'Massachusetts producer roster',
      { entityClass: 'person', jurisdiction: { state: 'MA', meaning: 'credential_jurisdiction' } },
      [ALT, 'Find NPN 10391484.'],
    );
  }
  if (/\blicen[cs]e\b/i.test(q) && /\b(verify|lookup|look up|check|status)\b/i.test(q) && !insurer) {
    return answer(
      raw,
      'Massachusetts license status for producers, agencies and other licensees is verified through State Based Systems (SBS). InsuranceTrustHub does not mirror that lookup. Search a DOI administrative action by license number, or an insurer by NAIC code. ' + CONFIRM,
      'NOT_ACQUIRED',
      'Massachusetts license verification is SBS search-only',
    );
  }
  if (agency) return null; // existing Massachusetts agency credential execution, marked PARTIAL downstream

  const companyIntent = insurer || /\b(surplus lines|designation|6g|6e|6b|reinsur|risk retention|domestic|domiciled|workers'? ?comp)/i.test(q);
  if (!companyIntent) return null;

  if (/surplus lines|excess and surplus|\be&s\b|non-?admitted/i.test(q)) {
    return designationAnswer(raw, 'eligible_surplus_lines', 'eligible surplus lines', `The workbook is titled "${D.eligible_surplus_lines.workbook_title}". Surplus-lines eligibility is not admitted status.`);
  }
  if (/workers'?\s*comp/i.test(q)) {
    return designationAnswer(raw, 'workers_comp_6e', "workers' compensation 6E", "Designation 6E is authority to write workers' compensation, not proof of current underwriting appetite or a quote.");
  }
  if (/\b(auto|automobile|car|motor vehicle)\b/i.test(q)) {
    return designationAnswer(raw, 'auto_liability_6g', 'auto liability 6G', 'Designation 6G is authority to write auto liability, not proof a policy is offered to every consumer and not a quote. The separate private-passenger-auto group list was not acquired.');
  }
  if (/\b(health|dental|vision)\b/i.test(q)) {
    return designationAnswer(raw, 'health_6b', 'health 6B', 'Designation 6B (health - all kinds) includes life/health and property/casualty company types. It is not a plan list and not a quote.');
  }
  if (/\b(surety|fidelity|bonds?)\b/i.test(q)) {
    return designationAnswer(raw, 'fidelity_surety_4', 'fidelity and surety 4', 'Designation 4 is fidelity and surety authority.');
  }
  if (/\b(domestic|domiciled|headquarter)/i.test(q)) {
    return answer(
      raw,
      `DOI domestic lists (${AS_OF}): ${fmtInt(D.domestic_life.distinct_naic)} Massachusetts-domestic life companies and ${fmtInt(D.domestic_pc.distinct_naic)} Massachusetts-domestic property and casualty companies, kept as two lists. The State column on the Licensed or Approved list is a mailing address, not domicile. Domestic is not a product capability. ${CONFIRM}`,
      'PARTIAL',
      'Massachusetts domestic companies',
      { entityClass: 'insurer', jurisdiction: { state: 'MA', meaning: 'regulatory_domicile' } },
    );
  }
  for (const [re, type] of TYPE_QUERIES) if (re.test(q)) return typeAnswer(raw, type);
  if (/reinsur/i.test(q)) {
    const t = LIST.company_types as Record<string, number>;
    const reinsurerTypes = Object.keys(t).filter((k) => /reinsur/i.test(k));
    return answer(
      raw,
      `DOI's Licensed or Approved Companies list (${AS_OF}) lists reinsurers under several company types: ${reinsurerTypes.map((k) => `${k} ${fmtInt(t[k])}`).join(', ')}. These are separate list relationships and are not added into one reinsurer total. ${CONFIRM}`,
      'PARTIAL',
      'Massachusetts reinsurer rows',
      { entityClass: 'insurer' },
    );
  }
  if (/\blife\b/i.test(q)) {
    return answer(
      raw,
      `DOI's Licensed or Approved Companies list (${AS_OF}) has ${fmtInt((LIST.company_types as Record<string, number>)['Life, Accident & Health'])} "Life, Accident & Health" rows; the separate Domestic Life list has ${fmtInt(D.domestic_life.distinct_naic)} Massachusetts-domestic life companies. Listing is authority, not a product list or a quote. ${CONFIRM}`,
      'PARTIAL',
      'Massachusetts life companies',
      { entityClass: 'insurer' },
    );
  }
  if (/\b(property|casualty|p&c|p & c)\b/i.test(q)) {
    return answer(
      raw,
      `DOI's Licensed or Approved Companies list (${AS_OF}) has ${fmtInt((LIST.company_types as Record<string, number>)['Property & Casualty'])} "Property & Casualty" rows; the Domestic P and C list has ${fmtInt(D.domestic_pc.distinct_naic)} Massachusetts-domestic companies. P&C authority is not proof a homeowners or auto policy is offered to you. ${CONFIRM}`,
      'PARTIAL',
      'Massachusetts property and casualty companies',
      { entityClass: 'insurer' },
    );
  }
  if (/\b(homeowners?|home insurance|renters?|condo|flood|umbrella|pet|travel|annuit|long[- ]term care|medicare)\b/i.test(q)) {
    return answer(
      raw,
      "The DOI company lists have no list for this consumer product. Company type and designation are legal authority, not proof a product is offered to you, so InsuranceTrustHub will not build a product-qualified Massachusetts insurer cohort. " + CONFIRM,
      'UNSUPPORTED',
      'no Massachusetts product-qualified insurer cohort',
      { entityClass: 'insurer' },
    );
  }

  const named = searchMassachusettsCompanyName(q);
  if (named.terms.some((t) => t.length >= 3) && !/\b(how many|count|number of|all|list)\b/i.test(q)) {
    const shown = named.hits.slice(0, 5).map(massachusettsCompanyLabel).join('; ');
    const reason = named.hits.length
      ? `${named.hits.length} company row(s) on DOI's Licensed or Approved Companies list (${AS_OF}) contain "${named.terms.join(' ')}": ${shown}${named.hits.length > 5 ? '; more on the official list' : ''}. The NAIC code printed by the DOI is the identity; the name match only finds the row. Search the NAIC code for the national legal-insurer identity. ${CONFIRM}`
      : named.noNaicHits.length
        ? `${named.noNaicHits.length} row(s) on DOI's Licensed or Approved Companies list contain "${named.terms.join(' ')}", but print no NAIC code (${named.noNaicHits.slice(0, 3).map((r) => `${r.name} — ${r.type}`).join('; ')}). They are kept as source rows, not insurers. ${CONFIRM}`
        : `No row on DOI's Licensed or Approved Companies list (${AS_OF}) contains "${named.terms.join(' ')}". A name that is not on the list is not proof of anything; brands and groups differ from legal company names. Search by NAIC code or check the official list. ${CONFIRM}`;
    return answer(raw, reason, 'PARTIAL', 'Massachusetts DOI company-list name lookup', { entityClass: 'insurer', nameQuery: named.terms.join(' ') }, [ALT, 'Find insurer NAIC code 36404.']);
  }

  const xw = S.naic_crosswalk.licensed_or_approved;
  return answer(
    raw,
    `${listSentence()} ${fmtInt(xw.EXACT_EXISTING_LEGAL_INSURER_MATCHES)} codes match existing legal-insurer identities exactly; ${fmtInt(xw.UNMATCHED_NAIC)} stay Massachusetts research identities. Surplus-lines eligibility is not admitted status, the State column is a mailing address, and listing is not a quote. A legal insurer is not an agency, and NAIC is not NPN. ${CONFIRM}`,
    'PARTIAL',
    'Massachusetts licensed or approved companies',
    { entityClass: 'insurer', jurisdiction: { state: 'MA', meaning: 'credential_jurisdiction' } },
    [ALT, 'Find insurer NAIC code 36404.'],
  );
}

/** Adds Massachusetts DOI list membership to a labeled NAIC lookup that names Massachusetts. */
export function withMassachusettsNaicContext(parsed: ParsedInsuranceAsk): ParsedInsuranceAsk {
  const id = parsed.query.identifier;
  if (id?.type !== 'naic_company_code' || !mentionsMassachusetts(parsed.raw)) return parsed;
  const row = lookupMassachusettsNaic(id.value);
  const value = row
    ? `NAIC ${row.naic} is on DOI's Licensed or Approved Companies list (${AS_OF}) as ${massachusettsCompanyLabel(row)}. Listing is legal authority, not a quote.`
    : `NAIC ${id.value.padStart(5, '0')} is not on DOI's Licensed or Approved Companies list dated ${AS_OF}.`;
  return { ...parsed, interpretation: [...parsed.interpretation, { label: 'Massachusetts DOI list', value }] };
}

export const MASSACHUSETTS_AGENCY_COVERAGE_NOTE = `PARTIAL — Massachusetts agency credentials (${fmtInt(S.agency_roster.existing_graph_ma_agency_credentials)}) come from an earlier DOI producer-license extract matched by exact NPN. They are not a complete Massachusetts agency roster; bulk SBS lists were not acquired. Confirm /massachusetts.`;
