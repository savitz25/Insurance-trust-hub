/**
 * ACA Marketplace research guides — content clusters into the flagship tool.
 * Educational only; no invented premiums as permanent quotes.
 */

export type AcaMarketplaceGuide = {
  slug: string;
  /** Primary SEO keyword focus (one per page) */
  primaryKeyword: string;
  title: string;
  description: string;
  h1: string;
  subhead: string;
  locationLabel: string;
  stateName: 'Florida';
  /** Sample ZIPs for research hints only */
  sampleZips: Array<{ zip: string; label: string }>;
  hubHref: string;
  hubLabel: string;
  directoryHref: string;
  medicareCountyHref?: string;
  marketplaceCountyHref?: string;
  overview: string[];
  whoBuys: string[];
  costFactors: string[];
  whatToolShows: string[];
  faqs: Array<{ q: string; a: string }>;
  relatedGuides: string[];
};

const FLAGSHIP = '/tools/marketplace-plan-research';

export const ACA_MARKETPLACE_GUIDES: AcaMarketplaceGuide[] = [
  {
    slug: 'florida-aca-marketplace',
    primaryKeyword: 'ACA Marketplace Florida',
    title: 'Florida ACA Marketplace Guide — Research Plans by ZIP (2026)',
    description:
      'How to research ACA Marketplace coverage in Florida: what affects cost, how to use local plan landscape tools, subsidy context, and HealthCare.gov next steps. Educational only — no lead selling.',
    h1: 'Florida ACA Marketplace guide',
    subhead:
      'A practical research path for Floridians shopping individual-market health coverage — start with your ZIP landscape, then verify and enroll on HealthCare.gov.',
    locationLabel: 'Florida',
    stateName: 'Florida',
    sampleZips: [
      { zip: '33139', label: 'Miami Beach area' },
      { zip: '33301', label: 'Fort Lauderdale' },
      { zip: '33401', label: 'West Palm Beach' },
      { zip: '33602', label: 'Tampa' },
      { zip: '32801', label: 'Orlando' },
      { zip: '32202', label: 'Jacksonville' },
    ],
    hubHref: '/hubs/south-florida',
    hubLabel: 'South Florida agents hub',
    directoryHref: '/hubs/aca',
    overview: [
      'Florida has a large individual health insurance market. Many residents use the federal Marketplace (HealthCare.gov) during open enrollment or a special enrollment period after a qualifying life event.',
      'Costs and plan menus vary by county and household. A statewide guide cannot replace a ZIP-level look at how many plans and issuers CMS lists for your area — that is what our Marketplace plan research tool is for.',
      'This page is educational research from Insurance Trust Hub. We do not sell policies, process applications, or invent official premiums.',
    ],
    whoBuys: [
      'People without affordable employer coverage',
      'Self-employed workers and contractors',
      'Households leaving Medicaid/CHIP or other coverage',
      'Early retirees under 65 researching bridge coverage before Medicare',
    ],
    costFactors: [
      'Age and household composition (Marketplace age rating)',
      'Household income relative to the federal poverty level (premium tax credit eligibility education)',
      'Tobacco use where rating rules apply',
      'Metal tier (Bronze, Silver, Gold, etc.) and deductible/max out-of-pocket design',
      'County and local issuer competition — plan counts differ across Florida metros',
    ],
    whatToolShows: [
      'Approximate plan and issuer counts for your ZIP when the CMS Marketplace API is available',
      'Premium ranges and deductible ranges when CMS returns those fields',
      'Lower-premium, balanced, and higher-protection research path examples',
      'Assistance context when you add household income (educational — not an official award)',
    ],
    faqs: [
      {
        q: 'Does Florida use HealthCare.gov or a state exchange?',
        a: 'Florida uses the federal Marketplace at HealthCare.gov for individual ACA coverage. Always confirm enrollment steps, special enrollment periods, and official plan prices there.',
      },
      {
        q: 'Why do plan options change by ZIP?',
        a: 'Issuers file service areas by county/region. Moving across county lines — even within South Florida — can change which plans and networks are available. Research the ZIP where you will live and seek care.',
      },
      {
        q: 'Is a low monthly premium always the best deal?',
        a: 'Not necessarily. Bronze-style paths often have lower premiums and higher deductibles. Silver can matter if cost-sharing reductions may apply. Use total-cost thinking (premium + expected care), then verify on HealthCare.gov.',
      },
      {
        q: 'Can Insurance Trust Hub enroll me?',
        a: 'No. We provide independent educational research only. Official eligibility, subsidies, and enrollment are determined on HealthCare.gov (or with a licensed agent you choose).',
      },
      {
        q: 'What about Medicare in Florida?',
        a: 'Medicare is a separate pathway from the ACA Marketplace. If you are 65+ or otherwise Medicare-eligible, use our Medicare research tools and Medicare.gov — not Marketplace enrollment alone.',
      },
    ],
    relatedGuides: [
      'miami-dade-aca-marketplace',
      'broward-aca-marketplace',
      'palm-beach-aca-marketplace',
    ],
  },
  {
    slug: 'miami-dade-aca-marketplace',
    primaryKeyword: 'ACA plans in Miami',
    title: 'ACA Plans in Miami-Dade — Local Marketplace Research Guide',
    description:
      'Research ACA Marketplace coverage in Miami-Dade County: how to use ZIP-level plan landscape tools, cost factors, subsidy context, and HealthCare.gov next steps. Educational only.',
    h1: 'ACA Marketplace research in Miami-Dade',
    subhead:
      'Miami-Dade is one of Florida’s densest individual health markets. Use local ZIP research to understand plan volume and path types — then confirm everything on HealthCare.gov.',
    locationLabel: 'Miami-Dade County, Florida',
    stateName: 'Florida',
    sampleZips: [
      { zip: '33139', label: 'Miami Beach' },
      { zip: '33130', label: 'Brickell / downtown' },
      { zip: '33186', label: 'Kendall area' },
      { zip: '33012', label: 'Hialeah area' },
      { zip: '33157', label: 'Perrine / South Dade' },
    ],
    hubHref: '/hubs/florida/miami-dade',
    hubLabel: 'Miami-Dade insurance agents',
    directoryHref: '/hubs/south-florida',
    medicareCountyHref: '/medicare/fl/miami-dade',
    marketplaceCountyHref: '/marketplace/fl/miami-dade',
    overview: [
      'Miami-Dade shoppers often compare multilingual service, network access across the metro, and whether a lower premium is worth a higher deductible.',
      'Plan menus can differ by ZIP within the county. Treat any statewide “average” as context only — run your own ZIP in the research tool for a current CMS landscape snapshot when available.',
      'This guide is not a quote engine and does not list permanent official premiums.',
    ],
    whoBuys: [
      'Hospitality, tourism, and service workers without stable employer plans',
      'Self-employed professionals and small-business households',
      'Families evaluating Silver vs Bronze tradeoffs',
      'People newly eligible after a job or coverage change',
    ],
    costFactors: [
      'Age rating and who is on the application',
      'Income for educational premium tax credit / CSR framing',
      'Local issuer competition and metal mix in your ZIP',
      'Network fit for preferred hospitals and clinics (confirm on official plan documents)',
    ],
    whatToolShows: [
      'How many Marketplace plans CMS returns for a Miami-area ZIP',
      'Issuer depth and premium spreads when available',
      'Example lower-premium vs balanced vs higher-protection paths',
      'Optional income-based assistance education',
    ],
    faqs: [
      {
        q: 'What ZIP should I use for Miami-Dade research?',
        a: 'Use the ZIP for the home where you will live and primarily seek care. Different Miami-Dade ZIPs can surface different plan menus.',
      },
      {
        q: 'Are Spanish-language materials available?',
        a: 'HealthCare.gov offers language support. Licensed agents in South Florida often serve bilingual households — verify licenses on the Florida DFS site.',
      },
      {
        q: 'How is this different from Medicare research for Miami-Dade?',
        a: 'Medicare county dashboards and the Plan Complaint Index use different CMS extracts for 65+ / Medicare Advantage markets. ACA Marketplace research is for individual/family coverage under 65 (with limited exceptions).',
      },
      {
        q: 'Can I save my research?',
        a: 'Yes. After you run the Marketplace plan research tool, you can save a summary to My Insurance when signed in. That is a research history feature — not enrollment.',
      },
    ],
    relatedGuides: [
      'florida-aca-marketplace',
      'broward-aca-marketplace',
      'palm-beach-aca-marketplace',
    ],
  },
  {
    slug: 'broward-aca-marketplace',
    primaryKeyword: 'Marketplace insurance Broward County',
    title: 'Marketplace Insurance in Broward County — ACA Research Guide',
    description:
      'Research ACA Marketplace coverage in Broward County, Florida: ZIP landscape research, cost factors, subsidy education, and HealthCare.gov next steps. Independent research — no lead selling.',
    h1: 'ACA Marketplace research in Broward County',
    subhead:
      'From Fort Lauderdale coastal ZIPs to inland communities, Broward plan options are local. Start with a ZIP landscape, then verify official details on HealthCare.gov.',
    locationLabel: 'Broward County, Florida',
    stateName: 'Florida',
    sampleZips: [
      { zip: '33301', label: 'Fort Lauderdale' },
      { zip: '33308', label: 'Galt Ocean area' },
      { zip: '33064', label: 'Pompano Beach area' },
      { zip: '33021', label: 'Hollywood area' },
      { zip: '33351', label: 'Sunrise / Plantation area' },
    ],
    hubHref: '/hubs/florida/broward-county',
    hubLabel: 'Broward insurance agents',
    directoryHref: '/hubs/south-florida',
    medicareCountyHref: '/medicare/fl/broward',
    marketplaceCountyHref: '/marketplace/fl/broward',
    overview: [
      'Broward County sits between Miami-Dade and Palm Beach. Commuters sometimes assume one plan menu covers the whole tri-county area — in practice, Marketplace availability is still geography-based.',
      'Use educational tools to understand local plan volume and path types, then complete official shopping on HealthCare.gov.',
    ],
    whoBuys: [
      'Coastal and inland workers comparing network access',
      'Households comparing South Florida counties before a move',
      'Self-employed residents researching total cost, not just premium',
    ],
    costFactors: [
      'Age and household size',
      'Income / FPL position for assistance education',
      'Metal tier and deductible design',
      'Whether preferred providers appear in plan networks (confirm officially)',
    ],
    whatToolShows: [
      'Plan and issuer counts for a Broward ZIP when CMS data loads',
      'Premium and deductible ranges when provided',
      'Lower-premium vs more protective research path examples',
      'Assistance context if you enter income',
    ],
    faqs: [
      {
        q: 'I work in Miami but live in Broward — which ZIP do I use?',
        a: 'Marketplace eligibility and plan menus are generally based on where you live. Research your home ZIP, then confirm networks cover where you actually receive care.',
      },
      {
        q: 'Is Broward cheaper than Miami-Dade?',
        a: 'There is no single permanent answer. Issuer competition, ages, and income drive outcomes. Compare live landscapes for each ZIP rather than relying on anecdotes.',
      },
      {
        q: 'Where do I enroll?',
        a: 'On HealthCare.gov (Florida’s federal Marketplace pathway), or with a licensed professional you choose. Insurance Trust Hub does not enroll consumers.',
      },
      {
        q: 'What if the tool shows no live data?',
        a: 'We fail closed and label educational fallbacks. We never invent a full plan catalog. Retry later or go directly to HealthCare.gov Window Shopping.',
      },
    ],
    relatedGuides: [
      'florida-aca-marketplace',
      'miami-dade-aca-marketplace',
      'palm-beach-aca-marketplace',
    ],
  },
  {
    slug: 'palm-beach-aca-marketplace',
    primaryKeyword: 'Silver plan cost Palm Beach',
    title: 'Silver Plan Cost & ACA Research in Palm Beach County',
    description:
      'Educational guide to researching ACA Marketplace coverage and Silver vs other metal paths in Palm Beach County, Florida. Use ZIP landscape tools; verify on HealthCare.gov.',
    h1: 'ACA Marketplace research in Palm Beach County',
    subhead:
      'Palm Beach County shoppers often ask about Silver plan cost and whether a “balanced” path beats the cheapest premium. Research your ZIP landscape first — then confirm official prices on HealthCare.gov.',
    locationLabel: 'Palm Beach County, Florida',
    stateName: 'Florida',
    sampleZips: [
      { zip: '33401', label: 'West Palm Beach' },
      { zip: '33480', label: 'Palm Beach' },
      { zip: '33458', label: 'Jupiter area' },
      { zip: '33414', label: 'Wellington area' },
      { zip: '33444', label: 'Delray Beach area' },
    ],
    hubHref: '/hubs/florida/palm-beach-county',
    hubLabel: 'Palm Beach insurance agents',
    directoryHref: '/hubs/south-florida',
    medicareCountyHref: '/medicare/fl/palm-beach',
    marketplaceCountyHref: '/marketplace/fl/palm-beach',
    overview: [
      'Palm Beach County includes coastal and western communities with different care patterns. Silver plans matter especially when cost-sharing reductions may apply for eligible incomes — that is educational framing, not a determination.',
      'Any dollar figure you see in research tools is a landscape estimate for learning. Official Silver plan cost and CSR attachment only finalize on HealthCare.gov.',
    ],
    whoBuys: [
      'Households comparing Bronze premiums to Silver protection',
      'Workers without employer coverage across the county',
      'People evaluating total annual cost with expected care use',
    ],
    costFactors: [
      'Age rating and who is covered',
      'Income relative to FPL (PTC/CSR education)',
      'Metal tier — Silver vs Bronze is a common Palm Beach research question',
      'Local issuer options in your specific ZIP',
    ],
    whatToolShows: [
      'How many plans CMS lists for a Palm Beach–area ZIP',
      'Whether Silver and Bronze examples appear in path cards',
      'Premium and deductible ranges when available',
      'Assistance education when income is provided',
    ],
    faqs: [
      {
        q: 'Why focus on Silver plan cost in Palm Beach?',
        a: 'Many shoppers compare the lowest premium to a more balanced Silver-style path. If your income may support cost-sharing reductions, Silver can change total cost math — confirm eligibility officially.',
      },
      {
        q: 'Are tool premiums the same as HealthCare.gov?',
        a: 'Not guaranteed. Tools show educational landscape data from CMS when available, or labeled estimates. Always verify final premiums and assistance on HealthCare.gov.',
      },
      {
        q: 'Should I use the Cost Planner or the flagship ZIP tool?',
        a: 'Start with Marketplace plan research for local landscape and path examples. Use the Cost Planner for total annual cost scenarios and the ACA Savings Planner for PTC/CSR cliff education.',
      },
      {
        q: 'Where can I find local agents?',
        a: 'Browse our South Florida / Palm Beach hubs for research listings, then re-check licenses with Florida DFS. No forced lead form from these guides.',
      },
    ],
    relatedGuides: [
      'florida-aca-marketplace',
      'miami-dade-aca-marketplace',
      'broward-aca-marketplace',
    ],
  },
];

export function getAcaMarketplaceGuide(slug: string): AcaMarketplaceGuide | undefined {
  return ACA_MARKETPLACE_GUIDES.find((g) => g.slug === slug);
}

export function getAllAcaMarketplaceGuideSlugs(): string[] {
  return ACA_MARKETPLACE_GUIDES.map((g) => g.slug);
}

export { FLAGSHIP as MARKETPLACE_FLAGSHIP_PATH };
