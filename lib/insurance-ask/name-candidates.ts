/**
 * TH-SEARCH-R1-019F: the ONE Insurance organization-name candidate engine.
 *
 * Native /ask, trusthub-specialist-execution-v2 (identityName) and insurance-name-candidates-v1 are
 * adapters over this file. Matching is NOT defined here: name-match.ts (normalizeSourceName,
 * distinctiveNameTokens, matchSourceName) stays the only name semantics.
 *
 * ORDER OF OPERATIONS -- match first, page second:
 *   1. read the source superset for the name (SQL ILIKE is only a substring prefilter);
 *   2. apply matchSourceName to EVERY superset row (whole-word, distinctive-token rule);
 *   3. collapse to one candidate per class-qualified identity, keeping the strongest field evidence;
 *   4. order deterministically;
 *   5. only then cut the requested window.
 * No raw source row is ever limited before step 2, so a window can never lose (or gain) a candidate
 * because of where a non-matching substring row happened to sort.
 *
 * ELIGIBLE GRAINS (unscoped name discovery): agency identities from national_entities, and legal
 * insurers from the published Wave-1 cohort. Never individual producers/persons, carriers from
 * appointment rows, consumer brands, directory listings or unpublished insurer inventory.
 *
 * TRUTH ABOUT TOTALS: `matchedCount` is a number only when the superset was read to its end
 * (completeness COMPLETE) -- then it is a computed count of distinct matched identities, not an
 * estimate. If the per-field scan bound is reached it is null and the stream says SCAN_BOUND_REACHED;
 * nothing that looks like a census is emitted. A source error always throws: it can never become an
 * empty window, a last page, or a miss.
 */
import { distinctiveNameTokens, matchSourceName, normalizeSourceName } from './name-match';

export const NAME_CANDIDATE_WINDOW = 10;
export const NAME_CANDIDATE_MAX_PAGE = 200;
/** Rows read per source request while scanning the substring superset. */
export const NAME_SCAN_BATCH = 500;
/** Upper bound of superset rows read per source-name field before the stream is declared incomplete. */
export const NAME_SCAN_ROW_BOUND = 5000;

export type NameField = 'legal_name' | 'display_name';
export type AgencySourceRow = { id: string; entity_kind: string; npn: string | null; display_name: string; legal_name: string; identity_kind?: string; identity_confidence?: string };
export type InsurerSourceRow = { entityId: string; canonicalLegalName: string; naicCode: string };

export type NameCandidate = {
  /** Class-qualified so an agency and a legal insurer can never collapse into one identity. */
  stableKey: string;
  entityId: string;
  entityClass: 'agency' | 'insurer';
  displayName: string;
  match: { method: string; field: NameField | 'canonical_legal_name'; value: string; normalization: string[] };
  agency?: AgencySourceRow;
  insurer?: InsurerSourceRow;
};

export type NameCandidateStream = {
  requestedName: string;
  tokens: string[];
  candidates: NameCandidate[];
  completeness: 'COMPLETE' | 'SCAN_BOUND_REACHED';
};

export type NameCandidateWindow = {
  page: number;
  limit: number;
  returned: number;
  hasMore: boolean;
  outOfRange: boolean;
  nextPage: number | null;
  /** Exact count of distinct matched identities, or null when the scan bound was reached. */
  matchedCount: number | null;
  completeness: NameCandidateStream['completeness'];
};

export type NameSource = {
  /** One page of agency rows whose `field` equals the name (case-insensitive), ordered by field, id. */
  agenciesExact(field: NameField, name: string, from: number, to: number): Promise<AgencySourceRow[]>;
  /** One page of agency rows whose `field` contains every token as a substring, ordered by field, id. */
  agenciesContainingTokens(field: NameField, tokens: string[], from: number, to: number): Promise<AgencySourceRow[]>;
  /** Published Wave-1 legal insurers only. */
  publishedInsurers(name: string): InsurerSourceRow[];
};

/** Unscoped name discovery admits agency identities only; a source that hands back anything else is ignored. */
function isEligibleAgencyRow(row: AgencySourceRow): boolean {
  return row.entity_kind === 'agency';
}

/** legal exact > display exact > display token > legal token -- the precedence the pre-019F loop produced. */
function evidenceStrength(match: NameCandidate['match']): number {
  const exact = match.method === 'normalized_exact_name';
  if (exact) return match.field === 'legal_name' ? 4 : 3;
  return match.field === 'display_name' ? 2 : 1;
}

/** Deterministic across runtimes: no host-locale collation. */
function byCodeUnit(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
export function compareNameCandidates(a: NameCandidate, b: NameCandidate): number {
  return Number(b.match.method === 'normalized_exact_name') - Number(a.match.method === 'normalized_exact_name')
    || byCodeUnit(normalizeSourceName(a.displayName), normalizeSourceName(b.displayName))
    || byCodeUnit(a.displayName, b.displayName)
    || byCodeUnit(a.stableKey, b.stableKey);
}

async function scan(read: (from: number, to: number) => Promise<AgencySourceRow[]>, visit: (row: AgencySourceRow) => void): Promise<boolean> {
  for (let from = 0; from < NAME_SCAN_ROW_BOUND; from += NAME_SCAN_BATCH) {
    const rows = await read(from, from + NAME_SCAN_BATCH - 1);
    rows.forEach(visit);
    if (rows.length < NAME_SCAN_BATCH) return true;
  }
  return false;
}

export async function collectInsuranceNameCandidates(source: NameSource, input: { name: string; entityClass?: 'agency' | 'insurer' | 'person' }): Promise<NameCandidateStream> {
  const name = input.name, tokens = distinctiveNameTokens(name);
  const found = new Map<string, NameCandidate>();
  let complete = true;
  if (!tokens.length) return { requestedName: name, tokens, candidates: [], completeness: 'COMPLETE' };

  if (!input.entityClass || input.entityClass === 'agency') {
    // The two fields are read concurrently: which evidence wins is decided by evidenceStrength, never
    // by arrival order, and the final order by compareNameCandidates -- so the stream is identical.
    await Promise.all((['legal_name', 'display_name'] as const).map(async (field) => {
      const visit = (row: AgencySourceRow) => {
        if (!isEligibleAgencyRow(row)) return;
        const value = row[field]; if (!value) return;
        const relation = matchSourceName(name, value); if (!relation) return;
        const match = { method: relation.method, field, value, normalization: relation.normalization };
        const stableKey = `agency:${row.id}`, old = found.get(stableKey);
        if (old && evidenceStrength(old.match) >= evidenceStrength(match)) return;
        found.set(stableKey, { stableKey, entityId: row.id, entityClass: 'agency', displayName: row.display_name || row.legal_name || 'Unnamed agency', match, agency: row });
      };
      if (!(await scan((from, to) => source.agenciesExact(field, name, from, to), visit))) complete = false;
      if (!(await scan((from, to) => source.agenciesContainingTokens(field, tokens, from, to), visit))) complete = false;
    }));
  }
  if (!input.entityClass || input.entityClass === 'insurer') {
    for (const insurer of source.publishedInsurers(name)) {
      const relation = matchSourceName(name, insurer.canonicalLegalName); if (!relation) continue;
      const stableKey = `insurer:${insurer.entityId}`;
      found.set(stableKey, { stableKey, entityId: insurer.entityId, entityClass: 'insurer', displayName: insurer.canonicalLegalName, match: { method: relation.method, field: 'canonical_legal_name', value: insurer.canonicalLegalName, normalization: relation.normalization }, insurer });
    }
  }
  return { requestedName: name, tokens, candidates: [...found.values()].sort(compareNameCandidates), completeness: complete ? 'COMPLETE' : 'SCAN_BOUND_REACHED' };
}

export function nameCandidateWindow(stream: NameCandidateStream, page: number, limit: number): { window: NameCandidateWindow; candidates: NameCandidate[] } {
  const start = (page - 1) * limit, all = stream.candidates;
  const candidates = all.slice(start, start + limit);
  const moreInStream = start + candidates.length < all.length;
  // Beyond the scanned stream there may be more only when the scan bound was reached -- and then the
  // honest statement is "refine", never a fabricated next page and never "this was the last window".
  const hasMore = moreInStream;
  return {
    candidates,
    window: {
      page, limit, returned: candidates.length, hasMore,
      outOfRange: all.length > 0 && start >= all.length,
      nextPage: hasMore ? page + 1 : null,
      matchedCount: stream.completeness === 'COMPLETE' ? all.length : null,
      completeness: stream.completeness,
    },
  };
}

/** A selected identity is honoured only if it is a CURRENT candidate of the same request; ambiguity fails closed. */
export function revalidateSelection(stream: NameCandidateStream, selectedEntityId: string): NameCandidate | null {
  const hits = stream.candidates.filter((c) => c.entityId === selectedEntityId);
  return hits.length === 1 ? hits[0]! : null;
}
