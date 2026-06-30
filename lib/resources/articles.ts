export interface ArticleSection {
  heading: string;
  content: string;
  bullets?: string[];
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  readTime: string;
  category: string;
  sections: ArticleSection[];
  relatedLinks: { href: string; label: string }[];
}

export const ARTICLES: Article[] = [
  {
    slug: 'how-to-choose-insurance-agent',
    title: 'How to Choose an Insurance Agent (2026 Guide)',
    description:
      'Learn the difference between captive and independent agents, what to ask before buying, and how to verify licensing in your state.',
    publishedAt: '2026-01-15',
    updatedAt: '2026-06-01',
    readTime: '8 min',
    category: 'Getting Started',
    sections: [
      {
        heading: 'Independent vs. captive agents',
        content:
          'Independent agents represent multiple carriers and can shop the market on your behalf. Captive agents represent one insurer and may offer deeper product knowledge for that brand. Neither is inherently better — the right choice depends on your coverage needs and how many quotes you want to compare.',
        bullets: [
          'Independent: broader carrier access, ideal for comparing rates',
          'Captive: single-carrier expertise, often strong for bundled loyalty discounts',
          'Both must be licensed in your state to sell insurance',
        ],
      },
      {
        heading: 'Questions to ask before you buy',
        content:
          'A trustworthy agent explains coverage gaps, not just premium price. Ask about deductibles, exclusions, claims handling, and renewal history in your zip code.',
        bullets: [
          'Which carriers did you compare for my profile?',
          'What is not covered under this policy?',
          'How have rates changed in my area over the past three years?',
          'Who handles claims — you or a call center?',
        ],
      },
      {
        heading: 'Verify licensing and complaints',
        content:
          'Every state maintains an insurance department database. Look up the agent and agency license, then check consumer complaint indices. Insurance Trust Hub listings include license numbers when available, but always confirm directly with your state regulator.',
      },
    ],
    relatedLinks: [
      { href: '/directory', label: 'Browse Insurance Agencies' },
      { href: '/resources/independent-vs-captive', label: 'Independent vs. Captive Guide' },
      { href: '/contact', label: 'Report a Data Issue' },
    ],
  },
  {
    slug: 'auto-insurance-costs-by-state',
    title: 'Auto Insurance Costs by State: What to Expect in 2026',
    description:
      'Average auto insurance premiums vary dramatically by state, driving record, and coverage limits. See what drives costs and how to lower your bill.',
    publishedAt: '2026-02-01',
    updatedAt: '2026-06-01',
    readTime: '10 min',
    category: 'Auto Insurance',
    sections: [
      {
        heading: 'Why rates differ so much',
        content:
          'State laws, litigation climate, weather claims, population density, and uninsured motorist rates all influence premiums. No-fault states and PIP requirements often push base rates higher. Urban counties typically exceed rural averages within the same state.',
      },
      {
        heading: 'Coverage levels that affect price',
        content:
          'Minimum liability policies cost less but expose you to lawsuits after serious accidents. Most financial advisors recommend 100/300/100 liability or higher where affordable, plus matching uninsured/underinsured motorist coverage.',
        bullets: [
          'Liability: pays others when you are at fault',
          'Collision & comprehensive: protect your vehicle',
          'UM/UIM: covers you when the other driver is uninsured',
        ],
      },
      {
        heading: 'Practical ways to save',
        content:
          'Bundle home and auto, maintain continuous coverage, ask about telematics programs, and review deductibles annually. An independent agent can re-shop carriers at renewal instead of accepting automatic increases.',
      },
    ],
    relatedLinks: [
      { href: '/tools/cost-estimator', label: 'Premium Cost Estimator' },
      { href: '/destinations/texas', label: 'Texas Insurance Guide' },
      { href: '/destinations/florida', label: 'Florida Insurance Guide' },
    ],
  },
  {
    slug: 'homeowners-insurance-basics',
    title: 'Homeowners Insurance Basics: HO-3 Policies Explained',
    description:
      'Understand dwelling coverage, personal property limits, liability protection, and the exclusions that surprise homeowners after a claim.',
    publishedAt: '2026-02-10',
    updatedAt: '2026-06-01',
    readTime: '9 min',
    category: 'Home Insurance',
    sections: [
      {
        heading: 'Core HO-3 coverages',
        content:
          'Most homeowners buy HO-3 policies covering the structure on an open-perils basis and personal property on a named-perils basis. Dwelling limits should reflect rebuild cost, not market value or purchase price.',
        bullets: [
          'Coverage A — Dwelling',
          'Coverage B — Other structures',
          'Coverage C — Personal property',
          'Coverage D — Loss of use',
          'Coverage E — Personal liability',
        ],
      },
      {
        heading: 'Common exclusions',
        content:
          'Flood, earthquake, wear and tear, and many sewer backups are excluded unless endorsed. In hurricane-prone states, wind deductibles may apply as a percentage of dwelling coverage rather than a flat dollar amount.',
      },
      {
        heading: 'Replacement cost vs. actual cash value',
        content:
          'Replacement cost endorsements pay to rebuild or replace without depreciation deductions. Actual cash value policies cost less upfront but pay less after aging roofs or damaged contents.',
      },
    ],
    relatedLinks: [
      { href: '/resources/flood-insurance-guide', label: 'Flood Insurance Guide' },
      { href: '/resources/umbrella-insurance', label: 'Umbrella Insurance' },
      { href: '/destinations/california', label: 'California Home Insurance' },
    ],
  },
  {
    slug: 'flood-insurance-guide',
    title: 'Flood Insurance Guide: NFIP vs. Private Policies',
    description:
      'Standard homeowners policies exclude flood. Learn when NFIP coverage makes sense, how private flood markets work, and what mortgage lenders require.',
    publishedAt: '2026-02-20',
    updatedAt: '2026-06-01',
    readTime: '7 min',
    category: 'Home Insurance',
    sections: [
      {
        heading: 'Do you need flood insurance?',
        content:
          'If you are in a FEMA high-risk zone with a federally backed mortgage, flood insurance is required. Many floods happen outside mapped zones — over 20% of NFIP claims come from moderate- to low-risk areas.',
      },
      {
        heading: 'NFIP basics',
        content:
          'The National Flood Insurance Program caps dwelling coverage and has waiting periods for new policies. It remains the default option in many communities, especially for older homes in established flood zones.',
      },
      {
        heading: 'Private flood alternatives',
        content:
          'Private carriers may offer higher limits, shorter waiting periods, and more flexible basement coverage. An independent agent can compare NFIP and private options using your elevation certificate and loss history.',
      },
    ],
    relatedLinks: [
      { href: '/destinations/florida', label: 'Florida Insurance' },
      { href: '/destinations/texas', label: 'Texas Insurance' },
      { href: '/tools/cost-estimator', label: 'Cost Estimator' },
    ],
  },
  {
    slug: 'renters-insurance',
    title: 'Renters Insurance: What It Covers and Why It Costs So Little',
    description:
      'Renters policies protect personal property, liability, and additional living expenses. See typical premiums and what landlords require.',
    publishedAt: '2026-03-01',
    updatedAt: '2026-06-01',
    readTime: '6 min',
    category: 'Renters',
    sections: [
      {
        heading: 'What renters insurance covers',
        content:
          'HO-4 policies cover belongings from theft, fire, and many perils. Liability coverage helps if a guest is injured or you accidentally damage someone else\'s property. Loss-of-use coverage pays temporary housing if your unit is uninhabitable.',
      },
      {
        heading: 'Typical costs',
        content:
          'Nationwide averages often fall between $15 and $30 per month for $30,000–$50,000 contents limits. Urban markets like New York City may run higher; Midwest cities often land lower.',
      },
      {
        heading: 'Landlord requirements',
        content:
          'Many leases require proof of renters insurance with minimum liability limits. Listing your landlord as an interested party ensures they receive cancellation notices.',
      },
    ],
    relatedLinks: [
      { href: '/destinations/new-york', label: 'New York Insurance' },
      { href: '/destinations/illinois', label: 'Illinois Insurance' },
      { href: '/directory?type=renters', label: 'Find Renters Insurance Agents' },
    ],
  },
  {
    slug: 'umbrella-insurance',
    title: 'Umbrella Insurance: Extra Liability Protection Explained',
    description:
      'Umbrella policies add $1M+ liability coverage above your auto and home limits. Learn who needs one and typical costs.',
    publishedAt: '2026-03-10',
    updatedAt: '2026-06-01',
    readTime: '5 min',
    category: 'Liability',
    sections: [
      {
        heading: 'How umbrella policies work',
        content:
          'Personal umbrella insurance sits above your underlying auto and homeowners liability limits. When a claim exceeds those limits, the umbrella responds — protecting wages, savings, and future earnings from lawsuits.',
      },
      {
        heading: 'Who should consider a umbrella',
        content:
          'Homeowners with pools, teen drivers, rental properties, or public-facing side businesses benefit most. High-net-worth households often stack umbrellas with excess uninsured motorist coverage.',
        bullets: [
          'Teen drivers on the policy',
          'Swimming pool or trampoline',
          'Rental property ownership',
          'Board seats or volunteer leadership roles',
        ],
      },
      {
        heading: 'Cost expectations',
        content:
          'A $1 million umbrella often costs $150–$300 per year when bundled with the same carrier as auto and home. Underlying liability limits must meet carrier minimums — typically $250k/$500k auto and $300k home.',
      },
    ],
    relatedLinks: [
      { href: '/resources/homeowners-insurance-basics', label: 'Homeowners Basics' },
      { href: '/resources/auto-insurance-costs-by-state', label: 'Auto Insurance Costs' },
      { href: '/directory', label: 'Find an Agent' },
    ],
  },
  {
    slug: 'independent-vs-captive',
    title: 'Independent vs. Captive Insurance Agents: Which Is Right for You?',
    description:
      'Compare how independent and captive agents are paid, how they shop carriers, and when each model serves buyers best.',
    publishedAt: '2026-03-20',
    updatedAt: '2026-06-01',
    readTime: '7 min',
    category: 'Getting Started',
    sections: [
      {
        heading: 'Business model differences',
        content:
          'Captive agents sell products from one insurer — State Farm, Allstate, Farmers, and similar brands. Independent agents contract with many carriers and earn commissions per policy placed. Both earn commissions; neither should charge you a separate broker fee for standard personal lines.',
      },
      {
        heading: 'When independents shine',
        content:
          'Hard-to-place risks, non-standard auto, coastal property, and small business packages often benefit from an independent agent who can submit to multiple markets in one conversation.',
      },
      {
        heading: 'When captives shine',
        content:
          'If you prefer a single branded app, loyalty multi-policy discounts, and a long relationship with one insurer, captive agents offer deep product training and streamlined service within that ecosystem.',
      },
    ],
    relatedLinks: [
      { href: '/resources/how-to-choose-insurance-agent', label: 'How to Choose an Agent' },
      { href: '/directory', label: 'Agency Directory' },
      { href: '/about', label: 'About Insurance Trust Hub' },
    ],
  },
  {
    slug: 'hurricane-prep-insurance',
    title: 'Hurricane Prep and Insurance: Florida & Coastal Homeowner Checklist',
    description:
      'Wind deductibles, mitigation credits, and flood gaps — prepare your coastal home policy before storm season.',
    publishedAt: '2026-04-01',
    updatedAt: '2026-06-01',
    readTime: '8 min',
    category: 'Home Insurance',
    sections: [
      {
        heading: 'Before storm season',
        content:
          'Review declarations pages for wind and hurricane deductibles. Document belongings with photos and receipts. Trim trees, install shutters or impact glass where possible, and confirm flood coverage — wind policies do not cover storm surge.',
      },
      {
        heading: 'Wind mitigation inspections',
        content:
          'Florida and other coastal states may offer premium credits for roof shape, strapping, and opening protection. A wind mitigation form completed by a licensed inspector can reduce premiums for years.',
        bullets: [
          'Roof covering and deck attachment',
          'Roof-to-wall connection',
          'Opening protection (shutters, impact glass)',
          'Secondary water resistance',
        ],
      },
      {
        heading: 'After a storm',
        content:
          'Document damage immediately, mitigate further loss with tarps and dry-out, and file claims promptly. Keep in mind that assignment of benefits scams target stressed homeowners — work directly with your carrier and licensed adjusters.',
      },
    ],
    relatedLinks: [
      { href: '/destinations/florida', label: 'Florida Insurance Hub' },
      { href: '/destinations/north-carolina', label: 'North Carolina Insurance' },
      { href: '/resources/flood-insurance-guide', label: 'Flood Insurance Guide' },
    ],
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getAllArticleSlugs(): string[] {
  return ARTICLES.map((a) => a.slug);
}