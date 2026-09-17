/**
 * SQA-009 / ATH-SEARCH-P0-009 — consumer product intent is not an official LOA.
 *
 * Homeowners / auto / flood / renters / umbrella / Medicare are requested products.
 * They must survive interpretation, execution, and rendering. They must not be
 * silently dropped so a statewide agency census looks product-qualified.
 *
 * Official executable LOA / credential-class terms remain Property, Casualty,
 * Life, Health, Personal Lines, and Variable Life / Annuity. Do not invent a
 * Florida homeowners LOA or map homeowners onto Property / Personal Lines.
 */
import type { InsuranceResearchQuery, ParsedInsuranceAsk } from './contract';

const CONSUMER_PRODUCT_PATTERNS: Array<{ product: string; re: RegExp }> = [
  { product: 'homeowners', re: /\bhomeowners?\b|\bhome insurance\b/i },
  { product: 'auto', re: /\bauto(?:mobile)?\b|\bcar insurance\b|\bvehicle insurance\b/i },
  { product: 'flood', re: /\bflood insurance\b|\bnfip\b/i },
  { product: 'renters', re: /\brenters? insurance\b/i },
  { product: 'umbrella', re: /\bumbrella insurance\b|\bumbrella (?:agenc|polic)/i },
  { product: 'medicare', re: /\bmedicare\b/i },
];

export function detectRequestedConsumerProducts(raw: string): string[] {
  const out: string[] = [];
  for (const { product, re } of CONSUMER_PRODUCT_PATTERNS) {
    if (re.test(raw) && !out.includes(product)) out.push(product);
  }
  return out;
}

export function unresolvedProductReason(products: string[], state?: string): string {
  const productList = products.join(' / ');
  const jurisdiction =
    state === 'FL'
      ? 'Florida DFS agency credentials are typically license class “AGENCY LICENSE.” Official Florida LOA observation rows for agencies = 0, and there is no dedicated homeowners or auto agency LOA in this extract.'
      : state
        ? `There is no dedicated ${productList} line of authority in the current ${state} extract that can qualify an agency cohort.`
        : `There is no dedicated ${productList} line of authority in this extract that can qualify an agency cohort.`;
  return (
    `${productList} is a consumer product request, not an official agency line of authority. ${jurisdiction} ` +
    `Ask will not invent a ${productList} LOA, map it onto Property / Casualty / Personal Lines, or present the statewide agency census as a ${productList}-qualified result. ` +
    'Missing product evidence is not a zero, and the unfiltered credential census is not product satisfaction.'
  );
}

export function applyUnresolvedProduct(query: InsuranceResearchQuery, products: string[]): void {
  const state = query.jurisdiction?.state;
  query.mode = 'fail_closed';
  query.intent = 'FAIL_CLOSED';
  query.coverageState = 'UNSUPPORTED';
  query.requestedProduct = products;
  query.failReason = unresolvedProductReason(products, state);
  query.alternatives = [
    state && state !== 'FL'
      ? `Show insurance agencies credentialed in ${state}.`
      : 'Show insurance agencies credentialed in Florida.',
    'What is a line of authority?',
  ];
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

export function productInterpretationLines(products: string[]): ParsedInsuranceAsk['interpretation'] {
  return [
    { label: 'Requested product', value: products.join(', ') },
    { label: 'Product status', value: 'UNSUPPORTED — not an official agency LOA in this extract' },
    { label: 'Mode', value: 'fail_closed' },
  ];
}

/** Cohort execution that would otherwise advertise a statewide census as product-qualified. */
export function unresolvedProductsBlockingCensus(raw: string, query: InsuranceResearchQuery): string[] {
  if (query.mode === 'directory' || query.mode === 'identifier' || query.mode === 'evidence' || query.mode === 'definition') {
    return [];
  }
  if (query.identifier || query.nameQuery) return [];
  if (query.entityClass === 'insurer') return [];
  const products = detectRequestedConsumerProducts(raw);
  if (!products.length) return [];
  if (query.mode === 'entity' || query.mode === 'count' || query.mode === 'aggregate' || query.mode === 'comparison') {
    return products;
  }
  return [];
}

export function rememberProductOnInterpretation(parsed: ParsedInsuranceAsk, products: string[]): void {
  const labels = new Set(parsed.interpretation.map((row) => row.label));
  for (const row of productInterpretationLines(products)) {
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
