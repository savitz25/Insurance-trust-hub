/**
 * Phase 4 — Florida DFS lines of authority → consumer categories.
 * Never map LOA to “Medicare-certified” (requires CMS evidence later).
 */

import type { InsuranceType } from '@/lib/constants';

/** Normalized LOA capability tags (stored on producer / specialties). */
export type LoaCapability =
  | 'health'
  | 'life'
  | 'property_casualty'
  | 'personal_lines'
  | 'variable'
  | 'other';

const HEALTH_PATTERNS = [/health/i, /\bh\s*&\s*l\b/i, /accident/i, /disability/i];
const LIFE_PATTERNS = [/\blife\b/i, /annuit/i];
const PC_PATTERNS = [
  /property/i,
  /casualty/i,
  /p\s*&\s*c/i,
  /general lines/i,
  /surplus/i,
];
const PERSONAL_PATTERNS = [/personal lines/i, /auto/i, /homeowners/i, /residential/i];
const VARIABLE_PATTERNS = [/variable/i];

export function classifyLoa(raw: string): LoaCapability {
  const s = raw.trim();
  if (!s) return 'other';
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

/** Honest specialty labels — never “Medicare Specialists” from DFS alone. */
export function capabilitiesToSpecialties(
  caps: LoaCapability[],
  entityType: 'individual' | 'business'
): string[] {
  const out: string[] = ['Independent Agency'];
  if (entityType === 'individual') {
    out[0] = 'Independent Agent';
  }
  if (caps.includes('health')) out.push('Health');
  if (caps.includes('life')) out.push('Life');
  if (caps.includes('property_casualty') || caps.includes('personal_lines')) {
    out.push('Personal Lines');
  }
  return out;
}

export function parseLoaField(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[|;,/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
