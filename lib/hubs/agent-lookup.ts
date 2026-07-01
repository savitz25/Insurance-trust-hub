import type { Provider } from '@/types/provider';
import { INSURANCE_HUBS } from '@/lib/hubs/registry';
import { getAgentsForHub } from '@/lib/hubs/agents';
import type { HubAgent } from '@/types/agent';
import type { Specialty } from '@/lib/constants';

function hubAgentToProvider(agent: HubAgent): Provider {
  return {
    id: agent.id,
    slug: agent.slug,
    name: agent.name,
    short_description: agent.shortDescription,
    description: agent.shortDescription,
    city: agent.city,
    state: agent.state,
    phone: null,
    website: agent.website ?? null,
    license_number: agent.licenseNumber,
    insurance_types: agent.insuranceTypes,
    specialties: agent.specialties as Specialty[],
    rating: agent.rating,
    review_count: agent.reviewCount,
    is_verified: agent.isVerified,
    years_in_business: agent.yearsInBusiness,
    trust_score: agent.trustScore,
    local_market_experience: agent.localMarketExperience,
    avg_response_hours: agent.avgResponseHours,
    bbb_rating: agent.bbbRating,
  };
}

export function getHubAgentBySlug(slug: string): Provider | null {
  for (const hub of INSURANCE_HUBS) {
    const agent = getAgentsForHub(hub).find((a) => a.slug === slug);
    if (agent) return hubAgentToProvider(agent);
  }
  return null;
}