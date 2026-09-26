/**
 * MN-INS-001: Minnesota Department of Commerce routing.
 * Labeled NAIC / NPN intent is left for the identifier path. Cities are geography only.
 * Company, agency and producer bulk rosters were not acquired. Counts are not invented.
 */
import type { InsuranceResearchQuery, ParsedInsuranceAsk } from './contract';
import { MINNESOTA_SNAPSHOT as S } from '../minnesota-intelligence/snapshot';

const ALT = 'Open Minnesota insurance research.';
const CONFIRM = 'Confirm /minnesota.';
const MN = { state: 'MN', meaning: 'credential_jurisdiction' as const };

function answer(
  raw: string,
  reason: string,
  coverage: NonNullable<InsuranceResearchQuery['coverageState']>,
  label: string,
  extra: Partial<InsuranceResearchQuery> = {},
): ParsedInsuranceAsk {
  const query: InsuranceResearchQuery = {
    mode: 'fail_closed',
    page: 1,
    failReason: reason,
    alternatives: [ALT],
    coverageState: coverage,
    ...extra,
  };
  return { raw, query, interpretation: [{ label: 'Coverage', value: `${coverage} — ${label}` }] };
}

export function mentionsMinnesota(q: string): boolean {
  return /\bminnesota\b/i.test(q) || /\bMN\b/.test(q);
}

const MN_ONLY_CITIES = /\b(minneapolis|st\.?\s*paul|saint paul|duluth|bloomington|minnetonka|edina|eagan)\b/i;
const MN_SHARED_CITIES = /\b(rochester|eden prairie)\b/i;
const INSURANCE = /\b(insurance|agenc|agents?|insurers?|compan(?:y|ies)|producers?|brokers?|carriers?)\b/i;

function localCity(q: string, mn: boolean): string | null {
  const unique = q.match(MN_ONLY_CITIES);
  if (unique) return unique[1];
  if (!mn) return null;
  const shared = q.match(MN_SHARED_CITIES);
  return shared ? shared[1] : null;
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function interpretMinnesotaEarly(raw: string): ParsedInsuranceAsk | null {
  const q = raw.trim();
  if (/\b(npn|naic)\b/i.test(q)) return null;
  const mn = mentionsMinnesota(q);
  const city = INSURANCE.test(q) ? localCity(q, mn) : null;
  if (city) {
    return answer(
      raw,
      `This statewide Minnesota insurance page does not publish ${titleCase(city)} or other local insurance intelligence. A city is geography. The Minnesota Department of Commerce licenses companies, agencies and producers statewide. Confirm /minnesota.`,
      'UNSUPPORTED',
      'no Minnesota local intelligence',
      { jurisdiction: { state: 'MN', meaning: 'recorded_address_state' }, requestedCity: titleCase(city) },
    );
  }
  if (!mn) return null;

  if (/\b(best|safest|most trustworthy|cheapest|top[- ]?rated|most trusted|recommended|trust score|worst)\b/i.test(q)) {
    return answer(raw, 'InsuranceTrustHub does not rank Minnesota insurers, agencies or agents and does not publish a Trust Score. ' + CONFIRM, 'UNSUPPORTED', 'no ranking');
  }
  if (/complaint/i.test(q)) {
    return answer(
      raw,
      `Complaint intake at the Commerce Insurance Division is known (${S.regulator.complaint_phone}). Provider-level complaint outcomes were not acquired. A complaint is not a finding and is not a ranking. ${CONFIRM}`,
      'KNOWN',
      'Minnesota complaint intake',
    );
  }
  if (/\bserff\b|rate filings?|form filings?/i.test(q)) {
    return answer(
      raw,
      'Commerce directs public insurance rate and form filings to SERFF. InsuranceTrustHub ingested no filings. A filing is not a quote or a recommendation. ' + CONFIRM,
      'KNOWN',
      'Minnesota SERFF filing access',
    );
  }
  if (/\b(financial exam|examination)\b/i.test(q)) {
    return answer(
      raw,
      'Commerce identifies insurance financial examinations as public through CARDS. No examination metadata index was acquired. An examination is not an enforcement action and is not a score. ' + CONFIRM,
      'KNOWN',
      'Minnesota financial examinations',
      { entityClass: 'insurer' },
    );
  }
  if (/enforcement|consent order|cease and desist|disciplin|revocation|suspension/i.test(q)) {
    return answer(
      raw,
      'Commerce enforcement search is CARDS. No insurance-only action index for 2022 through 2026 was acquired. Nothing is attached by company or person name. A consent order is not relabeled as a violation. ' + CONFIRM,
      'KNOWN',
      'Minnesota insurance enforcement',
    );
  }
  if (/\bagenc/i.test(q) && /\b(producers?|agents?|insurers?|compan)/i.test(q)) {
    return answer(
      raw,
      'A Minnesota agency, a producer and an insurer are different grains and are never added into one Minnesota insurance total. Bulk rosters were not acquired. Search-only is not zero. ' + CONFIRM,
      'NOT_ACQUIRED',
      'Minnesota grains stay separate',
    );
  }
  if (/\b(producers?|agents?|brokers?)\b/i.test(q) && !/\bagenc/i.test(q)) {
    return answer(
      raw,
      'Minnesota producer licensing is person grain, verified through Commerce license lookup and Sircon. No producer roster was acquired and no personal names are published here. An NPN is not an NAIC code. ' + CONFIRM,
      'NOT_ACQUIRED',
      'Minnesota producer roster',
      { entityClass: 'person', jurisdiction: MN },
    );
  }
  if (/\bagenc/i.test(q)) {
    return answer(
      raw,
      'Minnesota agency licensing is organization grain. No agency roster was acquired. Appointments and designated responsible producers are not agencies. ' + CONFIRM,
      'NOT_ACQUIRED',
      'Minnesota agency roster',
      { entityClass: 'agency', jurisdiction: MN },
    );
  }
  return answer(
    raw,
    'Minnesota company verification is known through Commerce license lookup. No company roster was acquired, so there is no NAIC crosswalk on this page. A national NAIC identity is not Minnesota authority. Authority class is not a product offering. ' + CONFIRM,
    'NOT_ACQUIRED',
    'Minnesota company roster',
    { entityClass: 'insurer', jurisdiction: MN },
  );
}

export function withMinnesotaNaicContext(parsed: ParsedInsuranceAsk): ParsedInsuranceAsk {
  if (!mentionsMinnesota(parsed.raw)) return parsed;
  const id = parsed.query.identifier;
  if (id?.type === 'npn') {
    return {
      ...parsed,
      interpretation: [
        ...parsed.interpretation,
        { label: 'Minnesota Commerce', value: 'This NPN is not checked against a Minnesota producer roster. Verify it in Commerce license lookup or Sircon. NPN is not an NAIC code.' },
      ],
    };
  }
  if (id?.type !== 'naic_company_code') return parsed;
  return {
    ...parsed,
    interpretation: [
      ...parsed.interpretation,
      { label: 'Minnesota Commerce', value: 'This NAIC identity is not checked against Minnesota authority. No company roster was acquired. Verify the company in Commerce license lookup.' },
    ],
  };
}
