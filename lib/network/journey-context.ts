/**
 * Stage A′ — Contextual Journey Handoffs (Insurance copy of shared contract).
 * Keep in sync with lender-trust-hub/lib/network/journey-context.ts
 */

import { US_STATES } from '@/lib/constants';
import { DESTINATION_STATES } from '@/lib/destinations/data';

export type JourneySrc = 'move' | 'lender' | 'insurance' | 'ask';
export type JourneyKind = 'relocate' | 'purchase' | 'refi' | 'coverage' | 'unknown';
export type JourneyIntent = 'buy' | 'rent' | 'refi' | 'unknown';
export type JourneyHousing = 'owner' | 'renter' | 'unknown';

export type JourneyContext = {
  src?: JourneySrc;
  journey?: JourneyKind;
  stateSlug?: string;
  stateCode?: string;
  stateName?: string;
  county?: string;
  intent?: JourneyIntent;
  housing?: JourneyHousing;
};

export type JourneyStep = {
  hub: JourneySrc;
  href: string;
  title: string;
  body: string;
  cta: string;
  priority: 'primary' | 'secondary';
};

const HUB_ORIGIN = {
  move: 'https://www.movetrusthub.com',
  insurance: 'https://www.insurancetrusthub.com',
  lender: 'https://www.lendertrusthub.com',
  ask: 'https://www.asktrusthub.com',
} as const;

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

function firstParam(v: string | string[] | undefined | null): string | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  return t || undefined;
}

function slugifyStateName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function normalizeCountySlug(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return s || undefined;
}

export function normalizeState(raw?: string): {
  stateSlug: string;
  stateCode: string;
  stateName: string;
} | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;

  // Destination guides (preferred)
  if (t.length === 2) {
    const dest = DESTINATION_STATES.find((d) => d.code === t.toUpperCase());
    if (dest) {
      return { stateSlug: dest.slug, stateCode: dest.code, stateName: dest.name };
    }
    const st = US_STATES.find((s) => s.code === t.toUpperCase());
    if (st) {
      return {
        stateSlug: slugifyStateName(st.name),
        stateCode: st.code,
        stateName: st.name,
      };
    }
  }

  const slug = t.toLowerCase().replace(/\s+/g, '-');
  const byDestSlug = DESTINATION_STATES.find((d) => d.slug === slug);
  if (byDestSlug) {
    return {
      stateSlug: byDestSlug.slug,
      stateCode: byDestSlug.code,
      stateName: byDestSlug.name,
    };
  }
  const byName = US_STATES.find((s) => s.name.toLowerCase() === t.toLowerCase());
  if (byName) {
    return {
      stateSlug: slugifyStateName(byName.name),
      stateCode: byName.code,
      stateName: byName.name,
    };
  }
  return null;
}

export function parseJourneyContext(
  searchParams:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null
    | undefined
): JourneyContext {
  const get = (key: string): string | undefined => {
    if (!searchParams) return undefined;
    if (searchParams instanceof URLSearchParams) {
      return firstParam(searchParams.get(key));
    }
    return firstParam(searchParams[key]);
  };

  const srcRaw = get('src')?.toLowerCase() as JourneySrc | undefined;
  const journeyRaw = get('journey')?.toLowerCase() as JourneyKind | undefined;
  const intentRaw = get('intent')?.toLowerCase() as JourneyIntent | undefined;
  const housingRaw = get('housing')?.toLowerCase() as JourneyHousing | undefined;
  const stateRaw = get('state');
  const county = normalizeCountySlug(get('county'));
  const st = normalizeState(stateRaw);

  return {
    src: srcRaw && SRC_SET.has(srcRaw) ? srcRaw : undefined,
    journey: journeyRaw && JOURNEY_SET.has(journeyRaw) ? journeyRaw : undefined,
    intent: intentRaw && INTENT_SET.has(intentRaw) ? intentRaw : undefined,
    housing: housingRaw && HOUSING_SET.has(housingRaw) ? housingRaw : undefined,
    stateSlug: st?.stateSlug,
    stateCode: st?.stateCode,
    stateName: st?.stateName,
    county,
  };
}

export function buildJourneyQuery(ctx: JourneyContext): string {
  const p = new URLSearchParams();
  if (ctx.src) p.set('src', ctx.src);
  if (ctx.journey) p.set('journey', ctx.journey);
  if (ctx.stateCode) p.set('state', ctx.stateCode);
  else if (ctx.stateSlug) p.set('state', ctx.stateSlug);
  if (ctx.county) p.set('county', ctx.county);
  if (ctx.intent && ctx.intent !== 'unknown') p.set('intent', ctx.intent);
  if (ctx.housing && ctx.housing !== 'unknown') p.set('housing', ctx.housing);
  return p.toString();
}

export function withJourneyParams(path: string, ctx: JourneyContext): string {
  const q = buildJourneyQuery(ctx);
  if (!q) return path;
  return path.includes('?') ? `${path}&${q}` : `${path}?${q}`;
}

export function placeLabel(ctx: JourneyContext): string | null {
  if (ctx.county && ctx.stateName) {
    const countyName = ctx.county
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return `${countyName} County, ${ctx.stateName}`;
  }
  if (ctx.stateName) return ctx.stateName;
  if (ctx.stateCode) return ctx.stateCode;
  return null;
}

export function resolveLenderLandingPath(ctx: JourneyContext): string {
  if (ctx.stateSlug && ctx.county) {
    return withJourneyParams(`/local-lenders/${ctx.stateSlug}/${ctx.county}`, {
      ...ctx,
      src: ctx.src ?? 'insurance',
    });
  }
  if (ctx.stateSlug) {
    return withJourneyParams(`/local-lenders/${ctx.stateSlug}`, {
      ...ctx,
      src: ctx.src ?? 'insurance',
    });
  }
  return withJourneyParams('/local-lenders', { ...ctx, src: ctx.src ?? 'insurance' });
}

export function resolveInsuranceLandingPath(ctx: JourneyContext): string {
  if (ctx.stateSlug) {
    const hasDest = DESTINATION_STATES.some((d) => d.slug === ctx.stateSlug);
    if (hasDest) {
      return withJourneyParams(`/destinations/${ctx.stateSlug}`, {
        ...ctx,
        src: ctx.src ?? 'move',
      });
    }
    if (ctx.stateCode) {
      return withJourneyParams(`/directory?state=${ctx.stateCode}`, {
        ...ctx,
        src: ctx.src ?? 'move',
      });
    }
  }
  if (ctx.stateCode) {
    return withJourneyParams(`/directory?state=${ctx.stateCode}`, {
      ...ctx,
      src: ctx.src ?? 'move',
    });
  }
  return withJourneyParams('/destinations', { ...ctx, src: ctx.src ?? 'move' });
}

export function resolveMoveLandingPath(ctx: JourneyContext): string {
  return withJourneyParams('/', { ...ctx, src: ctx.src ?? 'insurance' });
}

export function absoluteHubUrl(
  hub: keyof typeof HUB_ORIGIN,
  pathWithQuery: string
): string {
  const path = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  return `${HUB_ORIGIN[hub]}${path}`;
}

export function buildLenderJourneyUrl(ctx: JourneyContext): string {
  return absoluteHubUrl('lender', resolveLenderLandingPath(ctx));
}

export function buildInsuranceJourneyUrl(ctx: JourneyContext): string {
  return absoluteHubUrl('insurance', resolveInsuranceLandingPath(ctx));
}

export function buildMoveJourneyUrl(ctx: JourneyContext): string {
  return absoluteHubUrl('move', resolveMoveLandingPath(ctx));
}

export function resolveSituationSteps(
  ctx: JourneyContext,
  currentHub: JourneySrc
): JourneyStep[] {
  const place = placeLabel(ctx) ?? 'your destination';
  const intent = ctx.intent ?? 'unknown';
  const journey = ctx.journey ?? 'unknown';
  const isRelocate = journey === 'relocate' || ctx.src === 'move';
  const isBuy =
    intent === 'buy' ||
    journey === 'purchase' ||
    ctx.housing === 'owner' ||
    intent === 'refi' ||
    journey === 'refi';
  const isRent = intent === 'rent' || ctx.housing === 'renter';
  const isRefi = intent === 'refi' || journey === 'refi';

  const steps: JourneyStep[] = [];

  const lenderStep = (priority: 'primary' | 'secondary'): JourneyStep => ({
    hub: 'lender',
    href: buildLenderJourneyUrl({
      ...ctx,
      src: currentHub === 'lender' ? ctx.src : currentHub,
    }),
    title: isRelocate
      ? `Buying after your move to ${place}?`
      : `Research mortgages in ${place}`,
    body: isRelocate
      ? `Research mortgage activity, local lenders, and Loan Estimate tools for ${place}.`
      : `Explore NMLS-oriented lenders and educational Loan Estimate tools for ${place}.`,
    cta: 'Research local lenders',
    priority,
  });

  const insuranceStep = (priority: 'primary' | 'secondary'): JourneyStep => ({
    hub: 'insurance',
    href: buildInsuranceJourneyUrl({
      ...ctx,
      src: currentHub === 'insurance' ? ctx.src : currentHub,
    }),
    title: isRelocate
      ? 'Your move changes more than your address'
      : `Coverage research for ${place}`,
    body: isRent
      ? `Research renters and auto coverage considerations for ${place}.`
      : `Homeowners insurance is typically required to close — research coverage considerations in ${place}.`,
    cta: 'Research coverage',
    priority,
  });

  const moveStep = (priority: 'primary' | 'secondary'): JourneyStep => ({
    hub: 'move',
    href: buildMoveJourneyUrl({
      ...ctx,
      src: currentHub === 'move' ? ctx.src : currentHub,
    }),
    title: 'Research licensed movers',
    body: 'Compare interstate movers with public FMCSA context on Move Trust Hub.',
    cta: 'Research movers',
    priority,
  });

  if (isRefi && !isRelocate) {
    if (currentHub !== 'lender') steps.push(lenderStep('primary'));
  } else if (isRelocate && isBuy) {
    if (currentHub !== 'lender') steps.push(lenderStep('primary'));
    if (currentHub !== 'insurance') steps.push(insuranceStep('secondary'));
  } else if (isRelocate && isRent) {
    if (currentHub !== 'insurance') steps.push(insuranceStep('primary'));
  } else if (isRelocate && !isBuy && !isRent) {
    if (currentHub !== 'insurance') steps.push(insuranceStep('primary'));
    if (currentHub !== 'lender') steps.push(lenderStep('secondary'));
  } else if (isBuy && !isRelocate) {
    if (currentHub !== 'lender') steps.push(lenderStep('primary'));
    if (currentHub !== 'insurance') steps.push(insuranceStep('secondary'));
  } else if (currentHub === 'lender' && journey === 'coverage') {
    // Coverage-focused mortgage research → insurance next (purchase already implies isBuy above)
    steps.push(insuranceStep('primary'));
  } else if (currentHub === 'insurance') {
    if (isBuy) steps.push(lenderStep('primary'));
    else if (isRelocate) steps.push(moveStep('secondary'));
  }

  if (steps.length === 0 && currentHub === 'insurance' && isRelocate) {
    steps.push(moveStep('secondary'));
  }
  if (steps.length === 0 && currentHub === 'insurance' && isBuy) {
    steps.push(lenderStep('primary'));
  }

  return steps
    .filter((s) => s.hub !== currentHub)
    .slice(0, 2)
    .map((s, i) => ({
      ...s,
      priority: (i === 0 ? 'primary' : 'secondary') as 'primary' | 'secondary',
    }));
}

export function hasJourneyContext(ctx: JourneyContext): boolean {
  return Boolean(
    ctx.src ||
      ctx.journey ||
      ctx.stateSlug ||
      ctx.county ||
      (ctx.intent && ctx.intent !== 'unknown')
  );
}

export function orientationCopy(ctx: JourneyContext): {
  eyebrow: string;
  title: string;
  body: string;
} | null {
  if (!hasJourneyContext(ctx)) return null;
  const place = placeLabel(ctx);
  const fromMove = ctx.src === 'move' || ctx.journey === 'relocate';
  if (fromMove && place) {
    return {
      eyebrow: 'Continuing your relocation research',
      title: `Moving to ${place}`,
      body:
        ctx.intent === 'rent'
          ? 'Continue with renters and auto coverage considerations for your destination. Educational only — not a quote marketplace.'
          : ctx.intent === 'buy'
            ? 'Continue with homeowners and auto coverage research for your destination. Educational only.'
            : 'Continue with coverage research for your destination. Educational only — not a quote marketplace.',
    };
  }
  if (place && (ctx.journey === 'relocate' || ctx.src === 'move')) {
    return {
      eyebrow: 'Continuing your relocation research',
      title: place,
      body: 'Restored from your recent research session on this browser. Educational only.',
    };
  }
  if (ctx.src === 'lender' && place) {
    return {
      eyebrow: 'Continued from mortgage research',
      title: `Coverage context for ${place}`,
      body: 'Homeowners insurance is typically required to close. Research considerations for your market — not a quote funnel.',
    };
  }
  if (place) {
    return {
      eyebrow: 'Research context',
      title: place,
      body: 'Context from another Trust Hub. Continue with the tools below — research only.',
    };
  }
  return {
    eyebrow: 'Network research',
    title: 'Continue your Trust journey',
    body: 'Context from another specialist hub. Explore the research modules below.',
  };
}
