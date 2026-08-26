/**
 * Contact observation helpers. Contacts are never identity keys.
 * Unique graph key remains entity + kind + source + UPPER(TRIM(value)).
 * `value` is the idempotent normalized form; `label` retains raw source evidence.
 */

export type ContactKind =
  | 'email'
  | 'phone'
  | 'website'
  | 'physical_address'
  | 'mailing_address'
  | 'named_contact'
  | 'contact_title';

export type SourceClass =
  | 'OFFICIAL_REGULATOR'
  | 'OFFICIAL_PUBLIC_PROGRAM'
  | 'BUSINESS_CLAIM'
  | 'THIRD_PARTY'
  | 'OTHER';

export type EmailContext = 'general_business' | 'licensing_regulatory' | 'unknown';
export type AddressClass =
  | 'physical'
  | 'mailing'
  | 'unknown';

export function normalizeEmail(raw: string | null | undefined): string | null {
  const s = String(raw || '').trim().toLowerCase();
  if (!s || !s.includes('@') || /\s/.test(s)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

export function classifyEmailContext(email: string): EmailContext {
  if (/license|compliance|regulator|licensing|appoint/i.test(email)) {
    return 'licensing_regulatory';
  }
  return 'general_business';
}

export function parsePhone(raw: string | null | undefined): {
  e164: string;
  extension: string | null;
  original: string;
} | null {
  const original = String(raw || '').trim();
  if (!original) return null;
  let ext: string | null = null;
  const extM = original.match(/(?:ext\.?|x|extension)\s*[:.]?\s*(\d{1,8})/i);
  if (extM) ext = extM[1]!;
  const withoutExt = original.replace(/(?:ext\.?|x|extension)\s*[:.]?\s*\d{1,8}/i, '');
  const digits = withoutExt.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return { e164: `+${digits}`, extension: ext, original };
  }
  if (digits.length === 10) {
    return { e164: `+1${digits}`, extension: ext, original };
  }
  if (digits.length >= 7 && digits.length <= 15) {
    return { e164: `+${digits}`, extension: ext, original };
  }
  return null;
}

export function normalizeWebsite(raw: string | null | undefined): string | null {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (/^(n\/?a|none|null)$/i.test(s)) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname.includes('.')) return null;
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

const SUITE = /\b(suite|ste\.?|unit|apt\.?|apartment|#)\s*/gi;

export function normalizeAddressValue(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string | null {
  const street = String(parts.street || '')
    .replace(SUITE, 'STE ')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  const city = String(parts.city || '').replace(/\s+/g, ' ').trim().toUpperCase();
  const state = String(parts.state || '').trim().toUpperCase().slice(0, 2);
  const zip = String(parts.zip || '').replace(/\D/g, '').slice(0, 5);
  if (street) {
    return [street, city, state, zip].filter(Boolean).join(', ');
  }
  return null;
}

export function observationLabel(input: {
  raw: string;
  extension?: string | null;
  emailContext?: EmailContext;
  addressClass?: AddressClass;
  sourceClass?: SourceClass;
}): string {
  const bits = [`raw=${input.raw}`];
  if (input.extension) bits.push(`ext=${input.extension}`);
  if (input.emailContext) bits.push(`email_ctx=${input.emailContext}`);
  if (input.addressClass) bits.push(`addr_class=${input.addressClass}`);
  if (input.sourceClass) bits.push(`source_class=${input.sourceClass}`);
  return bits.join(';');
}

export function extractRawFromLabel(label: string | null | undefined): string | null {
  const m = String(label || '').match(/(?:^|;)\s*raw=([^;]*)/);
  return m ? m[1]!.trim() : null;
}
