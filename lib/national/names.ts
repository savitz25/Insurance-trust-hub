/**
 * Conservative legal-name compatibility for CONFIRMED NPN joins.
 * Name is NEVER an identity key. Used only to detect radical conflicts
 * on an already-matching NPN + entity kind.
 */

const STOP = new Set([
  'LLC',
  'INC',
  'CORP',
  'CO',
  'LTD',
  'THE',
  'INSURANCE',
  'AGENCY',
  'GROUP',
  'ASSOCIATES',
  'AND',
  'DBA',
  'OF',
  'COMPANY',
  'SERVICES',
  'SERVICE',
]);

export function normalizeLegalName(raw: string | null | undefined): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function significantNameTokens(raw: string | null | undefined): string[] {
  const n = normalizeLegalName(raw);
  if (!n) return [];
  return n.split(' ').filter((t) => t.length >= 3 && !STOP.has(t));
}

export type NameCompatibility = 'match' | 'compatible' | 'conflict' | 'insufficient';

/**
 * CONFIRMED attach requires match or compatible.
 * conflict → REVIEW_REQUIRED (do not attach).
 */
export function compareLegalNames(
  a: string | null | undefined,
  b: string | null | undefined
): NameCompatibility {
  const na = normalizeLegalName(a);
  const nb = normalizeLegalName(b);
  if (!na || !nb) return 'insufficient';
  if (na === nb) return 'match';
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = na.length < nb.length ? na : nb;
    if (shorter.length >= 8) return 'compatible';
  }

  const ta = new Set(significantNameTokens(a));
  const tb = new Set(significantNameTokens(b));
  if (ta.size === 0 || tb.size === 0) return 'insufficient';

  const inter: string[] = [];
  for (const t of ta) if (tb.has(t)) inter.push(t);
  if (inter.length === 0) return 'conflict';

  const union = new Set([...ta, ...tb]);
  const jaccard = inter.length / union.size;
  if (jaccard >= 0.5) return 'compatible';
  if (inter.some((t) => t.length >= 5)) return 'compatible';
  return 'conflict';
}
