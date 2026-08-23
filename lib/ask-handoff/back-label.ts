/**
 * Human “← Back to …” labels for Ask handoff context.
 */

import { normalizeState } from '@/lib/network/journey-context';
import type { InsuranceAskSearchContext } from '@/lib/ask-handoff/types';

function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function entityPhrase(ctx: InsuranceAskSearchContext): string {
  if (ctx.entityType === 'insurance_carrier') return 'insurance carriers';
  if (ctx.entityType === 'medicare_agent') return 'Medicare agents';
  if (ctx.entityType === 'insurance_agent') return 'insurance agents';
  // Agency-like consumer language
  return 'insurance agencies';
}

function categoryPhrase(ctx: InsuranceAskSearchContext): string | null {
  if (!ctx.category || ctx.category === 'medicare') return null;
  if (ctx.category === 'homeowners') return 'homeowners';
  if (ctx.category === 'auto') return 'auto';
  if (ctx.category === 'health') return 'health';
  if (ctx.category === 'flood') return 'flood';
  if (ctx.category === 'life') return 'life';
  if (ctx.category === 'renters') return 'renters';
  if (ctx.category === 'umbrella') return 'umbrella';
  return ctx.category;
}

function placePhrase(ctx: InsuranceAskSearchContext): string | null {
  const st = ctx.state ? normalizeState(ctx.state) : null;
  const stateName = st?.stateName || ctx.state || null;
  const city = ctx.city ? titleCaseSlug(ctx.city) : null;
  if (city && stateName) return `${city}, ${stateName}`;
  if (city) return city;
  if (ctx.zip && stateName) return `${ctx.zip}, ${stateName}`;
  if (ctx.zip) return ctx.zip;
  if (stateName) return stateName;
  return null;
}

/** e.g. "← Back to auto insurance agencies in Texas" */
export function buildAskBackLabel(ctx: InsuranceAskSearchContext): string {
  const entity = entityPhrase(ctx);
  const cat = categoryPhrase(ctx);
  const place = placePhrase(ctx);
  const head = cat ? `${cat} ${entity}` : entity;
  if (place) return `← Back to ${head} in ${place}`;
  return `← Back to ${head}`;
}

/** Short mobile label without arrow */
export function buildAskBackShortLabel(ctx: InsuranceAskSearchContext): string {
  return buildAskBackLabel(ctx).replace(/^←\s*Back to\s+/i, '');
}
