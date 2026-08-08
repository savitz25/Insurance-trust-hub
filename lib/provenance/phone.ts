/**
 * Phase 6A — phone integrity for public render paths.
 */

const PLACEHOLDER_555 = /\b555\b/;
/** Classic North American fiction exchange 555-01xx */
const FICTION_EXCHANGE = /555[-.\s]?0[0-1]\d{2}/;
const OBVIOUS_FAKE = /^(?:0+|1+|123[-.\s]?4567|000[-.\s]?0000)$/;

export function isPlaceholderPhone(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return true;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return true;
  if (PLACEHOLDER_555.test(raw)) return true;
  if (FICTION_EXCHANGE.test(raw)) return true;
  if (OBVIOUS_FAKE.test(digits.slice(-10))) return true;
  // All same digit
  if (/^(\d)\1{9,}$/.test(digits)) return true;
  return false;
}

/** Public display phone — null when placeholder or missing. */
export function publicDisplayPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  if (isPlaceholderPhone(raw)) return null;
  return raw.trim();
}
