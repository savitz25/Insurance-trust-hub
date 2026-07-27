import type { InsuranceType } from '@/lib/constants';

/** @deprecated use COMPASS_STEPS */
export interface AssessmentQuestion {
  id: string;
  question: string;
  options: { value: string; label: string }[];
}

export type FocusArea = {
  id: string;
  label: string;
  reason: string;
  insuranceType?: InsuranceType;
};

export type ResearchStep = {
  href: string;
  title: string;
  description: string;
  priority: number;
};

export interface AssessmentResult {
  insuranceTypes: InsuranceType[];
  specialties: string[];
  summary: string;
  directoryParams: Record<string, string>;
  /** Coverage Compass extensions */
  headline?: string;
  insight?: string;
  focusAreas?: FocusArea[];
  researchSteps?: ResearchStep[];
  situationLabel?: string;
}

export type CompassOption = {
  value: string;
  title: string;
  detail: string;
  icon: string;
};

export type CompassStep = {
  id: string;
  eyebrow: string;
  question: string;
  help?: string;
  options: CompassOption[];
};

export const COMPASS_STEPS: CompassStep[] = [
  {
    id: 'situation',
    eyebrow: 'Your situation',
    question: 'What best describes where you are right now?',
    help: 'Pick the closest match — you can always refine later with our research tools.',
    options: [
      {
        value: 'moving',
        title: 'Moving or recently relocated',
        detail: 'New state, new carriers, new rules',
        icon: 'truck',
      },
      {
        value: 'homeowner',
        title: 'Homeowner staying put',
        detail: 'Protect the place you already own',
        icon: 'home',
      },
      {
        value: 'renter',
        title: 'Renting',
        detail: 'Belongings, liability, and gaps landlords don’t cover',
        icon: 'building',
      },
      {
        value: 'business',
        title: 'Small business owner',
        detail: 'Liability, vehicles, and income risk',
        icon: 'briefcase',
      },
      {
        value: 'medicare',
        title: 'Turning 65 / new to Medicare',
        detail: 'Government programs + local market research',
        icon: 'heart',
      },
      {
        value: 'self-employed',
        title: 'Self-employed / contractor',
        detail: 'No employer plan — marketplace & personal coverages',
        icon: 'laptop',
      },
      {
        value: 'researching',
        title: 'Just researching options',
        detail: 'Exploring without a hard deadline',
        icon: 'compass',
      },
    ],
  },
  {
    id: 'household',
    eyebrow: 'Who to protect',
    question: 'Who needs protection right now?',
    options: [
      {
        value: 'individual',
        title: 'Just me',
        detail: 'Personal coverage priorities',
        icon: 'user',
      },
      {
        value: 'couple',
        title: 'Me + partner',
        detail: 'Shared household decisions',
        icon: 'users',
      },
      {
        value: 'family',
        title: 'Family with kids or dependents',
        detail: 'Income and health protection often rise in priority',
        icon: 'users-round',
      },
    ],
  },
  {
    id: 'worry',
    eyebrow: 'What worries you',
    question: 'What worries you most if something goes wrong?',
    options: [
      {
        value: 'medical',
        title: 'Medical bills & health coverage',
        detail: 'Doctor visits, hospital care, prescriptions',
        icon: 'stethoscope',
      },
      {
        value: 'home',
        title: 'Home, renters, or property damage',
        detail: 'Storms, theft, liability at your address',
        icon: 'home',
      },
      {
        value: 'income',
        title: 'Income if I couldn’t work',
        detail: 'Life insurance and financial protection',
        icon: 'wallet',
      },
      {
        value: 'liability',
        title: 'Lawsuits & major liability',
        detail: 'Protecting savings and assets',
        icon: 'shield',
      },
      {
        value: 'auto',
        title: 'Driving & vehicles',
        detail: 'Accidents, uninsured motorists, commuting',
        icon: 'car',
      },
      {
        value: 'everything',
        title: 'A little of everything',
        detail: 'You want a full-picture research path',
        icon: 'layers',
      },
    ],
  },
  {
    id: 'timing',
    eyebrow: 'Timing',
    question: 'What’s driving the timing for you?',
    options: [
      {
        value: 'new-home',
        title: 'New home or lease',
        detail: 'Closing, moving, or landlord requirements',
        icon: 'key',
      },
      {
        value: 'new-job',
        title: 'New job or lost coverage',
        detail: 'Open enrollment or special enrollment windows',
        icon: 'briefcase',
      },
      {
        value: 'retirement',
        title: 'Retirement or turning 65',
        detail: 'Medicare and income-protection shifts',
        icon: 'sunrise',
      },
      {
        value: 'renewal',
        title: 'Policy renewal coming up',
        detail: 'Shop before you auto-renew',
        icon: 'calendar',
      },
      {
        value: 'no-rush',
        title: 'No hard deadline',
        detail: 'Learning first, deciding later',
        icon: 'clock',
      },
    ],
  },
  {
    id: 'priority',
    eyebrow: 'Priorities',
    question: 'What matters most as you research?',
    options: [
      {
        value: 'cost',
        title: 'Lowest overall cost',
        detail: 'Premiums + out-of-pocket, not just the monthly bill',
        icon: 'coins',
      },
      {
        value: 'protection',
        title: 'Broad protection',
        detail: 'Fewer gaps, stronger limits',
        icon: 'shield-check',
      },
      {
        value: 'doctors',
        title: 'Keeping my doctors',
        detail: 'Participation and network research first',
        icon: 'stethoscope',
      },
      {
        value: 'trust',
        title: 'Trust & transparency',
        detail: 'Government data and verified local help',
        icon: 'badge-check',
      },
      {
        value: 'balance',
        title: 'Balanced approach',
        detail: 'Cost and coverage without extremes',
        icon: 'scale',
      },
    ],
  },
];

/** Legacy flat questions for any old imports */
export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = COMPASS_STEPS.map((s) => ({
  id: s.id,
  question: s.question,
  options: s.options.map((o) => ({ value: o.value, label: o.title })),
}));

const SITUATION_LABELS: Record<string, string> = Object.fromEntries(
  COMPASS_STEPS[0].options.map((o) => [o.value, o.title])
);

function stepInsight(stepId: string, value: string): string | null {
  if (stepId === 'situation') {
    const map: Record<string, string> = {
      moving:
        'Based on that, property and auto coverages often need a fresh look in the new market — networks and rules change by state.',
      homeowner:
        'Based on that, home and liability coverage often matter more than people expect — especially after renovations or equity growth.',
      renter:
        'Based on that, renters coverage is usually low-cost relative to replacing belongings and covering guest injuries.',
      business:
        'Based on that, commercial liability and vehicle use are common blind spots for small operators.',
      medicare:
        'Based on that, CMS research tools (complaints, counties, providers) are often more useful than generic “plan finder” marketing.',
      'self-employed':
        'Based on that, marketplace health total-cost planning usually beats shopping by monthly premium alone.',
      researching:
        'Based on that, we’ll keep the path educational — ranked research steps, not a sales pitch.',
    };
    return map[value] ?? null;
  }
  if (stepId === 'worry' && value === 'medical') {
    return 'Health paths change a lot by age and income — total annual cost and doctor participation usually beat sticker premium.';
  }
  if (stepId === 'household' && value === 'family') {
    return 'With dependents, income protection and health coverage often rise on the priority list next to property.';
  }
  return null;
}

export function getStepInsight(stepId: string, value: string): string | null {
  return stepInsight(stepId, value);
}

export function computeAssessment(answers: Record<string, string>): AssessmentResult {
  const types = new Set<InsuranceType>();
  const specialties = new Set<string>();
  const focus: FocusArea[] = [];
  const research: ResearchStep[] = [];

  const situation = answers.situation ?? 'researching';
  const household = answers.household ?? 'individual';
  const worry = answers.worry ?? 'everything';
  const timing = answers.timing ?? 'no-rush';
  const priority = answers.priority ?? 'balance';

  const addFocus = (area: FocusArea) => {
    if (!focus.some((f) => f.id === area.id)) focus.push(area);
  };
  const addResearch = (step: ResearchStep) => {
    if (!research.some((r) => r.href === step.href)) research.push(step);
  };

  // Situation → coverages
  if (situation === 'renter') {
    types.add('renters');
    addFocus({
      id: 'renters',
      label: 'Renters',
      reason: 'Belongings and liability the landlord policy won’t cover.',
      insuranceType: 'renters',
    });
  }
  if (situation === 'homeowner' || situation === 'moving') {
    types.add('homeowners');
    addFocus({
      id: 'home',
      label: 'Homeowners',
      reason: 'Dwelling, liability, and often separate flood or wind questions.',
      insuranceType: 'homeowners',
    });
  }
  if (situation === 'business') {
    types.add('umbrella');
    types.add('auto');
    specialties.add('Commercial Lines');
    specialties.add('Small Business');
    addFocus({
      id: 'business',
      label: 'Business & liability',
      reason: 'Operations, vehicles, and personal umbrella gaps.',
      insuranceType: 'umbrella',
    });
  }
  if (situation === 'medicare' || timing === 'retirement') {
    types.add('medicare');
    types.add('health');
    addFocus({
      id: 'medicare',
      label: 'Medicare research',
      reason: 'Use CMS-sourced tools before talking to anyone about Advantage vs Medigap.',
      insuranceType: 'medicare',
    });
  }
  if (situation === 'self-employed' || timing === 'new-job') {
    types.add('health');
    addFocus({
      id: 'health',
      label: 'Health / Marketplace',
      reason: 'No employer plan — total cost and subsidy context matter.',
      insuranceType: 'health',
    });
  }
  if (situation === 'moving') {
    specialties.add('Relocation Experienced');
  }

  // Worry
  if (worry === 'medical' || worry === 'everything') {
    types.add('health');
    if (situation === 'medicare' || timing === 'retirement') types.add('medicare');
    addFocus({
      id: 'health-worry',
      label: 'Health costs',
      reason: 'You flagged medical bills as a top concern.',
      insuranceType: 'health',
    });
  }
  if (worry === 'home' || worry === 'everything') {
    if (situation === 'renter') types.add('renters');
    else types.add('homeowners');
    addFocus({
      id: 'property',
      label: 'Property protection',
      reason: 'Home or renters risk was high on your list.',
    });
  }
  if (worry === 'income' || household === 'family') {
    types.add('life');
    addFocus({
      id: 'life',
      label: 'Life / income protection',
      reason:
        household === 'family'
          ? 'Dependents raise the value of income protection research.'
          : 'You want a plan if income stopped unexpectedly.',
      insuranceType: 'life',
    });
  }
  if (worry === 'liability') {
    types.add('umbrella');
    addFocus({
      id: 'umbrella',
      label: 'Umbrella liability',
      reason: 'Extra liability limits sit above home and auto.',
      insuranceType: 'umbrella',
    });
  }
  if (worry === 'auto' || worry === 'everything' || situation === 'business') {
    types.add('auto');
    addFocus({
      id: 'auto',
      label: 'Auto',
      reason: 'Vehicles and driving exposure remain a core personal risk.',
      insuranceType: 'auto',
    });
  }

  if (timing === 'new-home') {
    if (situation === 'renter') types.add('renters');
    else types.add('homeowners');
  }

  if (types.size === 0) {
    types.add('health');
    types.add('auto');
  }

  // Research routing — prioritized
  const medicareHeavy =
    situation === 'medicare' ||
    timing === 'retirement' ||
    types.has('medicare') ||
    (worry === 'medical' && (situation === 'medicare' || priority === 'doctors'));

  const healthHeavy =
    types.has('health') ||
    situation === 'self-employed' ||
    worry === 'medical' ||
    priority === 'cost' ||
    priority === 'doctors';

  if (healthHeavy) {
    addResearch({
      priority: priority === 'cost' || situation === 'self-employed' ? 1 : 2,
      href: '/tools/cost-estimator',
      title: 'Insurance Cost & Coverage Planner',
      description: 'Estimate premiums, deductibles, and total annual cost for marketplace-style paths.',
    });
  }

  if (medicareHeavy || priority === 'doctors' || worry === 'medical') {
    addResearch({
      priority: medicareHeavy ? 1 : 3,
      href: '/tools/medicare-provider-lookup',
      title: 'Medicare Provider Lookup',
      description: 'Search by doctor or organization name — does this provider show Medicare FFS participation?',
    });
    addResearch({
      priority: medicareHeavy ? 2 : 4,
      href: '/data/plan-complaint-index',
      title: 'Plan Complaint Index',
      description: 'CMS complaint rates for Medicare Advantage / Part D contracts.',
    });
    addResearch({
      priority: medicareHeavy ? 3 : 5,
      href: '/data/counties',
      title: 'County Medicare Dashboards',
      description: 'Local enrollment and quality context (South Florida live today).',
    });
    addResearch({
      priority: medicareHeavy ? 1 : 4,
      href: '/tools/medicare-plan-finder',
      title: 'Medicare Research Guide',
      description: 'Situation-based path — not a fake plan quoting tool.',
    });
  }

  if (!healthHeavy && !medicareHeavy) {
    addResearch({
      priority: 2,
      href: '/tools/cost-estimator',
      title: 'Insurance Cost & Coverage Planner',
      description: 'When health coverage is part of the picture, model total annual cost honestly.',
    });
  }

  if (priority === 'trust' || medicareHeavy) {
    addResearch({
      priority: 3,
      href: '/data/plan-complaint-index',
      title: 'Plan Complaint Index',
      description: 'Government-sourced transparency before marketing claims.',
    });
  }

  // Agents
  if (situation === 'medicare' || medicareHeavy) {
    addResearch({
      priority: 6,
      href: '/hubs/medicare',
      title: 'Medicare specialists directory',
      description: 'Verified agents when you want licensed human help — no lead form gate here.',
    });
  } else if (situation === 'self-employed' || healthHeavy) {
    addResearch({
      priority: 6,
      href: '/hubs/aca',
      title: 'ACA marketplace agents',
      description: 'Browse verified specialists when you are ready — no pressure.',
    });
  } else {
    addResearch({
      priority: 6,
      href: '/hubs/south-florida',
      title: 'South Florida verified agents',
      description: 'Local directory when you want human help after research.',
    });
  }

  addResearch({
    priority: 7,
    href: '/directory',
    title: 'Full agent directory',
    description: 'Filter by coverage type when you are ready to talk to someone.',
  });

  research.sort((a, b) => a.priority - b.priority);
  // Cap top steps shown, keep order
  const topResearch = research.slice(0, 6);

  // Limit focus areas to top 4
  const topFocus = focus.slice(0, 4);
  if (topFocus.length === 0) {
    topFocus.push({
      id: 'general',
      label: 'Core personal coverages',
      reason: 'A balanced starting set for most households.',
    });
  }

  const typeList = Array.from(types);
  const params: Record<string, string> = {
    type: typeList[0] ?? 'health',
  };
  if (specialties.has('Relocation Experienced')) {
    params.specialty = 'Relocation Experienced';
  }

  const situationLabel = SITUATION_LABELS[situation] ?? situation;
  const headline = 'Here’s the smartest research path for your situation';

  let summary = `You’re ${situationLabel.toLowerCase()}`;
  if (household === 'family') summary += ', protecting a family or dependents';
  else if (household === 'couple') summary += ', planning as a couple';
  summary += '. ';
  if (worry === 'medical') summary += 'Health costs are front of mind. ';
  if (worry === 'home') summary += 'Property risk is a top concern. ';
  if (worry === 'income') summary += 'Income protection matters. ';
  if (worry === 'liability') summary += 'Liability exposure is a priority. ';
  if (worry === 'auto') summary += 'Vehicle risk is a priority. ';
  summary +=
    'We ranked coverage focus areas and research tools — not products to buy, and not quotes.';

  const insight =
    priority === 'cost'
      ? 'When cost is the goal, look at total annual cost (premium + care), not the cheapest monthly sticker alone.'
      : priority === 'doctors'
        ? 'Start with provider participation and local plan context before comparing marketing materials.'
        : 'Independent research first — then talk with a verified agent if you want licensed help.';

  return {
    insuranceTypes: typeList,
    specialties: Array.from(specialties),
    summary,
    directoryParams: params,
    headline,
    insight,
    focusAreas: topFocus,
    researchSteps: topResearch,
    situationLabel,
  };
}
