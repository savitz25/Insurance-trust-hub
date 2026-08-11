import type { InsuranceHub } from '@/types/agent';
import { getHubBySlug, getTopHubs } from '@/lib/hubs/registry';
import { SOUTH_FLORIDA_AGENTS } from '@/lib/hubs/data/south-florida-agents';
import type { HubAgent } from '@/types/agent';
import {
  classifyHubAgentListing,
  isIndexableListing,
} from '@/lib/provenance/public-listing';

export interface SpecialtyTopic {
  slug: string;
  path: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  subtitle: string;
  focus: string;
  marketSnapshot: string;
  healthNeeds: string[];
  featuredHubSlugs: { state: string; slug: string; label: string }[];
  filterAgents: (agents: HubAgent[]) => HubAgent[];
}

const SOUTH_FLORIDA_HUB = getHubBySlug('florida', 'miami-fort-lauderdale')!;

export const SPECIALTY_TOPICS: SpecialtyTopic[] = [
  {
    slug: 'health-insurance',
    path: '/hubs/health-insurance',
    title: 'Health Insurance Agents',
    metaTitle: 'Health Insurance Research by Market | ACA, Medicare & Group Plans',
    metaDescription:
      'Independent health insurance research across U.S. markets — ACA Marketplace, Medicare, and employer group context. Verified listings only when they meet our public research standard. No paid placements.',
    h1: 'Health Insurance Research Nationwide',
    subtitle: 'ACA · Medicare · Employer Group · Dental/Vision',
    focus: 'health',
    marketSnapshot:
      'Health insurance is a primary research focus of Insurance Trust Hub market pages. We only surface agencies that meet our public research standard — never by advertising spend, and never with invented inventory.',
    healthNeeds: [
      'ACA marketplace enrollment and subsidies',
      'Medicare Advantage vs supplement comparison',
      'Employer group plan transitions',
      'Dental, vision, and short-term gap coverage',
      'Bilingual enrollment support',
    ],
    featuredHubSlugs: [
      { state: 'florida', slug: 'miami-fort-lauderdale', label: 'South Florida' },
      { state: 'florida', slug: 'miami-dade', label: 'Miami-Dade' },
      { state: 'texas', slug: 'houston', label: 'Houston' },
      { state: 'california', slug: 'los-angeles', label: 'Los Angeles' },
      { state: 'new-york', slug: 'nyc-newark-jersey-city', label: 'NYC Metro' },
      { state: 'illinois', slug: 'chicago', label: 'Chicago' },
    ],
    filterAgents: (agents) => agents.filter((a) => a.isHealthFeatured).slice(0, 8),
  },
  {
    slug: 'medicare',
    path: '/hubs/medicare',
    title: 'Medicare Insurance Agents',
    metaTitle: 'Medicare Insurance Research | Advantage, Supplement & Part D',
    metaDescription:
      'Medicare research pathways for Advantage, Medigap, and Part D. Use official CMS tools and our educational guides. Verified agency listings appear only when they meet our research standard.',
    h1: 'Medicare Insurance Research',
    subtitle: 'Medicare Advantage · Medigap · Part D · Dual-Eligible',
    focus: 'medicare',
    marketSnapshot:
      'Medicare enrollment peaks in South Florida, Arizona, and Texas Sun Belt markets. Use official CMS tools alongside our educational guides. We list agencies only when they meet our public research standard — empty markets stay empty.',
    healthNeeds: [
      'Medicare Advantage plan comparison',
      'Medigap supplement selection',
      'Part D prescription formulary review',
      'Annual enrollment period (AEP) transitions',
      'Dual-eligible Medicaid-Medicare navigation',
    ],
    featuredHubSlugs: [
      { state: 'florida', slug: 'miami-fort-lauderdale', label: 'South Florida' },
      { state: 'florida', slug: 'palm-beach-county', label: 'Palm Beach' },
      { state: 'arizona', slug: 'phoenix', label: 'Phoenix' },
      { state: 'texas', slug: 'houston', label: 'Houston' },
      { state: 'california', slug: 'los-angeles', label: 'Los Angeles' },
    ],
    filterAgents: (agents) =>
      agents.filter((a) => a.isMedicareFeatured || a.healthFocus.some((f) => f.includes('Medicare'))).slice(0, 8),
  },
  {
    slug: 'aca',
    path: '/hubs/aca',
    title: 'ACA Marketplace Agents',
    metaTitle: 'ACA Marketplace Research | HealthCare.gov Pathways',
    metaDescription:
      'Educational ACA Marketplace research — subsidies, special enrollment, and plan tiers. Start with HealthCare.gov or your state exchange. Verified agency listings only when research-standard inventory exists.',
    h1: 'ACA Marketplace Research',
    subtitle: 'Marketplace · Subsidies · Special Enrollment · Family Plans',
    focus: 'aca',
    marketSnapshot:
      'ACA marketplace enrollment requires understanding subsidy cliffs, network narrowness, and special enrollment triggers. Use HealthCare.gov or your state exchange for enrollment. We list agencies only when they meet our public research standard.',
    healthNeeds: [
      'Premium tax credit optimization',
      'Special enrollment period eligibility',
      'Family and dependent coverage',
      'CSR Silver plan qualification',
      'Short-term gap coverage between jobs',
    ],
    featuredHubSlugs: [
      { state: 'florida', slug: 'miami-dade', label: 'Miami-Dade' },
      { state: 'texas', slug: 'dallas-fort-worth', label: 'DFW' },
      { state: 'california', slug: 'los-angeles', label: 'Los Angeles' },
      { state: 'georgia', slug: 'atlanta', label: 'Atlanta' },
      { state: 'north-carolina', slug: 'charlotte', label: 'Charlotte' },
    ],
    filterAgents: (agents) =>
      agents.filter((a) => a.healthFocus.includes('ACA Marketplace')).slice(0, 8),
  },
];

export function getSpecialtyTopic(slug: string): SpecialtyTopic | undefined {
  return SPECIALTY_TOPICS.find((t) => t.slug === slug);
}

export function getSouthFloridaHub(): InsuranceHub {
  return SOUTH_FLORIDA_HUB;
}

export function getSouthFloridaAgents(): HubAgent[] {
  // Stage 0: public specialty pages never list non-indexable seed inventory
  return SOUTH_FLORIDA_AGENTS.filter((a) =>
    isIndexableListing(classifyHubAgentListing(a))
  );
}

export function getTopicFeaturedHubs(topic: SpecialtyTopic): InsuranceHub[] {
  return topic.featuredHubSlugs
    .map(({ state, slug }) => getHubBySlug(state, slug))
    .filter((h): h is InsuranceHub => Boolean(h));
}

export function getNationalHealthHubs(limit = 12): InsuranceHub[] {
  return getTopHubs(limit);
}