import type { InsuranceType } from '@/lib/constants';

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: { value: string; label: string }[];
}

export interface AssessmentResult {
  insuranceTypes: InsuranceType[];
  specialties: string[];
  summary: string;
  directoryParams: Record<string, string>;
}

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'situation',
    question: 'What best describes your situation?',
    options: [
      { value: 'moving', label: 'Moving or recently relocated' },
      { value: 'homeowner', label: 'Homeowner staying in place' },
      { value: 'renter', label: 'Renting an apartment or home' },
      { value: 'business', label: 'Small business owner' },
    ],
  },
  {
    id: 'vehicles',
    question: 'Do you own or lease vehicles?',
    options: [
      { value: 'yes', label: 'Yes, one or more vehicles' },
      { value: 'no', label: 'No vehicles' },
    ],
  },
  {
    id: 'dependents',
    question: 'Do you have dependents who rely on your income?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'flood',
    question: 'Is your property in a flood-prone or coastal area?',
    options: [
      { value: 'yes', label: 'Yes or unsure' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'assets',
    question: 'Do you have significant assets to protect (home equity, savings)?',
    options: [
      { value: 'high', label: 'Yes, substantial assets' },
      { value: 'moderate', label: 'Moderate assets' },
      { value: 'low', label: 'Limited assets' },
    ],
  },
];

export function computeAssessment(answers: Record<string, string>): AssessmentResult {
  const types = new Set<InsuranceType>();
  const specialties = new Set<string>();
  const params: Record<string, string> = {};

  const situation = answers.situation;
  const vehicles = answers.vehicles;
  const dependents = answers.dependents;
  const flood = answers.flood;
  const assets = answers.assets;

  if (vehicles === 'yes') types.add('auto');
  if (situation === 'renter') types.add('renters');
  if (situation === 'homeowner' || situation === 'moving') types.add('homeowners');
  if (situation === 'business') {
    types.add('umbrella');
    types.add('auto');
    specialties.add('Commercial Lines');
    specialties.add('Small Business');
  }
  if (dependents === 'yes') types.add('life');
  if (flood === 'yes') {
    types.add('flood');
    specialties.add('Flood & Wind');
  }
  if (assets === 'high') types.add('umbrella');

  if (situation === 'moving') {
    specialties.add('Relocation Experienced');
    params.specialty = 'Relocation Experienced';
  }

  if (types.size === 0) types.add('auto');

  const typeList = Array.from(types);
  const primaryType = typeList[0];
  params.type = primaryType;

  const labels = typeList.map((t) => {
    const map: Record<InsuranceType, string> = {
      auto: 'auto insurance',
      homeowners: 'homeowners insurance',
      renters: 'renters insurance',
      life: 'life insurance',
      health: 'health insurance',
      medicare: 'Medicare coverage',
      umbrella: 'umbrella liability',
      flood: 'flood insurance',
    };
    return map[t];
  });

  let summary = `Based on your answers, we suggest exploring ${labels.join(', ')}.`;
  if (situation === 'moving') {
    summary += ' Independent agents who work with relocating families can compare carriers in your new state.';
  }
  if (flood === 'yes') {
    summary += ' Confirm flood coverage separately — standard homeowners policies typically exclude flood.';
  }

  return {
    insuranceTypes: typeList,
    specialties: Array.from(specialties),
    summary,
    directoryParams: params,
  };
}