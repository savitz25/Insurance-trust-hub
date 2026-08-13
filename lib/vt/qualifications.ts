/**
 * Map Vermont DFR license class + LOA strings → shared specialty tags.
 * Never invent Medicare-certified.
 */

import type { LoaCapability } from '@/lib/dfs/loa';
import {
  capabilitiesToInsuranceTypes,
  capabilitiesToSpecialties,
} from '@/lib/dfs/loa';
import type { InsuranceType, Specialty } from '@/lib/constants';

export function classifyVtLoa(raw: string): LoaCapability {
  const s = (raw ?? '').trim();
  if (!s) return 'other';
  if (/\btitle\b/i.test(s)) return 'title';
  if (/public adjuster/i.test(s)) return 'public_adjuster';
  if (/accident|health|sickness|disability/i.test(s)) return 'health';
  if (/\blife\b|annuit|variable/i.test(s)) return 'life';
  if (/personal lines|auto physical/i.test(s)) return 'personal_lines';
  if (/property|casualty|worker.?s compensation/i.test(s)) return 'property_casualty';
  return 'other';
}

export function classifyVtClass(raw: string): LoaCapability {
  const s = (raw ?? '').trim();
  if (/title/i.test(s)) return 'title';
  if (/public adjuster/i.test(s)) return 'public_adjuster';
  if (/producer|surplus|managing general|consultant/i.test(s)) return 'agency';
  return 'other';
}

export function classifyVtStrings(parts: string[]): LoaCapability[] {
  const set = new Set<LoaCapability>();
  for (const p of parts) {
    const a = classifyVtLoa(p);
    if (a !== 'other') set.add(a);
    const b = classifyVtClass(p);
    if (b !== 'other') set.add(b);
  }
  if (parts.some((p) => /producer|surplus|agency|consultant/i.test(p))) {
    set.add('agency');
  }
  return Array.from(set);
}

export function vtCapabilitiesToSpecialties(caps: LoaCapability[]): Specialty[] {
  return capabilitiesToSpecialties(caps, 'business');
}

export function vtCapabilitiesToInsuranceTypes(caps: LoaCapability[]): InsuranceType[] {
  return capabilitiesToInsuranceTypes(caps);
}
