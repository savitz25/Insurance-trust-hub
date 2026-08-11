/**
 * Phase 4–5 — Florida DFS lines of authority → consumer categories / specialty tags.
 * Never map LOA to “Medicare-certified” (requires CMS evidence later).
 * Never invent carrier appointments from LOA text alone.
 */

import type { InsuranceType, Specialty } from '@/lib/constants';

/** Normalized LOA capability tags (stored on producer / specialties). */
export type LoaCapability =
  | 'health'
  | 'life'
  | 'property_casualty'
  | 'personal_lines'
  | 'variable'
  | 'agency'
  | 'other';

const HEALTH_PATTERNS = [/health/i, /\bh\s*&\s*l\b/i, /accident/i, /disability/i];
const LIFE_PATTERNS = [/\blife\b/i, /annuit/i];
const PC_PATTERNS = [
  /property/i,
  /casualty/i,
  /p\s*&\s*c/i,
  /general lines/i,
  /surplus/i,
  /commercial/i,
];
const PERSONAL_PATTERNS = [/personal lines/i, /\bauto\b/i, /homeowners/i, /residential/i];
const VARIABLE_PATTERNS = [/variable/i];
const AGENCY_PATTERNS = [/\bagency\b/i, /agency customer/i, /customer representative/i];

export function classifyLoa(raw: string): LoaCapability {
  const s = raw.trim();
  if (!s) return 'other';
  if (AGENCY_PATTERNS.some((p) => p.test(s))) return 'agency';
  if (HEALTH_PATTERNS.some((p) => p.test(s))) return 'health';
  if (LIFE_PATTERNS.some((p) => p.test(s))) return 'life';
  if (PERSONAL_PATTERNS.some((p) => p.test(s))) return 'personal_lines';
  if (PC_PATTERNS.some((p) => p.test(s))) return 'property_casualty';
  if (VARIABLE_PATTERNS.some((p) => p.test(s))) return 'variable';
  return 'other';
}

export function classifyLoas(rawList: string[]): LoaCapability[] {
  const set = new Set<LoaCapability>();
  for (const r of rawList) set.add(classifyLoa(r));
  set.delete('other');
  if (set.size === 0) set.add('other');
  return Array.from(set);
}

/** Map capabilities → directory insurance_types (never invent medicare). */
export function capabilitiesToInsuranceTypes(caps: LoaCapability[]): InsuranceType[] {
  const types = new Set<InsuranceType>();
  for (const c of caps) {
    if (c === 'health') types.add('health');
    if (c === 'life') types.add('life');
    if (c === 'personal_lines' || c === 'property_casualty') {
      types.add('homeowners');
      types.add('auto');
    }
  }
  if (types.size === 0) types.add('health'); // generic independent research listing
  return Array.from(types);
}

/**
 * Honest specialty labels from DFS LOAs only.
 * Never “Medicare Specialists” / Medicare-certified from DFS alone.
 */
export function capabilitiesToSpecialties(
  caps: LoaCapability[],
  entityType: 'individual' | 'business'
): Specialty[] {
  const out: Specialty[] = [];
  if (entityType === 'business' || caps.includes('agency')) {
    out.push('Agency');
    out.push('Independent Agency');
  } else {
    out.push('Independent Agency');
  }
  if (caps.includes('health')) out.push('Health');
  if (caps.includes('life')) out.push('Life');
  if (caps.includes('property_casualty')) out.push('Property & Casualty');
  if (caps.includes('personal_lines')) out.push('Personal Lines');
  // de-dupe while preserving order
  return Array.from(new Set(out));
}

/** Consumer-facing LOA chips (stable order). */
export const LOA_TAG_ORDER: Specialty[] = [
  'Agency',
  'Independent Agency',
  'Health',
  'Life',
  'Property & Casualty',
  'Personal Lines',
];

/**
 * Specialty tags that came from DFS LOA classification (safe to show as capability chips).
 * Excludes editorial specialties like “Medicare Specialists” which must not be implied by DFS.
 */
export const LOA_CAPABILITY_TAGS = new Set<string>([
  'Agency',
  'Independent Agency',
  'Health',
  'Life',
  'Property & Casualty',
  'Personal Lines',
]);

export function loaSpecialtyTags(specialties: string[] | null | undefined): string[] {
  if (!specialties?.length) return [];
  const found = specialties.filter((s) => LOA_CAPABILITY_TAGS.has(s));
  const ordered = LOA_TAG_ORDER.filter((t) => found.includes(t));
  const rest = found.filter((s) => !(LOA_TAG_ORDER as readonly string[]).includes(s));
  return [...ordered, ...rest];
}

export function parseLoaField(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[|;,/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
