import { INSURANCE_TYPES, type InsuranceType } from '@/lib/constants';

export const CANONICAL_CATEGORIES: readonly InsuranceType[] = INSURANCE_TYPES.map(
  (t) => t.value
);

const CATEGORY_SET = new Set<string>(CANONICAL_CATEGORIES);

/**
 * Export only categories already stored on the row.
 * Never infer medicare from health, flood from homeowners, etc.
 */
export function normalizeCategories(
  raw: string[] | null | undefined
): InsuranceType[] {
  const out = new Set<InsuranceType>();
  for (const value of raw ?? []) {
    const v = (value || '').trim().toLowerCase();
    if (CATEGORY_SET.has(v)) {
      out.add(v as InsuranceType);
    }
  }
  return Array.from(out).sort();
}

export function hasMedicareCategory(categories: readonly string[]): boolean {
  return categories.includes('medicare');
}

export function hasCategory(
  categories: readonly string[],
  wanted: InsuranceType
): boolean {
  return categories.includes(wanted);
}
