import type { InsuranceHub } from '@/types/agent';
import { getHubBySlug, getTopHubs } from '@/lib/hubs/registry';
import { SOUTH_FLORIDA_AGENTS } from '@/lib/hubs/data/south-florida-agents';
import type { HubAgent } from '@/types/agent';

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
    metaTitle: 'Health Insurance Agents by Market (2026) | ACA, Medicare & Group Plans',
    metaDescription:
      'Find verified health insurance agents across 54 U.S. markets. ACA marketplace, Medicare Advantage, employer group plans — DOI verified, no paid placements.',
    h1: 'Health Insurance Specialists Nationwide',
    subtitle: 'ACA · Medicare · Employer Group · Dental/Vision',
    focus: 'health',
    marketSnapshot:
      'Health insurance is the primary focus of every Insurance Trust Hub market page. We rank independent agents by licensing verification, review sentiment, Medicare/ACA specialization, and local market experience — never by advertising spend.',
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
    metaTitle: 'Medicare Insurance Agents (2026) | Advantage, Supplement & Part D',
    metaDescription:
      'Compare verified Medicare agents for Advantage, Medigap supplement, and Part D plans. South Florida, Sun Belt, and national metro specialists — DFS/DOI verified.',
    h1: 'Medicare Insurance Specialists',
    subtitle: 'Medicare Advantage · Medigap · Part D · Dual-Eligible',
    focus: 'medicare',
    marketSnapshot:
      'Medicare enrollment peaks in South Florida, Arizona, and Texas Sun Belt markets. Our featured agents specialize in side-by-side Advantage vs supplement comparisons, network adequacy for preferred hospitals, and bilingual counseling for diverse senior populations.',
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
    metaTitle: 'ACA / Obamacare Insurance Agents (2026) | Marketplace Enrollment Help',
    metaDescription:
      'Find verified ACA marketplace agents for HealthCare.gov and state exchanges. Subsidy optimization, special enrollment periods, and family plan guidance.',
    h1: 'ACA Marketplace Insurance Agents',
    subtitle: 'Obamacare · Subsidies · Special Enrollment · Family Plans',
    focus: 'aca',
    marketSnapshot:
      'ACA marketplace enrollment requires understanding subsidy cliffs, network narrowness, and special enrollment triggers. Featured agents help families compare Silver, Gold, and Bronze tiers while verifying hospital and specialist networks in your ZIP code.',
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
  return SOUTH_FLORIDA_AGENTS;
}

export function getTopicFeaturedHubs(topic: SpecialtyTopic): InsuranceHub[] {
  return topic.featuredHubSlugs
    .map(({ state, slug }) => getHubBySlug(state, slug))
    .filter((h): h is InsuranceHub => Boolean(h));
}

export function getNationalHealthHubs(limit = 12): InsuranceHub[] {
  return getTopHubs(limit);
}