/**
 * Bounded typed parser for Ask → InsuranceTrustHub handoff params.
 * No raw query, no PII, no arbitrary JSON, no open redirects.
 */

import { normalizeState } from '@/lib/network/journey-context';
import {
  ASK_HANDOFF_FORBIDDEN_KEYS,
  INSURANCE_ASK_CATEGORIES,
  INSURANCE_ASK_ENTITIES,
  type AskHandoffDestination,
  type InsuranceAskCategory,
  type InsuranceAskEntity,
  type InsuranceAskSearchContext,
} from '@/lib/ask-handoff/types';
import { buildAskDirectoryHref, buildAskCarriersHref } from '@/lib/ask-handoff/directory-href';
import { buildAskBackLabel } from '@/lib/ask-handoff/back-label';

const FORBIDDEN = new Set<string>(ASK_HANDOFF_FORBIDDEN_KEYS);
const ENTITY_SET = new Set<string>(INSURANCE_ASK_ENTITIES);
const CATEGORY_SET = new Set<string>(INSURANCE_ASK_CATEGORIES);

function firstParam(v: string | string[] | undefined | null): string | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  return t || undefined;
}

/** Strip control chars / angle brackets — never reflect raw HTML. */
function sanitizeToken(raw: string, max = 64): string | undefined {
  const cleaned = raw
    .replace(/[<>`"\\]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
  return cleaned || undefined;
}

function normalizeZip(raw?: string): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 5) return undefined;
  return digits;
}

function normalizeCity(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = sanitizeToken(raw, 64);
  if (!cleaned) return undefined;
  // Reject path traversal / protocol smuggling
  if (/:\/\//.test(cleaned) || cleaned.includes('..') || cleaned.includes('/')) {
    return undefined;
  }
  return cleaned.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || undefined;
}

function normalizeCounty(raw?: string): string | undefined {
  return normalizeCity(raw);
}

/**
 * Parse inbound searchParams into allowlisted Ask context.
 * Requires src=ask. Forbidden keys are ignored.
 */
export function parseInsuranceAskSearchContext(
  input:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null
    | undefined
): InsuranceAskSearchContext | null {
  if (!input) return null;

  const get = (key: string): string | undefined => {
    if (input instanceof URLSearchParams) return firstParam(input.get(key));
    return firstParam(input[key]);
  };

  // Always ignore forbidden keys even if present
  for (const bad of FORBIDDEN) {
    void get(bad);
  }

  const src = get('src')?.toLowerCase();
  if (src !== 'ask') return null;

  const entityRaw = sanitizeToken(get('entity')?.toLowerCase() ?? '', 48);
  const categoryRaw = sanitizeToken(get('category')?.toLowerCase() ?? '', 32);
  const stateRaw = sanitizeToken(get('state') ?? '', 32);
  const st = stateRaw ? normalizeState(stateRaw) : null;
  // Invalid explicit state → drop (fail closed), do not invent
  const state =
    stateRaw && !st
      ? undefined
      : st?.stateCode;

  const entity =
    entityRaw && ENTITY_SET.has(entityRaw)
      ? (entityRaw as InsuranceAskEntity)
      : undefined;
  const category =
    categoryRaw && CATEGORY_SET.has(categoryRaw)
      ? (categoryRaw as InsuranceAskCategory)
      : undefined;

  const ctx: InsuranceAskSearchContext = {
    source: 'ask',
    entityType: entity,
    category,
    state,
    county: normalizeCounty(get('county')),
    city: normalizeCity(get('city')),
    zip: normalizeZip(get('zip')),
    intent: sanitizeToken(get('intent')?.toLowerCase() ?? '', 32),
    journey: sanitizeToken(get('journey')?.toLowerCase() ?? '', 32),
    sid: sanitizeToken(get('sid') ?? '', 64),
  };

  // Medicare entity or medicare category without supported agent model
  if (entity === 'medicare_agent' || category === 'medicare') {
    ctx.unsupported = 'medicare_agent';
  } else if (entityRaw && !entity) {
    // Unknown entity string (e.g. script, insurance_company) — do not default
    ctx.unsupported = 'ambiguous_entity';
  } else if (stateRaw && !state && !ctx.zip && !ctx.city) {
    ctx.unsupported = 'invalid';
  }

  return ctx;
}

export function isAgencyLikeAskEntity(entity?: InsuranceAskEntity): boolean {
  return (
    entity === 'insurance_brokerage' ||
    entity === 'insurance_agency' ||
    entity === 'insurance_agent'
  );
}

/**
 * Resolve Ask context → Insurance destination (directory / carriers / unsupported).
 * Does not call Ask at runtime. Does not invent entity defaults.
 */
export function resolveAskHandoffDestination(
  ctx: InsuranceAskSearchContext
): AskHandoffDestination {
  const backLabel = buildAskBackLabel(ctx);

  if (ctx.unsupported === 'medicare_agent') {
    return {
      kind: 'unsupported',
      href: '/from-ask/unsupported?reason=medicare_agent',
      context: ctx,
      reason: 'medicare_agent',
      backLabel,
    };
  }

  if (ctx.unsupported === 'ambiguous_entity' || ctx.unsupported === 'invalid') {
    return {
      kind: 'unsupported',
      href: `/from-ask/unsupported?reason=${ctx.unsupported}`,
      context: ctx,
      reason: ctx.unsupported === 'invalid' ? 'invalid_context' : 'ambiguous_entity',
      backLabel,
    };
  }

  if (ctx.entityType === 'insurance_carrier') {
    return {
      kind: 'carriers',
      href: buildAskCarriersHref(ctx),
      context: ctx,
      backLabel,
    };
  }

  // Agency-like or unspecified entity with category/geo → directory
  // Unspecified entity without ambiguous flag is allowed for View More with category+geo
  if (
    !ctx.entityType ||
    isAgencyLikeAskEntity(ctx.entityType)
  ) {
    return {
      kind: 'directory',
      href: buildAskDirectoryHref(ctx),
      context: ctx,
      backLabel,
    };
  }

  return {
    kind: 'unsupported',
    href: '/from-ask/unsupported?reason=ambiguous_entity',
    context: ctx,
    reason: 'ambiguous_entity',
    backLabel,
  };
}

/** Serialize allowlisted Ask context for directory/profile URLs (no forbidden keys). */
export function serializeAskSearchContext(ctx: InsuranceAskSearchContext): string {
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

export function withAskContext(path: string, ctx: InsuranceAskSearchContext): string {
  const q = serializeAskSearchContext(ctx);
  if (!q) return path;
  const base = path.split('?')[0] || path;
  // Never attach to external URLs
  if (!base.startsWith('/')) return path;
  return `${base}?${q}`;
}
