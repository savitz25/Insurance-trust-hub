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
  stateName: 'Florida' | 'Texas' | 'Georgia' | 'North Carolina';
  /** Short regulator name for license re-check copy */
  licenseRegulator: string;
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
