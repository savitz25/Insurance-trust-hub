/**
 * SQA-009 / ATH-SEARCH-P0-009 — consumer product intent is not an official LOA.
 *
 * Homeowners / auto / flood / renters / umbrella / Medicare are requested products.
 * They must survive interpretation, execution, and rendering, but a statewide Florida
 * product-qualified provider census must fail closed. Official LOA, local discovery, and
 * unspecified-product census queries remain executable. Never invent a product LOA or map it onto Property,
 * Casualty, or Personal Lines.
 *
 * Detection is bounded: bare tokens such as "authority", "casualty", "life", and
 * "auto" are not consumer-product requests by themselves.
 */
import type { InsuranceResearchQuery, ParsedInsuranceAsk } from './contract';

const EXECUTABLE_LOA_LABELS = new Set([
  'property',
  'casualty',
  'life',
  'health',
  'personal lines',
  'variable life / annuity',
]);

const CONSUMER_PRODUCT_PATTERNS: Array<{ product: string; re: RegExp }> = [
  { product: 'homeowners', re: /\bhomeowners?\b|\bhome insurance\b/i },
  { product: 'auto', re: /\b(?:auto(?:mobile)?|car|vehicle)\s+insurance\b/i },
  { product: 'flood', re: /\bflood insurance\b|\bnfip\b/i },
  { product: 'renters', re: /\brenters? insurance\b/i },
  { product: 'umbrella', re: /\bumbrella insurance\b|\bumbrella (?:agenc|polic)/i },
  { product: 'medicare', re: /\bmedicare\b/i },
];

/** Bare word forms of the same concepts, for residue analysis rather than labeling. */
const CONSUMER_PRODUCT_WORD_STRIP =
  /\b(?:homeowners?|home|auto(?:mobile)?|car|vehicle|flood|nfip|renters?|umbrella|medicare)\b/gi;

export function detectRequestedConsumerProducts(raw: string): string[] {
  const out: string[] = [];
  for (const { product, re } of CONSUMER_PRODUCT_PATTERNS) {
    if (re.test(raw) && !out.includes(product) && !EXECUTABLE_LOA_LABELS.has(product)) out.push(product);
  }
  return out;
}

export function stripConsumerProductWords(raw: string): string {
  return raw.replace(CONSUMER_PRODUCT_WORD_STRIP, ' ');
}

export function hasOfficialExecutableLoa(loas: string[] | undefined): boolean {
  return Boolean(loas?.some((loa) => EXECUTABLE_LOA_LABELS.has(loa.trim().toLowerCase())));
}

export function unresolvedProductReason(products: string[], state?: string): string {
  const productList = products.join(' / ');
  const jurisdiction =
    state === 'FL'
      ? 'Florida DFS agency credentials are typically license class “AGENCY LICENSE.” Official Florida LOA observation rows for agencies = 0, and there is no dedicated homeowners or auto agency LOA in this extract.'
      : state
        ? `There is no dedicated ${productList} line of authority in the current ${state} extract that can qualify an agency cohort.`
        : `There is no dedicated ${productList} line of authority in this extract that can qualify an agency cohort.`;
  const census = state === 'FL' ? 'statewide Florida agency census' : 'broader agency census';
  return (
    `${productList} is a consumer product request, not an official agency line of authority. ${jurisdiction} ` +
    `Ask will not invent a ${productList} LOA, map it onto Property / Casualty / Personal Lines, or present the ${census} as a ${productList}-qualified result. ` +
    'Missing product evidence is not a zero, and the unfiltered credential census is not product satisfaction.'
  );
}

/** Retain product intent on a query that is independently executable (for example, an official LOA query). */
export function annotateUnestablishedProduct(query: InsuranceResearchQuery, products: string[]): void {
  query.requestedProduct = products;
  const existing = query.conditions ?? [];
  const already = new Set(
    existing.filter((c) => c.meaning === 'requested insurance product').map((c) => c.value.toLowerCase()),
  );
  query.conditions = [
    ...existing,
    ...products
      .filter((value) => !already.has(value.toLowerCase()))
      .map((value) => ({ value, meaning: 'requested insurance product' as const, outcome: 'UNSUPPORTED' as const })),
  ];
}

/** Fail closed before a general provider census can be presented as product-specific. */
export function applyUnresolvedProduct(query: InsuranceResearchQuery, products: string[]): void {
  annotateUnestablishedProduct(query, products);
  const state = query.jurisdiction?.state;
  query.mode = 'fail_closed';
  query.intent = 'FAIL_CLOSED';
  query.coverageState = 'UNSUPPORTED';
  query.failReason = unresolvedProductReason(products, state);
  query.alternatives = [
    state && state !== 'FL'
      ? `Show insurance agencies credentialed in ${state}.`
      : 'Show insurance agencies credentialed in Florida.',
    'What is a line of authority?',
  ];
}

export function productInterpretationLines(
  products: string[],
  state?: string,
  failClosed = false,
): ParsedInsuranceAsk['interpretation'] {
  const rows: ParsedInsuranceAsk['interpretation'] = [
    { label: 'Requested product', value: products.join(', ') },
    {
      label: 'Product status',
      value: `UNSUPPORTED — not an official agency/insurer line of authority in this extract. ${unresolvedProductReason(products, state)}`,
    },
  ];
  if (failClosed) rows.push({ label: 'Mode', value: 'fail_closed' });
  return rows;
}

/** Block only the FL statewide product-qualified cohort, not local discovery or official-LOA work. */
export function unresolvedProductsBlockingCensus(raw: string, query: InsuranceResearchQuery): string[] {
  if (
    query.mode === 'directory' ||
    query.mode === 'identifier' ||
    query.mode === 'evidence' ||
    query.mode === 'definition' ||
    query.mode === 'fail_closed'
  ) {
    return [];
  }
  if (query.identifier || query.nameQuery) return [];
  if (query.entityClass === 'insurer') return [];
  if (hasOfficialExecutableLoa(query.linesOfAuthority)) return [];
  if (query.jurisdiction?.state !== 'FL' || query.requestedCity) return [];
  const products = detectRequestedConsumerProducts(raw);
  if (!products.length) return [];
  if (query.mode === 'entity' || query.mode === 'count' || query.mode === 'aggregate' || query.mode === 'comparison') {
    return products;
  }
  return [];
}

export function rememberProductOnInterpretation(parsed: ParsedInsuranceAsk, products: string[]): void {
  const state = parsed.query.jurisdiction?.state;
  const labels = new Set(parsed.interpretation.map((row) => row.label));
  for (const row of productInterpretationLines(products, state, parsed.query.mode === 'fail_closed')) {
    if (row.label === 'Mode') {
      parsed.interpretation = parsed.interpretation.map((existing) =>
        existing.label === 'Mode' ? row : existing,
      );
      if (!parsed.interpretation.some((existing) => existing.label === 'Mode')) parsed.interpretation.push(row);
      continue;
    }
    if (!labels.has(row.label)) parsed.interpretation.push(row);
  }
}
