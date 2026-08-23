/**
 * ASK-SEARCH-INSURANCE-002 — Insurance receiving handoff types.
 * Allowlisted Ask → InsuranceTrustHub structured search context.
 */

export const ASK_HANDOFF_KEYS = [
  'src',
  'journey',
  'state',
  'county',
  'intent',
  'entity',
  'category',
  'city',
  'zip',
  'sid',
] as const;

export type AskHandoffKey = (typeof ASK_HANDOFF_KEYS)[number];

/** Forbidden inbound keys — ignored / never persisted. */
export const ASK_HANDOFF_FORBIDDEN_KEYS = [
  'query',
  'q',
  'email',
  'phone',
  'name',
  'street_address',
  'address',
  'account',
  'ssn',
  'income',
  'health_data',
  'diagnosis',
  'document',
  'next',
  'redirect',
  'lat',
  'lng',
  'latitude',
  'longitude',
] as const;

export const INSURANCE_ASK_ENTITIES = [
  'insurance_brokerage',
  'insurance_agency',
  'insurance_agent',
  'insurance_carrier',
  'medicare_agent',
] as const;

export type InsuranceAskEntity = (typeof INSURANCE_ASK_ENTITIES)[number];

export const INSURANCE_ASK_CATEGORIES = [
  'homeowners',
  'auto',
  'health',
  'medicare',
  'life',
  'renters',
  'umbrella',
  'flood',
] as const;

export type InsuranceAskCategory = (typeof INSURANCE_ASK_CATEGORIES)[number];

export type InsuranceAskSearchContext = {
  source: 'ask';
  entityType?: InsuranceAskEntity;
  category?: InsuranceAskCategory;
  state?: string; // USPS
  county?: string;
  city?: string; // slug or display
  zip?: string;
  intent?: string;
  journey?: string;
  sid?: string;
  /** True when inbound looked like Ask but entity/category is unsupported */
  unsupported?: 'medicare_agent' | 'ambiguous_entity' | 'invalid';
};

export type AskHandoffDestination =
  | {
      kind: 'directory';
      href: string;
      context: InsuranceAskSearchContext;
      backLabel: string;
    }
  | {
      kind: 'carriers';
      href: string;
      context: InsuranceAskSearchContext;
      backLabel: string;
    }
  | {
      kind: 'unsupported';
      href: string;
      context: InsuranceAskSearchContext;
      reason: 'medicare_agent' | 'ambiguous_entity' | 'invalid_context';
      backLabel: string;
    };
