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
  stateName:
    | 'Florida'
    | 'Texas'
    | 'Georgia'
    | 'North Carolina'
    | 'Pennsylvania'
    | 'New Jersey'
    | 'New York';
  /** Short regulator name for license re-check copy */
  licenseRegulator: string;
  /** Sample ZIPs for research hints only */
  sampleZips: Array<{ zip: string; label: string }>;
  hubHref: string;
  hubLabel: string;
  directoryHref: string;
  medicareCountyHref?: string;
  marketplaceCountyHref?: string;
  /**
   * Official enrollment destinations in Trust & next steps.
   * Defaults to HealthCare.gov when omitted (federal Marketplace states).
   * State-based Marketplaces (e.g. NY State of Health) should set this explicitly.
   */
  enrollmentLinks?: Array<{ href: string; label: string }>;
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
    licenseRegulator: 'Florida DFS',
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
    licenseRegulator: 'Florida DFS',
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
    licenseRegulator: 'Florida DFS',
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
    licenseRegulator: 'Florida DFS',
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
  // ── Texas cluster (Tier 2A) ───────────────────────────────────────────────
  {
    slug: 'texas-aca-marketplace',
    primaryKeyword: 'ACA Marketplace Texas',
    title: 'Texas ACA Marketplace Guide — Research Plans by ZIP (2026)',
    description:
      'How to research ACA Marketplace coverage in Texas: ZIP-level plan landscape tools, cost factors, subsidy education, and HealthCare.gov next steps. Educational only — no lead selling.',
    h1: 'Texas ACA Marketplace guide',
    subhead:
      'A practical research path for Texans shopping individual-market health coverage — start with your ZIP landscape, then verify and enroll on HealthCare.gov.',
    locationLabel: 'Texas',
    stateName: 'Texas',
    licenseRegulator: 'Texas TDI',
    sampleZips: [
      { zip: '77002', label: 'Houston downtown' },
      { zip: '77024', label: 'Memorial / west Houston' },
      { zip: '75201', label: 'Dallas downtown' },
      { zip: '75001', label: 'Addison / north Dallas' },
      { zip: '78701', label: 'Austin' },
      { zip: '78205', label: 'San Antonio' },
    ],
    hubHref: '/hubs/texas/houston',
    hubLabel: 'Houston insurance agents',
    directoryHref: '/hubs/aca',
    marketplaceCountyHref: '/marketplace/tx/harris',
    overview: [
      'Texas has a large individual health insurance market. Many residents use the federal Marketplace (HealthCare.gov) during open enrollment or after a qualifying life event.',
      'Plan menus and issuer competition vary widely between metros such as Houston, Dallas–Fort Worth, Austin, and San Antonio — and even between ZIPs inside the same metro. A statewide average cannot replace a ZIP-level CMS landscape when available.',
      'This page is educational research from Insurance Trust Hub. We do not sell policies, process applications, or invent official premiums.',
    ],
    whoBuys: [
      'People without affordable employer coverage',
      'Self-employed workers, contractors, and oil & gas / service-industry households',
      'Families leaving Medicaid/CHIP or other coverage',
      'Early retirees under 65 researching bridge coverage before Medicare',
    ],
    costFactors: [
      'Age and household composition (Marketplace age rating)',
      'Household income relative to the federal poverty level (premium tax credit education)',
      'Tobacco use where rating rules apply',
      'Metal tier (Bronze, Silver, Gold) and deductible / max out-of-pocket design',
      'County and local issuer competition — Houston and Dallas menus can differ substantially',
    ],
    whatToolShows: [
      'Approximate plan and issuer counts for your Texas ZIP when the CMS Marketplace API is available',
      'Premium ranges and deductible ranges when CMS returns those fields',
      'Lower-premium, balanced, and higher-protection research path examples',
      'Assistance context when you add household income (educational — not an official award)',
    ],
    faqs: [
      {
        q: 'Does Texas use HealthCare.gov or a state exchange?',
        a: 'Texas uses the federal Marketplace at HealthCare.gov for individual ACA coverage. Always confirm enrollment steps, special enrollment periods, and official plan prices there.',
      },
      {
        q: 'Why do Houston and Dallas options differ?',
        a: 'Issuers file service areas by county and region. Moving between Harris County and Dallas County — or even across suburban ZIPs — can change which plans and networks appear. Research the ZIP where you will live and seek care.',
      },
      {
        q: 'Is a low monthly premium always best in Texas?',
        a: 'Not necessarily. Bronze-style paths often pair lower premiums with higher deductibles. Silver can matter if cost-sharing reductions may apply. Use total-cost thinking, then verify on HealthCare.gov.',
      },
      {
        q: 'Can Insurance Trust Hub enroll me?',
        a: 'No. We provide independent educational research only. Official eligibility, subsidies, and enrollment are determined on HealthCare.gov (or with a licensed agent you choose).',
      },
      {
        q: 'What about Medicare in Texas?',
        a: 'Medicare is a separate pathway from the ACA Marketplace. If you are 65+ or otherwise Medicare-eligible, use Medicare research tools and Medicare.gov — not Marketplace enrollment alone.',
      },
    ],
    relatedGuides: ['houston-aca-marketplace', 'dallas-aca-marketplace'],
  },
  {
    slug: 'houston-aca-marketplace',
    primaryKeyword: 'ACA plans in Houston',
    title: 'ACA Plans in Houston — Local Marketplace Research Guide',
    description:
      'Research ACA Marketplace coverage in Houston and Harris County: ZIP-level plan landscape, cost factors, subsidy context, and HealthCare.gov next steps. Educational only.',
    h1: 'ACA Marketplace research in Houston',
    subhead:
      'Houston’s metro spans many ZIPs and care patterns. Use local ZIP research to understand plan volume and path types — then confirm everything on HealthCare.gov.',
    locationLabel: 'Houston / Harris County, Texas',
    stateName: 'Texas',
    licenseRegulator: 'Texas TDI',
    sampleZips: [
      { zip: '77002', label: 'Downtown Houston' },
      { zip: '77024', label: 'Memorial' },
      { zip: '77057', label: 'Galleria area' },
      { zip: '77070', label: 'Northwest Houston' },
      { zip: '77573', label: 'League City area' },
    ],
    hubHref: '/hubs/texas/houston',
    hubLabel: 'Houston insurance agents',
    directoryHref: '/hubs/aca',
    marketplaceCountyHref: '/marketplace/tx/harris',
    overview: [
      'Houston shoppers often compare network access across a large metro, multilingual service, and whether a lower premium is worth a higher deductible.',
      'Plan menus can differ by ZIP across Harris County and surrounding suburbs. Treat any statewide “average” as context only — run your own ZIP in the research tool for a current CMS landscape snapshot when available.',
      'This guide is not a quote engine and does not list permanent official premiums.',
    ],
    whoBuys: [
      'Energy, logistics, and service workers without stable employer plans',
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
      'How many Marketplace plans CMS returns for a Houston-area ZIP',
      'Issuer depth and premium spreads when available',
      'Example lower-premium vs balanced vs higher-protection paths',
      'Optional income-based assistance education',
    ],
    faqs: [
      {
        q: 'What ZIP should I use for Houston research?',
        a: 'Use the ZIP for the home where you will live and primarily seek care. Different Harris County and suburban ZIPs can surface different plan menus.',
      },
      {
        q: 'I work downtown but live in the suburbs — which ZIP?',
        a: 'Marketplace plan menus are generally based on where you live. Research your home ZIP, then confirm networks cover where you actually receive care.',
      },
      {
        q: 'How is this different from Medicare research in Houston?',
        a: 'Medicare tools use different CMS extracts for 65+ / Medicare Advantage markets. ACA Marketplace research is for individual/family coverage under 65 (with limited exceptions).',
      },
      {
        q: 'Can I save my research?',
        a: 'Yes. After you run the Marketplace plan research tool, you can save a summary to My Insurance when signed in. That is a research history feature — not enrollment.',
      },
    ],
    relatedGuides: ['texas-aca-marketplace', 'dallas-aca-marketplace'],
  },
  {
    slug: 'dallas-aca-marketplace',
    primaryKeyword: 'Marketplace insurance Dallas',
    title: 'Marketplace Insurance in Dallas — ACA Research Guide',
    description:
      'Research ACA Marketplace coverage in Dallas and North Texas: ZIP landscape tools, cost factors, subsidy education, and HealthCare.gov next steps. Independent research — no lead selling.',
    h1: 'ACA Marketplace research in Dallas',
    subhead:
      'Dallas–Fort Worth is a multi-county metro. Plan options are local by ZIP — start with a landscape research, then verify official details on HealthCare.gov.',
    locationLabel: 'Dallas / North Texas',
    stateName: 'Texas',
    licenseRegulator: 'Texas TDI',
    sampleZips: [
      { zip: '75201', label: 'Downtown Dallas' },
      { zip: '75205', label: 'University Park area' },
      { zip: '75001', label: 'Addison' },
      { zip: '75034', label: 'Frisco area' },
      { zip: '76051', label: 'Grapevine / mid-cities' },
    ],
    hubHref: '/hubs/texas/dallas-fort-worth',
    hubLabel: 'Dallas–Fort Worth insurance agents',
    directoryHref: '/hubs/aca',
    marketplaceCountyHref: '/marketplace/tx/dallas',
    overview: [
      'Dallas shoppers often compare suburban vs urban ZIPs, network access across DFW, and whether a balanced Silver-style path beats the cheapest premium.',
      'Issuers may treat Dallas County and surrounding counties differently. Use educational tools for landscape context, then complete official shopping on HealthCare.gov.',
    ],
    whoBuys: [
      'Corporate, logistics, and professional workers without employer coverage',
      'Self-employed residents researching total cost, not just premium',
      'Households comparing DFW suburbs before a move',
    ],
    costFactors: [
      'Age and household size',
      'Income / FPL position for assistance education',
      'Metal tier and deductible design',
      'Whether preferred providers appear in plan networks (confirm officially)',
    ],
    whatToolShows: [
      'Plan and issuer counts for a Dallas-area ZIP when CMS data loads',
      'Premium and deductible ranges when provided',
      'Lower-premium vs more protective research path examples',
      'Assistance context if you enter income',
    ],
    faqs: [
      {
        q: 'Should I research Dallas or Fort Worth separately?',
        a: 'Use the ZIP for your residence. Dallas County and Tarrant County (Fort Worth) can show different Marketplace menus. Do not assume one downtown ZIP covers the whole metro.',
      },
      {
        q: 'Is Dallas cheaper than Houston?',
        a: 'There is no permanent answer. Issuer competition, ages, and income drive outcomes. Compare live landscapes for each ZIP rather than relying on anecdotes.',
      },
      {
        q: 'Where do I enroll?',
        a: 'On HealthCare.gov (Texas’s federal Marketplace pathway), or with a licensed professional you choose. Insurance Trust Hub does not enroll consumers.',
      },
      {
        q: 'What if the tool shows no live data?',
        a: 'We fail closed and label educational fallbacks. We never invent a full plan catalog. Retry later or go directly to HealthCare.gov Window Shopping.',
      },
    ],
    relatedGuides: ['texas-aca-marketplace', 'houston-aca-marketplace'],
  },
  // ── Georgia cluster (Tier 2B) ─────────────────────────────────────────────
  {
    slug: 'georgia-aca-marketplace',
    primaryKeyword: 'ACA Marketplace Georgia',
    title: 'Georgia ACA Marketplace Guide — Research Plans by ZIP (2026)',
    description:
      'How to research ACA Marketplace coverage in Georgia: ZIP-level plan landscape tools, cost factors, subsidy education, and HealthCare.gov next steps. Educational only — no lead selling.',
    h1: 'Georgia ACA Marketplace guide',
    subhead:
      'A practical research path for Georgians shopping individual-market health coverage — start with your ZIP landscape, then verify and enroll on HealthCare.gov.',
    locationLabel: 'Georgia',
    stateName: 'Georgia',
    licenseRegulator: 'Georgia OCI',
    sampleZips: [
      { zip: '30303', label: 'Downtown Atlanta' },
      { zip: '30305', label: 'Buckhead area' },
      { zip: '30024', label: 'Suwanee / north metro' },
      { zip: '30080', label: 'Smyrna / Cobb area' },
      { zip: '31401', label: 'Savannah' },
      { zip: '30901', label: 'Augusta' },
    ],
    hubHref: '/hubs/georgia/atlanta',
    hubLabel: 'Atlanta insurance agents',
    directoryHref: '/hubs/aca',
    overview: [
      'Georgia has a significant individual health insurance market. Many residents use the federal Marketplace (HealthCare.gov) during open enrollment or after a qualifying life event.',
      'Plan menus and issuer competition can differ between metro Atlanta and other regions such as Savannah, Augusta, or smaller counties. A statewide average cannot replace a ZIP-level CMS landscape when available.',
      'This page is educational research from Insurance Trust Hub. We do not sell policies, process applications, or invent official premiums.',
    ],
    whoBuys: [
      'People without affordable employer coverage',
      'Self-employed workers, contractors, and gig-economy households',
      'Families leaving Medicaid/CHIP or other coverage',
      'Early retirees under 65 researching bridge coverage before Medicare',
    ],
    costFactors: [
      'Age and household composition (Marketplace age rating)',
      'Household income relative to the federal poverty level (premium tax credit education)',
      'Tobacco use where rating rules apply',
      'Metal tier (Bronze, Silver, Gold) and deductible / max out-of-pocket design',
      'County and local issuer competition — Atlanta-area ZIPs can differ from other Georgia markets',
    ],
    whatToolShows: [
      'Approximate plan and issuer counts for your Georgia ZIP when the CMS Marketplace API is available',
      'Premium ranges and deductible ranges when CMS returns those fields',
      'Lower-premium, balanced, and higher-protection research path examples',
      'Assistance context when you add household income (educational — not an official award)',
    ],
    faqs: [
      {
        q: 'Does Georgia use HealthCare.gov or a state exchange?',
        a: 'Georgia uses the federal Marketplace at HealthCare.gov for individual ACA coverage. Always confirm enrollment steps, special enrollment periods, and official plan prices there.',
      },
      {
        q: 'Why do Atlanta and other Georgia regions differ?',
        a: 'Issuers file service areas by county and region. Moving between metro Atlanta counties — or from Atlanta to coastal or rural Georgia — can change which plans and networks appear. Research the ZIP where you will live and seek care.',
      },
      {
        q: 'Is a low monthly premium always best in Georgia?',
        a: 'Not necessarily. Bronze-style paths often pair lower premiums with higher deductibles. Silver can matter if cost-sharing reductions may apply. Use total-cost thinking, then verify on HealthCare.gov.',
      },
      {
        q: 'Can Insurance Trust Hub enroll me?',
        a: 'No. We provide independent educational research only. Official eligibility, subsidies, and enrollment are determined on HealthCare.gov (or with a licensed agent you choose).',
      },
      {
        q: 'What about Medicare in Georgia?',
        a: 'Medicare is a separate pathway from the ACA Marketplace. If you are 65+ or otherwise Medicare-eligible, use Medicare research tools and Medicare.gov — not Marketplace enrollment alone.',
      },
    ],
    relatedGuides: ['atlanta-aca-marketplace'],
  },
  {
    slug: 'atlanta-aca-marketplace',
    primaryKeyword: 'ACA plans in Atlanta',
    title: 'ACA Plans in Atlanta — Local Marketplace Research Guide',
    description:
      'Research ACA Marketplace coverage in metro Atlanta: ZIP-level plan landscape, cost factors, subsidy context, and HealthCare.gov next steps. Educational only — no lead selling.',
    h1: 'ACA Marketplace research in Atlanta',
    subhead:
      'Metro Atlanta spans multiple counties and care patterns. Use local ZIP research to understand plan volume and path types — then confirm everything on HealthCare.gov.',
    locationLabel: 'Atlanta metro, Georgia',
    stateName: 'Georgia',
    licenseRegulator: 'Georgia OCI',
    sampleZips: [
      { zip: '30303', label: 'Downtown Atlanta' },
      { zip: '30305', label: 'Buckhead' },
      { zip: '30024', label: 'Suwanee / Forsyth area' },
      { zip: '30080', label: 'Smyrna' },
      { zip: '30043', label: 'Lawrenceville / Gwinnett' },
      { zip: '30062', label: 'Marietta area' },
    ],
    hubHref: '/hubs/georgia/atlanta',
    hubLabel: 'Atlanta insurance agents',
    directoryHref: '/hubs/aca',
    overview: [
      'Atlanta shoppers often compare network access across Fulton, DeKalb, Cobb, Gwinnett, and surrounding counties, plus whether a lower premium is worth a higher deductible.',
      'Plan menus can differ by ZIP across the metro. Treat any statewide “average” as context only — run your own ZIP in the research tool for a current CMS landscape snapshot when available.',
      'This guide is not a quote engine and does not list permanent official premiums.',
    ],
    whoBuys: [
      'Corporate, logistics, and hospitality workers without stable employer plans',
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
      'How many Marketplace plans CMS returns for an Atlanta-area ZIP',
      'Issuer depth and premium spreads when available',
      'Example lower-premium vs balanced vs higher-protection paths',
      'Optional income-based assistance education',
    ],
    faqs: [
      {
        q: 'What ZIP should I use for Atlanta research?',
        a: 'Use the ZIP for the home where you will live and primarily seek care. Different metro Atlanta counties and suburbs can surface different plan menus.',
      },
      {
        q: 'I work in Midtown but live in Gwinnett — which ZIP?',
        a: 'Marketplace plan menus are generally based on where you live. Research your home ZIP, then confirm networks cover where you actually receive care.',
      },
      {
        q: 'How is this different from Medicare research in Atlanta?',
        a: 'Medicare tools use different CMS extracts for 65+ / Medicare Advantage markets. ACA Marketplace research is for individual/family coverage under 65 (with limited exceptions).',
      },
      {
        q: 'Can I save my research?',
        a: 'Yes. After you run the Marketplace plan research tool, you can save a summary to My Insurance when signed in. That is a research history feature — not enrollment.',
      },
      {
        q: 'Where do I enroll?',
        a: 'On HealthCare.gov (Georgia’s federal Marketplace pathway), or with a licensed professional you choose. Insurance Trust Hub does not enroll consumers.',
      },
    ],
    relatedGuides: ['georgia-aca-marketplace'],
  },
  // ── North Carolina cluster (Tier 2C) ──────────────────────────────────────
  {
    slug: 'north-carolina-aca-marketplace',
    primaryKeyword: 'ACA Marketplace North Carolina',
    title: 'North Carolina ACA Marketplace Guide — Research Plans by ZIP (2026)',
    description:
      'How to research ACA Marketplace coverage in North Carolina: ZIP-level plan landscape tools, cost factors, subsidy education, and HealthCare.gov next steps. Educational only — no lead selling.',
    h1: 'North Carolina ACA Marketplace guide',
    subhead:
      'A practical research path for North Carolinians shopping individual-market health coverage — start with your ZIP landscape, then verify and enroll on HealthCare.gov.',
    locationLabel: 'North Carolina',
    stateName: 'North Carolina',
    licenseRegulator: 'North Carolina DOI',
    sampleZips: [
      { zip: '28202', label: 'Charlotte uptown' },
      { zip: '27601', label: 'Raleigh downtown' },
      { zip: '27701', label: 'Durham' },
      { zip: '27514', label: 'Chapel Hill' },
      { zip: '27401', label: 'Greensboro' },
      { zip: '28801', label: 'Asheville' },
    ],
    hubHref: '/hubs/north-carolina/charlotte',
    hubLabel: 'Charlotte insurance agents',
    directoryHref: '/hubs/aca',
    overview: [
      'North Carolina has a substantial individual health insurance market. Many residents use the federal Marketplace (HealthCare.gov) during open enrollment or after a qualifying life event.',
      'Plan menus and issuer competition can differ between Charlotte, the Research Triangle (Raleigh–Durham–Chapel Hill), the Triad, and mountain or coastal counties. A statewide average cannot replace a ZIP-level CMS landscape when available.',
      'This page is educational research from Insurance Trust Hub. We do not sell policies, process applications, or invent official premiums.',
    ],
    whoBuys: [
      'People without affordable employer coverage',
      'Self-employed workers, contractors, and tech / healthcare-adjacent households',
      'Families leaving Medicaid/CHIP or other coverage',
      'Early retirees under 65 researching bridge coverage before Medicare',
    ],
    costFactors: [
      'Age and household composition (Marketplace age rating)',
      'Household income relative to the federal poverty level (premium tax credit education)',
      'Tobacco use where rating rules apply',
      'Metal tier (Bronze, Silver, Gold) and deductible / max out-of-pocket design',
      'County and local issuer competition — Charlotte and Triangle menus can differ',
    ],
    whatToolShows: [
      'Approximate plan and issuer counts for your North Carolina ZIP when the CMS Marketplace API is available',
      'Premium ranges and deductible ranges when CMS returns those fields',
      'Lower-premium, balanced, and higher-protection research path examples',
      'Assistance context when you add household income (educational — not an official award)',
    ],
    faqs: [
      {
        q: 'Does North Carolina use HealthCare.gov or a state exchange?',
        a: 'North Carolina uses the federal Marketplace at HealthCare.gov for individual ACA coverage. Always confirm enrollment steps, special enrollment periods, and official plan prices there.',
      },
      {
        q: 'Why do Charlotte and the Triangle differ?',
        a: 'Issuers file service areas by county and region. Moving between Mecklenburg County and Wake County — or between urban and rural ZIPs — can change which plans and networks appear. Research the ZIP where you will live and seek care.',
      },
      {
        q: 'Is a low monthly premium always best in North Carolina?',
        a: 'Not necessarily. Bronze-style paths often pair lower premiums with higher deductibles. Silver can matter if cost-sharing reductions may apply. Use total-cost thinking, then verify on HealthCare.gov.',
      },
      {
        q: 'Can Insurance Trust Hub enroll me?',
        a: 'No. We provide independent educational research only. Official eligibility, subsidies, and enrollment are determined on HealthCare.gov (or with a licensed agent you choose).',
      },
      {
        q: 'What about Medicare in North Carolina?',
        a: 'Medicare is a separate pathway from the ACA Marketplace. If you are 65+ or otherwise Medicare-eligible, use Medicare research tools and Medicare.gov — not Marketplace enrollment alone.',
      },
    ],
    relatedGuides: ['charlotte-aca-marketplace', 'research-triangle-aca-marketplace'],
  },
  {
    slug: 'charlotte-aca-marketplace',
    primaryKeyword: 'ACA plans in Charlotte',
    title: 'ACA Plans in Charlotte — Local Marketplace Research Guide',
    description:
      'Research ACA Marketplace coverage in Charlotte and the greater Mecklenburg area: ZIP-level plan landscape, cost factors, subsidy context, and HealthCare.gov next steps. Educational only.',
    h1: 'ACA Marketplace research in Charlotte',
    subhead:
      'Charlotte’s metro spans multiple counties and care patterns. Use local ZIP research to understand plan volume and path types — then confirm everything on HealthCare.gov.',
    locationLabel: 'Charlotte, North Carolina',
    stateName: 'North Carolina',
    licenseRegulator: 'North Carolina DOI',
    sampleZips: [
      { zip: '28202', label: 'Uptown Charlotte' },
      { zip: '28205', label: 'Plaza Midwood area' },
      { zip: '28277', label: 'Ballantyne area' },
      { zip: '28078', label: 'Huntersville' },
      { zip: '28105', label: 'Matthews area' },
    ],
    hubHref: '/hubs/north-carolina/charlotte',
    hubLabel: 'Charlotte insurance agents',
    directoryHref: '/hubs/aca',
    overview: [
      'Charlotte shoppers often compare network access across Mecklenburg and surrounding counties, plus whether a lower premium is worth a higher deductible.',
      'Plan menus can differ by ZIP across the metro and into South Carolina border suburbs for people who live or work across the state line — always use the ZIP of residence for Marketplace research.',
      'This guide is not a quote engine and does not list permanent official premiums.',
    ],
    whoBuys: [
      'Banking, logistics, and professional workers without stable employer plans',
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
      'How many Marketplace plans CMS returns for a Charlotte-area ZIP',
      'Issuer depth and premium spreads when available',
      'Example lower-premium vs balanced vs higher-protection paths',
      'Optional income-based assistance education',
    ],
    faqs: [
      {
        q: 'What ZIP should I use for Charlotte research?',
        a: 'Use the ZIP for the home where you will live and primarily seek care. Different Mecklenburg and suburban ZIPs can surface different plan menus.',
      },
      {
        q: 'I live in South Carolina but work in Charlotte — which Marketplace?',
        a: 'Marketplace menus follow your state of residence. Research the ZIP where you live, then confirm networks cover where you receive care. Official rules are on HealthCare.gov.',
      },
      {
        q: 'How is this different from Medicare research in Charlotte?',
        a: 'Medicare tools use different CMS extracts for 65+ / Medicare Advantage markets. ACA Marketplace research is for individual/family coverage under 65 (with limited exceptions).',
      },
      {
        q: 'Can I save my research?',
        a: 'Yes. After you run the Marketplace plan research tool, you can save a summary to My Insurance when signed in. That is a research history feature — not enrollment.',
      },
    ],
    relatedGuides: ['north-carolina-aca-marketplace', 'research-triangle-aca-marketplace'],
  },
  {
    slug: 'research-triangle-aca-marketplace',
    primaryKeyword: 'Marketplace insurance Raleigh',
    title: 'Marketplace Insurance in Raleigh — Research Triangle ACA Guide',
    description:
      'Research ACA Marketplace coverage across the Research Triangle (Raleigh, Durham, Chapel Hill): ZIP landscape tools, cost factors, subsidy education, and HealthCare.gov next steps. Educational only.',
    h1: 'ACA Marketplace research in the Research Triangle',
    subhead:
      'This guide covers the Raleigh–Durham–Chapel Hill market context. Plan options are local by ZIP — start with a landscape research, then verify official details on HealthCare.gov.',
    locationLabel: 'Research Triangle (Raleigh–Durham–Chapel Hill), North Carolina',
    stateName: 'North Carolina',
    licenseRegulator: 'North Carolina DOI',
    sampleZips: [
      { zip: '27601', label: 'Raleigh downtown' },
      { zip: '27615', label: 'North Raleigh' },
      { zip: '27701', label: 'Durham' },
      { zip: '27707', label: 'Southwest Durham' },
      { zip: '27514', label: 'Chapel Hill' },
      { zip: '27560', label: 'Morrisville / RTP area' },
    ],
    hubHref: '/hubs/north-carolina/raleigh',
    hubLabel: 'Research Triangle insurance agents',
    directoryHref: '/hubs/aca',
    overview: [
      'The Research Triangle spans Wake, Durham, Orange, and nearby counties. Shoppers often assume one “Raleigh plan menu” covers Durham and Chapel Hill — in practice, Marketplace availability is still geography-based by ZIP and county.',
      'University, tech, healthcare, and government-adjacent households frequently research individual coverage between jobs or without employer plans. Use educational tools for landscape context, then complete official shopping on HealthCare.gov.',
      'Primary search focus for this page is Marketplace insurance in Raleigh; Durham and Chapel Hill are included as part of the same metro research cluster.',
    ],
    whoBuys: [
      'Tech, research, and healthcare workers without employer coverage',
      'Graduate students, contractors, and self-employed residents',
      'Households comparing Triangle suburbs before a move',
      'People evaluating total cost, not just monthly premium',
    ],
    costFactors: [
      'Age and household size',
      'Income / FPL position for assistance education',
      'Metal tier and deductible design',
      'Whether preferred providers appear in plan networks across Wake, Durham, and Orange counties (confirm officially)',
    ],
    whatToolShows: [
      'Plan and issuer counts for a Raleigh, Durham, or Chapel Hill ZIP when CMS data loads',
      'Premium and deductible ranges when provided',
      'Lower-premium vs more protective research path examples',
      'Assistance context if you enter income',
    ],
    faqs: [
      {
        q: 'Does this page cover Durham and Chapel Hill as well as Raleigh?',
        a: 'Yes. The Research Triangle guide is written for the Raleigh–Durham–Chapel Hill market context. Always research the specific ZIP where you live — menus can differ across Wake, Durham, and Orange counties.',
      },
      {
        q: 'Should I use a Raleigh or Durham ZIP if I work in RTP?',
        a: 'Use your home ZIP for Marketplace research. Confirm that preferred clinics near Research Triangle Park are in-network on official plan documents before you enroll.',
      },
      {
        q: 'Is Raleigh cheaper than Charlotte?',
        a: 'There is no permanent answer. Issuer competition, ages, and income drive outcomes. Compare live landscapes for each ZIP rather than relying on anecdotes.',
      },
      {
        q: 'Where do I enroll?',
        a: 'On HealthCare.gov (North Carolina’s federal Marketplace pathway), or with a licensed professional you choose. Insurance Trust Hub does not enroll consumers.',
      },
      {
        q: 'What if the tool shows no live data?',
        a: 'We fail closed and label educational fallbacks. We never invent a full plan catalog. Retry later or go directly to HealthCare.gov Window Shopping.',
      },
    ],
    relatedGuides: ['north-carolina-aca-marketplace', 'charlotte-aca-marketplace'],
  },
  // ── Pennsylvania cluster (Tier 2D) ────────────────────────────────────────
  {
    slug: 'pennsylvania-aca-marketplace',
    primaryKeyword: 'ACA Marketplace Pennsylvania',
    title: 'Pennsylvania ACA Marketplace Guide — Research Plans by ZIP (2026)',
    description:
      'How to research ACA Marketplace coverage in Pennsylvania: ZIP-level plan landscape tools, cost factors, subsidy education, and HealthCare.gov next steps. Educational only — no lead selling.',
    h1: 'Pennsylvania ACA Marketplace guide',
    subhead:
      'A practical research path for Pennsylvanians shopping individual-market health coverage — start with your ZIP landscape, then verify and enroll on HealthCare.gov.',
    locationLabel: 'Pennsylvania',
    stateName: 'Pennsylvania',
    licenseRegulator: 'Pennsylvania Insurance Department',
    sampleZips: [
      { zip: '19103', label: 'Center City Philadelphia' },
      { zip: '19147', label: 'South Philadelphia area' },
      { zip: '15222', label: 'Downtown Pittsburgh' },
      { zip: '15213', label: 'Oakland / universities' },
      { zip: '17101', label: 'Harrisburg' },
      { zip: '18101', label: 'Allentown' },
    ],
    hubHref: '/hubs/pennsylvania/philadelphia',
    hubLabel: 'Philadelphia insurance agents',
    directoryHref: '/hubs/aca',
    overview: [
      'Pennsylvania has a substantial individual health insurance market. Many residents use the federal Marketplace (HealthCare.gov) during open enrollment or after a qualifying life event.',
      'Plan menus and issuer competition can differ sharply between Greater Philadelphia, Pittsburgh, and smaller markets across the state. A statewide average cannot replace a ZIP-level CMS landscape when available.',
      'This page is educational research from Insurance Trust Hub. We do not sell policies, process applications, or invent official premiums.',
    ],
    whoBuys: [
      'People without affordable employer coverage',
      'Self-employed workers, contractors, and healthcare-adjacent households',
      'Families leaving Medicaid/CHIP or other coverage',
      'Early retirees under 65 researching bridge coverage before Medicare',
    ],
    costFactors: [
      'Age and household composition (Marketplace age rating)',
      'Household income relative to the federal poverty level (premium tax credit education)',
      'Tobacco use where rating rules apply',
      'Metal tier (Bronze, Silver, Gold) and deductible / max out-of-pocket design',
      'County and local issuer competition — SEPA and western Pennsylvania menus can differ',
    ],
    whatToolShows: [
      'Approximate plan and issuer counts for your Pennsylvania ZIP when the CMS Marketplace API is available',
      'Premium ranges and deductible ranges when CMS returns those fields',
      'Lower-premium, balanced, and higher-protection research path examples',
      'Assistance context when you add household income (educational — not an official award)',
    ],
    faqs: [
      {
        q: 'Does Pennsylvania use HealthCare.gov or a state exchange?',
        a: 'Pennsylvania uses the federal Marketplace at HealthCare.gov for individual ACA coverage. Always confirm enrollment steps, special enrollment periods, and official plan prices there.',
      },
      {
        q: 'Why do Philadelphia and Pittsburgh options differ?',
        a: 'Issuers file service areas by county and region. Moving between southeastern Pennsylvania and southwestern Pennsylvania can change which plans and networks appear. Research the ZIP where you will live and seek care.',
      },
      {
        q: 'Is a low monthly premium always best in Pennsylvania?',
        a: 'Not necessarily. Bronze-style paths often pair lower premiums with higher deductibles. Silver can matter if cost-sharing reductions may apply. Use total-cost thinking, then verify on HealthCare.gov.',
      },
      {
        q: 'Can Insurance Trust Hub enroll me?',
        a: 'No. We provide independent educational research only. Official eligibility, subsidies, and enrollment are determined on HealthCare.gov (or with a licensed agent you choose).',
      },
      {
        q: 'What about Medicare in Pennsylvania?',
        a: 'Medicare is a separate pathway from the ACA Marketplace. If you are 65+ or otherwise Medicare-eligible, use Medicare research tools and Medicare.gov — not Marketplace enrollment alone.',
      },
    ],
    relatedGuides: ['philadelphia-aca-marketplace', 'pittsburgh-aca-marketplace'],
  },
  {
    slug: 'philadelphia-aca-marketplace',
    primaryKeyword: 'ACA plans in Philadelphia',
    title: 'ACA Plans in Philadelphia — Local Marketplace Research Guide',
    description:
      'Research ACA Marketplace coverage in Philadelphia and nearby SEPA ZIPs: plan landscape tools, cost factors, subsidy context, and HealthCare.gov next steps. Educational only.',
    h1: 'ACA Marketplace research in Philadelphia',
    subhead:
      'Philadelphia shoppers often compare city and collar-county ZIPs. Use local ZIP research to understand plan volume and path types — then confirm everything on HealthCare.gov.',
    locationLabel: 'Philadelphia, Pennsylvania',
    stateName: 'Pennsylvania',
    licenseRegulator: 'Pennsylvania Insurance Department',
    sampleZips: [
      { zip: '19103', label: 'Center City' },
      { zip: '19147', label: 'South Philly area' },
      { zip: '19128', label: 'Roxborough area' },
      { zip: '19149', label: 'Northeast Philly area' },
      { zip: '19019', label: 'Near Philly / SEPA context' },
    ],
    hubHref: '/hubs/pennsylvania/philadelphia',
    hubLabel: 'Philadelphia insurance agents',
    directoryHref: '/hubs/aca',
    overview: [
      'Philadelphia is the core of a broader southeastern Pennsylvania (SEPA) labor and care market. Some residents live in collar counties but work in the city — Marketplace menus still follow the ZIP of residence.',
      'Plan options can differ across neighborhoods and across the city–suburb line. Treat any statewide “average” as context only; run your own ZIP in the research tool for a current CMS landscape snapshot when available.',
      'This guide focuses primarily on Philadelphia while acknowledging light SEPA commuting context. It is not a quote engine and does not list permanent official premiums.',
    ],
    whoBuys: [
      'Hospitality, healthcare, education, and service workers without stable employer plans',
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
      'How many Marketplace plans CMS returns for a Philadelphia-area ZIP',
      'Issuer depth and premium spreads when available',
      'Example lower-premium vs balanced vs higher-protection paths',
      'Optional income-based assistance education',
    ],
    faqs: [
      {
        q: 'What ZIP should I use for Philadelphia research?',
        a: 'Use the ZIP for the home where you will live and primarily seek care. Different Philadelphia ZIPs — and nearby SEPA ZIPs — can surface different plan menus.',
      },
      {
        q: 'I live in the suburbs but work in Center City — which ZIP?',
        a: 'Marketplace plan menus are generally based on where you live. Research your home ZIP, then confirm networks cover where you actually receive care.',
      },
      {
        q: 'How is this different from Medicare research in Philadelphia?',
        a: 'Medicare tools use different CMS extracts for 65+ / Medicare Advantage markets. ACA Marketplace research is for individual/family coverage under 65 (with limited exceptions).',
      },
      {
        q: 'Can I save my research?',
        a: 'Yes. After you run the Marketplace plan research tool, you can save a summary to My Insurance when signed in. That is a research history feature — not enrollment.',
      },
      {
        q: 'Where do I enroll?',
        a: 'On HealthCare.gov (Pennsylvania’s federal Marketplace pathway), or with a licensed professional you choose. Insurance Trust Hub does not enroll consumers.',
      },
    ],
    relatedGuides: ['pennsylvania-aca-marketplace', 'pittsburgh-aca-marketplace'],
  },
  {
    slug: 'pittsburgh-aca-marketplace',
    primaryKeyword: 'Marketplace insurance Pittsburgh',
    title: 'Marketplace Insurance in Pittsburgh — ACA Research Guide',
    description:
      'Research ACA Marketplace coverage in Pittsburgh and Allegheny County: ZIP landscape tools, cost factors, subsidy education, and HealthCare.gov next steps. Independent research — no lead selling.',
    h1: 'ACA Marketplace research in Pittsburgh',
    subhead:
      'Pittsburgh’s market is western Pennsylvania–focused. Plan options are local by ZIP — start with a landscape research, then verify official details on HealthCare.gov.',
    locationLabel: 'Pittsburgh, Pennsylvania',
    stateName: 'Pennsylvania',
    licenseRegulator: 'Pennsylvania Insurance Department',
    sampleZips: [
      { zip: '15222', label: 'Downtown Pittsburgh' },
      { zip: '15213', label: 'Oakland' },
      { zip: '15217', label: 'Squirrel Hill area' },
      { zip: '15237', label: 'North Hills area' },
      { zip: '15108', label: 'Coraopolis / airport area' },
    ],
    hubHref: '/hubs/pennsylvania/pittsburgh',
    hubLabel: 'Pittsburgh insurance agents',
    directoryHref: '/hubs/aca',
    overview: [
      'Pittsburgh shoppers often compare urban and suburban Allegheny County ZIPs, network access to major health systems, and whether a balanced Silver-style path beats the cheapest premium.',
      'Issuer service areas can treat southwestern Pennsylvania differently from SEPA. Use educational tools for landscape context, then complete official shopping on HealthCare.gov.',
      'This guide stays Pittsburgh-market focused. It is not a quote engine and does not list permanent official premiums.',
    ],
    whoBuys: [
      'Healthcare, education, manufacturing, and professional workers without employer coverage',
      'Self-employed residents researching total cost, not just premium',
      'Households comparing city vs North Hills / South Hills suburbs',
    ],
    costFactors: [
      'Age and household size',
      'Income / FPL position for assistance education',
      'Metal tier and deductible design',
      'Whether preferred providers appear in plan networks (confirm officially)',
    ],
    whatToolShows: [
      'Plan and issuer counts for a Pittsburgh-area ZIP when CMS data loads',
      'Premium and deductible ranges when provided',
      'Lower-premium vs more protective research path examples',
      'Assistance context if you enter income',
    ],
    faqs: [
      {
        q: 'What ZIP should I use for Pittsburgh research?',
        a: 'Use the ZIP for the home where you will live and primarily seek care. Different Allegheny County and nearby suburban ZIPs can surface different plan menus.',
      },
      {
        q: 'Is Pittsburgh cheaper than Philadelphia?',
        a: 'There is no permanent answer. Issuer competition, ages, and income drive outcomes. Compare live landscapes for each ZIP rather than relying on anecdotes.',
      },
      {
        q: 'Where do I enroll?',
        a: 'On HealthCare.gov (Pennsylvania’s federal Marketplace pathway), or with a licensed professional you choose. Insurance Trust Hub does not enroll consumers.',
      },
      {
        q: 'What if the tool shows no live data?',
        a: 'We fail closed and label educational fallbacks. We never invent a full plan catalog. Retry later or go directly to HealthCare.gov Window Shopping.',
      },
    ],
    relatedGuides: ['pennsylvania-aca-marketplace', 'philadelphia-aca-marketplace'],
  },
  // ── New Jersey cluster (Northeast — South / Central / North) ──────────────
  {
    slug: 'new-jersey-aca-marketplace',
    primaryKeyword: 'ACA Marketplace New Jersey',
    title: 'New Jersey ACA Marketplace Guide — Research Plans by ZIP (2026)',
    description:
      'How to research ACA Marketplace coverage in New Jersey: ZIP-level plan landscape tools, South / Central / North region context, subsidy education, and HealthCare.gov next steps. Educational only — no lead selling.',
    h1: 'New Jersey ACA Marketplace guide',
    subhead:
      'A practical research path for New Jersey residents shopping individual-market health coverage — start with your ZIP landscape, then verify and enroll on HealthCare.gov.',
    locationLabel: 'New Jersey',
    stateName: 'New Jersey',
    licenseRegulator: 'New Jersey DOBI',
    sampleZips: [
      { zip: '07030', label: 'Hoboken / North Jersey' },
      { zip: '07102', label: 'Newark area' },
      { zip: '08901', label: 'New Brunswick / Central' },
      { zip: '08608', label: 'Trenton area' },
      { zip: '08002', label: 'Cherry Hill / South' },
      { zip: '08401', label: 'Atlantic City area' },
    ],
    hubHref: '/hubs/aca',
    hubLabel: 'ACA specialists hub',
    directoryHref: '/hubs/aca',
    overview: [
      'New Jersey has a dense individual health insurance market. Many residents use the federal Marketplace (HealthCare.gov) during open enrollment or after a qualifying life event.',
      'People often describe the state as South, Central, and North Jersey — informal regions that still shape how shoppers compare networks and care access. Plan menus remain ZIP- and county-based, so always research the address where you live.',
      'This page is educational research from Insurance Trust Hub. We do not sell policies, process applications, or invent official premiums.',
    ],
    whoBuys: [
      'People without affordable employer coverage',
      'Self-employed workers, contractors, and commuter households',
      'Families leaving Medicaid/CHIP or other coverage',
      'Early retirees under 65 researching bridge coverage before Medicare',
    ],
    costFactors: [
      'Age and household composition (Marketplace age rating)',
      'Household income relative to the federal poverty level (premium tax credit education)',
      'Tobacco use where rating rules apply',
      'Metal tier (Bronze, Silver, Gold) and deductible / max out-of-pocket design',
      'County and local issuer competition — North, Central, and South Jersey menus can differ',
    ],
    whatToolShows: [
      'Approximate plan and issuer counts for your New Jersey ZIP when the CMS Marketplace API is available',
      'Premium ranges and deductible ranges when CMS returns those fields',
      'Lower-premium, balanced, and higher-protection research path examples',
      'Assistance context when you add household income (educational — not an official award)',
    ],
    faqs: [
      {
        q: 'Does New Jersey use HealthCare.gov or a state exchange?',
        a: 'New Jersey uses the federal Marketplace at HealthCare.gov for individual ACA coverage. Always confirm enrollment steps, special enrollment periods, and official plan prices there.',
      },
      {
        q: 'What do people mean by South, Central, and North Jersey?',
        a: 'They are common consumer regions, not official Marketplace zones. County and ZIP determine plan menus. We publish separate South, Central, and North Jersey guides to match how residents search, then send you to ZIP-level research.',
      },
      {
        q: 'Is a low monthly premium always best in New Jersey?',
        a: 'Not necessarily. Bronze-style paths often pair lower premiums with higher deductibles. Silver can matter if cost-sharing reductions may apply. Use total-cost thinking, then verify on HealthCare.gov.',
      },
      {
        q: 'Can Insurance Trust Hub enroll me?',
        a: 'No. We provide independent educational research only. Official eligibility, subsidies, and enrollment are determined on HealthCare.gov (or with a licensed agent you choose).',
      },
      {
        q: 'What about Medicare in New Jersey?',
        a: 'Medicare is a separate pathway from the ACA Marketplace. If you are 65+ or otherwise Medicare-eligible, use Medicare research tools and Medicare.gov — not Marketplace enrollment alone.',
      },
    ],
    relatedGuides: [
      'south-jersey-aca-marketplace',
      'central-jersey-aca-marketplace',
      'north-jersey-aca-marketplace',
    ],
  },
  {
    slug: 'south-jersey-aca-marketplace',
    primaryKeyword: 'ACA plans in South Jersey',
    title: 'ACA Plans in South Jersey — Local Marketplace Research Guide',
    description:
      'Research ACA Marketplace coverage in South Jersey (Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, Salem area context): ZIP landscape tools, cost factors, and HealthCare.gov next steps. Educational only.',
    h1: 'ACA Marketplace research in South Jersey',
    subhead:
      'South Jersey shoppers often compare shore, suburban, and Philly-adjacent ZIPs. Use local ZIP research for plan volume and path types — then confirm on HealthCare.gov.',
    locationLabel: 'South Jersey',
    stateName: 'New Jersey',
    licenseRegulator: 'New Jersey DOBI',
    sampleZips: [
      { zip: '08002', label: 'Cherry Hill area' },
      { zip: '08003', label: 'Cherry Hill / Voorhees area' },
      { zip: '08033', label: 'Haddonfield area' },
      { zip: '08096', label: 'Woodbury / Gloucester area' },
      { zip: '08401', label: 'Atlantic City area' },
      { zip: '08204', label: 'Cape May area' },
    ],
    hubHref: '/hubs/aca',
    hubLabel: 'ACA specialists hub',
    directoryHref: '/hubs/aca',
    overview: [
      'South Jersey commonly includes Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem area context. Definitions vary by resident — use them as a map, not a rigid boundary.',
      'Proximity to Philadelphia can influence where people work and seek care, but Marketplace plan menus still follow your New Jersey ZIP of residence. Keep research NJ-focused for enrollment rules.',
      'This guide is educational only. It is not a quote engine and does not list permanent official premiums.',
    ],
    whoBuys: [
      'Commuters and suburban households without employer coverage',
      'Shore-area workers with seasonal or variable income patterns',
      'Self-employed residents comparing total cost, not just premium',
      'People newly eligible after a job or coverage change',
    ],
    costFactors: [
      'Age rating and who is on the application',
      'Income for educational premium tax credit / CSR framing',
      'Local issuer competition and metal mix in your ZIP',
      'Network fit across South Jersey and, for some households, SEPA care patterns (confirm officially)',
    ],
    whatToolShows: [
      'How many Marketplace plans CMS returns for a South Jersey ZIP',
      'Issuer depth and premium spreads when available',
      'Example lower-premium vs balanced vs higher-protection paths',
      'Optional income-based assistance education',
    ],
    faqs: [
      {
        q: 'Which counties are “South Jersey”?',
        a: 'Residents often include Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem area communities. Exact lists vary. Always research the ZIP where you live.',
      },
      {
        q: 'I work in Philadelphia but live in South Jersey — which Marketplace?',
        a: 'Use your New Jersey home ZIP for Marketplace research and enrollment rules. Confirm that preferred Philly-area providers are in-network on official plan documents if you receive care across the river.',
      },
      {
        q: 'Where do I enroll?',
        a: 'On HealthCare.gov (New Jersey’s federal Marketplace pathway), or with a licensed professional you choose. Insurance Trust Hub does not enroll consumers.',
      },
      {
        q: 'Can I save my research?',
        a: 'Yes. After you run the Marketplace plan research tool, you can save a summary to My Insurance when signed in. That is a research history feature — not enrollment.',
      },
    ],
    relatedGuides: [
      'new-jersey-aca-marketplace',
      'central-jersey-aca-marketplace',
      'north-jersey-aca-marketplace',
    ],
  },
  {
    slug: 'central-jersey-aca-marketplace',
    primaryKeyword: 'Marketplace insurance Central Jersey',
    title: 'Marketplace Insurance in Central Jersey — ACA Research Guide',
    description:
      'Research ACA Marketplace coverage in Central Jersey (Middlesex, Mercer, Monmouth, Ocean, Somerset area context): ZIP landscape tools, cost factors, and HealthCare.gov next steps. Educational only.',
    h1: 'ACA Marketplace research in Central Jersey',
    subhead:
      '“Central Jersey” is how many residents describe the middle of the state — even when maps disagree. Research your ZIP for a real plan landscape, then verify on HealthCare.gov.',
    locationLabel: 'Central Jersey',
    stateName: 'New Jersey',
    licenseRegulator: 'New Jersey DOBI',
    sampleZips: [
      { zip: '08901', label: 'New Brunswick' },
      { zip: '08816', label: 'East Brunswick area' },
      { zip: '08608', label: 'Trenton area' },
      { zip: '08540', label: 'Princeton area' },
      { zip: '07701', label: 'Red Bank / Monmouth area' },
      { zip: '08701', label: 'Lakewood / Ocean area' },
    ],
    hubHref: '/hubs/aca',
    hubLabel: 'ACA specialists hub',
    directoryHref: '/hubs/aca',
    overview: [
      'Central Jersey often includes Middlesex, Mercer, Monmouth, Ocean, and Somerset area context. Residents use the label widely even though official boundaries are fuzzy — that is okay for research framing.',
      'Plan menus remain ZIP- and county-based. A Princeton ZIP, a shore ZIP, and a Route 1 corridor ZIP can surface different issuer mixes. Use the research tool for your address.',
      'This guide is educational only. It is not a quote engine and does not list permanent official premiums.',
    ],
    whoBuys: [
      'Pharmaceutical, logistics, and professional workers without employer coverage',
      'Shore and suburban households comparing networks',
      'Self-employed residents researching total annual cost',
      'People evaluating Silver vs Bronze tradeoffs',
    ],
    costFactors: [
      'Age and household size',
      'Income / FPL position for assistance education',
      'Metal tier and deductible design',
      'Whether preferred providers appear in plan networks (confirm officially)',
    ],
    whatToolShows: [
      'Plan and issuer counts for a Central Jersey ZIP when CMS data loads',
      'Premium and deductible ranges when provided',
      'Lower-premium vs more protective research path examples',
      'Assistance context if you enter income',
    ],
    faqs: [
      {
        q: 'Is Central Jersey a real region?',
        a: 'Many New Jerseyans say yes — even if cartographers argue. For Marketplace purposes, your county and ZIP matter more than the label. We use “Central Jersey” because that is how people search and talk about the area.',
      },
      {
        q: 'Does Ocean County count as Central or South?',
        a: 'Definitions vary. Use the ZIP where you live. Shore communities can sit at the edge of informal regions; the research tool keys off geography, not nicknames.',
      },
      {
        q: 'Where do I enroll?',
        a: 'On HealthCare.gov (New Jersey’s federal Marketplace pathway), or with a licensed professional you choose. Insurance Trust Hub does not enroll consumers.',
      },
      {
        q: 'What if the tool shows no live data?',
        a: 'We fail closed and label educational fallbacks. We never invent a full plan catalog. Retry later or go directly to HealthCare.gov Window Shopping.',
      },
    ],
    relatedGuides: [
      'new-jersey-aca-marketplace',
      'south-jersey-aca-marketplace',
      'north-jersey-aca-marketplace',
    ],
  },
  {
    slug: 'north-jersey-aca-marketplace',
    primaryKeyword: 'ACA plans in North Jersey',
    title: 'ACA Plans in North Jersey — Local Marketplace Research Guide',
    description:
      'Research ACA Marketplace coverage in North Jersey (Bergen, Essex, Hudson, Passaic, Morris, Union area context): ZIP landscape tools, cost factors, and HealthCare.gov next steps. Educational only.',
    h1: 'ACA Marketplace research in North Jersey',
    subhead:
      'North Jersey is dense, multi-county, and often NYC-adjacent. Keep Marketplace research on your New Jersey ZIP — then verify official details on HealthCare.gov.',
    locationLabel: 'North Jersey',
    stateName: 'New Jersey',
    licenseRegulator: 'New Jersey DOBI',
    sampleZips: [
      { zip: '07030', label: 'Hoboken' },
      { zip: '07302', label: 'Jersey City' },
      { zip: '07102', label: 'Newark area' },
      { zip: '07094', label: 'Secaucus area' },
      { zip: '07666', label: 'Teaneck / Bergen area' },
      { zip: '07960', label: 'Morristown / Morris area' },
    ],
    hubHref: '/hubs/aca',
    hubLabel: 'ACA specialists hub',
    directoryHref: '/hubs/aca',
    overview: [
      'North Jersey commonly includes Bergen, Essex, Hudson, Passaic, Morris, and Union area context. It is one of the densest health insurance research markets in the Northeast.',
      'NYC metro adjacency can influence where people work and receive specialty care, but New Jersey Marketplace enrollment still keys off your NJ residence. Mention of New York is for commuting context only.',
      'This guide is educational only. It is not a quote engine and does not list permanent official premiums.',
    ],
    whoBuys: [
      'Commuters and multi-language households without employer coverage',
      'Self-employed professionals and small-business owners',
      'Families comparing urban Hudson County ZIPs to suburban Bergen or Morris ZIPs',
      'People newly eligible after a job or coverage change',
    ],
    costFactors: [
      'Age rating and who is on the application',
      'Income for educational premium tax credit / CSR framing',
      'Local issuer competition and metal mix in your ZIP',
      'Network fit for preferred providers in North Jersey (and, for some, NYC — confirm officially)',
    ],
    whatToolShows: [
      'How many Marketplace plans CMS returns for a North Jersey ZIP',
      'Issuer depth and premium spreads when available',
      'Example lower-premium vs balanced vs higher-protection paths',
      'Optional income-based assistance education',
    ],
    faqs: [
      {
        q: 'Which counties are “North Jersey”?',
        a: 'Residents often include Bergen, Essex, Hudson, Passaic, Morris, and Union area communities. Exact lists vary. Always research the ZIP where you live.',
      },
      {
        q: 'I work in New York City but live in North Jersey — which Marketplace?',
        a: 'Use your New Jersey home ZIP for Marketplace research and enrollment rules. Confirm that preferred NYC providers are in-network on official plan documents if you receive care across the river.',
      },
      {
        q: 'Is North Jersey more expensive than South Jersey?',
        a: 'There is no permanent answer. Issuer competition, ages, and income drive outcomes. Compare live landscapes for each ZIP rather than relying on anecdotes.',
      },
      {
        q: 'Where do I enroll?',
        a: 'On HealthCare.gov (New Jersey’s federal Marketplace pathway), or with a licensed professional you choose. Insurance Trust Hub does not enroll consumers.',
      },
      {
        q: 'Can I save my research?',
        a: 'Yes. After you run the Marketplace plan research tool, you can save a summary to My Insurance when signed in. That is a research history feature — not enrollment.',
      },
    ],
    relatedGuides: [
      'new-jersey-aca-marketplace',
      'central-jersey-aca-marketplace',
      'south-jersey-aca-marketplace',
    ],
  },
  // ── New York cluster (Northeast — NYC / Long Island / Westchester) ───────
  {
    slug: 'new-york-aca-marketplace',
    primaryKeyword: 'ACA Marketplace New York',
    title: 'New York ACA Marketplace Guide — Research Plans by ZIP (2026)',
    description:
      'How to research ACA Marketplace coverage in New York: ZIP-level plan landscape tools, NYC / Long Island / Westchester context, subsidy education, and NY State of Health enrollment next steps. Educational only — no lead selling.',
    h1: 'New York ACA Marketplace guide',
    subhead:
      'A practical research path for New York residents shopping individual-market health coverage — start with your ZIP landscape, then verify and enroll through official New York pathways.',
    locationLabel: 'New York',
    stateName: 'New York',
    licenseRegulator: 'New York DFS',
    sampleZips: [
      { zip: '10001', label: 'Manhattan / NYC' },
      { zip: '11201', label: 'Brooklyn' },
      { zip: '11550', label: 'Hempstead / Long Island' },
      { zip: '10601', label: 'White Plains / Westchester' },
      { zip: '12207', label: 'Albany area' },
      { zip: '14604', label: 'Rochester area' },
    ],
    hubHref: '/hubs/new-york/nyc-newark-jersey-city',
    hubLabel: 'NYC Metro agents hub',
    directoryHref: '/hubs/aca',
    enrollmentLinks: [
      { href: 'https://nystateofhealth.ny.gov/', label: 'NY State of Health' },
      { href: 'https://www.healthcare.gov', label: 'HealthCare.gov' },
    ],
    overview: [
      'New York has a large, complex individual health insurance market. Many residents enroll in ACA coverage through NY State of Health, New York’s official state-based Marketplace — not solely through HealthCare.gov as in pure federal Marketplace states.',
      'People often research by metro region: New York City, Long Island, and Westchester / lower Hudson, plus distinct upstate markets. Plan menus remain ZIP- and county-based, so always research the address where you live.',
      'Insurance Trust Hub provides educational landscape research (including CMS Marketplace data when available). We do not sell policies, process applications, invent official premiums, or replace NY State of Health.',
    ],
    whoBuys: [
      'People without affordable employer coverage',
      'Self-employed workers, freelancers, and multi-borough households',
      'Families leaving Medicaid/CHIP or other coverage',
      'Early retirees under 65 researching bridge coverage before Medicare',
    ],
    costFactors: [
      'Age and household composition (Marketplace age rating)',
      'Household income relative to the federal poverty level (premium tax credit education)',
      'Tobacco use where rating rules apply',
      'Metal tier (Bronze, Silver, Gold) and deductible / max out-of-pocket design',
      'County and local issuer competition — NYC, Long Island, Westchester, and upstate menus can differ',
    ],
    whatToolShows: [
      'Approximate plan and issuer counts for your New York ZIP when the CMS Marketplace API is available',
      'Premium ranges and deductible ranges when CMS returns those fields',
      'Lower-premium, balanced, and higher-protection research path examples',
      'Assistance context when you add household income (educational — not an official award)',
    ],
    faqs: [
      {
        q: 'Does New York use HealthCare.gov or a state Marketplace?',
        a: 'New York operates NY State of Health, a state-based Marketplace, for individual ACA coverage and related programs. HealthCare.gov remains a useful federal reference, but official eligibility, plan selection, and enrollment for most New Yorkers go through NY State of Health (nystateofhealth.ny.gov). Always confirm current steps on official sites.',
      },
      {
        q: 'Why research by ZIP if I enroll on NY State of Health?',
        a: 'ZIP and county shape which plans and networks are available. Our research tool helps you understand local plan landscape context (when CMS data loads) before you complete official shopping and enrollment on NY State of Health.',
      },
      {
        q: 'Is a low monthly premium always best in New York?',
        a: 'Not necessarily. Lower-premium paths often pair with higher deductibles. Silver can matter if cost-sharing reductions may apply. Use total-cost thinking, then verify official prices and assistance on NY State of Health.',
      },
      {
        q: 'Can Insurance Trust Hub enroll me?',
        a: 'No. We provide independent educational research only. Official eligibility, subsidies, and enrollment are determined on NY State of Health (or with a licensed professional you choose).',
      },
      {
        q: 'What about Medicare in New York?',
        a: 'Medicare is a separate pathway from the ACA Marketplace. If you are 65+ or otherwise Medicare-eligible, use Medicare research tools and Medicare.gov — not Marketplace enrollment alone.',
      },
    ],
    relatedGuides: [
      'nyc-aca-marketplace',
      'long-island-aca-marketplace',
      'westchester-aca-marketplace',
    ],
  },
  {
    slug: 'nyc-aca-marketplace',
    primaryKeyword: 'ACA plans in NYC',
    title: 'ACA Plans in NYC — Local Marketplace Research Guide',
    description:
      'Research ACA Marketplace coverage in New York City (five boroughs): ZIP landscape tools, cost factors, subsidy education, and NY State of Health next steps. Educational only — no lead selling.',
    h1: 'ACA Marketplace research in NYC',
    subhead:
      'Five-borough shoppers face dense networks and ZIP-level plan variation. Research your local landscape first — then verify and enroll through NY State of Health.',
    locationLabel: 'New York City',
    stateName: 'New York',
    licenseRegulator: 'New York DFS',
    sampleZips: [
      { zip: '10001', label: 'Manhattan (midtown area)' },
      { zip: '10019', label: 'Manhattan (midtown west)' },
      { zip: '11201', label: 'Brooklyn Heights area' },
      { zip: '11101', label: 'Long Island City / Queens' },
      { zip: '10451', label: 'South Bronx area' },
      { zip: '10301', label: 'Staten Island (St. George area)' },
    ],
    hubHref: '/hubs/new-york/nyc-newark-jersey-city',
    hubLabel: 'NYC Metro agents hub',
    directoryHref: '/hubs/aca',
    enrollmentLinks: [
      { href: 'https://nystateofhealth.ny.gov/', label: 'NY State of Health' },
      { href: 'https://www.healthcare.gov', label: 'HealthCare.gov' },
    ],
    overview: [
      'New York City covers five boroughs — Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. Residents often compare neighborhoods and networks, but Marketplace menus still key off your ZIP and county of residence.',
      'NYC is not a pure HealthCare.gov state for most individual ACA shoppers. Official enrollment for many New Yorkers runs through NY State of Health. Treat any “average city premium” as anecdote only — never a permanent fact.',
      'This guide is educational research from Insurance Trust Hub. It is not a quote engine and does not invent official premiums.',
    ],
    whoBuys: [
      'Gig, creative, and professional workers without employer coverage',
      'Multi-language households comparing networks across boroughs',
      'Self-employed residents researching total annual cost',
      'People newly eligible after a job or coverage change',
    ],
    costFactors: [
      'Age rating and who is on the application',
      'Income for educational premium tax credit / CSR framing',
      'Local issuer competition and metal mix in your ZIP',
      'Network fit for preferred providers across boroughs (confirm officially)',
    ],
    whatToolShows: [
      'How many Marketplace plans CMS returns for an NYC ZIP when available',
      'Issuer depth and premium spreads when CMS provides those fields',
      'Example lower-premium vs balanced vs higher-protection paths',
      'Optional income-based assistance education',
    ],
    faqs: [
      {
        q: 'Where do New Yorkers officially enroll in ACA plans?',
        a: 'Most individual Marketplace enrollment in New York goes through NY State of Health (nystateofhealth.ny.gov), the state’s official Marketplace. HealthCare.gov can help you understand federal context, but complete official shopping and enrollment on the New York pathway unless an official site directs you otherwise.',
      },
      {
        q: 'Do plans differ by borough?',
        a: 'Availability can vary by ZIP and county within the city. A Manhattan ZIP, a Brooklyn ZIP, and a Staten Island ZIP can surface different landscapes. Always research the ZIP where you live and seek care.',
      },
      {
        q: 'Can Insurance Trust Hub enroll me in NYC?',
        a: 'No. We provide independent educational research only. Official eligibility, pricing, and enrollment are on NY State of Health (or with a licensed professional you choose).',
      },
      {
        q: 'Can I save my research?',
        a: 'Yes. After you run the Marketplace plan research tool, you can save a summary to My Insurance when signed in. That is a research history feature — not enrollment.',
      },
    ],
    relatedGuides: [
      'new-york-aca-marketplace',
      'long-island-aca-marketplace',
      'westchester-aca-marketplace',
    ],
  },
  {
    slug: 'long-island-aca-marketplace',
    primaryKeyword: 'Marketplace insurance Long Island',
    title: 'Marketplace Insurance on Long Island — ACA Research Guide',
    description:
      'Research ACA Marketplace coverage on Long Island (Nassau and Suffolk): ZIP landscape tools, cost factors, subsidy education, and NY State of Health next steps. Educational only — no lead selling.',
    h1: 'ACA Marketplace research on Long Island',
    subhead:
      'Nassau and Suffolk households often shop suburban networks and issuer mixes. Use ZIP-level landscape research — then verify official details on NY State of Health.',
    locationLabel: 'Long Island',
    stateName: 'New York',
    licenseRegulator: 'New York DFS',
    sampleZips: [
      { zip: '11550', label: 'Hempstead area' },
      { zip: '11530', label: 'Garden City area' },
      { zip: '11743', label: 'Huntington area' },
      { zip: '11701', label: 'Babylon / western Suffolk' },
      { zip: '11747', label: 'Melville / Route 110 area' },
      { zip: '11901', label: 'Riverhead / East End area' },
    ],
    hubHref: '/hubs/new-york/nyc-newark-jersey-city',
    hubLabel: 'NYC Metro agents hub',
    directoryHref: '/hubs/aca',
    enrollmentLinks: [
      { href: 'https://nystateofhealth.ny.gov/', label: 'NY State of Health' },
      { href: 'https://www.healthcare.gov', label: 'HealthCare.gov' },
    ],
    overview: [
      'Long Island research usually centers on Nassau and Suffolk counties — suburban markets with their own hospital systems, commuting patterns, and issuer competition.',
      'Like the rest of New York, official Marketplace enrollment for many residents runs through NY State of Health, not a pure HealthCare.gov-only pathway. Use educational ZIP research for landscape context, then complete official steps on the state site.',
      'This guide is educational only. It is not a quote engine and does not list permanent official premiums.',
    ],
    whoBuys: [
      'Suburban households without employer coverage',
      'Self-employed and small-business owners along the LIE / Route 110 corridors',
      'Families comparing total cost, not just monthly premium',
      'People newly eligible after a job or coverage change',
    ],
    costFactors: [
      'Age and household size',
      'Income / FPL position for assistance education',
      'Metal tier and deductible design',
      'Whether preferred Long Island providers appear in plan networks (confirm officially)',
    ],
    whatToolShows: [
      'Plan and issuer counts for a Long Island ZIP when CMS data loads',
      'Premium and deductible ranges when provided',
      'Lower-premium vs more protective research path examples',
      'Assistance context if you enter income',
    ],
    faqs: [
      {
        q: 'Is Long Island on NY State of Health?',
        a: 'Yes — Nassau and Suffolk residents generally use New York’s official state Marketplace, NY State of Health, for individual ACA enrollment. Confirm current rules and plan catalogs on nystateofhealth.ny.gov.',
      },
      {
        q: 'Nassau vs Suffolk — same plans?',
        a: 'Not necessarily. County and ZIP can change issuer and network options. Research the ZIP where you live rather than assuming a single “Long Island” menu.',
      },
      {
        q: 'Where do I enroll?',
        a: 'On NY State of Health for official eligibility, pricing, and enrollment, or with a licensed professional you choose. Insurance Trust Hub does not enroll consumers.',
      },
      {
        q: 'What if the research tool shows no live data?',
        a: 'We fail closed and label educational fallbacks. We never invent a full plan catalog. Retry later or go directly to NY State of Health for official shopping.',
      },
    ],
    relatedGuides: [
      'new-york-aca-marketplace',
      'nyc-aca-marketplace',
      'westchester-aca-marketplace',
    ],
  },
  {
    slug: 'westchester-aca-marketplace',
    primaryKeyword: 'ACA plans in Westchester',
    title: 'ACA Plans in Westchester — Local Marketplace Research Guide',
    description:
      'Research ACA Marketplace coverage in Westchester and lower Hudson context: ZIP landscape tools, cost factors, subsidy education, and NY State of Health next steps. Educational only — no lead selling.',
    h1: 'ACA Marketplace research in Westchester',
    subhead:
      'Westchester and nearby lower Hudson households often sit next to the NYC market. Keep research on your local ZIP — then verify enrollment on NY State of Health.',
    locationLabel: 'Westchester',
    stateName: 'New York',
    licenseRegulator: 'New York DFS',
    sampleZips: [
      { zip: '10601', label: 'White Plains' },
      { zip: '10583', label: 'Scarsdale / Eastchester area' },
      { zip: '10701', label: 'Yonkers area' },
      { zip: '10550', label: 'Mount Vernon area' },
      { zip: '10573', label: 'Port Chester / Rye area' },
      { zip: '10520', label: 'Croton / northern Westchester area' },
    ],
    hubHref: '/hubs/new-york/nyc-newark-jersey-city',
    hubLabel: 'NYC Metro agents hub',
    directoryHref: '/hubs/aca',
    enrollmentLinks: [
      { href: 'https://nystateofhealth.ny.gov/', label: 'NY State of Health' },
      { href: 'https://www.healthcare.gov', label: 'HealthCare.gov' },
    ],
    overview: [
      'Westchester County — and adjacent lower Hudson communities many residents mention in the same breath — is a dense suburban market north of New York City with its own hospital systems and commuting patterns.',
      'NYC adjacency can influence where people work and receive specialty care, but Marketplace research and New York enrollment rules still key off your New York residence. Official individual ACA pathways typically run through NY State of Health.',
      'This guide is educational only. It is not a quote engine and does not list permanent official premiums.',
    ],
    whoBuys: [
      'Commuter households without affordable employer coverage',
      'Self-employed professionals and small-business owners',
      'Families comparing networks across southern Westchester towns',
      'People newly eligible after a job or coverage change',
    ],
    costFactors: [
      'Age rating and who is on the application',
      'Income for educational premium tax credit / CSR framing',
      'Local issuer competition and metal mix in your ZIP',
      'Network fit for preferred Westchester (and, for some, NYC) providers — confirm officially',
    ],
    whatToolShows: [
      'How many Marketplace plans CMS returns for a Westchester ZIP when available',
      'Issuer depth and premium spreads when provided',
      'Example lower-premium vs balanced vs higher-protection paths',
      'Optional income-based assistance education',
    ],
    faqs: [
      {
        q: 'Does Westchester use NY State of Health?',
        a: 'Yes. Westchester residents generally enroll in individual ACA coverage through New York’s official state Marketplace, NY State of Health. Always confirm current steps and official plan prices there.',
      },
      {
        q: 'I work in NYC but live in Westchester — which Marketplace?',
        a: 'Use your New York home ZIP for Marketplace research and New York enrollment rules. Confirm that preferred city providers are in-network on official plan documents if you receive care in the five boroughs.',
      },
      {
        q: 'Is Westchester more expensive than Long Island or NYC?',
        a: 'There is no permanent answer. Issuer competition, ages, and income drive outcomes. Compare live landscapes for each ZIP rather than relying on anecdotes.',
      },
      {
        q: 'Where do I enroll?',
        a: 'On NY State of Health for official eligibility, pricing, and enrollment, or with a licensed professional you choose. Insurance Trust Hub does not enroll consumers.',
      },
      {
        q: 'Can I save my research?',
        a: 'Yes. After you run the Marketplace plan research tool, you can save a summary to My Insurance when signed in. That is a research history feature — not enrollment.',
      },
    ],
    relatedGuides: [
      'new-york-aca-marketplace',
      'nyc-aca-marketplace',
      'long-island-aca-marketplace',
    ],
  },
];

export function getAcaMarketplaceGuide(slug: string): AcaMarketplaceGuide | undefined {
  return ACA_MARKETPLACE_GUIDES.find((g) => g.slug === slug);
}

export function getAllAcaMarketplaceGuideSlugs(): string[] {
  return ACA_MARKETPLACE_GUIDES.map((g) => g.slug);
}

export function getAcaMarketplaceGuidesByState(
  stateName: AcaMarketplaceGuide['stateName']
): AcaMarketplaceGuide[] {
  return ACA_MARKETPLACE_GUIDES.filter((g) => g.stateName === stateName);
}

export { FLAGSHIP as MARKETPLACE_FLAGSHIP_PATH };
