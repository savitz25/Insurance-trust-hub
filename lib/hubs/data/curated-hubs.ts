import type { HubAgent } from '@/types/agent';
import { JACKSONVILLE_AGENTS } from '@/lib/hubs/data/jacksonville-agents';
import { ORLANDO_AGENTS } from '@/lib/hubs/data/orlando-agents';
import { SOUTH_FLORIDA_AGENTS } from '@/lib/hubs/data/south-florida-agents';
import { ATLANTA_AGENTS } from '@/lib/hubs/data/atlanta-agents';
import { TAMPA_BAY_AGENTS } from '@/lib/hubs/data/tampa-bay-agents';

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
  jacksonville: {
    slug: 'jacksonville',
    sectionTitle: 'Northeast Florida Coverage Area',
    summary:
      '12 verified independent agencies across Duval, St. Johns, Clay, and Nassau counties — 7 with primary or strong Medicare/ACA/health emphasis and 5 multi-line independents (several with group health or cross-sell capabilities). Average Google rating ~4.9 stars where review volume permits.',
    counties: ['Duval', 'St. Johns', 'Clay', 'Nassau'],
    badges: ['First Coast · Jacksonville metro'],
    featuredHealthLine:
      'Top 3 featured: The Medicare Dude · Florida Life & Health Exchange · Green Ins',
    healthFeaturedLimit: 7,
  },
  tampa: {
    slug: 'tampa',
    sectionTitle: 'Tampa Bay Coverage Area',
    summary:
      '12 verified independent agencies across Hillsborough, Pinellas, and Pasco counties — 7 with primary or strong Medicare/ACA/health emphasis and 5 multi-line independents (with health or employee benefits capabilities). Average Google rating ~4.9 stars where review volume permits.',
    counties: ['Hillsborough', 'Pinellas', 'Pasco'],
    badges: ['Tampa · St. Petersburg · Clearwater'],
    featuredHealthLine:
      'Top 3 featured: HealthPlan4U · Affordable Insurance Team · The Medicare Dude',
    healthFeaturedLimit: 7,
  },
  atlanta: {
    slug: 'atlanta',
    sectionTitle: 'Metro Atlanta Coverage Area',
    summary:
      '12 verified independent agencies across Fulton, DeKalb, Gwinnett, Cobb, and Clayton counties — 7 with primary Medicare/ACA/health or group benefits emphasis and 5 multi-line independents. Georgia\'s largest health market with 6–7 competing carriers (Kaiser, Oscar, Anthem, Ambetter, UnitedHealthcare). Average Google rating ~4.8–5.0 stars.',
    counties: ['Fulton', 'DeKalb', 'Gwinnett', 'Cobb', 'Clayton'],
    badges: ['Georgia Access · Kaiser · Oscar · Ambetter'],
    featuredHealthLine:
      'Top 3 featured: Georgia Health Insurance · iHealthBrokers · The Big 65',
    healthFeaturedLimit: 7,
  },
};

const CURATED_AGENTS: Record<string, HubAgent[]> = {
  'miami-fort-lauderdale': SOUTH_FLORIDA_AGENTS,
  orlando: ORLANDO_AGENTS,
  jacksonville: JACKSONVILLE_AGENTS,
  tampa: TAMPA_BAY_AGENTS,
  atlanta: ATLANTA_AGENTS,
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