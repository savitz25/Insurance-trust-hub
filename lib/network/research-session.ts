/**
 * Stage B.1 — Research session continuity (non-PII, first-party, origin-local).
 *
 * Cross-domain continuity still depends on Stage A′ URL params.
 * This store is for in-hub return visits and gap-fill when params are absent.
 */

import {
  hasJourneyContext,
  normalizeState,
  type JourneyContext,
  type JourneyHousing,
  type JourneyIntent,
  type JourneyKind,
  type JourneySrc,
} from '@/lib/network/journey-context';

export const RESEARCH_SESSION_KEY = 'ath:research-session:v1';
export const RESEARCH_SESSION_VERSION = 1 as const;

/** Max age before session is ignored (90 days) */
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export type ResearchSession = {
  version: typeof RESEARCH_SESSION_VERSION;
  src?: JourneySrc;
  journey?: JourneyKind;
  /** Prefer 2-letter; receivers also accept slug */
  state?: string;
  county?: string;
  intent?: JourneyIntent;
  housing?: JourneyHousing;
  updatedAt: string;
};

const SRC_SET = new Set<JourneySrc>(['move', 'lender', 'insurance', 'ask']);
const JOURNEY_SET = new Set<JourneyKind>([
  'relocate',
  'purchase',
  'refi',
  'coverage',
  'unknown',
]);
const INTENT_SET = new Set<JourneyIntent>(['buy', 'rent', 'refi', 'unknown']);
const HOUSING_SET = new Set<JourneyHousing>(['owner', 'renter', 'unknown']);

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function sanitizeSession(raw: unknown): ResearchSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== RESEARCH_SESSION_VERSION) return null;
  if (typeof o.updatedAt !== 'string') return null;
  const updated = Date.parse(o.updatedAt);
  if (!Number.isFinite(updated) || Date.now() - updated > MAX_AGE_MS) return null;

  const src =
    typeof o.src === 'string' && SRC_SET.has(o.src as JourneySrc)
      ? (o.src as JourneySrc)
      : undefined;
  const journey =
    typeof o.journey === 'string' && JOURNEY_SET.has(o.journey as JourneyKind)
      ? (o.journey as JourneyKind)
      : undefined;
  const intent =
    typeof o.intent === 'string' && INTENT_SET.has(o.intent as JourneyIntent)
      ? (o.intent as JourneyIntent)
      : undefined;
  const housing =
    typeof o.housing === 'string' && HOUSING_SET.has(o.housing as JourneyHousing)
      ? (o.housing as JourneyHousing)
      : undefined;

  let state: string | undefined;
  if (typeof o.state === 'string' && o.state.trim()) {
    const st = normalizeState(o.state.trim());
    state = st?.stateCode ?? o.state.trim().slice(0, 32);
  }

  let county: string | undefined;
  if (typeof o.county === 'string' && o.county.trim()) {
    county = o.county
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    if (!county) county = undefined;
  }

  const session: ResearchSession = {
    version: RESEARCH_SESSION_VERSION,
    updatedAt: o.updatedAt,
    src,
    journey,
    state,
    county,
    intent,
    housing,
  };

  if (!session.state && !session.county && !session.intent && !session.journey && !session.src) {
    return null;
  }
  return session;
}

/** Load session or null (SSR-safe). */
export function loadResearchSession(): ResearchSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(RESEARCH_SESSION_KEY);
    if (!raw) return null;
    return sanitizeSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Convert session → JourneyContext (normalized state fields). */
export function sessionToJourneyContext(session: ResearchSession | null): JourneyContext {
  if (!session) return {};
  const st = session.state ? normalizeState(session.state) : null;
  return {
    src: session.src,
    journey: session.journey,
    stateSlug: st?.stateSlug,
    stateCode: st?.stateCode,
    stateName: st?.stateName,
    county: session.county,
    intent: session.intent,
    housing: session.housing,
  };
}

/** Convert JourneyContext → session partial (for save). */
export function journeyContextToSessionPatch(ctx: JourneyContext): Partial<ResearchSession> {
  const st =
    ctx.stateCode || ctx.stateSlug || ctx.stateName
      ? normalizeState(ctx.stateCode || ctx.stateSlug || ctx.stateName)
      : null;
  return {
    src: ctx.src,
    journey: ctx.journey,
    state: st?.stateCode ?? ctx.stateCode ?? ctx.stateSlug,
    county: ctx.county,
    intent: ctx.intent,
    housing: ctx.housing,
  };
}

/**
 * Merge: primary (usually URL) wins field-by-field over fallback (session).
 */
export function mergeJourneyContext(
  primary: JourneyContext,
  fallback: JourneyContext
): JourneyContext {
  const st =
    primary.stateSlug || primary.stateCode || primary.stateName
      ? {
          stateSlug: primary.stateSlug,
          stateCode: primary.stateCode,
          stateName: primary.stateName,
        }
      : {
          stateSlug: fallback.stateSlug,
          stateCode: fallback.stateCode,
          stateName: fallback.stateName,
        };

  // If primary only has partial state, fill from fallback
  const mergedState = {
    stateSlug: primary.stateSlug ?? fallback.stateSlug ?? st.stateSlug,
    stateCode: primary.stateCode ?? fallback.stateCode ?? st.stateCode,
    stateName: primary.stateName ?? fallback.stateName ?? st.stateName,
  };

  return {
    src: primary.src ?? fallback.src,
    journey: primary.journey ?? fallback.journey,
    ...mergedState,
    county: primary.county ?? fallback.county,
    intent: primary.intent ?? fallback.intent,
    housing: primary.housing ?? fallback.housing,
  };
}

/**
 * Save / patch session. Newer valid fields overwrite; invalid ignored.
 * Fail soft if storage blocked.
 */
export function saveResearchSession(
  patch: Partial<ResearchSession> | JourneyContext,
  opts?: { preferSrc?: JourneySrc }
): ResearchSession | null {
  if (!isBrowser()) return null;
  try {
    const existing = loadResearchSession();
    const asCtx =
      'stateSlug' in patch || 'stateCode' in patch || 'stateName' in patch
        ? journeyContextToSessionPatch(patch as JourneyContext)
        : (patch as Partial<ResearchSession>);

    const next: ResearchSession = {
      version: RESEARCH_SESSION_VERSION,
      updatedAt: new Date().toISOString(),
      src: asCtx.src ?? existing?.src ?? opts?.preferSrc,
      journey: asCtx.journey ?? existing?.journey,
      state: asCtx.state ?? existing?.state,
      county: asCtx.county ?? existing?.county,
      intent: asCtx.intent ?? existing?.intent,
      housing: asCtx.housing ?? existing?.housing,
    };

    // Re-sanitize state/county
    const cleaned = sanitizeSession(next);
    if (!cleaned) {
      // still write if we have something usable after manual filter
      if (!next.state && !next.county && !next.intent && !next.journey) return existing;
    }
    const toStore = cleaned ?? next;
    localStorage.setItem(RESEARCH_SESSION_KEY, JSON.stringify(toStore));
    return toStore;
  } catch {
    return null;
  }
}

/** URL params first, then session gap-fill. Optionally persist URL-enriched session. */
export function resolveJourneyWithSession(
  urlContext: JourneyContext,
  opts?: { persist?: boolean; preferSrc?: JourneySrc }
): JourneyContext {
  const fromSession = sessionToJourneyContext(loadResearchSession());
  const merged = mergeJourneyContext(urlContext, fromSession);
  if (opts?.persist !== false && hasJourneyContext(urlContext)) {
    saveResearchSession(merged, { preferSrc: opts?.preferSrc });
  } else if (opts?.persist && hasJourneyContext(merged) && !hasJourneyContext(urlContext)) {
    // don't overwrite session when only reading session
  }
  return merged;
}

export function clearResearchSession(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(RESEARCH_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
