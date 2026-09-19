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
 *
 * TH-DISCOVERY-PARITY-001B: SQA-009's original fix (applyUnresolvedProduct) forced the ENTIRE
 * request to `mode: 'fail_closed'` the moment an unresolved consumer product word appeared,
 * regardless of whether a real, unambiguous provider-category + geography request could otherwise
 * be answered. That over-corrected: "flood insurance provider Miami" and "cheap car insurance"
 * dead-ended with zero providers even though real agency inventory was one query away. The
 * regulatory point SQA-009 was protecting -- never claim a product word is a satisfied line of
 * authority -- does not require hiding the result set. This file now only ANNOTATES the request
 * (retains the requested product, marks it UNSUPPORTED as an LOA, and supplies disclosure copy);
 * it no longer sets mode/coverageState/failReason, so interpret.ts's normal entity/count builder
 * keeps running and execute.ts returns real rows with an honest "not established" disclosure
 * instead of an empty screen.
 *
 * Detection is bounded: bare tokens such as "authority", "casualty", "life", and
 * "auto" are not consumer-product requests by themselves. Auto matches only as
 * auto/car/vehicle + insurance.
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

/** Bare word forms of the same consumer-product concepts, for stripping (not labeling) purposes. */
const CONSUMER_PRODUCT_WORD_STRIP =
  /\b(?:homeowners?|home|auto(?:mobile)?|car|vehicle|flood|nfip|renters?|umbrella|medicare)\b/gi;

export function detectRequestedConsumerProducts(raw: string): string[] {
  const out: string[] = [];
  for (const { product, re } of CONSUMER_PRODUCT_PATTERNS) {
    if (re.test(raw) && !out.includes(product) && !EXECUTABLE_LOA_LABELS.has(product)) out.push(product);
  }
  return out;
}

/** Strips bare consumer-product words from text; used to isolate non-geography, non-category residue. */
export function stripConsumerProductWords(raw: string): string {
  return raw.replace(CONSUMER_PRODUCT_WORD_STRIP, ' ');
}

export function hasOfficialExecutableLoa(loas: string[] | undefined): boolean {
  return Boolean(loas?.some((loa) => EXECUTABLE_LOA_LABELS.has(loa.trim().toLowerCase())));
}

function productNotEstablishedReason(products: string[], state?: string): string {
  const productList = products.join(' / ');
  const jurisdiction =
    state === 'FL'
      ? 'Florida DFS agency credentials are typically license class “AGENCY LICENSE.” Official Florida LOA observation rows for agencies = 0, and there is no dedicated homeowners or auto agency LOA in this extract.'
      : state
        ? `There is no dedicated ${productList} line of authority in the current ${state} extract that can qualify an agency cohort.`
        : `There is no dedicated ${productList} line of authority in this extract that can qualify an agency cohort.`;
  return (
    `${productList} is a consumer product request, not an official agency line of authority. ${jurisdiction} ` +
    `These results are not asserted to be ${productList}-specific; Ask will not invent a ${productList} LOA or map it onto Property / Casualty / Personal Lines. ` +
    'Missing product evidence is not a zero, and showing the broader real inventory is not product satisfaction.'
  );
}

/**
 * Retains the requested product on the query for disclosure and marks it UNSUPPORTED as an LOA.
 * Does NOT change `mode`, `coverageState`, or `failReason` -- the caller keeps executing as a
 * normal entity/count request and the disclosure surfaces as a limitation on the real result.
 */
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

/** @deprecated kept as an alias of annotateUnestablishedProduct; no longer forces fail_closed. */
export function applyUnresolvedProduct(query: InsuranceResearchQuery, products: string[]): void {
  annotateUnestablishedProduct(query, products);
}

export function productInterpretationLines(products: string[], state?: string): ParsedInsuranceAsk['interpretation'] {
  return [
    { label: 'Requested product', value: products.join(', ') },
    {
      label: 'Product status',
      value: `Not an official agency/insurer line of authority in this extract — product specialization not established. ${productNotEstablishedReason(products, state)}`,
    },
  ];
}

/** Cohort execution that would otherwise advertise a statewide census as product-qualified. */
export function unresolvedProductsBlockingCensus(raw: string, query: InsuranceResearchQuery): string[] {
  if (query.mode === 'directory' || query.mode === 'identifier' || query.mode === 'evidence' || query.mode === 'definition') {
    return [];
  }
  if (query.identifier || query.nameQuery) return [];
  if (query.entityClass === 'insurer') return [];
  if (hasOfficialExecutableLoa(query.linesOfAuthority)) return [];
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
  for (const row of productInterpretationLines(products, state)) {
    if (!labels.has(row.label)) parsed.interpretation.push(row);
  }
}
