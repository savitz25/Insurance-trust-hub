/**
 * Map Nevada firm license types → shared specialty tags.
 * Never invent Medicare-certified.
 */

import type { LoaCapability } from '@/lib/dfs/loa';
import {
  capabilitiesToInsuranceTypes,
  capabilitiesToSpecialties,
} from '@/lib/dfs/loa';
import type { InsuranceType, Specialty } from '@/lib/constants';
import { normalizeFirmLicenseType } from '@/lib/nv/firm-types';

export function classifyNvFirmType(raw: string): LoaCapability {
  const s = normalizeFirmLicenseType(raw);
  if (!s) return 'other';
  if (/title/i.test(s)) return 'title';
  if (/public adjuster/i.test(s)) return 'public_adjuster';
  if (/independent adjuster|appraiser/i.test(s)) return 'other';
  if (/producer firm|surplus lines|managing general|insurance consultant/i.test(s)) {
    return 'agency';
  }
  return 'other';
}

export function classifyNvStrings(parts: string[]): LoaCapability[] {
  const set = new Set<LoaCapability>();
  for (const p of parts) {
    const c = classifyNvFirmType(p);
    if (c !== 'other') set.add(c);
  }
  if (parts.some((p) => /producer firm|surplus lines|managing general|consultant/i.test(p))) {
    set.add('agency');
  }
  return Array.from(set);
}

export function nvCapabilitiesToSpecialties(caps: LoaCapability[]): Specialty[] {
  const specs = capabilitiesToSpecialties(caps, 'business');
  if (!specs.includes('Agency') && caps.includes('agency')) {
    specs.unshift('Agency', 'Independent Agency');
  }
  return Array.from(new Set(specs));
}

export function nvCapabilitiesToInsuranceTypes(caps: LoaCapability[]): InsuranceType[] {
  return capabilitiesToInsuranceTypes(caps);
}
