import type { HubAgent } from '@/types/agent';
import { SOUTH_FLORIDA_AGENTS } from '@/lib/hubs/data/south-florida-agents';

/** Sort South Florida agents with county-local specialists first. */
export function getSouthFloridaCountyAgents(county: string): HubAgent[] {
  return [...SOUTH_FLORIDA_AGENTS].sort((a, b) => {
    const aLocal = a.county === county ? 0 : 1;
    const bLocal = b.county === county ? 0 : 1;
    if (aLocal !== bLocal) return aLocal - bLocal;
    const aRank = a.featuredRank ?? 99;
    const bRank = b.featuredRank ?? 99;
    return aRank - bRank;
  });
}