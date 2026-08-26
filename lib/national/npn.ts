/**
 * NPN normalization. NPN is evidence for identity, never invented.
 */

const NPN_RE = /^\d{5,10}$/;

export function normalizeNpn(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const digits = String(raw).trim().replace(/[\s-]/g, '');
  if (!digits) return null;
  if (/^(n\/?a|none|null|unknown)$/i.test(digits)) return null;
  if (!NPN_RE.test(digits)) return null;
  return digits;
}

export function isValidNpn(raw: string | null | undefined): boolean {
  return normalizeNpn(raw) != null;
}
