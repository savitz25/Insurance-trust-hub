import type { HubAgent } from '@/types/agent';
import { ORLANDO_AGENTS } from '@/lib/hubs/data/orlando-agents';
import { SOUTH_FLORIDA_AGENTS } from '@/lib/hubs/data/south-florida-agents';

export interface CuratedHubConfig {
  slug: string;
  sectionTitle: string;
  summary: string;
  counties: string[];
  badges?: string[];
  featuredHealthLine: string;
  healthFeaturedLimit: number;
}

export const CURATED_HUB_CONFIG: Record<string, CuratedHubConfig> = {
  'miami-fort-lauderdale': {
    slug: 'miami-fort-lauderdale',
    sectionTitle: 'Tri-County Coverage Area',
    summary:
      '12 verified independent agencies across Miami-Dade, Broward, and Palm Beach counties — 8 with primary Medicare/ACA/health emphasis and 4 strong multi-line partners. Average Google rating ~4.9 stars across entries with sufficient review volume.',
    counties: ['Miami-Dade', 'Broward', 'Palm Beach'],
    badges: ['Bilingual EN/ES available'],
    featuredHealthLine:
      'Top 3 featured: SFIB · Absolute Best Insurance · Medicare Advisors of South Florida',
    healthFeaturedLimit: 8,
  },
  orlando: {
    slug: 'orlando',
    sectionTitle: 'Central Florida Coverage Area',
    summary:
      '12 verified independent agencies across Orange, Osceola, and Seminole counties — 6 with primary or strong Medicare/ACA/health emphasis and 6 multi-line independents (several with group health or cross-sell capabilities). Average Google rating ~4.8–5.0 stars where review volume permits.',
    counties: ['Orange', 'Osceola', 'Seminole'],
    badges: ['Winter Park · Kissimmee · Orlando metro'],
    featuredHealthLine:
      'Top 3 featured: The Medicare Dude · Benson Insurance · Insurance Pro Florida',
    healthFeaturedLimit: 6,
  },
};

const CURATED_AGENTS: Record<string, HubAgent[]> = {
  'miami-fort-lauderdale': SOUTH_FLORIDA_AGENTS,
  orlando: ORLANDO_AGENTS,
};

export function getCuratedHubConfig(slug: string): CuratedHubConfig | null {
  return CURATED_HUB_CONFIG[slug] ?? null;
}

export function getCuratedHubAgents(slug: string): HubAgent[] | null {
  return CURATED_AGENTS[slug] ?? null;
}

export function isCuratedHub(slug: string): boolean {
  return slug in CURATED_AGENTS;
}