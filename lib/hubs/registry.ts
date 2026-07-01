import type { InsuranceHub } from '@/types/agent';

/** 50+ priority MSA/city hubs — health insurance emphasis in every market */
export const INSURANCE_HUBS: InsuranceHub[] = [
  {
    slug: 'nyc-newark-jersey-city',
    stateSlug: 'new-york',
    stateCode: 'NY',
    stateName: 'New York',
    msaName: 'New York-Newark-Jersey City',
    shortName: 'NYC Metro',
    population: 19_800_000,
    enrollmentHighlight: '4.2M+ ACA and employer enrollees across tri-state corridor',
    localDescriptor: 'tri-state families, union plans, and diverse immigrant communities',
    priority: 1,
    zipCodes: ['10001', '10019', '11201', '07102', '07302'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'The nation\'s largest insurance market combines dense employer-sponsored coverage, ACA marketplace enrollment, and Medicaid managed care. Independent brokers navigate multi-state licensing and diverse-language enrollment needs across NYC boroughs, Long Island, and northern New Jersey.',
    healthNeeds: ['ACA multilingual enrollment', 'Union and employer transitions', 'Medicaid-to-Medicare bridges', 'Small business group plans'],
    metaTitle: 'Top Verified Insurance Agents in NYC Metro (2026) | Health Insurance Experts',
    metaDescription:
      'Compare 850+ verified insurance agents in New York-Newark-Jersey City. Health insurance specialists for ACA, Medicare, employer plans, and multi-line coverage. 100% data-driven, no paid placements.',
  },
  {
    slug: 'los-angeles',
    stateSlug: 'california',
    stateCode: 'CA',
    stateName: 'California',
    msaName: 'Los Angeles-Long Beach-Anaheim',
    shortName: 'Los Angeles',
    population: 12_900_000,
    enrollmentHighlight: 'Covered California leads national ACA enrollment volume',
    localDescriptor: 'Southern California families, entertainment industry, and Latino communities',
    priority: 2,
    zipCodes: ['90001', '90012', '90210', '90650', '91401'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'Covered California makes LA County one of the highest ACA enrollment markets in the U.S. Agents here specialize in subsidy optimization, Medi-Cal transitions, entertainment-industry gig coverage, and wildfire-related property/health bundling for relocating families.',
    healthNeeds: ['Covered California subsidies', 'Medi-Cal eligibility', 'Entertainment gig economy plans', 'Bilingual enrollment'],
    metaTitle: 'Verified Insurance Agents in Los Angeles (2026) | ACA & Medicare Experts',
    metaDescription:
      'Find trusted health insurance agents in Los Angeles-Long Beach-Anaheim. ACA marketplace, Medicare, dental, and multi-line agencies verified from state DOI and public reviews.',
  },
  {
    slug: 'chicago',
    stateSlug: 'illinois',
    stateCode: 'IL',
    stateName: 'Illinois',
    msaName: 'Chicago-Naperville-Elgin',
    shortName: 'Chicago',
    population: 9_400_000,
    enrollmentHighlight: '2.1M+ marketplace and employer enrollees in Chicagoland',
    localDescriptor: 'Chicagoland commuters, union households, and suburban families',
    priority: 3,
    zipCodes: ['60601', '60614', '60629', '60173', '60477'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'Chicago\'s insurance landscape blends large employer headquarters, union health funds, and Get Covered Illinois marketplace enrollment. Suburban growth corridors in Naperville and Elgin drive demand for independent agents who bundle health with home and auto for relocating professionals.',
    healthNeeds: ['Get Covered Illinois ACA', 'Union health fund navigation', 'Suburban employer transitions', 'Medicare Advantage in collar counties'],
    metaTitle: 'Top Insurance Agents in Chicago Metro (2026) | Health Insurance Directory',
    metaDescription:
      'Compare verified insurance agents in Chicago-Naperville-Elgin. Health insurance specialists for ACA, Medicare, group plans, plus home and auto coverage.',
  },
  {
    slug: 'dallas-fort-worth',
    stateSlug: 'texas',
    stateCode: 'TX',
    stateName: 'Texas',
    msaName: 'Dallas-Fort Worth-Arlington',
    shortName: 'DFW',
    population: 8_100_000,
    enrollmentHighlight: 'Fastest-growing large MSA for employer and ACA enrollment',
    localDescriptor: 'DFW corporate relocations, tech corridors, and young families',
    priority: 4,
    zipCodes: ['75201', '76102', '75001', '75034', '76010'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'DFW\'s explosive population growth creates constant demand for health coverage during corporate relocations. Independent agencies compete on ACA plans via HealthCare.gov, employer group administration, and Medicare for retiring boomers moving from higher-cost states.',
    healthNeeds: ['Relocation health coverage', 'ACA during job changes', 'Tech employer benefits', 'Hail/wind property bundling'],
    metaTitle: 'Verified Insurance Agents in Dallas-Fort Worth (2026)',
    metaDescription:
      'Find health insurance experts in DFW. Verified agents for ACA, Medicare, employer plans, home, and auto. Independent directory — no paid placements.',
  },
  {
    slug: 'houston',
    stateSlug: 'texas',
    stateCode: 'TX',
    stateName: 'Texas',
    msaName: 'Houston-The Woodlands-Sugar Land',
    shortName: 'Houston',
    population: 7_300_000,
    enrollmentHighlight: 'Energy sector employer plans plus Gulf Coast ACA enrollment',
    localDescriptor: 'energy professionals, hurricane-zone homeowners, and diverse Houston metro',
    priority: 5,
    zipCodes: ['77002', '77024', '77479', '77380', '77584'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'Houston\'s energy sector drives employer-sponsored health plan complexity, while flood and wind risks make multi-line independent agencies essential. Health brokers here navigate ACA, short-term gaps between jobs, and Medicare for retiring refinery workers.',
    healthNeeds: ['Energy sector benefits', 'Flood-zone property + health bundles', 'ACA job-loss transitions', 'Medicare for retirees'],
    metaTitle: 'Insurance Agents in Houston Metro (2026) | Health & Multi-Line Experts',
    metaDescription:
      'Compare verified insurance agents in Houston-The Woodlands-Sugar Land. Health insurance, Medicare, ACA, home, flood, and auto specialists.',
  },
  {
    slug: 'washington-dc',
    stateSlug: 'virginia',
    stateCode: 'VA',
    stateName: 'Virginia',
    msaName: 'Washington-Arlington-Alexandria',
    shortName: 'DC Metro',
    population: 6_300_000,
    enrollmentHighlight: 'Federal employee FEHB and ACA marketplace overlap',
    localDescriptor: 'federal employees, contractors, and NoVA tech professionals',
    priority: 6,
    zipCodes: ['20001', '22201', '22314', '20814', '20171'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'The DC metro area has uniquely high concentrations of federal employee health benefits (FEHB), contractor transitions, and ACA marketplace shoppers in Maryland and Virginia. Agents specialize in open season navigation, retirement health bridges, and employer plan comparisons.',
    healthNeeds: ['FEHB open season', 'Contractor-to-private transitions', 'Maryland/Virginia ACA', 'Retirement Medicare timing'],
    metaTitle: 'Insurance Agents in DC Metro (2026) | Federal & Health Plan Experts',
    metaDescription:
      'Verified insurance agents in Washington-Arlington-Alexandria. Health insurance for federal employees, ACA, Medicare, and multi-line coverage.',
  },
  {
    slug: 'miami-fort-lauderdale',
    stateSlug: 'florida',
    stateCode: 'FL',
    stateName: 'Florida',
    msaName: 'Miami-Fort Lauderdale-Pompano Beach',
    shortName: 'South Florida',
    population: 6_100_000,
    enrollmentHighlight: 'Nation\'s highest Medicare Advantage penetration market',
    localDescriptor: 'retirees, snowbirds, Caribbean and Latino communities',
    priority: 7,
    zipCodes: ['33101', '33139', '33301', '33024', '33401'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'South Florida leads the nation in Medicare Advantage enrollment density across Miami-Dade, Broward, and Palm Beach counties. Independent brokers in Doral, Hollywood, Fort Lauderdale, Greenacres, and Boca Raton compare Advantage, supplement, and ACA plans for retirees, snowbirds, and bilingual families — with property insurers addressing hurricane and flood risks alongside health coverage.',
    healthNeeds: [
      'Medicare Advantage comparison (tri-county)',
      'Bilingual ACA enrollment (Miami-Dade)',
      'Snowbird coverage transitions',
      'Palm Beach senior supplement plans',
      'Hurricane property + health bundling',
    ],
    metaTitle: 'Insurance Agents in South Florida (2026) | Miami-Dade, Broward & Palm Beach',
    metaDescription:
      'Compare 12 verified independent insurance agents across Miami-Dade, Broward, and Palm Beach. Medicare Advantage, ACA, supplement plans, and multi-line specialists — 4.9 avg rating, DFS verified.',
  },
  {
    slug: 'philadelphia',
    stateSlug: 'pennsylvania',
    stateCode: 'PA',
    stateName: 'Pennsylvania',
    msaName: 'Philadelphia-Camden-Wilmington',
    shortName: 'Philadelphia',
    population: 6_200_000,
    enrollmentHighlight: 'Pennie marketplace and cross-state tri-county enrollment',
    localDescriptor: 'tri-state commuters, healthcare workers, and university communities',
    priority: 8,
    zipCodes: ['19102', '19103', '19010', '08003', '19801'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'Greater Philadelphia spans three states with Pennie (PA), Get Covered NJ, and Delaware marketplace options. Healthcare employment clusters create strong group-plan expertise among independent agencies serving collar counties and Wilmington corporate corridors.',
    healthNeeds: ['Pennie ACA enrollment', 'Cross-state licensing', 'Healthcare worker benefits', 'University young-adult plans'],
    metaTitle: 'Insurance Agents in Philadelphia Metro (2026) | Health Insurance Hub',
    metaDescription:
      'Verified insurance agents in Philadelphia-Camden-Wilmington. ACA, Medicare, employer plans, and multi-line coverage across tri-state region.',
  },
  {
    slug: 'atlanta',
    stateSlug: 'georgia',
    stateCode: 'GA',
    stateName: 'Georgia',
    msaName: 'Atlanta-Sandy Springs-Alpharetta',
    shortName: 'Atlanta',
    population: 6_200_000,
    enrollmentHighlight: 'Corporate HQ relocations drive employer plan growth',
    localDescriptor: 'corporate relocations, diverse suburbs, and fast-growing exurbs',
    priority: 9,
    zipCodes: ['30303', '30309', '30004', '30328', '30067'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'Atlanta\'s status as a corporate relocation magnet creates steady demand for health insurance during job transitions. Georgia Access marketplace enrollment grows annually, while Medicare demand rises in north Fulton and Gwinnett retirement communities.',
    healthNeeds: ['Corporate relocation health', 'Georgia Access ACA', 'Suburban family plans', 'Medicare in north suburbs'],
    metaTitle: 'Insurance Agents in Atlanta Metro (2026) | Health & Benefits Experts',
    metaDescription:
      'Compare verified insurance agents in Atlanta-Sandy Springs-Alpharetta. Health insurance, ACA, Medicare, home, and auto for relocating families.',
  },
  {
    slug: 'phoenix',
    stateSlug: 'arizona',
    stateCode: 'AZ',
    stateName: 'Arizona',
    msaName: 'Phoenix-Mesa-Chandler',
    shortName: 'Phoenix',
    population: 5_100_000,
    enrollmentHighlight: 'Retiree influx fuels Medicare and ACA dual demand',
    localDescriptor: 'retirees, snowbirds, and fast-growing Maricopa families',
    priority: 10,
    zipCodes: ['85001', '85018', '85201', '85224', '85286'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'Maricopa County combines rapid population growth with one of the highest retiree migration rates nationally. Health agents navigate Arizona marketplace plans, Medicare Advantage in sun-belt communities, and property coverage for monsoon and wildfire risks.',
    healthNeeds: ['Medicare for retirees', 'Arizona marketplace ACA', 'Snowbird transitions', 'Monsoon property bundling'],
    metaTitle: 'Insurance Agents in Phoenix Metro (2026) | Medicare & ACA Experts',
    metaDescription:
      'Verified insurance agents in Phoenix-Mesa-Chandler. Medicare, ACA, dental, home, and auto specialists for Arizona families and retirees.',
  },
  {
    slug: 'boston',
    stateSlug: 'massachusetts',
    stateCode: 'MA',
    stateName: 'Massachusetts',
    msaName: 'Boston-Cambridge-Newton',
    shortName: 'Boston',
    population: 4_900_000,
    enrollmentHighlight: 'Near-universal coverage via state connector and employer plans',
    localDescriptor: 'academic, biotech, and healthcare employment corridors',
    priority: 11,
    zipCodes: ['02108', '02139', '02458', '02134', '01803'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'Massachusetts\' near-universal coverage framework means agents focus on plan optimization, employer transitions in biotech corridors, and Medicare for aging suburbs. Independent brokers add value comparing supplement options beyond minimum state requirements.',
    healthNeeds: ['Health Connector optimization', 'Biotech employer transitions', 'Student and young professional plans', 'Medicare supplements'],
    metaTitle: 'Insurance Agents in Boston Metro (2026) | Health Plan Specialists',
    metaDescription:
      'Top verified insurance agents in Boston-Cambridge-Newton. Health insurance, Medicare, ACA connector plans, life, and home coverage.',
  },
  {
    slug: 'san-francisco',
    stateSlug: 'california',
    stateCode: 'CA',
    stateName: 'California',
    msaName: 'San Francisco-Oakland-Berkeley',
    shortName: 'Bay Area',
    population: 4_600_000,
    enrollmentHighlight: 'Tech employer benefits and Covered California high-cost region',
    localDescriptor: 'tech professionals, startup equity transitions, and diverse Bay Area',
    priority: 12,
    zipCodes: ['94102', '94110', '94601', '94704', '94301'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'The Bay Area\'s tech economy creates complex health benefit scenarios — startup equity transitions, contractor 1099 coverage, and high-income ACA subsidy cliffs. Agents specialize in Covered California optimization and executive group plan consulting.',
    healthNeeds: ['Tech startup benefits', '1099 contractor coverage', 'Covered California subsidy cliffs', 'Earthquake property bundling'],
    metaTitle: 'Insurance Agents in San Francisco Bay Area (2026)',
    metaDescription:
      'Verified insurance agents in SF-Oakland-Berkeley. Health insurance for tech professionals, ACA, Medicare, home, earthquake, and auto.',
  },
  {
    slug: 'riverside-san-bernardino',
    stateSlug: 'california',
    stateCode: 'CA',
    stateName: 'California',
    msaName: 'Riverside-San Bernardino-Ontario',
    shortName: 'Inland Empire',
    population: 4_700_000,
    enrollmentHighlight: 'Affordable housing migration drives ACA enrollment growth',
    localDescriptor: 'LA overflow families, logistics workers, and first-time buyers',
    priority: 13,
    zipCodes: ['92501', '92401', '91761', '92879', '92201'],
    healthInsuranceDensity: 'high',
    marketSnapshot:
      'The Inland Empire absorbs families priced out of coastal California, creating demand for affordable ACA plans and first-time homeowner bundles. Health agents serve logistics, warehouse, and service-sector workers with marketplace and Medi-Cal transitions.',
    healthNeeds: ['Affordable ACA plans', 'Medi-Cal transitions', 'First-time buyer bundles', 'Wildfire property risks'],
    metaTitle: 'Insurance Agents in Inland Empire (2026) | Health & Home Experts',
    metaDescription:
      'Compare verified agents in Riverside-San Bernardino-Ontario. ACA, Medicare, home, auto, and wildfire coverage specialists.',
  },
  {
    slug: 'detroit',
    stateSlug: 'michigan',
    stateCode: 'MI',
    stateName: 'Michigan',
    msaName: 'Detroit-Warren-Dearborn',
    shortName: 'Detroit',
    population: 4_300_000,
    enrollmentHighlight: 'Auto industry benefits and Michigan marketplace enrollment',
    localDescriptor: 'auto industry workers, union households, and suburban Oakland County',
    priority: 14,
    zipCodes: ['48201', '48226', '48009', '48307', '48126'],
    healthInsuranceDensity: 'high',
    marketSnapshot:
      'Detroit\'s insurance market reflects automotive industry benefit structures, UAW health fund familiarity, and Michigan marketplace enrollment. Agents in Warren and Dearborn serve diverse communities with ACA, Medicare, and multi-line coverage needs.',
    healthNeeds: ['Auto industry benefit transitions', 'Michigan marketplace ACA', 'Union health navigation', 'Medicare in Oakland County'],
    metaTitle: 'Insurance Agents in Detroit Metro (2026) | Health Insurance Directory',
    metaDescription:
      'Verified insurance agents in Detroit-Warren-Dearborn. Health, Medicare, ACA, auto, and home specialists. Independent, data-driven listings.',
  },
  {
    slug: 'seattle',
    stateSlug: 'washington',
    stateCode: 'WA',
    stateName: 'Washington',
    msaName: 'Seattle-Tacoma-Bellevue',
    shortName: 'Seattle',
    population: 4_000_000,
    enrollmentHighlight: 'Washington Healthplanfinder and tech employer dominance',
    localDescriptor: 'tech workers, Amazon/Microsoft corridors, and Puget Sound families',
    priority: 15,
    zipCodes: ['98101', '98109', '98004', '98402', '98052'],
    healthInsuranceDensity: 'very-high',
    marketSnapshot:
      'Puget Sound\'s tech economy drives employer-sponsored plan expertise, while Washington Healthplanfinder serves ACA enrollees. Agents navigate no-state-income-tax financial planning alongside health coverage for contractors and relocating tech professionals.',
    healthNeeds: ['Tech employer benefits', 'Washington Healthplanfinder', 'Contractor 1099 coverage', 'Earthquake/flood property'],
    metaTitle: 'Insurance Agents in Seattle Metro (2026) | Health & Tech Benefits',
    metaDescription:
      'Top verified agents in Seattle-Tacoma-Bellevue. Health insurance, ACA, Medicare, home, and auto for Puget Sound families.',
  },
  // Remaining 35+ hubs (condensed metadata — full agent rosters generated programmatically)
  { slug: 'minneapolis', stateSlug: 'minnesota', stateCode: 'MN', stateName: 'Minnesota', msaName: 'Minneapolis-St. Paul-Bloomington', shortName: 'Twin Cities', population: 3_700_000, enrollmentHighlight: 'MNsure marketplace and Medtronic/retail HQ benefits', localDescriptor: 'Twin Cities families and healthcare corridor workers', priority: 16, zipCodes: ['55401', '55101', '55416'], healthInsuranceDensity: 'high', marketSnapshot: 'Twin Cities agents excel at MNsure ACA enrollment, Mayo-adjacent healthcare benefits, and winter property coverage bundled with health plans.', healthNeeds: ['MNsure ACA', 'Healthcare employer plans', 'Medicare Advantage'], metaTitle: 'Insurance Agents in Minneapolis-St. Paul (2026)', metaDescription: 'Verified health insurance agents in the Twin Cities metro.' },
  { slug: 'tampa', stateSlug: 'florida', stateCode: 'FL', stateName: 'Florida', msaName: 'Tampa-St. Petersburg-Clearwater', shortName: 'Tampa Bay', population: 3_300_000, enrollmentHighlight: 'Medicare-heavy retiree market on Gulf Coast', localDescriptor: 'retirees, military veterans, and Gulf Coast families', priority: 17, zipCodes: ['33602', '33701', '34677'], healthInsuranceDensity: 'very-high', marketSnapshot: 'Tampa Bay rivals South Florida in Medicare density with strong VA-adjacent broker expertise and hurricane-season property/health bundling.', healthNeeds: ['Medicare Advantage', 'VA benefits coordination', 'Hurricane coverage'], metaTitle: 'Insurance Agents in Tampa Bay (2026)', metaDescription: 'Medicare and health insurance agents in Tampa-St. Petersburg-Clearwater.' },
  { slug: 'denver', stateSlug: 'colorado', stateCode: 'CO', stateName: 'Colorado', msaName: 'Denver-Aurora-Lakewood', shortName: 'Denver', population: 2_900_000, enrollmentHighlight: 'Connect for Health Colorado and outdoor-lifestyle relocations', localDescriptor: 'relocating professionals, outdoor enthusiasts, and cannabis-industry workers', priority: 18, zipCodes: ['80202', '80012', '80123'], healthInsuranceDensity: 'high', marketSnapshot: 'Denver\'s relocation boom drives ACA and employer plan demand. Agents navigate Connect for Health Colorado and wildfire property risks in foothill suburbs.', healthNeeds: ['Connect for Health CO', 'Relocation coverage', 'Wildfire property'], metaTitle: 'Insurance Agents in Denver Metro (2026)', metaDescription: 'Health insurance experts in Denver-Aurora-Lakewood.' },
  { slug: 'baltimore', stateSlug: 'maryland', stateCode: 'MD', stateName: 'Maryland', msaName: 'Baltimore-Columbia-Towson', shortName: 'Baltimore', population: 2_800_000, enrollmentHighlight: 'Maryland Health Connection and Johns Hopkins corridor', localDescriptor: 'healthcare workers, federal commuters, and Columbia planned community', priority: 19, zipCodes: ['21201', '21044', '21234'], healthInsuranceDensity: 'high', marketSnapshot: 'Baltimore agents serve Maryland Health Connection enrollees, Hopkins healthcare employees, and DC commuter benefit transitions.', healthNeeds: ['Maryland Health Connection', 'Healthcare worker plans', 'DC commuter benefits'], metaTitle: 'Insurance Agents in Baltimore Metro (2026)', metaDescription: 'Verified agents in Baltimore-Columbia-Towson.' },
  { slug: 'st-louis', stateSlug: 'missouri', stateCode: 'MO', stateName: 'Missouri', msaName: 'St. Louis', shortName: 'St. Louis', population: 2_800_000, enrollmentHighlight: 'Bi-state marketplace enrollment MO/IL', localDescriptor: 'bi-state families, healthcare, and manufacturing workers', priority: 20, zipCodes: ['63101', '63117', '62034'], healthInsuranceDensity: 'high', marketSnapshot: 'St. Louis spans Missouri and Illinois marketplaces, requiring agents with bi-state licensing for ACA and employer transitions.', healthNeeds: ['Bi-state ACA', 'Employer transitions', 'Medicare'], metaTitle: 'Insurance Agents in St. Louis (2026)', metaDescription: 'Health insurance agents serving Greater St. Louis.' },
  {
    slug: 'orlando',
    stateSlug: 'florida',
    stateCode: 'FL',
    stateName: 'Florida',
    msaName: 'Orlando-Kissimmee-Sanford',
    shortName: 'Orlando',
    population: 2_700_000,
    enrollmentHighlight: 'Hospitality workforce ACA enrollment plus growing Central Florida Medicare demand',
    localDescriptor: 'hospitality workers, theme-park economy, Winter Park families, and Central Florida retirees',
    priority: 21,
    zipCodes: ['32801', '32789', '34741', '32771', '32750'],
    healthInsuranceDensity: 'high',
    marketSnapshot:
      'Orlando\'s hospitality economy drives ACA demand among seasonal and theme-park workers across Orange County, while Winter Park and Kissimmee anchor independent Medicare and health brokers serving AdventHealth Orlando and Orlando Health networks. Multi-line independents with decades of tenure complement dedicated Medicare specialists across Seminole and Osceola counties.',
    healthNeeds: [
      'Hospitality & seasonal worker ACA',
      'Medicare Advantage (AdventHealth/Orlando Health networks)',
      'Winter Park small-business group health',
      'Kissimmee / Osceola family plans',
      'Seminole County multi-line bundling',
    ],
    metaTitle: 'Insurance Agents in Orlando Metro (2026) | Orange, Osceola & Seminole',
    metaDescription:
      'Compare 12 verified independent insurance agents in Orlando-Kissimmee-Sanford. Medicare, ACA, and multi-line specialists in Winter Park, Kissimmee, and Central Florida — DFS verified.',
  },
  { slug: 'charlotte', stateSlug: 'north-carolina', stateCode: 'NC', stateName: 'North Carolina', msaName: 'Charlotte-Concord-Gastonia', shortName: 'Charlotte', population: 2_700_000, enrollmentHighlight: 'Banking sector benefits and NC marketplace growth', localDescriptor: 'banking professionals, NASCAR corridor, and Carolina relocations', priority: 22, zipCodes: ['28202', '28027', '29708'], healthInsuranceDensity: 'high', marketSnapshot: 'Charlotte\'s banking headquarters create employer-plan expertise while NC marketplace enrollment grows among relocating professionals.', healthNeeds: ['Banking sector benefits', 'NC marketplace ACA', 'Relocation coverage'], metaTitle: 'Insurance Agents in Charlotte Metro (2026)', metaDescription: 'Verified agents in Charlotte-Concord-Gastonia.' },
  { slug: 'san-antonio', stateSlug: 'texas', stateCode: 'TX', stateName: 'Texas', msaName: 'San Antonio-New Braunfels', shortName: 'San Antonio', population: 2_600_000, enrollmentHighlight: 'Military/VA-adjacent and Latino community enrollment', localDescriptor: 'military families, Latino communities, and Hill Country growth', priority: 23, zipCodes: ['78205', '78130', '78250'], healthInsuranceDensity: 'high', marketSnapshot: 'San Antonio agents navigate TRICARE/VA coordination, bilingual ACA enrollment, and Medicare for retiring military families.', healthNeeds: ['Military/VA coordination', 'Bilingual ACA', 'Medicare'], metaTitle: 'Insurance Agents in San Antonio (2026)', metaDescription: 'Health insurance agents in San Antonio-New Braunfels.' },
  { slug: 'portland', stateSlug: 'oregon', stateCode: 'OR', stateName: 'Oregon', msaName: 'Portland-Vancouver-Hillsboro', shortName: 'Portland', population: 2_500_000, enrollmentHighlight: 'Oregon Health Plan and Washington cross-river enrollment', localDescriptor: 'tech commuters, progressive healthcare consumers, and cross-river families', priority: 24, zipCodes: ['97201', '98660', '97124'], healthInsuranceDensity: 'high', marketSnapshot: 'Portland metro spans Oregon and Washington marketplaces with strong demand for independent health plan comparison.', healthNeeds: ['Oregon marketplace', 'Cross-river licensing', 'Tech commuter plans'], metaTitle: 'Insurance Agents in Portland Metro (2026)', metaDescription: 'Health agents in Portland-Vancouver-Hillsboro.' },
  { slug: 'sacramento', stateSlug: 'california', stateCode: 'CA', stateName: 'California', msaName: 'Sacramento-Roseville-Folsom', shortName: 'Sacramento', population: 2_400_000, enrollmentHighlight: 'State capital employer plans and wildfire-zone property', localDescriptor: 'state employees, wildfire-zone homeowners, and Central Valley families', priority: 25, zipCodes: ['95814', '95661', '95762'], healthInsuranceDensity: 'high', marketSnapshot: 'Sacramento combines CalPERS-adjacent expertise with Covered California enrollment and wildfire property/health bundling.', healthNeeds: ['State employee benefits', 'Covered California', 'Wildfire coverage'], metaTitle: 'Insurance Agents in Sacramento (2026)', metaDescription: 'Verified agents in Sacramento-Roseville-Folsom.' },
  { slug: 'pittsburgh', stateSlug: 'pennsylvania', stateCode: 'PA', stateName: 'Pennsylvania', msaName: 'Pittsburgh', shortName: 'Pittsburgh', population: 2_400_000, enrollmentHighlight: 'Healthcare and university anchor institutions', localDescriptor: 'healthcare systems, university communities, and aging steel towns', priority: 26, zipCodes: ['15222', '15213', '15101'], healthInsuranceDensity: 'high', marketSnapshot: 'Pittsburgh agents serve UPMC-adjacent healthcare workers, university populations, and Medicare in aging mill-town communities.', healthNeeds: ['Healthcare worker plans', 'University ACA', 'Medicare'], metaTitle: 'Insurance Agents in Pittsburgh (2026)', metaDescription: 'Health insurance agents in Greater Pittsburgh.' },
  { slug: 'las-vegas', stateSlug: 'nevada', stateCode: 'NV', stateName: 'Nevada', msaName: 'Las Vegas-Henderson-Paradise', shortName: 'Las Vegas', population: 2_300_000, enrollmentHighlight: 'Hospitality workforce and retiree Medicare growth', localDescriptor: 'hospitality workers, retirees, and California overflow relocations', priority: 27, zipCodes: ['89101', '89012', '89145'], healthInsuranceDensity: 'high', marketSnapshot: 'Las Vegas combines hospitality-worker ACA demand with retiree Medicare growth and California relocation health transitions.', healthNeeds: ['Hospitality ACA', 'Retiree Medicare', 'Relocation coverage'], metaTitle: 'Insurance Agents in Las Vegas (2026)', metaDescription: 'Health and Medicare agents in Las Vegas-Henderson.' },
  { slug: 'austin', stateSlug: 'texas', stateCode: 'TX', stateName: 'Texas', msaName: 'Austin-Round Rock-Georgetown', shortName: 'Austin', population: 2_400_000, enrollmentHighlight: 'Tech relocation capital of Texas', localDescriptor: 'tech transplants, startup culture, and Hill Country growth', priority: 28, zipCodes: ['78701', '78664', '78626'], healthInsuranceDensity: 'high', marketSnapshot: 'Austin\'s tech boom creates constant health coverage transitions for relocating professionals and startup contractors.', healthNeeds: ['Tech relocation health', 'Startup contractor plans', 'ACA transitions'], metaTitle: 'Insurance Agents in Austin Metro (2026)', metaDescription: 'Health insurance experts in Austin-Round Rock-Georgetown.' },
  { slug: 'cincinnati', stateSlug: 'ohio', stateCode: 'OH', stateName: 'Ohio', msaName: 'Cincinnati', shortName: 'Cincinnati', population: 2_200_000, enrollmentHighlight: 'Tri-state OH/KY/IN marketplace corridor', localDescriptor: 'tri-state commuters, P&G corridor, and Ohio River communities', priority: 29, zipCodes: ['45202', '41011', '45040'], healthInsuranceDensity: 'high', marketSnapshot: 'Cincinnati agents navigate three state marketplaces and corporate benefit structures along the Ohio River corridor.', healthNeeds: ['Tri-state ACA', 'Corporate benefits', 'Medicare'], metaTitle: 'Insurance Agents in Cincinnati (2026)', metaDescription: 'Verified agents in Greater Cincinnati.' },
  { slug: 'kansas-city', stateSlug: 'missouri', stateCode: 'MO', stateName: 'Missouri', msaName: 'Kansas City', shortName: 'Kansas City', population: 2_200_000, enrollmentHighlight: 'Bi-state MO/KS enrollment and logistics corridor', localDescriptor: 'bi-state families, logistics hub, and Midwest relocations', priority: 30, zipCodes: ['64106', '66202', '64068'], healthInsuranceDensity: 'high', marketSnapshot: 'Kansas City spans two states with growing demand for health agents who understand cross-border marketplace enrollment.', healthNeeds: ['Bi-state ACA', 'Logistics worker plans', 'Medicare'], metaTitle: 'Insurance Agents in Kansas City (2026)', metaDescription: 'Health insurance agents in Kansas City metro.' },
  { slug: 'hartford', stateSlug: 'connecticut', stateCode: 'CT', stateName: 'Connecticut', msaName: 'Hartford-East Hartford-Middletown', shortName: 'Hartford', population: 1_200_000, enrollmentHighlight: 'Insurance capital of the world — industry employment hub', localDescriptor: 'insurance industry professionals and Connecticut suburbs', priority: 31, zipCodes: ['06103', '06107', '06457'], healthInsuranceDensity: 'very-high', marketSnapshot: 'Hartford\'s identity as the insurance capital creates uniquely informed agent expertise in health, life, and group benefits.', healthNeeds: ['Group benefits', 'ACA Access Health CT', 'Medicare'], metaTitle: 'Insurance Agents in Hartford (2026)', metaDescription: 'Health insurance experts in Hartford metro.' },
  { slug: 'des-moines', stateSlug: 'iowa', stateCode: 'IA', stateName: 'Iowa', msaName: 'Des Moines-West Des Moines', shortName: 'Des Moines', population: 700_000, enrollmentHighlight: 'Insurance industry HQ concentration', localDescriptor: 'insurance industry workers and Iowa farm communities', priority: 32, zipCodes: ['50309', '50266', '50021'], healthInsuranceDensity: 'very-high', marketSnapshot: 'Des Moines hosts major insurer headquarters, creating deep agent expertise in health and group benefit administration.', healthNeeds: ['Group administration', 'Iowa marketplace', 'Farm family coverage'], metaTitle: 'Insurance Agents in Des Moines (2026)', metaDescription: 'Verified agents in Des Moines metro.' },
  { slug: 'jacksonville', stateSlug: 'florida', stateCode: 'FL', stateName: 'Florida', msaName: 'Jacksonville', shortName: 'Jacksonville', population: 1_600_000, enrollmentHighlight: 'Military, logistics, and retiree Medicare growth', localDescriptor: 'military bases, port logistics, and North Florida retirees', priority: 33, zipCodes: ['32202', '32225', '32003'], healthInsuranceDensity: 'high', marketSnapshot: 'Jacksonville combines military health navigation, logistics-worker ACA, and growing Medicare enrollment.', healthNeeds: ['Military/TRICARE', 'Medicare growth', 'Hurricane property'], metaTitle: 'Insurance Agents in Jacksonville (2026)', metaDescription: 'Health and Medicare agents in Jacksonville.' },
  { slug: 'fort-lauderdale', stateSlug: 'florida', stateCode: 'FL', stateName: 'Florida', msaName: 'Fort Lauderdale', shortName: 'Fort Lauderdale', population: 1_900_000, enrollmentHighlight: 'Broward Medicare density and cruise-industry workers', localDescriptor: 'Broward retirees, cruise workers, and yacht-industry professionals', priority: 34, zipCodes: ['33301', '33308', '33004'], healthInsuranceDensity: 'very-high', marketSnapshot: 'Broward County agents specialize in Medicare Advantage, cruise-industry ACA gaps, and coastal property/health bundles.', healthNeeds: ['Medicare Advantage', 'Maritime worker ACA', 'Coastal property'], metaTitle: 'Insurance Agents in Fort Lauderdale (2026)', metaDescription: 'Medicare and health agents in Broward County.' },
  { slug: 'san-jose', stateSlug: 'california', stateCode: 'CA', stateName: 'California', msaName: 'San Jose-Sunnyvale-Santa Clara', shortName: 'San Jose', population: 1_900_000, enrollmentHighlight: 'Silicon Valley tech equity and high-income ACA cliffs', localDescriptor: 'Silicon Valley engineers, startup founders, and tech executives', priority: 35, zipCodes: ['95110', '95014', '94085'], healthInsuranceDensity: 'very-high', marketSnapshot: 'Silicon Valley agents navigate RSU vesting health transitions, startup benefits, and Covered California for high earners.', healthNeeds: ['Tech equity transitions', 'Startup benefits', 'High-income ACA'], metaTitle: 'Insurance Agents in San Jose / Silicon Valley (2026)', metaDescription: 'Health insurance experts in San Jose-Sunnyvale-Santa Clara.' },
  { slug: 'nashville', stateSlug: 'tennessee', stateCode: 'TN', stateName: 'Tennessee', msaName: 'Nashville-Davidson-Murfreesboro', shortName: 'Nashville', population: 2_000_000, enrollmentHighlight: 'Healthcare industry HQ and music economy', localDescriptor: 'healthcare executives, music industry, and Tennessee relocations', priority: 36, zipCodes: ['37201', '37027', '37129'], healthInsuranceDensity: 'high', marketSnapshot: 'Nashville\'s healthcare HQ concentration and relocation growth drive employer-plan and ACA expertise.', healthNeeds: ['Healthcare HQ benefits', 'Tennessee marketplace', 'Relocation coverage'], metaTitle: 'Insurance Agents in Nashville (2026)', metaDescription: 'Health agents in Nashville metro.' },
  { slug: 'raleigh', stateSlug: 'north-carolina', stateCode: 'NC', stateName: 'North Carolina', msaName: 'Raleigh-Cary-Durham', shortName: 'Research Triangle', population: 2_100_000, enrollmentHighlight: 'Research Triangle tech and university enrollment', localDescriptor: 'Research Triangle tech, university, and biotech workers', priority: 37, zipCodes: ['27601', '27511', '27701'], healthInsuranceDensity: 'high', marketSnapshot: 'The Triangle\'s university and biotech clusters create diverse health insurance needs from student plans to executive benefits.', healthNeeds: ['University plans', 'Biotech benefits', 'NC marketplace'], metaTitle: 'Insurance Agents in Research Triangle (2026)', metaDescription: 'Health agents in Raleigh-Cary-Durham.' },
  { slug: 'columbus', stateSlug: 'ohio', stateCode: 'OH', stateName: 'Ohio', msaName: 'Columbus', shortName: 'Columbus', population: 2_100_000, enrollmentHighlight: 'State capital and insurance industry employment', localDescriptor: 'state government, insurance industry, and Ohio State corridor', priority: 38, zipCodes: ['43215', '43017', '43221'], healthInsuranceDensity: 'high', marketSnapshot: 'Columbus agents serve state employees, insurance industry workers, and growing suburban family enrollment.', healthNeeds: ['State employee benefits', 'Ohio marketplace', 'Suburban family plans'], metaTitle: 'Insurance Agents in Columbus (2026)', metaDescription: 'Verified agents in Columbus metro.' },
  { slug: 'indianapolis', stateSlug: 'indiana', stateCode: 'IN', stateName: 'Indiana', msaName: 'Indianapolis-Carmel-Anderson', shortName: 'Indianapolis', population: 2_100_000, enrollmentHighlight: 'Healthcare and logistics corridor', localDescriptor: 'healthcare, logistics, and Indy 500 corridor families', priority: 39, zipCodes: ['46204', '46032', '46250'], healthInsuranceDensity: 'high', marketSnapshot: 'Indianapolis combines healthcare employment benefits expertise with marketplace enrollment across growing suburbs.', healthNeeds: ['Healthcare benefits', 'Indiana marketplace', 'Medicare'], metaTitle: 'Insurance Agents in Indianapolis (2026)', metaDescription: 'Health agents in Indianapolis metro.' },
  { slug: 'salt-lake-city', stateSlug: 'utah', stateCode: 'UT', stateName: 'Utah', msaName: 'Salt Lake City-Provo-Orem', shortName: 'Salt Lake', population: 1_300_000, enrollmentHighlight: 'Young family growth and tech corridor expansion', localDescriptor: 'young families, LDS communities, and Silicon Slopes tech', priority: 40, zipCodes: ['84101', '84043', '84604'], healthInsuranceDensity: 'high', marketSnapshot: 'Utah\'s young demographics drive family health plan demand alongside Silicon Slopes tech relocation coverage.', healthNeeds: ['Family health plans', 'Tech relocation', 'Utah marketplace'], metaTitle: 'Insurance Agents in Salt Lake City (2026)', metaDescription: 'Health agents in Salt Lake-Provo-Orem.' },
  { slug: 'milwaukee', stateSlug: 'wisconsin', stateCode: 'WI', stateName: 'Wisconsin', msaName: 'Milwaukee-Waukesha', shortName: 'Milwaukee', population: 1_600_000, enrollmentHighlight: 'Manufacturing benefits and Wisconsin marketplace', localDescriptor: 'manufacturing workers, brewery corridor, and lakefront communities', priority: 41, zipCodes: ['53202', '53186', '53005'], healthInsuranceDensity: 'high', marketSnapshot: 'Milwaukee agents navigate manufacturing benefit transitions and Wisconsin marketplace enrollment.', healthNeeds: ['Manufacturing benefits', 'Wisconsin marketplace', 'Medicare'], metaTitle: 'Insurance Agents in Milwaukee (2026)', metaDescription: 'Health agents in Milwaukee-Waukesha.' },
  { slug: 'oklahoma-city', stateSlug: 'oklahoma', stateCode: 'OK', stateName: 'Oklahoma', msaName: 'Oklahoma City', shortName: 'OKC', population: 1_400_000, enrollmentHighlight: 'Energy sector and tornado-alley property bundling', localDescriptor: 'energy workers, military, and tornado-alley homeowners', priority: 42, zipCodes: ['73102', '73120', '73034'], healthInsuranceDensity: 'moderate', marketSnapshot: 'OKC agents serve energy sector benefits, Tinker AFB military families, and tornado property/health bundles.', healthNeeds: ['Energy sector benefits', 'Military health', 'Tornado property'], metaTitle: 'Insurance Agents in Oklahoma City (2026)', metaDescription: 'Health agents in OKC metro.' },
  { slug: 'louisville', stateSlug: 'kentucky', stateCode: 'KY', stateName: 'Kentucky', msaName: 'Louisville-Jefferson County', shortName: 'Louisville', population: 1_300_000, enrollmentHighlight: 'Healthcare and logistics hub on Ohio River', localDescriptor: 'healthcare, bourbon industry, and Ohio River communities', priority: 43, zipCodes: ['40202', '40241', '40059'], healthInsuranceDensity: 'high', marketSnapshot: 'Louisville agents serve healthcare system employees, UPS logistics workers, and Kentucky marketplace enrollees.', healthNeeds: ['Healthcare worker plans', 'Kentucky marketplace', 'Medicare'], metaTitle: 'Insurance Agents in Louisville (2026)', metaDescription: 'Health agents in Louisville metro.' },
  { slug: 'memphis', stateSlug: 'tennessee', stateCode: 'TN', stateName: 'Tennessee', msaName: 'Memphis', shortName: 'Memphis', population: 1_300_000, enrollmentHighlight: 'Logistics hub and Mississippi River bi-state corridor', localDescriptor: 'logistics workers, music tourism, and bi-state families', priority: 44, zipCodes: ['38103', '38017', '38671'], healthInsuranceDensity: 'moderate', marketSnapshot: 'Memphis agents navigate FedEx corridor benefits, bi-state enrollment, and diverse community health needs.', healthNeeds: ['Logistics benefits', 'Bi-state ACA', 'Medicare'], metaTitle: 'Insurance Agents in Memphis (2026)', metaDescription: 'Health agents in Memphis metro.' },
  { slug: 'richmond', stateSlug: 'virginia', stateCode: 'VA', stateName: 'Virginia', msaName: 'Richmond', shortName: 'Richmond', population: 1_300_000, enrollmentHighlight: 'State capital and growing tech corridor', localDescriptor: 'state government, university, and RVA tech growth', priority: 45, zipCodes: ['23219', '23233', '23113'], healthInsuranceDensity: 'high', marketSnapshot: 'Richmond combines state employee benefit expertise with growing marketplace enrollment in Henrico and Chesterfield.', healthNeeds: ['State employee benefits', 'Virginia marketplace', 'University plans'], metaTitle: 'Insurance Agents in Richmond (2026)', metaDescription: 'Health agents in Richmond metro.' },
  { slug: 'birmingham', stateSlug: 'alabama', stateCode: 'AL', stateName: 'Alabama', msaName: 'Birmingham-Hoover', shortName: 'Birmingham', population: 1_100_000, enrollmentHighlight: 'Healthcare anchor UAB and Alabama marketplace', localDescriptor: 'healthcare workers, steel legacy, and Alabama families', priority: 46, zipCodes: ['35203', '35242', '35216'], healthInsuranceDensity: 'high', marketSnapshot: 'Birmingham agents serve UAB healthcare corridor employees and Alabama marketplace enrollees.', healthNeeds: ['Healthcare worker plans', 'Alabama marketplace', 'Medicare'], metaTitle: 'Insurance Agents in Birmingham (2026)', metaDescription: 'Health agents in Birmingham-Hoover.' },
  { slug: 'buffalo', stateSlug: 'new-york', stateCode: 'NY', stateName: 'New York', msaName: 'Buffalo-Cheektowaga', shortName: 'Buffalo', population: 1_100_000, enrollmentHighlight: 'NY State of Health and cross-border Ontario commuters', localDescriptor: 'Buffalo Niagara families, healthcare, and Canadian border corridor', priority: 47, zipCodes: ['14202', '14221', '14086'], healthInsuranceDensity: 'high', marketSnapshot: 'Buffalo agents navigate NY State of Health enrollment and healthcare employment in the Niagara medical corridor.', healthNeeds: ['NY State of Health', 'Healthcare employment', 'Winter property'], metaTitle: 'Insurance Agents in Buffalo (2026)', metaDescription: 'Health agents in Buffalo-Cheektowaga.' },
  { slug: 'providence', stateSlug: 'rhode-island', stateCode: 'RI', stateName: 'Rhode Island', msaName: 'Providence-Warwick', shortName: 'Providence', population: 1_600_000, enrollmentHighlight: 'HealthSource RI and Boston commuter corridor', localDescriptor: 'Boston commuters, coastal communities, and university populations', priority: 48, zipCodes: ['02903', '02886', '02809'], healthInsuranceDensity: 'high', marketSnapshot: 'Providence agents serve HealthSource RI enrollees and Boston commuter benefit transitions.', healthNeeds: ['HealthSource RI', 'Boston commuter plans', 'Coastal property'], metaTitle: 'Insurance Agents in Providence (2026)', metaDescription: 'Health agents in Providence-Warwick.' },
  { slug: 'new-orleans', stateSlug: 'louisiana', stateCode: 'LA', stateName: 'Louisiana', msaName: 'New Orleans-Metairie', shortName: 'New Orleans', population: 1_200_000, enrollmentHighlight: 'Tourism economy and hurricane-zone property bundling', localDescriptor: 'tourism workers, port logistics, and hurricane-zone homeowners', priority: 49, zipCodes: ['70112', '70002', '70433'], healthInsuranceDensity: 'moderate', marketSnapshot: 'New Orleans agents navigate tourism-worker ACA gaps, hurricane property risks, and Louisiana marketplace enrollment.', healthNeeds: ['Tourism worker ACA', 'Hurricane property', 'Louisiana marketplace'], metaTitle: 'Insurance Agents in New Orleans (2026)', metaDescription: 'Health agents in New Orleans metro.' },
  { slug: 'honolulu', stateSlug: 'hawaii', stateCode: 'HI', stateName: 'Hawaii', msaName: 'Urban Honolulu', shortName: 'Honolulu', population: 1_000_000, enrollmentHighlight: 'Unique state marketplace and military concentration', localDescriptor: 'military families, tourism workers, and island communities', priority: 50, zipCodes: ['96813', '96815', '96789'], healthInsuranceDensity: 'high', marketSnapshot: 'Hawaii\'s isolated market requires agents with state-specific marketplace expertise and military health coordination.', healthNeeds: ['Hawaii marketplace', 'Military/TRICARE', 'Tourism worker ACA'], metaTitle: 'Insurance Agents in Honolulu (2026)', metaDescription: 'Health agents in Urban Honolulu.' },
  { slug: 'albuquerque', stateSlug: 'new-mexico', stateCode: 'NM', stateName: 'New Mexico', msaName: 'Albuquerque', shortName: 'Albuquerque', population: 900_000, enrollmentHighlight: 'beWellnm marketplace and Native community health', localDescriptor: 'Native communities, Sandia labs corridor, and Southwest families', priority: 51, zipCodes: ['87102', '87114', '87048'], healthInsuranceDensity: 'moderate', marketSnapshot: 'Albuquerque agents serve beWellnm enrollees, federal lab employees, and diverse Native community health needs.', healthNeeds: ['beWellnm ACA', 'Federal employee benefits', 'Native community health'], metaTitle: 'Insurance Agents in Albuquerque (2026)', metaDescription: 'Health agents in Albuquerque metro.' },
  { slug: 'tucson', stateSlug: 'arizona', stateCode: 'AZ', stateName: 'Arizona', msaName: 'Tucson', shortName: 'Tucson', population: 1_000_000, enrollmentHighlight: 'Retiree destination and university community', localDescriptor: 'retirees, university, and Davis-Monthan military corridor', priority: 52, zipCodes: ['85701', '85718', '85747'], healthInsuranceDensity: 'high', marketSnapshot: 'Tucson combines retiree Medicare demand with university and military health navigation.', healthNeeds: ['Retiree Medicare', 'University plans', 'Military health'], metaTitle: 'Insurance Agents in Tucson (2026)', metaDescription: 'Medicare and health agents in Tucson.' },
  { slug: 'fresno', stateSlug: 'california', stateCode: 'CA', stateName: 'California', msaName: 'Fresno', shortName: 'Fresno', population: 1_000_000, enrollmentHighlight: 'Agricultural workforce Medi-Cal and Covered California', localDescriptor: 'agricultural workers, Central Valley families, and Medi-Cal transitions', priority: 53, zipCodes: ['93721', '93650', '93720'], healthInsuranceDensity: 'high', marketSnapshot: 'Fresno agents specialize in agricultural worker health coverage, Medi-Cal transitions, and Central Valley property risks.', healthNeeds: ['Agricultural worker health', 'Medi-Cal transitions', 'Central Valley property'], metaTitle: 'Insurance Agents in Fresno (2026)', metaDescription: 'Health agents in Fresno and Central Valley.' },
  { slug: 'omaha', stateSlug: 'nebraska', stateCode: 'NE', stateName: 'Nebraska', msaName: 'Omaha-Council Bluffs', shortName: 'Omaha', population: 950_000, enrollmentHighlight: 'Insurance and financial services employment hub', localDescriptor: 'insurance industry, financial services, and bi-state families', priority: 54, zipCodes: ['68102', '68154', '51503'], healthInsuranceDensity: 'high', marketSnapshot: 'Omaha\'s insurance industry concentration creates deep agent expertise in health and group benefits.', healthNeeds: ['Group benefits', 'Nebraska marketplace', 'Bi-state enrollment'], metaTitle: 'Insurance Agents in Omaha (2026)', metaDescription: 'Health agents in Omaha-Council Bluffs.' },
];

export function getHubBySlug(stateSlug: string, hubSlug: string): InsuranceHub | undefined {
  return INSURANCE_HUBS.find((h) => h.stateSlug === stateSlug && h.slug === hubSlug);
}

export function getHubsByState(stateSlug: string): InsuranceHub[] {
  return INSURANCE_HUBS.filter((h) => h.stateSlug === stateSlug);
}

export function getAllHubParams(): { state: string; slug: string }[] {
  return INSURANCE_HUBS.map((h) => ({ state: h.stateSlug, slug: h.slug }));
}

export function getAllStateSlugs(): string[] {
  return [...new Set(INSURANCE_HUBS.map((h) => h.stateSlug))];
}

export function getHubByZip(zip: string): InsuranceHub | undefined {
  const normalized = zip.trim().slice(0, 5);
  return INSURANCE_HUBS.find((h) => h.zipCodes.includes(normalized));
}

export function getTopHubs(limit = 15): InsuranceHub[] {
  return [...INSURANCE_HUBS].sort((a, b) => a.priority - b.priority).slice(0, limit);
}