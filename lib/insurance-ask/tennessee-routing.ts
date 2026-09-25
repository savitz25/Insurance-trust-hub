/**
 * TN-INS-001 (state sprint): Tennessee Department of Commerce & Insurance routing for Ask.
 *
 * Runs in the early state block, after labeled NAIC/NPN detection is excluded, so exact identifier
 * intent always reaches the identifier path first. Answers come from the accepted TDCI snapshot:
 * the List of Licensed Insurance Companies keyed by NAIC (company types never summed), monthly
 * company-activity events, and the company-action / examination indexes (standalone; never joined
 * by name). Producer and agency bulk rosters were not acquired.
 */
import type { InsuranceResearchQuery, ParsedInsuranceAsk } from './contract';
import { resolveAllPlaceCodes } from './us-cities';
import { TENNESSEE_SNAPSHOT as S, fmtInt } from '../tennessee-intelligence/snapshot';
import {
  lookupTennesseeNaic,
  searchTennesseeCompanyName,
  tennesseeEventLabel,
  tennesseeEventsForNaic,
  tennesseeListingLabel,
} from '../tennessee-intelligence/lookup';

const ALT = 'Open Tennessee insurance research.';
const CONFIRM = 'Confirm /tennessee.';
const LIST = S.licensed_companies;
const XW = S.naic_crosswalk.licensed_companies;
const EV = S.company_activity_updates;
const CA = S.company_actions;
const EX = S.company_examinations;
const AS_OF = LIST.list_statement.replace(/^As of /, '').replace(/\.$/, '');
const TYPES = LIST.company_types as Record<string, number>;
const DISTINCT = LIST.distinct_naic_by_type as Record<string, number>;
const STATUS_BY_TYPE = LIST.status_reasons_by_type as Record<string, Record<string, number>>;
const TN_INSURER = { entityClass: 'insurer' as const, jurisdiction: { state: 'TN', meaning: 'credential_jurisdiction' as const } };

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

/** Tennessee named, or the uppercase TN state code. */
export function mentionsTennessee(q: string): boolean {
  return /\btennessee\b/i.test(q) || /\btenn\.?(?=\s|$)/i.test(q) || /\bTN\b/.test(q) || /\btdci\b/i.test(q);
}

// Cities that route without a state only when the name is essentially Tennessee-only.
const TN_ONLY_CITIES = /\b(nashville|memphis|chattanooga|knoxville|murfreesboro|gatlinburg)\b/i;
// Shared city names route only when Tennessee is named in the same request.
const TN_SHARED_CITIES = /\b(franklin|jackson|clarksville|columbia|cleveland|johnson city|kingsport|bristol|oak ridge|brentwood|hendersonville|smyrna)\b/i;
const INSURANCE_WORDS = /\b(insurance|agenc|agents?|insurers?|compan(?:y|ies)|producers?|brokers?|carriers?)\b/i;

function localCity(q: string, tn: boolean): string | null {
  const unique = q.match(TN_ONLY_CITIES);
  if (unique) return unique[1];
  const shared = tn ? q.match(TN_SHARED_CITIES) : null;
  return shared ? shared[1] : null;
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function statusText(type: string): string {
  return Object.entries(STATUS_BY_TYPE[type] ?? {})
    .map(([status, n]) => `${status} ${fmtInt(n)}`)
    .join(', ');
}

function typeAnswer(raw: string, type: string, caveat: string, label: string): ParsedInsuranceAsk {
  return answer(
    raw,
    `TDCI's List of Licensed Insurance Companies (as of ${AS_OF}) has ${fmtInt(TYPES[type] ?? 0)} rows with COMPANY_TYPE "${type}" (${fmtInt(DISTINCT[type] ?? 0)} distinct NAIC codes; status as published: ${statusText(type)}). ${caveat} Company type is TDCI's own classification, not a separate insurer universe, and company types are never added together. ${CONFIRM}`,
    'PARTIAL',
    label,
    TN_INSURER,
    [ALT, 'Find insurer NAIC code 16862 Tennessee.'],
  );
}

function listSentence(): string {
  return `TDCI's List of Licensed Insurance Companies (as of ${AS_OF}) has ${fmtInt(LIST.listed_rows)} listed rows across ${Object.keys(TYPES).length} company types. ${fmtInt(LIST.rows_with_exact_naic)} rows carry ${fmtInt(LIST.distinct_naic)} distinct NAIC codes; ${fmtInt(LIST.placeholder_rows)} reinsurer and captive rows print the placeholder NAIC ${LIST.placeholder_naic} and are not counted as identities.`;
}

/** Tennessee named, or a place the shared resolver maps to TN. */
export function resolvesToTennessee(q: string): boolean {
  if (mentionsTennessee(q)) return true;
  return resolveAllPlaceCodes(q)[0] === 'TN';
}

export function interpretTennesseeEarly(raw: string): ParsedInsuranceAsk | null {
  const q = raw.trim();
  const tn = mentionsTennessee(q);
  if (/\b(npn|naic)\b/i.test(q)) return null; // exact identifier intent outranks state routing

  const city = INSURANCE_WORDS.test(q) ? localCity(q, tn) : null;
  if (city) {
    return answer(
      raw,
      `This statewide Tennessee insurance page does not publish ${titleCase(city)} or other local insurance intelligence routes. A city is geography, not a licensing regime. TDCI licenses companies, agencies and producers statewide, and a company's mailing office is not where it sells. The existing Tennessee market hubs are research pathways, not a TDCI license census. ${CONFIRM}`,
      'UNSUPPORTED',
      'no Tennessee local intelligence',
      { jurisdiction: { state: 'TN', meaning: 'recorded_address_state' }, requestedCity: titleCase(city) },
    );
  }
  if (!tn) return null;

  if (/\b(best|safest|most trustworthy|cheapest|top[- ]?rated|most trusted|recommended|trust score|worst)\b/i.test(q)) {
    return answer(
      raw,
      'InsuranceTrustHub does not rank Tennessee insurers, agencies, or agents and does not publish a Trust Score. Research the TDCI list of licensed companies, company actions and examinations instead. ' + CONFIRM,
      'UNSUPPORTED',
      'no ranking',
    );
  }

  const agency = /\bagenc/i.test(q);
  const producer = /\b(insurance agents?|agents?|producers?|brokers?|adjusters?)\b/i.test(q);
  const insurer = /\b(insurers?|insurance compan(?:y|ies)|carriers?|underwriters?|companies)\b/i.test(q);

  if (/complaint/i.test(q)) {
    return answer(
      raw,
      "TDCI Consumer Insurance Services takes insurance complaints online (NAIC State Based Systems form) or by mail; the policy must have been written in Tennessee, and TennCare complaints go to the TennCare Oversight Division. TDCI's \"Complaint Data\" link opens the NAIC Consumer Insurance Search, a national company lookup. No Tennessee company-level complaint table was acquired, so there are no complaint counts or ratios here. A complaint is not an enforcement finding, and a complaint ratio is not a quality score. " + CONFIRM,
      'NOT_ACQUIRED',
      'Tennessee company-level complaint data',
    );
  }

  if (/\bexam(?:ination)?s?\b|market conduct|financial exam/i.test(q)) {
    const recent = EX.latest_posting_year_listings.map((x) => `${x.company_as_listed} (as of ${x.exam_as_of_year}, posted ${x.posted.join(', ')})`);
    return answer(
      raw,
      `TDCI's Company Examinations Archive lists ${fmtInt(EX.listings)} examinations grouped by the year each is as of (${EX.exam_as_of_years[0]}–${EX.exam_as_of_years[1]}), with ${fmtInt(EX.documents)} report and order PDFs. Posted in ${EX.latest_posting_year}: ${recent.join('; ')}. The listings print no NAIC code, so none is attached to an insurer by name; the PDFs were not parsed, and an examination report is not a score. ${CONFIRM}`,
      'PARTIAL',
      'Tennessee company examination index',
      { entityClass: 'insurer' },
    );
  }

  if ((producer || /\blicensee/i.test(q)) && /disciplin|revoc|revoked|suspen|enforcement|actions?\b/i.test(q) && !insurer) {
    return answer(
      raw,
      `TDCI's Agent/Producer Disciplinary Actions Archive lists ${fmtInt(S.producer_discipline.linked_entries)} entries alphabetically by the individual's last name, each linking to an order. It prints no NPN and no action-date field, so no entry is attached to a producer, agency or insurer here, and names are not republished. A disciplinary entry is person-grain evidence, not an agency or company record. ${CONFIRM}`,
      'PARTIAL',
      'Tennessee producer disciplinary archive',
      { entityClass: 'person', jurisdiction: { state: 'TN', meaning: 'credential_jurisdiction' } },
    );
  }

  if (/monthly update|activit(?:y|ies) update|admission|name change|redomestic|merger|surrender|withdraw|new(?:ly)? licensed/i.test(q)) {
    const bySection = Object.entries(EV.event_rows_by_section)
      .map(([k, n]) => `${k.replace(/_/g, ' ')} ${k === 'suspensions' && n === 0 ? 'none' : fmtInt(n)}`)
      .join(', ');
    return answer(
      raw,
      `TDCI's Insurance Activities Monthly Update (as of ${EV.source_as_of}; ${EV.page_last_updated_statement.replace(/^This Page /, 'page ').toLowerCase()}) lists ${fmtInt(EV.event_rows)} company events: ${bySection}. ${fmtInt(EV.naic_keyed_event_rows)} print a 5-digit NAIC code. An event is not a company and these events are not a second company census. Search an NAIC code to see its events. ${CONFIRM}`,
      'PARTIAL',
      'Tennessee company-activity events',
      TN_INSURER,
      [ALT, 'Find insurer NAIC code 34118 Tennessee.'],
    );
  }

  if (
    /company actions?|enforcement|consent order|agreed order|order to show cause|disciplin|revocation|revoked|suspension|suspended|\bfines?\b|penalt|sanction|regulatory action|rehabilitat|receivership|liquidat/i.test(q)
  ) {
    const recent = CA.latest_year_entries.map((x) => x.caption_as_listed);
    const terms = CA.terms_as_listed as Record<string, number>;
    return answer(
      raw,
      `TDCI's Insurance Company Actions Archive lists orders and related documents alphabetically by company: ${fmtInt(CA.index_lines)} index lines linking ${fmtInt(CA.linked_documents)} documents, dated ${CA.earliest_date.slice(0, 4)}–${CA.latest_date.slice(0, 4)}. It prints no list date, no action type and no NAIC code, so every line is a standalone TDCI record and none is attached to an insurer by name. Not every entry is punitive: captions mention acquisitions (${fmtInt(terms.Acquisition ?? 0)}), mergers (${fmtInt(terms.Merger ?? 0)}), rehabilitation (${fmtInt(terms.Rehabilitation ?? 0)}) and bond funds (${fmtInt(terms.Bond ?? 0)}) as well as orders. ${CA.latest_year} entries as listed: ${recent.join('; ')}. ${fmtInt(LIST.status_reasons.Suspended)} rows on the licensed-company list carry status Suspended and ${fmtInt(LIST.status_reasons.Restricted)} Restricted, as published. Producer discipline is a separate archive. Receivership and financial-solvency data were not acquired. ${CONFIRM}`,
      'PARTIAL',
      'Tennessee insurance company actions archive',
      { entityClass: 'insurer' },
    );
  }

  if (agency && (producer || insurer)) {
    return answer(
      raw,
      'Tennessee agencies, individual producers and insurance companies are different grains and are never added into one Tennessee insurance total. Agency and producer bulk rosters were not acquired; the TDCI company list counts companies only. ' + CONFIRM,
      'NOT_ACQUIRED',
      'Tennessee grains stay separate',
    );
  }
  if (producer && !agency) {
    return answer(
      raw,
      "Tennessee verifies individual producers (agents) through TDCI's Verify an Insurance License link, which opens the NAIC public license lookup. That is a search, not a download. No free structured bulk producer roster was found and no paid list was bought, so there is no Tennessee producer census here. A producer is not an agency or an insurer, and an NPN is not an NAIC code. Search-only is not zero. " + CONFIRM,
      'NOT_ACQUIRED',
      'Tennessee producer roster',
      { entityClass: 'person', jurisdiction: { state: 'TN', meaning: 'credential_jurisdiction' } },
      [ALT, 'Find NPN 10391484.'],
    );
  }
  if (agency) {
    return answer(
      raw,
      "Tennessee agency (business entity) licenses are verified through TDCI's Verify an Insurance License link, which opens the NAIC public license lookup. No free structured bulk agency roster was found and none was bought. InsuranceTrustHub holds no Tennessee credential source, so existing agency records from other states are not a Tennessee agency census. An agency is not an insurer and not an individual producer. Search-only is not zero. " + CONFIRM,
      'NOT_ACQUIRED',
      'Tennessee agency roster',
      { entityClass: 'agency', jurisdiction: { state: 'TN', meaning: 'credential_jurisdiction' } },
    );
  }
  if (/\blicen[cs]e\b/i.test(q) && /\b(verify|lookup|look up|check|status)\b/i.test(q) && !insurer) {
    return answer(
      raw,
      "Tennessee license status for producers, agencies and companies is checked through TDCI's Verify an Insurance License link, which opens the NAIC public license lookup. InsuranceTrustHub does not mirror that lookup. Search an insurer by NAIC code for its TDCI list row. " + CONFIRM,
      'NOT_ACQUIRED',
      'Tennessee license verification is search-only',
    );
  }

  const companyIntent =
    insurer || /\b(surplus lines|reinsur|risk retention|domestic|domiciled|headquarter|hmo|fraternal|captive|title|workers'? ?comp|county mutual)/i.test(q);
  if (!companyIntent) return null;

  if (/surplus lines|excess and surplus|\be&s\b|non-?admitted/i.test(q)) {
    return typeAnswer(raw, 'SURPLUS LINES', 'Every surplus-lines row has status "Eligible". Eligible is not admitted (licensed) status, and eligibility is not a quote.', 'Tennessee eligible surplus-lines companies');
  }
  if (/workers'?\s*comp/i.test(q)) {
    return answer(
      raw,
      `TDCI's List of Licensed Insurance Companies has no line-of-business column, so workers' compensation authority cannot be read from it. Companies writing it are generally PROPERTY-type (${fmtInt(TYPES.PROPERTY)} rows), but a PROPERTY row is not proof of workers' compensation authority, so no workers' compensation insurer count is shown. ${CONFIRM}`,
      'UNSUPPORTED',
      "no Tennessee workers' compensation insurer cohort",
      TN_INSURER,
    );
  }
  if (/\b(hmo|health maintenance)\b/i.test(q)) {
    return typeAnswer(raw, 'HEALTH MAINTENANCE ORGANIZATION', 'An HMO listing is not a plan list or a quote.', 'Tennessee HMOs');
  }
  if (/\bhealth\b/i.test(q)) {
    return answer(
      raw,
      `TDCI's list (as of ${AS_OF}) has ${fmtInt(TYPES['HEALTH MAINTENANCE ORGANIZATION'])} HEALTH MAINTENANCE ORGANIZATION rows and ${fmtInt(TYPES['HOSPITAL PLAN'])} HOSPITAL PLAN rows. Accident and health authority is not a separate company type: LIFE (${fmtInt(TYPES.LIFE)} rows) and PROPERTY companies can hold it, and the list prints no line-of-business column, so no complete health-insurer count is shown. Types are not added together. TennCare managed care is overseen by the TennCare Oversight Division. ${CONFIRM}`,
      'PARTIAL',
      'Tennessee health company types',
      TN_INSURER,
    );
  }
  if (/\b(property|casualty|p&c|p & c)\b/i.test(q)) {
    return typeAnswer(raw, 'PROPERTY', 'PROPERTY authority is not proof a homeowners or auto policy is offered to you.', 'Tennessee property and casualty companies');
  }
  if (/\b(domestic|domiciled|headquarter)/i.test(q)) {
    const byType = Object.entries(LIST.tennessee_domiciled_rows_by_type)
      .map(([t, n]) => `${t} ${fmtInt(n)}`)
      .join(', ');
    return answer(
      raw,
      `${fmtInt(LIST.tennessee_domiciled_rows)} rows on TDCI's list (as of ${AS_OF}) have DOMICILE_STATE TN (${fmtInt(LIST.tennessee_domiciled_distinct_naic)} distinct NAIC codes): ${byType}. Domicile is not Tennessee authority: ${fmtInt(LIST.foreign_or_alien_domiciled_rows)} listed rows are domiciled elsewhere, and a Tennessee domicile is not itself an authority class. The mailing-office state is not the domicile. ${CONFIRM}`,
      'PARTIAL',
      'Tennessee-domiciled companies',
      { entityClass: 'insurer', jurisdiction: { state: 'TN', meaning: 'regulatory_domicile' } },
    );
  }
  if (/risk retention/i.test(q)) return typeAnswer(raw, 'RISK RETENTION GROUP', 'Registered is not a Tennessee license.', 'Tennessee risk retention groups');
  if (/fraternal/i.test(q)) return typeAnswer(raw, 'FRATERNAL', 'A fraternal listing is authority, not a product offer.', 'Tennessee fraternal companies');
  if (/captive/i.test(q)) {
    return typeAnswer(raw, 'CAPTIVE', 'One captive row prints the placeholder NAIC 99999. Captive authority is not a consumer product.', 'Tennessee captives');
  }
  if (/\btitle\b/i.test(q)) return typeAnswer(raw, 'TITLE', 'A title listing is not a quote.', 'Tennessee title insurers');
  if (/county mutual/i.test(q)) return typeAnswer(raw, 'COUNTY MUTUAL', 'County mutuals are Tennessee-domiciled.', 'Tennessee county mutuals');
  if (/reinsur/i.test(q)) {
    return answer(
      raw,
      `TDCI's list (as of ${AS_OF}) has ${fmtInt(TYPES.REINSURER)} REINSURER rows (status as published: ${statusText('REINSURER')}) and ${fmtInt(TYPES['LIMITED CAPITAL REINSURER'])} LIMITED CAPITAL REINSURER rows. ${fmtInt(LIST.placeholder_rows_by_type.REINSURER)} reinsurer rows print the placeholder NAIC ${LIST.placeholder_naic}; TDCI lists their 7-digit NAIC alien codes on a separate page, but joining the two would need a name match, so it is not done. A reinsurance recognition is not a direct-writing license, and the types are not added together. ${CONFIRM}`,
      'PARTIAL',
      'Tennessee reinsurer rows',
      TN_INSURER,
    );
  }
  if (/\blife\b/i.test(q)) return typeAnswer(raw, 'LIFE', 'Listing is authority, not a product list or a quote.', 'Tennessee life companies');
  if (/\b(homeowners?|home insurance|renters?|condo|flood|umbrella|pet|travel|annuit|long[- ]term care|medicare|auto|automobile|car)\b/i.test(q)) {
    return answer(
      raw,
      "TDCI's List of Licensed Insurance Companies has no product or line-of-business column. Company type is legal authority, not proof a product is offered to you, so InsuranceTrustHub will not build a product-qualified Tennessee insurer cohort. " + CONFIRM,
      'UNSUPPORTED',
      'no Tennessee product-qualified insurer cohort',
      { entityClass: 'insurer' },
    );
  }

  const named = searchTennesseeCompanyName(q);
  if (named.terms.some((t) => t.length >= 3) && !/\b(how many|count|number of|all|list)\b/i.test(q)) {
    const shown = named.hits.slice(0, 5).map(tennesseeListingLabel).join('; ');
    const reason = named.hits.length
      ? `${named.hits.length} company row(s) on TDCI's List of Licensed Insurance Companies (as of ${AS_OF}) contain "${named.terms.join(' ')}": ${shown}${named.hits.length > 5 ? '; more on the official list' : ''}. The NAIC code TDCI prints is the identity; the name match only finds the row. Search the NAIC code for the national legal-insurer identity. ${CONFIRM}`
      : named.placeholderHits.length
        ? `${named.placeholderHits.length} row(s) on TDCI's list contain "${named.terms.join(' ')}" but print the placeholder NAIC ${LIST.placeholder_naic} (${named.placeholderHits.slice(0, 3).map((r) => `${r.name} — ${r.type}, ${r.status}`).join('; ')}). They are kept as research rows, not identities. ${CONFIRM}`
        : `No row on TDCI's List of Licensed Insurance Companies (as of ${AS_OF}) contains "${named.terms.join(' ')}". A name that is not on the list is not proof of anything; brands and groups differ from legal company names. Search by NAIC code or check the official list. ${CONFIRM}`;
    return answer(raw, reason, 'PARTIAL', 'Tennessee TDCI company-list name lookup', { entityClass: 'insurer', nameQuery: named.terms.join(' ') }, [ALT, 'Find insurer NAIC code 16862 Tennessee.']);
  }

  return answer(
    raw,
    `${listSentence()} ${fmtInt(XW.EXACT_EXISTING_LEGAL_INSURER_MATCHES)} codes match existing legal-insurer identities exactly; ${fmtInt(XW.UNMATCHED_NAIC)} stay Tennessee research identities. Status is kept as published (Licensed ${fmtInt(LIST.status_reasons.Licensed)}, Eligible surplus lines ${fmtInt(LIST.status_reasons.Eligible)}, Registered risk retention groups ${fmtInt(LIST.status_reasons.Registered)}, reinsurer recognitions, Suspended ${fmtInt(LIST.status_reasons.Suspended)}, Restricted ${fmtInt(LIST.status_reasons.Restricted)}). Domicile is not Tennessee authority, and listing is not a quote. A legal insurer is not an agency, and NAIC is not NPN. ${CONFIRM}`,
    'PARTIAL',
    'Tennessee licensed insurance companies',
    TN_INSURER,
    [ALT, 'Find insurer NAIC code 16862 Tennessee.'],
  );
}

/** Adds TDCI list membership and monthly events to a labeled NAIC lookup that names Tennessee. */
export function withTennesseeNaicContext(parsed: ParsedInsuranceAsk): ParsedInsuranceAsk {
  const id = parsed.query.identifier;
  if (!mentionsTennessee(parsed.raw)) return parsed;
  if (id?.type === 'npn') {
    const value = 'Tennessee producer and agency licenses are verified through the NAIC public lookup linked by TDCI. This extract holds no Tennessee producer roster, so the NPN result above is not Tennessee license status. NPN is not an NAIC code.';
    return { ...parsed, interpretation: [...parsed.interpretation, { label: 'Tennessee TDCI', value }] };
  }
  if (id?.type !== 'naic_company_code') return parsed;
  const naic = id.value.replace(/\D/g, '').padStart(5, '0');
  const row = lookupTennesseeNaic(naic);
  const events = tennesseeEventsForNaic(naic);
  const listed = naic === LIST.placeholder_naic
    ? `NAIC ${naic} is a placeholder on TDCI's list (${fmtInt(LIST.placeholder_rows)} reinsurer and captive rows), not an identity.`
    : row
      ? `NAIC ${row.naic} is on TDCI's List of Licensed Insurance Companies (as of ${AS_OF}) as ${tennesseeListingLabel(row)}. Listing is legal authority, not a quote; domicile is not Tennessee authority.`
      : `NAIC ${naic} is not on TDCI's List of Licensed Insurance Companies as of ${AS_OF}.`;
  const activity = events.length ? ` TDCI monthly update events for this code: ${events.map(tennesseeEventLabel).join('; ')}.` : '';
  return { ...parsed, interpretation: [...parsed.interpretation, { label: 'Tennessee TDCI list', value: listed + activity }] };
}
