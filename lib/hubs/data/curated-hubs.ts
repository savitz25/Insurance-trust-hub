import type { HubAgent } from '@/types/agent';
import { JACKSONVILLE_AGENTS } from '@/lib/hubs/data/jacksonville-agents';
import { ORLANDO_AGENTS } from '@/lib/hubs/data/orlando-agents';
import { SOUTH_FLORIDA_AGENTS } from '@/lib/hubs/data/south-florida-agents';
import { ATLANTA_AGENTS } from '@/lib/hubs/data/atlanta-agents';
import { CHARLOTTE_AGENTS } from '@/lib/hubs/data/charlotte-agents';
import { RESEARCH_TRIANGLE_AGENTS } from '@/lib/hubs/data/research-triangle-agents';
import { TRIAD_AGENTS } from '@/lib/hubs/data/triad-agents';
import { TAMPA_BAY_AGENTS } from '@/lib/hubs/data/tampa-bay-agents';
import { NASHVILLE_AGENTS } from '@/lib/hubs/data/nashville-agents';
import { MEMPHIS_AGENTS } from '@/lib/hubs/data/memphis-agents';
import { CHATTANOOGA_AGENTS } from '@/lib/hubs/data/chattanooga-agents';
import { KNOXVILLE_AGENTS } from '@/lib/hubs/data/knoxville-agents';
import { CHICAGO_AGENTS } from '@/lib/hubs/data/chicago-agents';
import { DALLAS_FORT_WORTH_AGENTS } from '@/lib/hubs/data/dallas-fort-worth-agents';
import { HOUSTON_AGENTS } from '@/lib/hubs/data/houston-agents';
import { WASHINGTON_DC_AGENTS } from '@/lib/hubs/data/washington-dc-agents';
import { BOSTON_AGENTS } from '@/lib/hubs/data/boston-agents';
import { DETROIT_AGENTS } from '@/lib/hubs/data/detroit-agents';
import { SEATTLE_AGENTS } from '@/lib/hubs/data/seattle-agents';
import { INLAND_EMPIRE_AGENTS } from '@/lib/hubs/data/inland-empire-agents';
import { MINNEAPOLIS_AGENTS } from '@/lib/hubs/data/minneapolis-agents';
import { ST_LOUIS_AGENTS } from '@/lib/hubs/data/st-louis-agents';
import { DENVER_AGENTS } from '@/lib/hubs/data/denver-agents';
import { BALTIMORE_AGENTS } from '@/lib/hubs/data/baltimore-agents';
import { PORTLAND_AGENTS } from '@/lib/hubs/data/portland-agents';
import { SAN_ANTONIO_AGENTS } from '@/lib/hubs/data/san-antonio-agents';
import { SACRAMENTO_AGENTS } from '@/lib/hubs/data/sacramento-agents';
import { PITTSBURGH_AGENTS } from '@/lib/hubs/data/pittsburgh-agents';
import { LAS_VEGAS_AGENTS } from '@/lib/hubs/data/las-vegas-agents';
import { AUSTIN_AGENTS } from '@/lib/hubs/data/austin-agents';
import { CINCINNATI_AGENTS } from '@/lib/hubs/data/cincinnati-agents';
import { KANSAS_CITY_AGENTS } from '@/lib/hubs/data/kansas-city-agents';
import { HARTFORD_AGENTS } from '@/lib/hubs/data/hartford-agents';
import { DES_MOINES_AGENTS } from '@/lib/hubs/data/des-moines-agents';
import { SAN_JOSE_AGENTS } from '@/lib/hubs/data/san-jose-agents';
import { COLUMBUS_AGENTS } from '@/lib/hubs/data/columbus-agents';
import { INDIANAPOLIS_AGENTS } from '@/lib/hubs/data/indianapolis-agents';
import { SALT_LAKE_CITY_AGENTS } from '@/lib/hubs/data/salt-lake-city-agents';
import { MILWAUKEE_AGENTS } from '@/lib/hubs/data/milwaukee-agents';
import { OKLAHOMA_CITY_AGENTS } from '@/lib/hubs/data/oklahoma-city-agents';

export interface CuratedHubConfig {
  slug: string;
  sectionTitle: string;
  summary: string;
  counties: string[];
  badges?: string[];
  featuredHealthLine: string;
  healthFeaturedLimit: number;
}

export const CURATED_HUB_CONFIG: Record<string, CuratedHubConfig> = {
  'miami-fort-lauderdale': {
    slug: 'miami-fort-lauderdale',
    sectionTitle: 'Tri-County Coverage Area',
    summary:
      '12 verified independent agencies across Miami-Dade, Broward, and Palm Beach counties — 8 with primary Medicare/ACA/health emphasis and 4 strong multi-line partners. Average Google rating ~4.9 stars across entries with sufficient review volume.',
    counties: ['Miami-Dade', 'Broward', 'Palm Beach'],
    badges: ['Bilingual EN/ES available'],
    featuredHealthLine:
      'Top 3 featured: SFIB · Absolute Best Insurance · Medicare Advisors of South Florida',
    healthFeaturedLimit: 8,
  },
  orlando: {
    slug: 'orlando',
    sectionTitle: 'Central Florida Coverage Area',
    summary:
      '12 verified independent agencies across Orange, Osceola, and Seminole counties — 6 with primary or strong Medicare/ACA/health emphasis and 6 multi-line independents (several with group health or cross-sell capabilities). Average Google rating ~4.8–5.0 stars where review volume permits.',
    counties: ['Orange', 'Osceola', 'Seminole'],
    badges: ['Winter Park · Kissimmee · Orlando metro'],
    featuredHealthLine:
      'Top 3 featured: The Medicare Dude · Benson Insurance · Insurance Pro Florida',
    healthFeaturedLimit: 6,
  },
  jacksonville: {
    slug: 'jacksonville',
    sectionTitle: 'Northeast Florida Coverage Area',
    summary:
      '12 verified independent agencies across Duval, St. Johns, Clay, and Nassau counties — 7 with primary or strong Medicare/ACA/health emphasis and 5 multi-line independents (several with group health or cross-sell capabilities). Average Google rating ~4.9 stars where review volume permits.',
    counties: ['Duval', 'St. Johns', 'Clay', 'Nassau'],
    badges: ['First Coast · Jacksonville metro'],
    featuredHealthLine:
      'Top 3 featured: The Medicare Dude · Florida Life & Health Exchange · Green Ins',
    healthFeaturedLimit: 7,
  },
  tampa: {
    slug: 'tampa',
    sectionTitle: 'Tampa Bay Coverage Area',
    summary:
      '12 verified independent agencies across Hillsborough, Pinellas, and Pasco counties — 7 with primary or strong Medicare/ACA/health emphasis and 5 multi-line independents (with health or employee benefits capabilities). Average Google rating ~4.9 stars where review volume permits.',
    counties: ['Hillsborough', 'Pinellas', 'Pasco'],
    badges: ['Tampa · St. Petersburg · Clearwater'],
    featuredHealthLine:
      'Top 3 featured: HealthPlan4U · Affordable Insurance Team · The Medicare Dude',
    healthFeaturedLimit: 7,
  },
  atlanta: {
    slug: 'atlanta',
    sectionTitle: 'Metro Atlanta Coverage Area',
    summary:
      '12 verified independent agencies across Fulton, DeKalb, Gwinnett, Cobb, and Clayton counties — 7 with primary Medicare/ACA/health or group benefits emphasis and 5 multi-line independents. Georgia\'s largest health market with 6–7 competing carriers (Kaiser, Oscar, Anthem, Ambetter, UnitedHealthcare). Average Google rating ~4.8–5.0 stars.',
    counties: ['Fulton', 'DeKalb', 'Gwinnett', 'Cobb', 'Clayton'],
    badges: ['Georgia Access · Kaiser · Oscar · Ambetter'],
    featuredHealthLine:
      'Top 3 featured: Georgia Health Insurance · iHealthBrokers · The Big 65',
    healthFeaturedLimit: 7,
  },
  charlotte: {
    slug: 'charlotte',
    sectionTitle: 'Charlotte Metro Coverage Area',
    summary:
      '12 verified independent agencies across Mecklenburg, Union, Cabarrus, and Gaston counties — 7 with large-group, Medicare, or ACA emphasis and 5 multi-line independents. Corporate health battleground for banking, tech, and healthcare with Atrium Health and Oscar Health network alignments. Average Google rating ~4.8–5.0 stars.',
    counties: ['Mecklenburg', 'Union', 'Cabarrus', 'Gaston'],
    badges: ['Atrium Health · Oscar · Corporate benefits'],
    featuredHealthLine:
      'Top 3 featured: Benefits Bridge · Health Plans of NC · Insurance People of the Carolinas',
    healthFeaturedLimit: 7,
  },
  raleigh: {
    slug: 'raleigh',
    sectionTitle: 'Research Triangle Coverage Area',
    summary:
      '12 verified independent agencies across Wake, Durham, and Orange counties — 7 with employer-sponsored group, ACA, or Medicare capabilities and 5 multi-line independents. Competitive tech, biotech, and university market dominated by BCBSNC and UnitedHealthcare. Average Google rating ~4.8–5.0 stars.',
    counties: ['Wake', 'Durham', 'Orange'],
    badges: ['BCBSNC · UnitedHealthcare · RTP · UNC/Duke'],
    featuredHealthLine:
      'Top 3 featured: Health Plans of NC · Triangle Employee Benefits · Benefits Bridge',
    healthFeaturedLimit: 7,
  },
  greensboro: {
    slug: 'greensboro',
    sectionTitle: 'The Triad Coverage Area',
    summary:
      '12 verified independent agencies across Guilford and Forsyth counties (Greensboro, Winston-Salem, High Point) — 7 with health/group/Medicare emphasis and 5 multi-line independents. Tiered network expertise around Novant Health and Atrium Health Wake Forest Baptist via BCBSNC Blue Home/Blue Local. Average Google rating ~4.8–5.0 stars.',
    counties: ['Guilford', 'Forsyth'],
    badges: ['Novant · Atrium WFB · BCBSNC tiered networks'],
    featuredHealthLine:
      'Top 3 featured: Health Plans of NC · Blue Moon Benefits · Triad Insurance Partners',
    healthFeaturedLimit: 7,
  },
  nashville: {
    slug: 'nashville',
    sectionTitle: 'Nashville Metro Coverage Area',
    summary:
      '12 verified independent agencies across Davidson, Williamson, and Rutherford counties (Rating Area 4) — 7–8 with primary health/Medicare/ACA/group emphasis and 4–5 multi-line independents. Corporate healthcare hub driven by HCA and employer-sponsored volume alongside competitive individual market with Oscar, Cigna, and UnitedHealthcare. Average Google rating ~4.8–5.0 stars.',
    counties: ['Davidson', 'Williamson', 'Rutherford'],
    badges: ['HCA corridor · Oscar · Cigna · UHC'],
    featuredHealthLine:
      'Top 3 featured: The Jordan Insurance Agency · Madison Insurance Group (MIG) · Boyle Insurance Agency',
    healthFeaturedLimit: 8,
  },
  memphis: {
    slug: 'memphis',
    sectionTitle: 'Memphis Metro Coverage Area',
    summary:
      '12 verified independent agencies across Shelby County and surrounding areas (Rating Area 6) — 7–8 with primary health/Medicare/ACA/group emphasis and 4–5 multi-line independents. Logistics-driven economy with FedEx-scale employer volume and competitive individual market featuring Oscar, Cigna, and UnitedHealthcare. Average Google rating ~4.8–5.0 stars.',
    counties: ['Shelby'],
    badges: ['FedEx corridor · Logistics benefits · Narrow networks'],
    featuredHealthLine:
      'Top 3 featured: Higginbotham · Boyle Insurance Agency · Sneed Insurance Agency',
    healthFeaturedLimit: 8,
  },
  chattanooga: {
    slug: 'chattanooga',
    sectionTitle: 'Chattanooga Market Coverage Area',
    summary:
      '12 verified independent agencies across Hamilton County (Rating Area 3) — 7–8 with primary health/Medicare/ACA/group emphasis and 4–5 multi-line independents. BCBS TN headquarters market with diverse carrier choices including Alliant Health Plans and the state\'s only Platinum-tier marketplace plans. Average Google rating ~4.8–5.0 stars.',
    counties: ['Hamilton'],
    badges: ['BCBS TN HQ · Alliant Health · Platinum-tier ACA'],
    featuredHealthLine:
      'Top 3 featured: Atlas Insurance Agency · American Exchange · Justin Brock',
    healthFeaturedLimit: 8,
  },
  knoxville: {
    slug: 'knoxville',
    sectionTitle: 'Knoxville & Tri-Cities Coverage Area',
    summary:
      '12 verified independent agencies across Knox, Blount, and Washington counties (Rating Areas 1 & 2) — 7–8 with primary health/Medicare/ACA/group emphasis and 4–5 multi-line independents. East Tennessee localized networks including Covenant Health and UT Medical Center alongside BCBS TN dominance. Average Google rating ~4.8–5.0 stars.',
    counties: ['Knox', 'Blount', 'Washington'],
    badges: ['Covenant Health · UT Medical Center · BCBS TN'],
    featuredHealthLine:
      'Top 3 featured: The Akers Solution · Beacon Group · Heritage Insurance Group',
    healthFeaturedLimit: 8,
  },
  chicago: {
    slug: 'chicago',
    sectionTitle: 'Chicago Metro Coverage Area',
    summary:
      '12 verified independent agencies across Cook County with service to DuPage, Lake, Will, and Kane — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. One of the largest U.S. markets blending employer headquarters, union health funds, and Get Covered Illinois marketplace enrollment. Average Google rating ~4.8–5.0 stars.',
    counties: ['Cook', 'DuPage', 'Lake', 'Will', 'Kane'],
    badges: ['Get Covered Illinois · Union benefits · Bilingual EN/ES'],
    featuredHealthLine:
      'Top 3 featured: Illinois Health Agents · The Health Insurance Shoppe · Victor Fuentes',
    healthFeaturedLimit: 8,
  },
  'dallas-fort-worth': {
    slug: 'dallas-fort-worth',
    sectionTitle: 'DFW Metro Coverage Area',
    summary:
      '12 verified independent agencies across Dallas and Tarrant counties with service to Collin, Denton, and Ellis — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Fastest-growing large MSA with corporate HQ employer volume and HealthCare.gov individual competition. Average Google rating ~4.8–5.0 stars.',
    counties: ['Dallas', 'Tarrant', 'Collin', 'Denton', 'Ellis'],
    badges: ['Corporate relocations · BCBS TX · Plano/Frisco growth'],
    featuredHealthLine:
      'Top 3 featured: Custom Health Plans · John Lynch (Dallas Health Agent) · Selected Benefits',
    healthFeaturedLimit: 8,
  },
  houston: {
    slug: 'houston',
    sectionTitle: 'Houston Metro Coverage Area',
    summary:
      '12 verified independent agencies across Harris County with service to Fort Bend, Montgomery, Brazoria, and Galveston — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Energy, healthcare, and port/logistics employer volume alongside diverse ACA and Medicare demand. Average Google rating ~4.8–5.0 stars.',
    counties: ['Harris', 'Fort Bend', 'Montgomery', 'Brazoria'],
    badges: ['Texas Medical Center · Energy sector · Bilingual EN/ES'],
    featuredHealthLine:
      'Top 3 featured: Selected Benefits · Ruben Trejo · Rodney Powell',
    healthFeaturedLimit: 8,
  },
  'washington-dc': {
    slug: 'washington-dc',
    sectionTitle: 'DC Metro Coverage Area',
    summary:
      '12 verified independent agencies across DC, Maryland (Montgomery, Prince George\'s), and Virginia (Arlington, Fairfax, Alexandria) — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Federal FEHB, contractor transitions, and tri-jurisdictional marketplace enrollment. Average Google rating ~4.8–5.0 stars.',
    counties: ['District of Columbia', 'Montgomery', 'Prince George\'s', 'Arlington', 'Fairfax'],
    badges: ['FEHB · NoVA tech corridor · DC/MD/VA licensed'],
    featuredHealthLine:
      'Top 3 featured: Linda McGill · Zahra Gharany · Cory Weaver',
    healthFeaturedLimit: 8,
  },
  boston: {
    slug: 'boston',
    sectionTitle: 'Boston Metro Coverage Area',
    summary:
      '12 verified independent agencies across Suffolk County with service to Middlesex, Essex, Norfolk, and Plymouth — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Major Northeast market with employer-sponsored plans in education, healthcare, biotech, and finance alongside Health Connector optimization and Medicare demand. Average Google rating ~4.8–5.0 stars.',
    counties: ['Suffolk', 'Middlesex', 'Essex', 'Norfolk', 'Plymouth'],
    badges: ['Health Connector · Biotech corridor · North & South Shore'],
    featuredHealthLine:
      'Top 3 featured: Ted Wallus · iHealthBrokers · Francis Burgoyne',
    healthFeaturedLimit: 8,
  },
  detroit: {
    slug: 'detroit',
    sectionTitle: 'Detroit Metro Coverage Area',
    summary:
      '12 verified independent agencies across Wayne, Oakland, and Macomb counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Auto industry employer volume, UAW benefit familiarity, and Michigan marketplace enrollment drive competitive individual and group options. Average Google rating ~4.8–5.0 stars.',
    counties: ['Wayne', 'Oakland', 'Macomb'],
    badges: ['Auto industry benefits · BCBSM · Dearborn corridor'],
    featuredHealthLine:
      'Top 3 featured: Shaun & Elizabeth Abshire · Vicki Ferguson · Michigan Planners',
    healthFeaturedLimit: 8,
  },
  seattle: {
    slug: 'seattle',
    sectionTitle: 'Puget Sound Coverage Area',
    summary:
      '12 verified independent agencies across King County with service to Snohomish, Pierce, and Kitsap — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Tech employer benefits, Washington Healthplanfinder enrollment, and contractor 1099 coverage drive competitive Puget Sound options. Average Google rating ~4.8–5.0 stars.',
    counties: ['King', 'Snohomish', 'Pierce', 'Kitsap'],
    badges: ['Healthplanfinder · Amazon/Microsoft corridor · Eastside'],
    featuredHealthLine:
      'Top 3 featured: Jason Hark · Team Health Insurance · Nick Casanova',
    healthFeaturedLimit: 8,
  },
  'riverside-san-bernardino': {
    slug: 'riverside-san-bernardino',
    sectionTitle: 'Inland Empire Coverage Area',
    summary:
      '12 verified independent agencies across Riverside and San Bernardino counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. LA overflow migration, logistics employment, and affordable Covered California enrollment drive growing Inland Empire demand. Average Google rating ~4.8–5.0 stars.',
    counties: ['Riverside', 'San Bernardino'],
    badges: ['Covered California · Medi-Cal transitions · Bilingual EN/ES'],
    featuredHealthLine:
      'Top 3 featured: Cynthia Nakaya · Dee Thomas Agency · Michael Ryan',
    healthFeaturedLimit: 8,
  },
  minneapolis: {
    slug: 'minneapolis',
    sectionTitle: 'Twin Cities Coverage Area',
    summary:
      '12 verified independent agencies across Hennepin and Ramsey counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. MNsure marketplace enrollment, Medtronic/healthcare employer benefits, and Mayo-adjacent corridor expertise. Average Google rating ~4.8–5.0 stars.',
    counties: ['Hennepin', 'Ramsey'],
    badges: ['MNsure · Healthcare corridor · Edina/St Paul suburbs'],
    featuredHealthLine:
      'Top 3 featured: James Romeo · Twin Cities Health Insurance Solutions · Randi Dinner Fogel',
    healthFeaturedLimit: 8,
  },
  'st-louis': {
    slug: 'st-louis',
    sectionTitle: 'Greater St. Louis Coverage Area',
    summary:
      '12 verified independent agencies across St. Louis City and St. Louis County — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Bi-state MO/IL marketplace enrollment, healthcare and manufacturing employer volume, and Arch Brokerage individual health expertise since 1969. Average Google rating ~4.8–5.0 stars.',
    counties: ['St. Louis City', 'St. Louis County'],
    badges: ['Bi-state MO/IL · Arch Brokerage · Blue Chip Consortium'],
    featuredHealthLine:
      'Top 3 featured: Steve Potje · Arch Brokerage · Ed & Peggy Weir',
    healthFeaturedLimit: 8,
  },
  denver: {
    slug: 'denver',
    sectionTitle: 'Denver Metro Coverage Area',
    summary:
      '12 verified independent agencies across Denver, Arapahoe, Jefferson, and Adams counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Connect for Health Colorado, relocation-driven ACA demand, and bilingual Medicare expertise. Average Google rating ~4.8–5.0 stars.',
    counties: ['Denver', 'Arapahoe', 'Jefferson', 'Adams'],
    badges: ['Connect for Health CO · Bilingual EN/ES · Relocation corridor'],
    featuredHealthLine:
      'Top 3 featured: Voss Speros · Colorado Health Insurance Brokers · Nichole Wright',
    healthFeaturedLimit: 8,
  },
  baltimore: {
    slug: 'baltimore',
    sectionTitle: 'Baltimore Metro Coverage Area',
    summary:
      '12 verified independent agencies across Baltimore City and Baltimore County — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Maryland Health Connection, Johns Hopkins healthcare corridor, and DC commuter benefit transitions. Average Google rating ~4.8–5.0 stars.',
    counties: ['Baltimore City', 'Baltimore County'],
    badges: ['Maryland Health Connection · Hopkins corridor · Mid-Atlantic'],
    featuredHealthLine:
      'Top 3 featured: Gerard Washington · East Coast Health Advisors · Zahra Gharany',
    healthFeaturedLimit: 8,
  },
  portland: {
    slug: 'portland',
    sectionTitle: 'Portland Metro Coverage Area',
    summary:
      '12 verified independent agencies across Multnomah, Washington, and Clackamas counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Oregon Health Plan marketplace enrollment, cross-river Washington licensing, and tech-corridor ACA demand. Average Google rating ~4.8–5.0 stars.',
    counties: ['Multnomah', 'Washington', 'Clackamas'],
    badges: ['Oregon marketplace · Cross-river · Progressive healthcare'],
    featuredHealthLine:
      'Top 3 featured: Travis Harmon · Hummingbird Insurance · Russ Harshberger',
    healthFeaturedLimit: 8,
  },
  'san-antonio': {
    slug: 'san-antonio',
    sectionTitle: 'San Antonio Metro Coverage Area',
    summary:
      '12 verified independent agencies across Bexar, Comal, Guadalupe, and Kendall counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Military/TRICARE-adjacent Medicare, bilingual ACA enrollment, and employer-sponsored plan volume. Average Google rating ~4.8–5.0 stars.',
    counties: ['Bexar', 'Comal', 'Guadalupe', 'Kendall'],
    badges: ['Bilingual EN/ES · Military corridor · Hill Country growth'],
    featuredHealthLine:
      'Top 3 featured: Rodney Powell · Deschenes Financial Services · Sid Martinez',
    healthFeaturedLimit: 8,
  },
  sacramento: {
    slug: 'sacramento',
    sectionTitle: 'Sacramento Metro Coverage Area',
    summary:
      '12 verified independent agencies across Sacramento, Placer, El Dorado, and Yolo counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Covered California, CalPERS-adjacent retirement transitions, and state-capital employer benefits. Average Google rating ~4.8–5.0 stars.',
    counties: ['Sacramento', 'Placer', 'El Dorado', 'Yolo'],
    badges: ['Covered California · State capital · Gold River corridor'],
    featuredHealthLine:
      'Top 3 featured: Quinn McNamara · Summit Independent Insurance Services · John Goeden',
    healthFeaturedLimit: 8,
  },
  pittsburgh: {
    slug: 'pittsburgh',
    sectionTitle: 'Greater Pittsburgh Coverage Area',
    summary:
      '12 verified independent agencies across Allegheny, Beaver, Butler, Washington, and Westmoreland counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. UPMC-adjacent healthcare workers, university ACA enrollment, and aging mill-town Medicare demand. Average Google rating ~4.8–5.0 stars.',
    counties: ['Allegheny', 'Beaver', 'Butler', 'Washington', 'Westmoreland'],
    badges: ['UPMC corridor · University ACA · South Hills'],
    featuredHealthLine:
      'Top 3 featured: Matthew Gaus · Murray Insurance Services · Paula Duffy',
    healthFeaturedLimit: 8,
  },
  'las-vegas': {
    slug: 'las-vegas',
    sectionTitle: 'Las Vegas Valley Coverage Area',
    summary:
      '12 verified independent agencies across Clark County — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Hospitality-worker ACA demand, retiree Medicare growth, and California relocation health transitions. Average Google rating ~4.8–5.0 stars.',
    counties: ['Clark'],
    badges: ['Hospitality ACA · Retiree Medicare · Bilingual EN/ES'],
    featuredHealthLine:
      "Top 3 featured: James O'Neal · Tyler Insurance Group · Amos St. Louis",
    healthFeaturedLimit: 8,
  },
  austin: {
    slug: 'austin',
    sectionTitle: 'Austin Metro Coverage Area',
    summary:
      '12 verified independent agencies across Travis, Williamson, Hays, and Bastrop counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Tech-relocation ACA demand, startup contractor plans, and Hill Country Medicare growth. Average Google rating ~4.8–5.0 stars.',
    counties: ['Travis', 'Williamson', 'Hays', 'Bastrop'],
    badges: ['Tech relocation · Bilingual EN/ES · Hill Country growth'],
    featuredHealthLine:
      'Top 3 featured: Rodney Powell · Custom Health Plans · Mark Lyne',
    healthFeaturedLimit: 8,
  },
  cincinnati: {
    slug: 'cincinnati',
    sectionTitle: 'Greater Cincinnati Coverage Area',
    summary:
      '12 verified independent agencies across Hamilton, Butler, Clermont, and Warren counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Tri-state OH/KY/IN marketplace enrollment, P&G corridor benefits, and UC Health retiree Medicare. Average Google rating ~4.8–5.0 stars.',
    counties: ['Hamilton', 'Butler', 'Clermont', 'Warren'],
    badges: ['Tri-state ACA · P&G corridor · Ohio River communities'],
    featuredHealthLine:
      'Top 3 featured: Brian Moore · Ohio Health Insurance Consultants · Don Scheiderer',
    healthFeaturedLimit: 8,
  },
  'kansas-city': {
    slug: 'kansas-city',
    sectionTitle: 'Kansas City Metro Coverage Area',
    summary:
      '12 verified independent agencies across Jackson, Clay, Platte (MO) and Johnson, Wyandotte (KS) — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Bi-state MO/KS marketplace enrollment, logistics employment, and bilingual Medicare expertise. Average Google rating ~4.8–5.0 stars.',
    counties: ['Jackson', 'Clay', 'Platte', 'Johnson', 'Wyandotte'],
    badges: ['Bi-state MO/KS · Bilingual EN/ES · Logistics corridor'],
    featuredHealthLine:
      'Top 3 featured: Jeffrey Slibowski · AIS Health Insurance Advisors · George Ibanez',
    healthFeaturedLimit: 8,
  },
  hartford: {
    slug: 'hartford',
    sectionTitle: 'Hartford Metro Coverage Area',
    summary:
      '12 verified independent agencies across Hartford, Tolland, Middlesex, and New London counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Access Health CT enrollment, insurance-industry employment hub, and capital-region group benefits. Average Google rating ~4.8–5.0 stars.',
    counties: ['Hartford', 'Tolland', 'Middlesex', 'New London'],
    badges: ['Access Health CT · Insurance capital · Capital region'],
    featuredHealthLine:
      'Top 3 featured: Michael Andrews · Jaclyn Lasaracina · KPK Senior Insurance Solutions',
    healthFeaturedLimit: 8,
  },
  'des-moines': {
    slug: 'des-moines',
    sectionTitle: 'Des Moines Metro Coverage Area',
    summary:
      '12 verified independent agencies across Polk, Dallas, Warren, and Madison counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Iowa marketplace enrollment, insurer-HQ employment corridor, and growing capital-city suburban demand. Average Google rating ~4.8–5.0 stars.',
    counties: ['Polk', 'Dallas', 'Warren', 'Madison'],
    badges: ['Iowa marketplace · Insurer HQ corridor · Bilingual EN/ES'],
    featuredHealthLine:
      'Top 3 featured: Stephen Burgett · Iowa Health Agents · Bob Thompson',
    healthFeaturedLimit: 8,
  },
  'san-jose': {
    slug: 'san-jose',
    sectionTitle: 'Silicon Valley Coverage Area',
    summary:
      '12 verified independent agencies across Santa Clara County — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Covered California high-income cliffs, tech equity transitions, and startup benefits navigation. Average Google rating ~4.8–5.0 stars.',
    counties: ['Santa Clara'],
    badges: ['Silicon Valley · Covered California · Bilingual EN/ES'],
    featuredHealthLine:
      'Top 3 featured: Gary Church · Pete Randazzo · Nicole Daman Insurance Services',
    healthFeaturedLimit: 8,
  },
  columbus: {
    slug: 'columbus',
    sectionTitle: 'Columbus Metro Coverage Area',
    summary:
      '12 verified independent agencies across Franklin, Delaware, Fairfield, and Licking counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. State capital employee benefits, Ohio State corridor enrollment, and insurance-industry employment hub. Average Google rating ~4.8–5.0 stars.',
    counties: ['Franklin', 'Delaware', 'Fairfield', 'Licking'],
    badges: ['State capital · Ohio marketplace · OSU corridor'],
    featuredHealthLine:
      'Top 3 featured: Brian Moore · Hyers & Associates · Nica Langdon',
    healthFeaturedLimit: 8,
  },
  indianapolis: {
    slug: 'indianapolis',
    sectionTitle: 'Indianapolis Metro Coverage Area',
    summary:
      '12 verified independent agencies across Marion, Hamilton, Hendricks, Johnson, and Hancock counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Healthcare employment benefits, Indiana marketplace enrollment, and growing capital-city suburban demand. Average Google rating ~4.8–5.0 stars.',
    counties: ['Marion', 'Hamilton', 'Hendricks', 'Johnson', 'Hancock'],
    badges: ['Healthcare corridor · Indiana marketplace · Carmel suburbs'],
    featuredHealthLine:
      'Top 3 featured: Jason Hark · Indyhealthagent · Michael Wehner',
    healthFeaturedLimit: 8,
  },
  'salt-lake-city': {
    slug: 'salt-lake-city',
    sectionTitle: 'Salt Lake Metro Coverage Area',
    summary:
      '12 verified independent agencies across Salt Lake, Davis, Weber, and Utah counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Young-family growth, Silicon Slopes tech relocation, and Utah marketplace enrollment. Average Google rating ~4.8–5.0 stars.',
    counties: ['Salt Lake', 'Davis', 'Weber', 'Utah'],
    badges: ['Silicon Slopes · Utah marketplace · Family health plans'],
    featuredHealthLine:
      'Top 3 featured: Justin Call · Ark Insurance Solutions · Trevor Snell',
    healthFeaturedLimit: 8,
  },
  milwaukee: {
    slug: 'milwaukee',
    sectionTitle: 'Milwaukee Metro Coverage Area',
    summary:
      '12 verified independent agencies across Milwaukee, Waukesha, Ozaukee, and Washington counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Manufacturing benefit transitions, Wisconsin marketplace enrollment, and lakefront community Medicare growth. Average Google rating ~4.8–5.0 stars.',
    counties: ['Milwaukee', 'Waukesha', 'Ozaukee', 'Washington'],
    badges: ['Manufacturing benefits · Wisconsin marketplace · Lakefront communities'],
    featuredHealthLine:
      'Top 3 featured: William Kravit · MKE Benefits · Frank Souk',
    healthFeaturedLimit: 8,
  },
  'oklahoma-city': {
    slug: 'oklahoma-city',
    sectionTitle: 'Oklahoma City Metro Coverage Area',
    summary:
      '12 verified independent agencies across Oklahoma, Canadian, and Cleveland counties — 8 with primary health/Medicare/ACA/group emphasis and 4 multi-line independents. Energy sector benefits, Tinker AFB military families, and Oklahoma marketplace enrollment. Average Google rating ~4.8–5.0 stars.',
    counties: ['Oklahoma', 'Canadian', 'Cleveland'],
    badges: ['Energy sector · Military families · Oklahoma marketplace'],
    featuredHealthLine:
      'Top 3 featured: Jason Hark · Eagle Group Associates · Joe Graves',
    healthFeaturedLimit: 8,
  },
};

const CURATED_AGENTS: Record<string, HubAgent[]> = {
  'miami-fort-lauderdale': SOUTH_FLORIDA_AGENTS,
  orlando: ORLANDO_AGENTS,
  jacksonville: JACKSONVILLE_AGENTS,
  tampa: TAMPA_BAY_AGENTS,
  atlanta: ATLANTA_AGENTS,
  charlotte: CHARLOTTE_AGENTS,
  raleigh: RESEARCH_TRIANGLE_AGENTS,
  greensboro: TRIAD_AGENTS,
  nashville: NASHVILLE_AGENTS,
  memphis: MEMPHIS_AGENTS,
  chattanooga: CHATTANOOGA_AGENTS,
  knoxville: KNOXVILLE_AGENTS,
  chicago: CHICAGO_AGENTS,
  'dallas-fort-worth': DALLAS_FORT_WORTH_AGENTS,
  houston: HOUSTON_AGENTS,
  'washington-dc': WASHINGTON_DC_AGENTS,
  boston: BOSTON_AGENTS,
  detroit: DETROIT_AGENTS,
  seattle: SEATTLE_AGENTS,
  'riverside-san-bernardino': INLAND_EMPIRE_AGENTS,
  minneapolis: MINNEAPOLIS_AGENTS,
  'st-louis': ST_LOUIS_AGENTS,
  denver: DENVER_AGENTS,
  baltimore: BALTIMORE_AGENTS,
  portland: PORTLAND_AGENTS,
  'san-antonio': SAN_ANTONIO_AGENTS,
  sacramento: SACRAMENTO_AGENTS,
  pittsburgh: PITTSBURGH_AGENTS,
  'las-vegas': LAS_VEGAS_AGENTS,
  austin: AUSTIN_AGENTS,
  cincinnati: CINCINNATI_AGENTS,
  'kansas-city': KANSAS_CITY_AGENTS,
  hartford: HARTFORD_AGENTS,
  'des-moines': DES_MOINES_AGENTS,
  'san-jose': SAN_JOSE_AGENTS,
  columbus: COLUMBUS_AGENTS,
  indianapolis: INDIANAPOLIS_AGENTS,
  'salt-lake-city': SALT_LAKE_CITY_AGENTS,
  milwaukee: MILWAUKEE_AGENTS,
  'oklahoma-city': OKLAHOMA_CITY_AGENTS,
};

export function getCuratedHubConfig(slug: string): CuratedHubConfig | null {
  return CURATED_HUB_CONFIG[slug] ?? null;
}

export function getCuratedHubAgents(slug: string): HubAgent[] | null {
  return CURATED_AGENTS[slug] ?? null;
}

export function isCuratedHub(slug: string): boolean {
  return slug in CURATED_AGENTS;
}