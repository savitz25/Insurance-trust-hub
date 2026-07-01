export const SITE_NAME = 'Insurance Trust Hub';
export const SITE_URL = 'https://www.insurancetrusthub.com';
export const SITE_EMAIL = 'hello@insurancetrusthub.com';

export const DISCLAIMER =
  'Independent directory. Not affiliated with any insurance carrier, agency, or agent. All information is for research purposes only. Always verify licensing directly with your state\'s Department of Insurance, NAIC, or official sources before engaging any provider.';

export const INSURANCE_TYPES = [
  { value: 'homeowners', label: 'Homeowners' },
  { value: 'auto', label: 'Auto' },
  { value: 'health', label: 'Health' },
  { value: 'medicare', label: 'Medicare' },
  { value: 'renters', label: 'Renters' },
  { value: 'life', label: 'Life' },
  { value: 'umbrella', label: 'Umbrella' },
  { value: 'flood', label: 'Flood' },
] as const;

export type InsuranceType = (typeof INSURANCE_TYPES)[number]['value'];

export const SPECIALTIES = [
  'Relocation Experienced',
  'High-Value Property',
  'Medicare Specialists',
  'Bundle Experts',
  'Independent Agency',
  'Captive Agent',
  'Commercial Lines',
  'Personal Lines',
  'High-Risk Auto',
  'Flood & Wind',
  'ACA Marketplace',
  'Life & Annuities',
  'Small Business',
  'Bilingual Services',
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
] as const;

export const TRUST_STATS = [
  { label: 'Verified Agents', value: '850+' },
  { label: 'Reviews Analyzed', value: '15,200+' },
  { label: 'States & Counties', value: '50 States' },
  { label: 'Market Hubs', value: '54 Hubs' },
] as const;

export const MOVE_TRUST_HUB_URL = 'https://www.movetrusthub.com';