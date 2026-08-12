/**
 * Map Texas TDI license_type + qualification strings → LOA capabilities / specialties.
 * Never invent Medicare-certified.
 */

import type { LoaCapability } from '@/lib/dfs/loa';
import {
  capabilitiesToInsuranceTypes,
  capabilitiesToSpecialties,
} from '@/lib/dfs/loa';
import type { InsuranceType, Specialty } from '@/lib/constants';

export function classifyTdiQualification(raw: string): LoaCapability {
  const s = (raw ?? '').trim();
  if (!s) return 'other';
  if (/\btitle\b/i.test(s) || /escrow/i.test(s)) return 'title';
  if (/public\s*adjust/i.test(s) || /\badjuster\b/i.test(s)) return 'public_adjuster';
  // Line-of-authority keywords before generic “Agency” suffix (e.g. Life Agent/Agency)
  if (/health/i.test(s) || /accident/i.test(s) || /hmo/i.test(s) || /disability/i.test(s)) {
    return 'health';
  }
  if (/\blife\b/i.test(s) || /annuit/i.test(s) || /variable life/i.test(s)) {
    return 'life';
  }
  if (
    /personal lines/i.test(s) ||
    /\bauto\b/i.test(s) ||
    /homeowners/i.test(s) ||
    /residential/i.test(s)
  ) {
    return 'personal_lines';
  }
  if (
    /property/i.test(s) ||
    /casualty/i.test(s) ||
    /p\s*&\s*c/i.test(s) ||
    /general lines/i.test(s) ||
    /surplus/i.test(s) ||
    /commercial/i.test(s) ||
    /property and casualty/i.test(s)
  ) {
    return 'property_casualty';
  }
  if (/\bagency\b/i.test(s) || /managing general/i.test(s) || /mga/i.test(s)) {
    return 'agency';
  }
  if (/credit/i.test(s) || /specialty/i.test(s)) return 'other';
  return 'other';
}

export function classifyTdiStrings(parts: string[]): LoaCapability[] {
  const set = new Set<LoaCapability>();
  for (const p of parts) {
    const c = classifyTdiQualification(p);
    if (c !== 'other') set.add(c);
  }
  // Agencies dataset is business entities — always agency-capable surface
  set.add('agency');
  if (set.size === 1) {
    // agency only — keep other for generic listing types
  }
  return Array.from(set);
}

export function tdiCapabilitiesToSpecialties(caps: LoaCapability[]): Specialty[] {
  return capabilitiesToSpecialties(caps, 'business');
}

export function tdiCapabilitiesToInsuranceTypes(
  caps: LoaCapability[]
): InsuranceType[] {
  return capabilitiesToInsuranceTypes(caps);
}
