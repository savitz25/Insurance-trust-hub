/**
 * Official LOA text is preserved. Consumer groups are derived, never a replacement.
 */

import { classifyLoa, type LoaCapability } from '../dfs/loa';

export function consumerGroupFromOfficialLoa(officialText: string): string | null {
  const cap: LoaCapability = classifyLoa(officialText);
  if (cap === 'other') return null;
  return cap;
}
