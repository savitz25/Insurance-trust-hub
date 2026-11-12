import { US_STATES } from '@/lib/constants';

/** USPS state code. Accepts any code in the state list, including TX and ID. */
export function normalizeStateCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return US_STATES.some((state) => state.code === code) ? code : null;
}

export function stateNameForCode(code: string): string {
  return US_STATES.find((state) => state.code === code)?.name ?? code;
}
