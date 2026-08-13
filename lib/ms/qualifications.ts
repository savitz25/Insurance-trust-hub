/**
 * Map Mississippi MID entity / line strings → shared specialty tags.
 * Never invent Medicare-certified. This export has no LOA column.
 */

import type { LoaCapability } from '@/lib/dfs/loa';
import {
  capabilitiesToInsuranceTypes,
  capabilitiesToSpecialties,
} from '@/lib/dfs/loa';
import type { InsuranceType, Specialty } from '@/lib/constants';

export function classifyMsLine(raw: string): LoaCapability {
  const s = (raw ?? '').trim();
  if (!s) return 'other';
  if (/medicare/i.test(s)) return 'other';
  if (/variable/i.test(s)) return 'life';
  if (/accident|health|a\s*&\s*h|sickness|disability/i.test(s)) return 'health';
  if (/\blife\b|annuit/i.test(s)) return 'life';
  if (/personal lines/i.test(s)) return 'personal_lines';
  if (/property|casualty|p\s*&\s*c|worker.?s compensation/i.test(s)) {
    return 'property_casualty';
  }
  if (/agenc|producer entity/i.test(s)) return 'agency';
  return 'other';
}

export function classifyMsStrings(parts: string[]): LoaCapability[] {
  const set = new Set<LoaCapability>();
  for (const p of parts) {
    const cap = classifyMsLine(p);
    if (cap !== 'other') set.add(cap);
  }
  set.add('agency');
  return Array.from(set);
}

export function msCapabilitiesToSpecialties(caps: LoaCapability[]): Specialty[] {
  return capabilitiesToSpecialties(caps, 'business');
}

export function msCapabilitiesToInsuranceTypes(caps: LoaCapability[]): InsuranceType[] {
  return capabilitiesToInsuranceTypes(caps);
}
