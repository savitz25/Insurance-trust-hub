/**
 * contact.business_supplied — a business-supplied card on /providers/[slug].
 * Jsonb only. Not a regulator record, not a trust-state input, not JSON-LD.
 * Optional office jurisdiction is read from the same jsonb. It never writes
 * contact.address.
 */

import { normalizeStateCode } from '@/lib/providers/state-code';

export const BUSINESS_SUPPLIED_SOURCE = 'BUSINESS_SUPPLIED' as const;

export const BUSINESS_SUPPLIED_FIELD_LABEL = 'BUSINESS-SUPPLIED';

export const BUSINESS_SUPPLIED_TITLE =
  'From the business (BUSINESS-SUPPLIED — not verified by a regulator)';

export interface BusinessSuppliedOfficeInput {
  label?: string;
  address?: string | { street?: string; city?: string; state?: string; zip?: string };
  verified?: boolean;
  /** Optional USPS code such as TX or ID. Absent means the office is untagged. */
  jurisdiction?: string;
}

export interface BusinessSuppliedInput {
  source: typeof BUSINESS_SUPPLIED_SOURCE;
  supplied_at?: string;
  supplied_via?: string;
  lines?: unknown[];
  hours?: unknown[];
  offices?: BusinessSuppliedOfficeInput[];
  phone?: string;
  email?: string;
}

export interface BusinessSuppliedOfficeView {
  label: string;
  address: string;
  verified: boolean;
  jurisdiction: string | null;
}

export interface BusinessSuppliedView {
  title: typeof BUSINESS_SUPPLIED_TITLE;
  fieldLabel: typeof BUSINESS_SUPPLIED_FIELD_LABEL;
  source: typeof BUSINESS_SUPPLIED_SOURCE;
  suppliedAt: string | null;
  suppliedVia: string | null;
  lines: string[];
  hours: string[];
  offices: BusinessSuppliedOfficeView[];
  phone: string | null;
  email: string | null;
  emailHref: string | null;
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') {
    const text = value.trim();
    return text || null;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['text', 'label', 'value', 'hours']) {
      const nested = record[key];
      if (typeof nested === 'string' && nested.trim()) return nested.trim();
    }
  }
  return null;
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const text = asText(item);
    if (text) out.push(text);
  }
  return out;
}

function formatAddress(address: BusinessSuppliedOfficeInput['address']): string {
  if (typeof address === 'string') return address.trim();
  if (!address || typeof address !== 'object') return '';
  return [address.street, address.city, address.state, address.zip]
    .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
    .map((part) => part.trim())
    .join(', ');
}

export function businessSuppliedMailto(email: string | null | undefined): string | null {
  const value = (email || '').trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)) return null;
  return `mailto:${value}`;
}

export function parseBusinessSupplied(value: unknown): BusinessSuppliedView | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record.source !== BUSINESS_SUPPLIED_SOURCE) return null;

  const offices: BusinessSuppliedOfficeView[] = [];
  if (Array.isArray(record.offices)) {
    for (const item of record.offices) {
      if (!item || typeof item !== 'object') continue;
      const office = item as BusinessSuppliedOfficeInput;
      const label = typeof office.label === 'string' ? office.label.trim() : '';
      const address = formatAddress(office.address);
      if (!label && !address) continue;
      offices.push({
        label: label || 'Office',
        address,
        verified: office.verified === true,
        jurisdiction: normalizeStateCode(office.jurisdiction),
      });
    }
  }

  const email = asText(record.email);
  const view: BusinessSuppliedView = {
    title: BUSINESS_SUPPLIED_TITLE,
    fieldLabel: BUSINESS_SUPPLIED_FIELD_LABEL,
    source: BUSINESS_SUPPLIED_SOURCE,
    suppliedAt: asText(record.supplied_at),
    suppliedVia: asText(record.supplied_via),
    lines: textList(record.lines),
    hours: textList(record.hours),
    offices,
    phone: asText(record.phone),
    email,
    emailHref: businessSuppliedMailto(email),
  };

  const hasContent = Boolean(
    view.suppliedAt ||
      view.suppliedVia ||
      view.lines.length ||
      view.hours.length ||
      view.offices.length ||
      view.phone ||
      view.email
  );
  return hasContent ? view : null;
}
