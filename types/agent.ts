import type { InsuranceType, Specialty } from '@/lib/constants';

export type AgentType = 'independent_agency' | 'brokerage' | 'captive_agent' | 'health_specialist';

export type HealthFocus =
  | 'ACA Marketplace'
  | 'Medicare Advantage'
  | 'Medicare Supplement'
  | 'Employer/Group'
  | 'Short-Term'
  | 'Dental/Vision'
  | 'Diverse Populations';

export interface HubAgent {
  id: string;
  slug: string;
  name: string;
  division?: string;
  city: string;
  state: string;
  agentType: AgentType;
  insuranceTypes: InsuranceType[];
  healthFocus: HealthFocus[];
  specialties: Specialty[];
  rating: number;
  reviewCount: number;
  shortDescription: string;
  licenseNumber: string;
  trustScore: number;
  localMarketExperience: number;
  avgResponseHours: number;
  bbbRating: string;
  isVerified: boolean;
  isHealthFeatured: boolean;
  isMedicareFeatured: boolean;
  isDiversePopulations: boolean;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  county?: string;
  contactPerson?: string;
  reviewHighlight?: string;
  awards?: string[];
  yearsInBusiness: number;
  featuredRank?: number;
}

export interface InsuranceHub {
  slug: string;
  stateSlug: string;
  stateCode: string;
  stateName: string;
  msaName: string;
  shortName: string;
  population: number;
  enrollmentHighlight: string;
  localDescriptor: string;
  priority: number;
  zipCodes: string[];
  healthInsuranceDensity: 'very-high' | 'high' | 'moderate';
  marketSnapshot: string;
  healthNeeds: string[];
  metaTitle: string;
  metaDescription: string;
}