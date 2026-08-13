/**
 * Map North Carolina DOI / SBS license type + LOA strings → specialty tags.
 * Never invent Medicare-certified.
 */

import type { LoaCapability } from '@/lib/dfs/loa';
import {
  capabilitiesToInsuranceTypes,
  capabilitiesToSpecialties,
} from '@/lib/dfs/loa';
import type { InsuranceType, Specialty } from '@/lib/constants';

export function classifyNcQualification(raw: string): LoaCapability {
  const s = (raw ?? '').trim();
  if (!s) return 'other';
  if (/\btitle\b/i.test(s) || /escrow/i.test(s)) return 'title';
  if (/public\s*adjust/i.test(s) || /\badjuster\b/i.test(s)) return 'public_adjuster';
  if (/health/i.test(s) || /accident/i.test(s) || /sickness/i.test(s) || /disability/i.test(s)) {
    return 'health';
  }
  if (/\blife\b/i.test(s) || /annuit/i.test(s) || /variable/i.test(s)) {
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
    /major lines/i.test(s) ||
    /general lines/i.test(s) ||
    /surplus/i.test(s) ||
    /commercial/i.test(s)
  ) {
    return 'property_casualty';
  }
  if (/\bagency\b/i.test(s) || /business entity/i.test(s) || /organization/i.test(s)) {
    return 'agency';
  }
  if (/limited lines/i.test(s) || /credit/i.test(s) || /navigator/i.test(s) || /surplus lines/i.test(s)) {
    return 'other';
  }
  return 'other';
}

export function classifyNcStrings(parts: string[]): LoaCapability[] {
  const set = new Set<LoaCapability>();
  for (const p of parts) {
    const c = classifyNcQualification(p);
    if (c !== 'other') set.add(c);
  }
  set.add('agency');
  return Array.from(set);
}

export function ncCapabilitiesToSpecialties(caps: LoaCapability[]): Specialty[] {
  return capabilitiesToSpecialties(caps, 'business');
}

export function ncCapabilitiesToInsuranceTypes(caps: LoaCapability[]): InsuranceType[] {
  return capabilitiesToInsuranceTypes(caps);
}

/** Reject individual / producer-only rows when entity type is present. */
export function looksLikeIndividualEntity(raw: string | null | undefined): boolean {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return false;
  if (/business|organization|agency|entity|firm|corp|llc|inc/.test(s)) {
    return false;
  }
  return /individual|producer|person|resident agent|non-?resident agent/.test(s);
}
