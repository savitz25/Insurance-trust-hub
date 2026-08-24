/**
 * Map Ask search context → existing /directory and /carriers URLs.
 * Reuses directory filter keys: state, zip, type (category), city.
 */

import type { InsuranceAskSearchContext } from '@/lib/ask-handoff/types';

function serializeAskParams(ctx: InsuranceAskSearchContext): string {
  const p = new URLSearchParams();
  p.set('src', 'ask');
  if (ctx.journey) p.set('journey', ctx.journey);
  if (ctx.state) p.set('state', ctx.state);
  if (ctx.county) p.set('county', ctx.county);
  if (ctx.intent) p.set('intent', ctx.intent);
  if (ctx.entityType) p.set('entity', ctx.entityType);
  if (ctx.category) p.set('category', ctx.category);
  if (ctx.city) p.set('city', ctx.city);
  if (ctx.zip) p.set('zip', ctx.zip);
  if (ctx.sid) p.set('sid', ctx.sid);
  return p.toString();
}

/**
 * Build preloaded directory href from Ask context.
 * Uses existing /directory filters — does not invent a second search engine.
 *
 * Notes:
 * - `type` = product category (homeowners, auto, …)
 * - `city` is passed through for physical-city post-filter (exact locality)
 * - `state` uses USPS code (directory license/service filter)
 * - Never sets `q` / free-text query
 */
export function buildAskDirectoryHref(ctx: InsuranceAskSearchContext): string {
  const p = new URLSearchParams();
  p.set('verified', 'true');
  p.set('src', 'ask');
  if (ctx.state) p.set('state', ctx.state);
  if (ctx.zip) p.set('zip', ctx.zip);
  if (ctx.city) p.set('city', ctx.city);
  if (ctx.county) p.set('county', ctx.county);
  // Product category — never infer medicare from health
  if (ctx.category && ctx.category !== 'medicare') {
    p.set('type', ctx.category);
    // Preserve the structured handoff key so profile links and Back to Results
    // retain the original category alongside the directory's internal filter.
    p.set('category', ctx.category);
  }
  if (ctx.entityType) p.set('entity', ctx.entityType);
  if (ctx.journey) p.set('journey', ctx.journey);
  if (ctx.intent) p.set('intent', ctx.intent);
  if (ctx.sid) p.set('sid', ctx.sid);
  return `/directory?${p.toString()}`;
}

/**
 * Carriers hub — registry has no safe state geography.
 * Preserve Ask context for analytics / empty-state honesty.
 */
export function buildAskCarriersHref(ctx: InsuranceAskSearchContext): string {
  const p = new URLSearchParams();
  p.set('src', 'ask');
  p.set('entity', 'insurance_carrier');
  if (ctx.state) p.set('state', ctx.state);
  if (ctx.category) p.set('category', ctx.category);
  if (ctx.journey) p.set('journey', ctx.journey);
  if (ctx.sid) p.set('sid', ctx.sid);
  return `/carriers?${p.toString()}`;
}

/** Attach Ask context onto a provider/carrier profile path (canonical path stays clean without params). */
export function providerHrefWithAskContext(
  slug: string,
  ctx: InsuranceAskSearchContext
): string {
  const q = serializeAskParams(ctx);
  return q ? `/providers/${encodeURIComponent(slug)}?${q}` : `/providers/${encodeURIComponent(slug)}`;
}

export function carrierHrefWithAskContext(
  slug: string,
  ctx: InsuranceAskSearchContext
): string {
  const q = serializeAskParams(ctx);
  return q ? `/carriers/${encodeURIComponent(slug)}?${q}` : `/carriers/${encodeURIComponent(slug)}`;
}
