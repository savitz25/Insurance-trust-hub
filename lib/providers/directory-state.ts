import type { Provider } from '@/types/provider';

/**
 * Public directory state membership.
 *
 * `/directory?state=TX` already queries `states_licensed` (a licensed-state
 * scan). A later in-memory pass used `license_state || address.state`.
 * `license_state` is licenses[0] and `address.state` is the recorded HQ, so a
 * CA-primary provider with states_licensed {CA,TX,ID} was removed from
 * state=TX and state=ID after the database had already selected it.
 *
 * When `states_licensed` is present it is the membership list. The HQ address
 * is not a license. An empty array falls back to the legacy single state so
 * older rows still resolve.
 */
export function providerMatchesLicensedState(provider: Provider, stateCode: string): boolean {
  const code = stateCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return false;
  const licensed = (provider.states_licensed ?? [])
    .map((state) => state.trim().toUpperCase())
    .filter((state) => /^[A-Z]{2}$/.test(state));
  if (licensed.length > 0) return licensed.includes(code);
  const fallback = (provider.license_state || provider.state || '').trim().toUpperCase();
  return fallback === code;
}
