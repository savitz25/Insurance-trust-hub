/**
 * Insurance production handoff gate.
 * Exposure comes from the environment, not a compiled allowlist.
 * NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED and
 * NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS are read as process.env
 * NEXT_PUBLIC values, so Next bundles them at build. Redeploy when the
 * master switch or the canary list changes.
 * MTH_INSURANCE_PARENT_SAVE_MODE is read on the server at request time.
 * The profile control asks the server. It does not decide admission.
 * Slug admission is exposure only. The state license stays the identity.
 */

const RELEASE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ParentRelease = {
  enabled: boolean;
  parentSync: 'off' | 'production';
  canary: boolean;
  broad: boolean;
  slugs: readonly string[];
};

export type ReleaseEnv = {
  NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED?: string;
  NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS?: string;
  MTH_INSURANCE_PARENT_SAVE_MODE?: string;
};

const RELEASE_OFF: ParentRelease = {
  enabled: false,
  parentSync: 'off',
  canary: false,
  broad: false,
  slugs: [],
};

function canarySlugList(raw: string | undefined): readonly string[] | null {
  if (raw === undefined || raw.trim() === '') return [];
  const slugs: string[] = [];
  for (const part of raw.split(',')) {
    const slug = part.trim();
    if (!slug) continue;
    if (!RELEASE_SLUG.test(slug) || slugs.includes(slug)) return null;
    slugs.push(slug);
  }
  return slugs;
}

/** Master off, or any malformed mode or slug list, stays off. No Ask POST. */
export function productionParentGate(env?: ReleaseEnv): ParentRelease {
  const source: ReleaseEnv = env ?? {
    NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED: process.env.NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED,
    NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS: process.env.NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS,
    MTH_INSURANCE_PARENT_SAVE_MODE: process.env.MTH_INSURANCE_PARENT_SAVE_MODE,
  };
  const slugs = canarySlugList(source.NEXT_PUBLIC_INSURANCE_PARENT_SAVE_CANARY_SLUGS);
  const enabled = source.NEXT_PUBLIC_INSURANCE_PARENT_SAVE_ENABLED === '1';
  const mode = (source.MTH_INSURANCE_PARENT_SAVE_MODE ?? '').trim();
  if (slugs === null || !enabled || mode !== 'production') return { ...RELEASE_OFF };
  if (slugs.length === 0) return { enabled: true, parentSync: 'production', canary: false, broad: true, slugs };
  return { enabled: true, parentSync: 'production', canary: true, broad: false, slugs };
}

export function releaseAdmits(slug: string, gate: ParentRelease): boolean {
  if (gate.parentSync !== 'production' || gate.enabled !== true) return false;
  if (gate.broad && gate.canary) return false;
  if (!RELEASE_SLUG.test(slug)) return false;
  if (gate.broad) return true;
  if (!gate.canary) return false;
  return gate.slugs.includes(slug);
}
