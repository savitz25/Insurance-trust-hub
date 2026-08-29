/**
 * INS-INSURER-001 — deterministic legal-insurer search ranking.
 * Discovery only. Similarity is not identity resolution.
 */
import { normalizeLegalName } from './names';
import { normalizeNaicCompanyCode } from './legal-insurer-identity';

export const INSURER_SEARCH_RANK = [
  'exact_naic',
  'exact_legal_name',
  'normalized_legal_name',
  'deterministic_alias',
  'text_similarity',
  'stable_tie_break',
] as const;

export type InsurerSearchMatch = (typeof INSURER_SEARCH_RANK)[number];

export const FORBIDDEN_INSURER_SEARCH_ORDER = [
  'complaint volume',
  'market share',
  'premium',
  'rating',
  'popularity',
  'paid status',
  'trust score',
] as const;

export type LegalInsurerSearchRecord = {
  entityId: string;
  legalName: string;
  naicCode: string | null;
  domicile: string | null;
  aliases?: string[];
};

export type LegalInsurerSearchHit = {
  entityId: string;
  legalName: string;
  naicCode: string | null;
  domicile: string | null;
  match: Exclude<InsurerSearchMatch, 'stable_tie_break'>;
};

function rankOf(match: LegalInsurerSearchHit['match']): number {
  return INSURER_SEARCH_RANK.indexOf(match);
}

function stableTieBreak(a: LegalInsurerSearchRecord, b: LegalInsurerSearchRecord): number {
  const na = a.naicCode || '';
  const nb = b.naicCode || '';
  if (na !== nb) return na.localeCompare(nb);
  const ln = a.legalName.localeCompare(b.legalName);
  if (ln !== 0) return ln;
  return a.entityId.localeCompare(b.entityId);
}

/**
 * Neutral insurer search. Never orders by complaints, premium, ratings, or paid status.
 */
export function searchLegalInsurers(
  query: string,
  records: readonly LegalInsurerSearchRecord[],
): LegalInsurerSearchHit[] {
  const raw = String(query || '').trim();
  if (!raw) return [];
  const naic = normalizeNaicCompanyCode(raw);
  const exactName = raw.replace(/\s+/g, ' ').trim();
  const normalized = normalizeLegalName(raw);
  const hits: LegalInsurerSearchHit[] = [];

  for (const rec of records) {
    let match: LegalInsurerSearchHit['match'] | null = null;
    if (naic && rec.naicCode === naic) match = 'exact_naic';
    else if (rec.legalName === exactName) match = 'exact_legal_name';
    else if (normalizeLegalName(rec.legalName) === normalized && normalized.length > 0) {
      match = 'normalized_legal_name';
    } else if ((rec.aliases || []).some((a) => a === exactName || normalizeLegalName(a) === normalized)) {
      match = 'deterministic_alias';
    } else if (
      normalized.length >= 8 &&
      (normalizeLegalName(rec.legalName).includes(normalized) ||
        normalized.includes(normalizeLegalName(rec.legalName)))
    ) {
      match = 'text_similarity';
    }
    if (!match) continue;
    hits.push({
      entityId: rec.entityId,
      legalName: rec.legalName,
      naicCode: rec.naicCode,
      domicile: rec.domicile,
      match,
    });
  }

  hits.sort((a, b) => {
    const ra = rankOf(a.match);
    const rb = rankOf(b.match);
    if (ra !== rb) return ra - rb;
    const recA = records.find((r) => r.entityId === a.entityId)!;
    const recB = records.find((r) => r.entityId === b.entityId)!;
    return stableTieBreak(recA, recB);
  });
  return hits;
}

export function insurerSearchUsesForbiddenSignal(orderKey: string): boolean {
  const k = orderKey.toLowerCase();
  return FORBIDDEN_INSURER_SEARCH_ORDER.some((p) => k.includes(p.split(' ')[0]!));
}
