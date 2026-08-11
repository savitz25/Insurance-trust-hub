import type { Provider } from '@/types/provider';
import { INSURANCE_HUBS } from '@/lib/hubs/registry';
import { getAgentsForHub } from '@/lib/hubs/agents';
import type { HubAgent } from '@/types/agent';
import type { Specialty } from '@/lib/constants';

function hubAgentToProvider(agent: HubAgent): Provider {
  const description = [agent.shortDescription, agent.reviewHighlight]
    .filter(Boolean)
    .join(' ');

  return {
    id: agent.id,
    slug: agent.slug,
    name: agent.name,
    short_description: agent.shortDescription,
    description,
    city: agent.city,
    state: agent.state,
    phone: agent.phone ?? null,
    website: agent.website ?? null,
    license_number: agent.licenseNumber,
    insurance_types: agent.insuranceTypes ?? [],
    specialties: (agent.specialties ?? []) as Specialty[],
    rating: agent.rating ?? 0,
    review_count: agent.reviewCount ?? 0,
    is_verified: Boolean(agent.isVerified),
    years_in_business: agent.yearsInBusiness ?? null,
    trust_score: agent.trustScore ?? null,
    local_market_experience: agent.localMarketExperience ?? null,
    avg_response_hours: agent.avgResponseHours ?? null,
    bbb_rating: agent.bbbRating ?? null,
  };
}

/** Lazy slug → provider map so provider pages do not rebuild all hubs per request. */
let hubSlugIndex: Map<string, Provider> | null = null;

function getHubSlugIndex(): Map<string, Provider> {
  if (hubSlugIndex) return hubSlugIndex;
  const map = new Map<string, Provider>();
  for (const hub of INSURANCE_HUBS) {
    try {
      for (const agent of getAgentsForHub(hub)) {
        if (!map.has(agent.slug)) {
          map.set(agent.slug, hubAgentToProvider(agent));
        }
      }
    } catch {
      // Skip broken hub catalogs — never take down provider routes
    }
  }
  hubSlugIndex = map;
  return map;
}

export function getHubAgentBySlug(slug: string): Provider | null {
  try {
    return getHubSlugIndex().get(slug) ?? null;
  } catch {
    return null;
  }
}
