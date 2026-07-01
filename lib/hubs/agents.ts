import type { HubAgent, InsuranceHub } from '@/types/agent';
import type { InsuranceType, Specialty } from '@/lib/constants';
import { SOUTH_FLORIDA_AGENTS, isSouthFloridaHub } from '@/lib/hubs/data/south-florida-agents';

const HEALTH_AGENCY_NAMES = [
  'Summit Health Partners',
  'Guardian Benefits Group',
  'Heritage Medicare Advisors',
  'Clearview Insurance Agency',
  'Beacon Health & Life',
  'Pioneer Coverage Solutions',
  'Atlas Benefits Brokers',
  'Cornerstone Health Insurance',
  'Northstar Medicare Group',
  'Evergreen ACA Navigators',
  'Bridgeport Health Advisors',
  'Keystone Insurance Partners',
  'Horizon Benefits Agency',
  'Anchor Health & Wellness',
  'Sterling Medicare Solutions',
];

const MULTILINE_NAMES = [
  'Coastal Insurance Group',
  'Premier Risk Advisors',
  'Liberty Coverage Agency',
  'Oakwood Insurance Services',
  'Crescent Bay Insurance',
  'Ridgeline Insurance Partners',
  'Valley Trust Insurance',
  'MetroShield Agency',
  'Pacific Crest Insurance',
  'Heartland Coverage Group',
];

const HEALTH_DESCRIPTIONS = [
  (hub: InsuranceHub) =>
    `Serving ${hub.localDescriptor} with ACA marketplace, Medicare Advantage, and employer group plans since ${2008 + (hub.priority % 10)}. Top-rated for subsidy optimization and enrollment support.`,
  (hub: InsuranceHub) =>
    `Independent health insurance brokerage specializing in Medicare supplements and Part D for ${hub.shortName} retirees. BBB A+ rated with bilingual enrollment staff.`,
  (hub: InsuranceHub) =>
    `Trusted ACA navigator for ${hub.shortName} families — expert in marketplace transitions, dental/vision riders, and short-term gap coverage during job changes.`,
  (hub: InsuranceHub) =>
    `Diverse-population health broker serving ${hub.localDescriptor}. Certified for ACA, Medicaid transitions, and culturally competent Medicare counseling.`,
  (hub: InsuranceHub) =>
    `Group benefits specialist for ${hub.shortName} employers. Designs health plans for small businesses, professional associations, and union-adjacent groups.`,
  (hub: InsuranceHub) =>
    `Medicare Advantage comparison agency helping ${hub.shortName} seniors navigate plan networks, prescription formularies, and supplement options.`,
];

const MULTILINE_DESCRIPTIONS = [
  (hub: InsuranceHub) =>
    `Full-service independent agency in ${hub.shortName} bundling auto, homeowners, and life with health referrals. ${hub.enrollmentHighlight.split(' ')[0]} local market expertise.`,
  (hub: InsuranceHub) =>
    `Multi-line brokerage serving ${hub.localDescriptor}. Strong in property/casualty with dedicated health insurance division for employer and individual plans.`,
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function slugify(name: string, hub: InsuranceHub): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${hub.slug}`;
}

function buildAgent(
  hub: InsuranceHub,
  name: string,
  index: number,
  opts: Partial<HubAgent> & { isHealthFeatured?: boolean }
): HubAgent {
  const seed = hash(`${hub.slug}-${name}-${index}`);
  const rating = 4.2 + (seed % 8) / 10;
  const reviewCount = 45 + (seed % 280);
  const trustScore = 88 + (seed % 12);
  const localExp = 85 + (seed % 15);
  const isHealth = opts.isHealthFeatured ?? index < 6;

  const healthTypes: InsuranceType[] = ['health', 'medicare'];
  const multiTypes: InsuranceType[] = ['auto', 'homeowners', 'life', 'renters'];

  return {
    id: `${hub.slug}-agent-${index}`,
    slug: slugify(name, hub),
    name,
    division: isHealth ? 'Health Insurance Division' : undefined,
    city: hub.shortName.split(' ')[0],
    state: hub.stateCode,
    agentType: isHealth ? 'health_specialist' : 'independent_agency',
    insuranceTypes: isHealth
      ? [...healthTypes, ...(seed % 2 ? (['renters'] as InsuranceType[]) : [])]
      : [...multiTypes, ...(seed % 3 === 0 ? (['health'] as InsuranceType[]) : [])],
    healthFocus: isHealth
      ? opts.isMedicareFeatured
        ? ['Medicare Advantage', 'Medicare Supplement']
        : opts.isDiversePopulations
          ? ['ACA Marketplace', 'Diverse Populations', 'Dental/Vision']
          : ['ACA Marketplace', 'Employer/Group', 'Dental/Vision']
      : seed % 2
        ? ['ACA Marketplace']
        : [],
    specialties: (isHealth
      ? ['Medicare Specialists', 'Relocation Experienced', 'Bundle Experts'].slice(0, 2 + (seed % 2))
      : ['Independent Agency', 'Personal Lines', 'Bundle Experts']) as Specialty[],
    rating: Math.round(rating * 10) / 10,
    reviewCount,
    shortDescription: isHealth
      ? HEALTH_DESCRIPTIONS[seed % HEALTH_DESCRIPTIONS.length](hub)
      : MULTILINE_DESCRIPTIONS[seed % MULTILINE_DESCRIPTIONS.length](hub),
    licenseNumber: `${hub.stateCode}-${100000 + (seed % 899999)}`,
    trustScore,
    localMarketExperience: localExp,
    avgResponseHours: 1 + (seed % 4),
    bbbRating: seed % 5 === 0 ? 'A' : 'A+',
    isVerified: true,
    isHealthFeatured: isHealth,
    isMedicareFeatured: opts.isMedicareFeatured ?? false,
    isDiversePopulations: opts.isDiversePopulations ?? false,
    yearsInBusiness: 8 + (seed % 22),
    website: undefined,
  };
}

function sortAgents(agents: HubAgent[]): HubAgent[] {
  return [...agents].sort((a, b) => {
    if (a.featuredRank != null && b.featuredRank != null) {
      return a.featuredRank - b.featuredRank;
    }
    if (a.isHealthFeatured !== b.isHealthFeatured) return a.isHealthFeatured ? -1 : 1;
    return b.trustScore - a.trustScore;
  });
}

export function getAgentsForHub(hub: InsuranceHub): HubAgent[] {
  if (isSouthFloridaHub(hub.slug)) {
    return sortAgents(SOUTH_FLORIDA_AGENTS);
  }

  const agents: HubAgent[] = [];

  // 4-6 featured health specialists
  const healthCount = hub.healthInsuranceDensity === 'very-high' ? 6 : 4;
  for (let i = 0; i < healthCount; i++) {
    const name = HEALTH_AGENCY_NAMES[(hub.priority + i) % HEALTH_AGENCY_NAMES.length];
    agents.push(
      buildAgent(hub, name, i, {
        isHealthFeatured: true,
        isMedicareFeatured: i === 1,
        isDiversePopulations: i === 3,
      })
    );
  }

  // 6-10 multi-line agencies
  const multiCount = hub.priority <= 15 ? 8 : 6;
  for (let i = 0; i < multiCount; i++) {
    const name = MULTILINE_NAMES[(hub.priority + i) % MULTILINE_NAMES.length];
    agents.push(buildAgent(hub, `${name}`, healthCount + i, { isHealthFeatured: false }));
  }

  return sortAgents(agents);
}

export function getFeaturedHealthAgents(hub: InsuranceHub): HubAgent[] {
  const limit = isSouthFloridaHub(hub.slug) ? 8 : 6;
  return getAgentsForHub(hub).filter((a) => a.isHealthFeatured).slice(0, limit);
}

export function getHubStats(hub: InsuranceHub) {
  const agents = getAgentsForHub(hub);
  const healthAgents = agents.filter((a) => a.isHealthFeatured);
  const avgTrust =
    Math.round(agents.reduce((s, a) => s + a.trustScore, 0) / agents.length);
  const totalReviews = agents.reduce((s, a) => s + a.reviewCount, 0);

  return {
    totalAgents: agents.length,
    healthSpecialists: healthAgents.length,
    verified: agents.filter((a) => a.isVerified).length,
    avgTrustScore: avgTrust,
    totalReviews,
  };
}